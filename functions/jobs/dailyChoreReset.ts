/**
 * Daily chore reset — authoritative server-side rollover.
 *
 * Runs every day at 00:01 America/Los_Angeles and advances every recurring
 * chore in every house to the current day / week / month as appropriate.
 * Daily firing is required for correctness: cadences whose due-day isn't
 * Monday (e.g. a "Wednesday only" custom-weeks chore or a "day 15" monthly
 * chore) need their `weekKey` re-stamped on the day they actually fire,
 * otherwise the `useChores` listener (which filters by `weekKey ==
 * currentWeek`) silently hides them from the Chores tab. The cron expression
 * `1 0 * * *` runs at 00:01 PT, well clear of the 02:00 DST jumps.
 *
 * Both server and client compute keys from the same `getWeekKey(now)`
 * helper; no pre-stamping is required.
 *
 * This file is the single source of truth for the rollover decision. There
 * is no client-side `evaluateRoll` / `rolloverHouse` anymore; the React
 * Native client only renders state and writes user actions. A small amount
 * of code is still duplicated between here and `src/utils/`:
 *  - `isChoreDueOn` is mirrored in `src/utils/choreSchedule.ts` because the
 *    client needs it for the "Today" filter and display. The two copies
 *    MUST stay in lockstep — see the comment on `isChoreDueOn` below.
 *  - Week / day key helpers are mirrored from `src/utils/weekKey.ts` for
 *    the same reason (and because client modules pull in `firebase/
 *    firestore` web SDK + the React Native runtime, which can't be loaded
 *    inside a Node.js Cloud Function).
 *
 * Observability:
 *  Each invocation emits structured events for Cloud Logging:
 *    - dailyChoreReset.start  { targetWeekKey, targetDayKey, houseCount }
 *    - dailyChoreReset.house  { houseId, status, rolled, weeksAdvanced, errorMessage? }
 *    - dailyChoreReset.end    { durationMs, totals }
 *  status ∈ { 'rolled' | 'noop' | 'empty' | 'error' }.
 */

