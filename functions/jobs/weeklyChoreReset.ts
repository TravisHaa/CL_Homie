/**
 * Weekly chore reset — authoritative server-side rollover.
 *
 * Runs every Sunday at 00:01 America/Los_Angeles, just inside the new US
 * week (Sun–Sat), and advances every recurring chore in every house to the
 * current week. Both server and client compute keys from the same
 * `getWeekKey(now)` helper; no Monday pre-stamping is required. Mirrors the
 * client-side rollover at `src/firebase/choreRollover.ts` (the `evaluateRoll`
 * decision matrix is ported verbatim) until that fallback is retired in a
 * follow-up issue.
 *
 * Why duplicate the logic instead of importing from `src/`:
 *  - The client modules import `firebase/firestore` (web SDK) and depend on
 *    the React Native runtime; they cannot be loaded inside a Node.js
 *    Cloud Function. Admin SDK is used here.
 *  - The duplication is intentional and short-lived — once the client copy
 *    is removed, this file becomes the single source of truth.
 *
 * Observability:
 *  Each invocation emits structured events for Cloud Logging:
 *    - weeklyChoreReset.start  { targetWeekKey, targetDayKey, houseCount }
 *    - weeklyChoreReset.house  { houseId, status, rolled, weeksAdvanced, errorMessage? }
 *    - weeklyChoreReset.end    { durationMs, totals }
 *  status ∈ { 'rolled' | 'noop' | 'race_guard_hit' | 'empty' | 'error' }.
 */

import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  getDaysInMonth,
  getWeek,
  getWeekYear,
  isSameDay,
  setWeek,
  setWeekYear,
  startOfWeek,
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
  createdAt?: Timestamp;
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
// US-week semantics (weeks start Sunday, week 1 contains Jan 1) so the
// server and client compute identical keys.
// ---------------------------------------------------------------------------

const US_WEEK_OPTS = { weekStartsOn: 0, firstWeekContainsDate: 1 } as const;

/** Stable US-week identifier like "2026-W15" (weeks run Sun–Sat). */
function getWeekKey(date: Date): string {
  const week = getWeek(date, US_WEEK_OPTS);
  const year = getWeekYear(date, US_WEEK_OPTS);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Parse "2026-W15" into the Sunday (00:00 local) of that US week. */
function parseWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const anchor = setWeekYear(new Date(year, 5, 1), year, US_WEEK_OPTS);
  const inWeek = setWeek(anchor, week, US_WEEK_OPTS);
  return startOfWeek(inWeek, US_WEEK_OPTS);
}

/** Signed US-week difference: b - a. Same week → 0. */
function weeksBetween(a: string, b: string): number {
  const aSun = parseWeekKey(a);
  const bSun = parseWeekKey(b);
  return Math.round(differenceInCalendarDays(bSun, aSun) / 7);
}

/** Signed calendar-month difference between the Sundays of two week keys: b - a. */
function monthsBetween(a: string, b: string): number {
  return differenceInCalendarMonths(parseWeekKey(b), parseWeekKey(a));
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

/** Signed day difference: b - a. */
function daysBetweenKeys(a: string, b: string): number {
  return differenceInCalendarDays(parseDayKey(b), parseDayKey(a));
}

/** Monotonic US-week index, lets us compare two dates by US-week. */
function weekIndex(date: Date): number {
  return getWeekYear(date, US_WEEK_OPTS) * 54 + getWeek(date, US_WEEK_OPTS);
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
      const anchor = chore.createdAt?.toDate() ?? date;
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
      if (!cr) return false;
      if (cr.unit === 'days') {
        if (!chore.lastTriggeredKey) return true;
        return daysBetweenKeys(chore.lastTriggeredKey, getDayKey(date)) >= cr.count;
      }
      if (!cr.daysOfWeek?.includes(dow)) return false;
      const anchor = chore.createdAt?.toDate() ?? date;
      const cyclesSinceAnchor = weekIndex(date) - weekIndex(anchor);
      return cyclesSinceAnchor >= 0 && cyclesSinceAnchor % cr.count === 0;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Roll decision matrix — ported verbatim from `src/firebase/choreRollover.ts`
// (`evaluateRoll`, `nextAssignee`). Behaviour MUST stay in lockstep with the
// client until the client copy is removed.
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
      let weeksElapsed: number;
      try {
        weeksElapsed = weeksBetween(chore.weekKey, currentWeekKey);
      } catch {
        return { shift: 1, bumpWeekKey: true };
      }
      if (weeksElapsed < 2) return null;
      return { shift: Math.floor(weeksElapsed / 2), bumpWeekKey: true };
    }
    case 'monthly': {
      let monthsElapsed: number;
      try {
        monthsElapsed = monthsBetween(chore.weekKey, currentWeekKey);
      } catch {
        return null;
      }
      if (monthsElapsed < 1) return null;
      if (chore.dayOfMonth != null && !isChoreDueOn(chore, now)) return null;
      return { shift: monthsElapsed, bumpWeekKey: true };
    }
    case 'custom': {
      const cr = chore.customRecurrence;
      if (!cr || cr.count < 1) return null;
      if (cr.unit === 'days') {
        if (!lastDay) {
          return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
        }
        const elapsed = daysBetweenKeys(lastDay, todayDayKey);
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

type HouseStatus = 'rolled' | 'noop' | 'race_guard_hit' | 'empty' | 'error';

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
  targetDayKey: string
): Promise<HouseResult> {
  const choresCol = db.collection('houses').doc(houseId).collection('chores');
  const houseRef = db.collection('houses').doc(houseId);

  // Pre-fetch all chores OUTSIDE the transaction (admin SDK transactions can
  // perform queries, but the client cannot — keeping the shape identical
  // makes diffing the two implementations easier).
  const snap = await choresCol.get();
  const candidates = snap.docs
    .map((d) => ({ chore: { id: d.id, ...(d.data() as Omit<Chore, 'id'>) }, ref: d.ref }))
    .filter((entry) => entry.chore.recurrence !== 'once');

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

    if (house.lastRolloverDayKey === targetDayKey) {
      return {
        houseId,
        status: 'race_guard_hit' as HouseStatus,
        rolled: 0,
        weeksAdvanced: 0,
      };
    }

    const memberIds = house.memberIds ?? [];
    const sortedMembers = [...memberIds].sort();
    const masterSwitchOn = house.weeklyScrambleEnabled !== false;

    let rolled = 0;
    let maxWeeksAdvanced = 0;

    for (const { chore, ref } of candidates) {
      const decision = evaluateRoll(chore, now);
      if (!decision) continue;

      const update: Record<string, unknown> = {
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        lastTriggeredKey: targetDayKey,
      };
      if (decision.bumpWeekKey) update.weekKey = targetWeekKey;

      const shouldRotate =
        chore.autoRotate === true &&
        masterSwitchOn &&
        sortedMembers.length > 1;

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

      tx.update(ref, update);
      rolled += 1;
      if (decision.shift > maxWeeksAdvanced) maxWeeksAdvanced = decision.shift;
    }

    const houseUpdate: Record<string, unknown> = {
      lastRolloverDayKey: targetDayKey,
      lastRolloverWeekKey: targetWeekKey,
    };
    if (rolled > 0) {
      // Use explicit read-modify-write to match src/firebase/choreRollover.ts.
      // FieldValue.increment is atomic on its own, but mixing it here with the
      // client's direct-write would make the two implementations diverge in a
      // way that's easy to misread when comparing them.
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
    raceGuardHit: number;
    empty: number;
    errors: number;
  };
  results: HouseResult[];
}

/**
 * Run the rollover for every house.
 *
 * @param now Wall-clock reference. Its US-week / day-key are stamped onto
 *            every rolled chore (matches `src/firebase/choreRollover.ts`,
 *            which also computes both keys from `new Date()`). The Sunday
 *            00:01 PT scheduled handler simply passes the default.
 */
export async function runWeeklyChoreReset(
  now: Date = new Date()
): Promise<RunSummary> {
  const db = getFirestore();
  const startedAt = Date.now();

  const targetWeekKey = getWeekKey(now);
  const targetDayKey = getDayKey(now);

  const housesSnap = await db.collection('houses').get();
  const houseIds = housesSnap.docs.map((d) => d.id);

  logger.info('weeklyChoreReset.start', {
    targetWeekKey,
    targetDayKey,
    houseCount: houseIds.length,
  });

  const settled = await Promise.allSettled(
    houseIds.map((id) =>
      rolloverHouse(db, id, now, targetWeekKey, targetDayKey)
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
      logger.error('weeklyChoreReset.house', payload);
    } else {
      logger.info('weeklyChoreReset.house', payload);
    }
  }

  const totals = {
    rolled: results.filter((r) => r.status === 'rolled').length,
    noop: results.filter((r) => r.status === 'noop').length,
    raceGuardHit: results.filter((r) => r.status === 'race_guard_hit').length,
    empty: results.filter((r) => r.status === 'empty').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  const summary: RunSummary = {
    durationMs: Date.now() - startedAt,
    totals,
    results,
  };

  logger.info('weeklyChoreReset.end', {
    durationMs: summary.durationMs,
    totals,
  });

  return summary;
}

// ---------------------------------------------------------------------------
// Scheduled function. `1 0 * * 0` = Sunday 00:01 in `America/Los_Angeles`,
// which lands just inside the new US week. Both server and client compute
// keys from `getWeekKey(now)`, so no Monday pre-stamping is needed and minor
// schedule drift around the boundary is safe. 00:01 PT is also well clear of
// the 02:00 spring-forward / fall-back DST boundaries.
// ---------------------------------------------------------------------------

export const weeklyChoreReset = onSchedule(
  {
    schedule: '1 0 * * 0',
    timeZone: 'America/Los_Angeles',
    region: 'us-central1',
    retryCount: 0,
  },
  async (_event) => {
    await runWeeklyChoreReset();
  }
);