import {
  differenceInCalendarDays,
  format,
  getDaysInMonth,
  getISOWeek,
  getISOWeekYear,
  isSameDay,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from 'date-fns';
import { getApps, initializeApp } from 'firebase-admin/app';
import {
  Firestore,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// ---------------------------------------------------------------------------
// Admin SDK init (idempotent — required for emulator + production reuse).
// ---------------------------------------------------------------------------

if (getApps().length === 0) {
  initializeApp();
}

// ---------------------------------------------------------------------------
// Local types — minimal projections of the shapes in `src/types/index.ts`.
// We only model the fields the rollover logic touches.
// ---------------------------------------------------------------------------

type ChoreRecurrence =
  | 'once'
  | 'daily'
  | 'weekly'
  // 'biweekly' is the legacy schema-v0 value. Migration v1 rewrites every
  // such chore to `custom { count: 2, unit: 'weeks' }`, but the migration
  // only runs when the React Native client opens — un-migrated houses will
  // still carry the original value. Keeping the case live in `isChoreDueOn`
  // means the rollover stays correct for those houses until they open the
  // app once.
  | 'biweekly'
  | 'monthly'
  | 'custom';

interface CustomRecurrence {
  count: number;
  unit: 'days' | 'weeks';
  daysOfWeek?: number[];
}

interface Chore {
  id: string;
  assignedTo: string;
  recurrence: ChoreRecurrence;
  autoRotate?: boolean;
  dayOfWeek: number | null;
  dayOfMonth?: number | null;
  customRecurrence?: CustomRecurrence | null;
  dueAt: Timestamp | null;
  weekKey: string;
  lastTriggeredKey?: string | null;
  // Stable, timezone-independent cadence anchor (YYYY-MM-DD in the device's
  // local time at creation). Mirrors `Chore.recurrenceAnchorKey` in
  // `src/types/index.ts`. Populated by `useChores.addChore` and back-filled
  // by client migration v4 for legacy chores; treated as missing if absent.
  recurrenceAnchorKey?: string | null;
  createdAt?: Timestamp;
  isCompleted?: boolean;
  completedAt?: Timestamp | null;
  completedBy?: string | null;
}

interface House {
  memberIds?: string[];
  weeklyScrambleEnabled?: boolean;
  lastRolloverDayKey?: string;
  lastRolloverWeekKey?: string;
  rotationOffset?: number;
}

// ---------------------------------------------------------------------------
// Week / day key helpers — copied verbatim from `src/utils/weekKey.ts` so the
// function has zero dependency on the React Native client codebase. Uses
// ISO-week semantics (weeks start Monday) so the server and client compute
// identical keys.
// ---------------------------------------------------------------------------

/** Stable ISO-week identifier like "2026-W15" (weeks run Mon–Sun). */
function getWeekKey(date: Date): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Parse "2026-W15" into the Monday (00:00 local) of that ISO week. */
function parseWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const anchor = setISOWeekYear(new Date(year, 5, 1), year);
  const inWeek = setISOWeek(anchor, week);
  return startOfISOWeek(inWeek);
}

/** Signed ISO-week difference: b - a. Same week → 0. */
function weeksBetween(a: string, b: string): number {
  const aMon = parseWeekKey(a);
  const bMon = parseWeekKey(b);
  return Math.round(differenceInCalendarDays(bMon, aMon) / 7);
}

/** Stable day identifier like "2026-05-04". */
function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function parseDayKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid day key: ${key}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Resolve a chore's cadence anchor as a local-midnight Date. Mirrors
 * `src/utils/choreSchedule.ts#resolveAnchorDate`; the duplication exists
 * because Cloud Functions can't import the React Native client modules.
 */
function resolveAnchorDate(chore: Chore, fallback: Date): Date {
  if (chore.recurrenceAnchorKey) {
    try {
      return parseDayKey(chore.recurrenceAnchorKey);
    } catch {
      // fall through
    }
  }
  return chore.createdAt?.toDate?.() ?? fallback;
}

/** Signed day difference: b - a. */
function daysBetweenKeys(a: string, b: string): number {
  return differenceInCalendarDays(parseDayKey(b), parseDayKey(a));
}

/**
 * Monotonic ISO-week index (true week count). Mirrors `src/utils/weekKey.ts`.
 * The naive `isoYear * 53 + isoWeek` formula is not monotonic across ISO
 * years that end at week 52 (e.g. 2022-W52 → 2023-W01 produced a diff of 2
 * instead of 1), which silently corrupts the biweekly / custom-weeks cadence
 * modulus.
 */
const WEEK_INDEX_EPOCH = new Date(1970, 0, 5); // 1970-01-05 was a Monday.
function weekIndex(date: Date): number {
  return Math.round(
    differenceInCalendarDays(startOfISOWeek(date), WEEK_INDEX_EPOCH) / 7
  );
}

/** Clamp a target day-of-month to the actual length of the month containing `reference`. */
function clampDayOfMonth(reference: Date, dayOfMonth: number): number {
  const max = getDaysInMonth(reference);
  return Math.min(Math.max(1, dayOfMonth), max);
}

// ---------------------------------------------------------------------------
// Schedule check — ported from `src/utils/choreSchedule.ts`.
// ---------------------------------------------------------------------------

function isChoreDueOn(chore: Chore, date: Date): boolean {
  const dow = date.getDay();
  switch (chore.recurrence) {
    case 'once':
      return chore.dueAt ? isSameDay(chore.dueAt.toDate(), date) : false;
    case 'daily':
      return true;
    case 'weekly':
      return chore.dayOfWeek === dow;
    case 'biweekly': {
      if (chore.dayOfWeek !== dow) return false;
      const anchor = resolveAnchorDate(chore, date);
      const cyclesSinceAnchor = weekIndex(date) - weekIndex(anchor);
      return cyclesSinceAnchor >= 0 && cyclesSinceAnchor % 2 === 0;
    }
    case 'monthly': {
      if (chore.dayOfMonth == null) return false;
      const target = clampDayOfMonth(date, chore.dayOfMonth);
      return date.getDate() === target;
    }
    case 'custom': {
      const cr = chore.customRecurrence;
      if (!cr || cr.count < 1) return false;
      if (cr.unit === 'days') {
        // Match the client: strict modulus from the chore's anchor
        // (`recurrenceAnchorKey` → fallback to createdAt → fallback to date).
        // The old `!lastTriggeredKey ? true` branch fired every day for new
        // chores; using the anchor pins the cadence to the user's chosen
        // start day instead.
        const todayKey = getDayKey(date);
        const anchorKey =
          chore.lastTriggeredKey ?? chore.recurrenceAnchorKey ?? getDayKey(resolveAnchorDate(chore, date));
        const elapsed = daysBetweenKeys(anchorKey, todayKey);
        if (elapsed < 0) return false;
        return elapsed % cr.count === 0;
      }
      if (!cr.daysOfWeek?.includes(dow)) return false;
      const anchor = resolveAnchorDate(chore, date);
      const cyclesSinceAnchor = weekIndex(date) - weekIndex(anchor);
      return cyclesSinceAnchor >= 0 && cyclesSinceAnchor % cr.count === 0;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Roll decision matrix. Server-only — the client has no rollover code path;
// it just observes Firestore state mutated by this function.
// ---------------------------------------------------------------------------

interface RollDecision {
  /** Number of rotation steps to advance the assignee by (>= 1 if rolling). */
  shift: number;
  /** Whether the chore's weekKey should be bumped to the target week. */
  bumpWeekKey: boolean;
}

function evaluateRoll(chore: Chore, now: Date): RollDecision | null {
  if (chore.recurrence === 'once') return null;

  const todayDayKey = getDayKey(now);
  const currentWeekKey = getWeekKey(now);
  const lastDay = chore.lastTriggeredKey ?? null;

  switch (chore.recurrence) {
    case 'daily': {
      if (lastDay && lastDay >= todayDayKey) return null;
      return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
    }
    case 'weekly': {
      let weeksElapsed: number;
      try {
        weeksElapsed = weeksBetween(chore.weekKey, currentWeekKey);
      } catch {
        return { shift: 1, bumpWeekKey: true };
      }
      if (weeksElapsed <= 0) return null;
      return { shift: weeksElapsed, bumpWeekKey: true };
    }
    case 'biweekly': {
      // Legacy schema-v0 path. Migration v1 rewrites every biweekly chore to
      // `custom { count: 2, unit: 'weeks' }`, but we keep the case live for
      // un-migrated houses (the Cloud Function may run before any client
      // opens the app). Gate on `isChoreDueOn` (anchor-based modulus over
      // `recurrenceAnchorKey` / `createdAt`) + the per-day idempotency
      // check on `lastTriggeredKey`. We can't gate on
      // `weeksBetween(weekKey, currentWeekKey)` like the original
      // implementation did: the daily visibility re-stamp at the bottom of
      // `rolloverHouse` resets `weekKey` to the current ISO week every
      // night, so `weeksElapsed` is effectively capped at 1 and the
      // `< 2` threshold would silently prevent every fire.
      if (!isChoreDueOn(chore, now)) return null;
      if (lastDay && lastDay >= todayDayKey) return null;
      return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
    }
    case 'monthly': {
      // Anchor on the chore's target day-of-month (via `isChoreDueOn`,
      // which clamps day 31 → last day of short months) plus the
      // `lastTriggeredKey >= todayDayKey` idempotency check. We can't use
      // `monthsBetween(weekKey, currentWeekKey)` here: the daily
      // visibility re-stamp at the bottom of `rolloverHouse` resets
      // `weekKey` to the current ISO week every night, so by the time
      // the chore's target day arrives `monthsBetween` is 0 and the
      // chore would silently never fire (causing the user-visible bug
      // where a day-15 monthly stays assigned to its first holder
      // indefinitely).
      if (!isChoreDueOn(chore, now)) return null;
      if (lastDay && lastDay >= todayDayKey) return null;
      return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
    }
    case 'custom': {
      const cr = chore.customRecurrence;
      if (!cr || cr.count < 1) return null;
      if (cr.unit === 'days') {
        // Anchored catch-up. Anchor on the chore's own `lastTriggeredKey`
        // once it has fired at least once; otherwise fall back to the
        // creation-time anchor (`recurrenceAnchorKey`, then `createdAt`).
        // This mirrors the client's `isChoreDueOn` anchor resolution in
        // `src/utils/choreSchedule.ts`, so the two stay in lockstep on the
        // anchor grid even though the server is tolerant of missed runs.
        //
        // Catch-up (`elapsed >= cr.count`, not strict equality) means a
        // missed nightly invocation — deploy collision, cold start past
        // 00:01 PT, transient outage — still fires the chore on the next
        // run and re-anchors via the `lastTriggeredKey = targetDayKey`
        // write in `rolloverHouse`. After that re-anchor the client's
        // strict-modulus check picks up the new grid automatically because
        // it also resolves anchor as `lastTriggeredKey ?? ...`.
        const anchorKey =
          chore.lastTriggeredKey ??
          chore.recurrenceAnchorKey ??
          getDayKey(resolveAnchorDate(chore, now));
        const elapsed = daysBetweenKeys(anchorKey, todayDayKey);
        if (elapsed < cr.count) return null;
        return {
          shift: Math.floor(elapsed / cr.count),
          bumpWeekKey: chore.weekKey !== currentWeekKey,
        };
      }
      if (!isChoreDueOn(chore, now)) return null;
      if (lastDay && lastDay >= todayDayKey) return null;
      return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
    }
    default:
      return null;
  }
}

function nextAssignee(
  currentAssignee: string,
  sortedMembers: string[],
  cadenceShift: number
): string {
  if (sortedMembers.length === 0) return currentAssignee;
  const idx = sortedMembers.indexOf(currentAssignee);
  if (idx === -1) return sortedMembers[0];
  const next = (idx + cadenceShift) % sortedMembers.length;
  return sortedMembers[next];
}

// ---------------------------------------------------------------------------
// Per-house rollover.
// ---------------------------------------------------------------------------

type HouseStatus = 'rolled' | 'noop' | 'empty' | 'error';

interface HouseResult {
  houseId: string;
  status: HouseStatus;
  rolled: number;
  weeksAdvanced: number;
  errorMessage?: string;
}

async function rolloverHouse(
  db: Firestore,
  houseId: string,
  now: Date,
  targetWeekKey: string,
  targetDayKey: string,
  force: boolean
): Promise<HouseResult> {
  const choresCol = db.collection('houses').doc(houseId).collection('chores');
  const houseRef = db.collection('houses').doc(houseId);

  // Pre-fetch all chores OUTSIDE the transaction (admin SDK transactions can
  // perform queries, but the client cannot — keeping the shape identical
  // makes diffing the two implementations easier).
  const snap = await choresCol.get();
  const candidates = snap.docs.map((d) => ({
    chore: { id: d.id, ...(d.data() as Omit<Chore, 'id'>) },
    ref: d.ref,
  }));

  if (candidates.length === 0) {
    return { houseId, status: 'empty', rolled: 0, weeksAdvanced: 0 };
  }

  return db.runTransaction(async (tx) => {
    const houseSnap = await tx.get(houseRef);
    if (!houseSnap.exists) {
      return {
        houseId,
        status: 'noop' as HouseStatus,
        rolled: 0,
        weeksAdvanced: 0,
      };
    }
    const house = houseSnap.data() as House;

    // No same-day guard: the function is idempotent within a day because
    //   - evaluateRoll returns null once a chore's weekKey is at the target,
    //   - rotationOffset only bumps when cadenceAdvanced > 0,
    //   - completed once-chores are deleted on the first run and absent on
    //     subsequent runs.
    // This is what makes `retryCount > 0` safe on the scheduled trigger
    // (see the bottom of this file) and also lets manual re-invocation
    // from `functions:shell` and repeated tests actually do work.

    const memberIds = house.memberIds ?? [];
    const sortedMembers = [...memberIds].sort();
    const masterSwitchOn = house.weeklyScrambleEnabled !== false;

    let rolled = 0;
    let cadenceAdvanced = 0;
    let maxWeeksAdvanced = 0;

    for (const { chore, ref } of candidates) {
      // One-time chores aren't on a cadence: delete them once completed so
      // they disappear from the user's view, and leave overdue/incomplete
      // ones in place so the user doesn't silently lose unfinished tasks.
      if (chore.recurrence === 'once') {
        if (chore.isCompleted) {
          tx.delete(ref);
          rolled += 1;
        }
        continue;
      }

      let decision = evaluateRoll(chore, now);
      // Force mode (manual testing only): when cadence math says "no advance
      // yet", synthesize a single-step rotation so the call exercises the
      // rotation path. We still respect `bumpWeekKey` semantics — if the
      // chore is already at the target week, don't redundantly re-stamp it.
      if (!decision && force) {
        decision = {
          shift: 1,
          bumpWeekKey: chore.weekKey !== targetWeekKey,
        };
      }
      const update: Record<string, unknown> = {};

      // Daily uncross — true "fires every day" cadences (recurrence === 'daily'
      // or custom-days with count === 1) must clear their completion state
      // whenever the calendar day advances, otherwise a chore marked done
      // Tuesday would still render as done Wed–Sun. Multi-day customs (e.g.
      // every 5 days) are intentionally excluded: their completion should
      // persist between fire days, and the cadence-driven uncross below picks
      // them up on the actual advance day. Weekly / monthly / custom-weeks
      // cadences also fall through to that branch.
      const isDaily = chore.recurrence === 'daily';
      const isEveryDayCustom =
        chore.recurrence === 'custom' &&
        chore.customRecurrence?.unit === 'days' &&
        (chore.customRecurrence?.count ?? 1) === 1;
      const isSingleDayCadence = isDaily || isEveryDayCustom;
      const dayHasAdvanced =
        isSingleDayCadence && chore.lastTriggeredKey !== targetDayKey;

      // Force-uncross: every recurring chore gets its completion state cleared
      // when the reset advances cadence, on day boundaries for single-day
      // cadences, or when invoked manually (e.g. from the Functions shell).
      // Only emit the writes when there's actually something to clear to
      // avoid no-op document churn.
      const shouldUncross =
        decision !== null ||
        dayHasAdvanced ||
        force;
      if (
        shouldUncross &&
        (chore.isCompleted === true ||
          chore.completedAt != null ||
          chore.completedBy != null)
      ) {
        update.isCompleted = false;
        update.completedAt = null;
        update.completedBy = null;
      }

      // Cadence-driven changes (weekKey bump, rotation, lastTriggeredKey) only
      // apply when the chore's schedule has actually advanced.
      if (decision) {
        update.lastTriggeredKey = targetDayKey;
        if (decision.bumpWeekKey) update.weekKey = targetWeekKey;

        // First-cycle protection — a brand-new chore's seeded assignee
        // (`useChores.addChore` uses `house.rotationOffset` to stagger
        // creations) must own the first occurrence. Without this guard,
        // creating a chore mid-week and letting the next daily/weekly
        // tick run would silently rotate the assignee away before the
        // user ever saw it on the schedule. We treat `lastTriggeredKey
        // == null` as "this is the chore's very first advance" and keep
        // the current assignee for that pass only; subsequent ticks
        // rotate normally.
        const isFirstAdvance = chore.lastTriggeredKey == null;
        const shouldRotate =
          chore.autoRotate === true &&
          masterSwitchOn &&
          sortedMembers.length > 1 &&
          !isFirstAdvance;

        if (shouldRotate) {
          update.assignedTo = nextAssignee(
            chore.assignedTo,
            sortedMembers,
            decision.shift
          );
        } else if (
          sortedMembers.length > 0 &&
          !sortedMembers.includes(chore.assignedTo)
        ) {
          update.assignedTo = sortedMembers[0];
        }

        cadenceAdvanced += 1;
        if (decision.shift > maxWeeksAdvanced) maxWeeksAdvanced = decision.shift;
      }

      // Daily weekKey re-stamp — visibility fix for chores whose fire day
      // isn't the start of the ISO week (monthly "day 15", custom-weeks
      // "Wednesday only", custom-days "every 5 days"). The `useChores`
      // listener filters by `where('weekKey', '==', currentWeekKey)`, so
      // any recurring chore whose weekKey lags the current week silently
      // drops out of the Chores tab until it next fires. The cadence path
      // above only writes weekKey on actual fire days, which is precisely
      // when these chores are NOT firing — hence this independent bump.
      // No rotation, no uncross, no `lastTriggeredKey` write: this is a
      // pure listener-visibility refresh. (One-time chores already short-
      // circuited above via `continue`, so we don't need to re-check the
      // recurrence here.)
      if (chore.weekKey !== targetWeekKey && update.weekKey === undefined) {
        update.weekKey = targetWeekKey;
      }

      if (Object.keys(update).length === 0) continue;

      tx.update(ref, update);
      rolled += 1;
    }

    const houseUpdate: Record<string, unknown> = {
      lastRolloverDayKey: targetDayKey,
      lastRolloverWeekKey: targetWeekKey,
    };
    if (cadenceAdvanced > 0) {
      // Only bump the rotation seed when at least one chore's cadence actually
      // advanced — a pure "force uncross" pass mustn't perturb future
      // auto-rotate seeding for newly-created chores.
      houseUpdate.rotationOffset = (house.rotationOffset ?? 0) + 1;
    }
    tx.update(houseRef, houseUpdate);

    return {
      houseId,
      status: (rolled > 0 ? 'rolled' : 'noop') as HouseStatus,
      rolled,
      weeksAdvanced: maxWeeksAdvanced,
    };
  });
}

// ---------------------------------------------------------------------------
// Orchestrator. Exported (without the schedule wrapper) so it can be invoked
// directly from the Functions shell or unit tests.
// ---------------------------------------------------------------------------

export interface RunSummary {
  durationMs: number;
  totals: {
    rolled: number;
    noop: number;
    empty: number;
    errors: number;
  };
  results: HouseResult[];
}

export interface RunOptions {
  /**
   * When true, every recurring chore is rotated by one step even if its
   * cadence math says "no advance yet". Intended for manual invocations from
   * `firebase functions:shell` (see functions/README.md); the scheduled
   * nightly trigger never sets this so production keeps strict cadence
   * semantics for monthly / custom chores.
   */
  force?: boolean;
}

/**
 * Run the rollover for every house.
 *
 * @param now Wall-clock reference. Its ISO-week / day-key are stamped onto
 *            every rolled chore. The nightly 00:01 PT scheduled handler
 *            simply passes the default.
 */
export async function runDailyChoreReset(
  now: Date = new Date(),
  options: RunOptions = {}
): Promise<RunSummary> {
  const db = getFirestore();
  const startedAt = Date.now();
  const force = options.force === true;

  const targetWeekKey = getWeekKey(now);
  const targetDayKey = getDayKey(now);

  const housesSnap = await db.collection('houses').get();
  const houseIds = housesSnap.docs.map((d) => d.id);

  logger.info('dailyChoreReset.start', {
    targetWeekKey,
    targetDayKey,
    houseCount: houseIds.length,
    force,
  });

  const settled = await Promise.allSettled(
    houseIds.map((id) =>
      rolloverHouse(db, id, now, targetWeekKey, targetDayKey, force)
    )
  );

  const results: HouseResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    const err = s.reason as Error | undefined;
    return {
      houseId: houseIds[i],
      status: 'error',
      rolled: 0,
      weeksAdvanced: 0,
      errorMessage: err?.message ?? String(s.reason),
    };
  });

  for (const r of results) {
    const payload = {
      houseId: r.houseId,
      status: r.status,
      rolled: r.rolled,
      weeksAdvanced: r.weeksAdvanced,
      ...(r.errorMessage ? { errorMessage: r.errorMessage } : {}),
    };
    if (r.status === 'error') {
      logger.error('dailyChoreReset.house', payload);
    } else {
      logger.info('dailyChoreReset.house', payload);
    }
  }

  const totals = {
    rolled: results.filter((r) => r.status === 'rolled').length,
    noop: results.filter((r) => r.status === 'noop').length,
    empty: results.filter((r) => r.status === 'empty').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  const summary: RunSummary = {
    durationMs: Date.now() - startedAt,
    totals,
    results,
  };

  logger.info('dailyChoreReset.end', {
    durationMs: summary.durationMs,
    totals,
  });

  return summary;
}

// ---------------------------------------------------------------------------
// Scheduled function. `1 0 * * *` = every day at 00:01 in
// `America/Los_Angeles`, the first minute of the new calendar day. Daily
// firing is what makes the rollover correct for chores whose due-day isn't
// a Monday — a custom-weeks "Wednesday only" chore or a monthly "day 15"
// chore now gets its `weekKey` re-stamped on the day it actually fires,
// instead of disappearing from the Chores tab after one week / one month.
//
// Per-recurrence safety:
//   - daily / custom-days: idempotent via `lastTriggeredKey >= todayDayKey`
//     check inside `evaluateRoll`.
//   - weekly: gated by `weeksElapsed <= 0` (one advance per ISO week).
//   - biweekly / monthly / custom-weeks: gated by `isChoreDueOn(now)` plus
//     the `lastTriggeredKey >= todayDayKey` idempotency check, so each
//     fires at most once per scheduled fire day. We deliberately do NOT
//     gate on `weeksBetween(weekKey, ...)` / `monthsBetween(weekKey, ...)`
//     for these: the daily visibility re-stamp below resets `weekKey` to
//     the current ISO week every night, which would peg those deltas at
//     0–1 and silently suppress every fire.
//
// `retryCount: 2` is safe because `rolloverHouse` is idempotent within a
// day (per the bullets above and the same-day notes in `rolloverHouse`).
// It exists to absorb transient cold-start / deploy-collision failures
// where the first invocation errors before completing — without it, those
// would silently skip a whole day's rollover for every house.
//
// 00:01 PT is also well clear of the 02:00 spring-forward / fall-back DST
// boundaries.
// ---------------------------------------------------------------------------

export const dailyChoreReset = onSchedule(
  {
    schedule: '1 0 * * *',
    timeZone: 'America/Los_Angeles',
    region: 'us-central1',
    retryCount: 2,
  },
  async (_event) => {
    await runDailyChoreReset();
  }
);
