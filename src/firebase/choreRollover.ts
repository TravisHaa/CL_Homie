import { getDocs, runTransaction } from 'firebase/firestore';

import type { Chore, House } from '@/src/types';
import { isChoreDueOn } from '@/src/utils/choreSchedule';
import {
    daysBetweenKeys,
    getDayKey,
    getWeekKey,
    monthsBetween,
    weeksBetween,
} from '@/src/utils/weekKey';

import { db } from './config';
import { choresCol, houseDoc } from './firestore';

interface RollDecision {
  /** Number of rotation steps to advance the assignee by (>= 1 if rolling). */
  shift: number;
  /** Whether the chore's weekKey should be bumped to the current week. */
  bumpWeekKey: boolean;
}

/**
 * Decides whether `chore` should roll given the current device-local moment.
 * Returns null when the chore is not yet due for a new cycle.
 *
 * The rules mirror the spec in the rotation redesign plan §3 — see that doc
 * for a per-recurrence breakdown.
 */
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
        // Malformed weekKey — recover by treating as a fresh roll.
        return { shift: 1, bumpWeekKey: true };
      }
      if (weeksElapsed <= 0) return null;
      return { shift: weeksElapsed, bumpWeekKey: true };
    }
    case 'biweekly': {
      // Legacy path until the migration runs. Behaves like the original engine.
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
      // Wait until the actual day-of-month target before rolling, so a chore
      // due on the 15th doesn't reset on the 1st.
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
      // unit === 'weeks' (multi-day-of-week, multi-occurrence per cycle).
      if (!isChoreDueOn(chore, now)) return null;
      if (lastDay && lastDay >= todayDayKey) return null;
      return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
    }
    default:
      return null;
  }
}

/**
 * Resolves the next assignee for a chore given a deterministic sorted member
 * list and the cadence shift. Falls back to the first member if the current
 * assignee has left the house.
 */
function nextAssignee(
  currentAssignee: string,
  sortedMembers: string[],
  cadenceShift: number
): string {
  if (sortedMembers.length === 0) return currentAssignee;
  const idx = sortedMembers.indexOf(currentAssignee);
  if (idx === -1) {
    // Current assignee no longer in house. Fall back deterministically.
    return sortedMembers[0];
  }
  const next = (idx + cadenceShift) % sortedMembers.length;
  return sortedMembers[next];
}

/**
 * Performs a guarded chore rollover for the given house.
 *
 * - Pre-fetches recurring chores OUTSIDE the transaction (Firestore JS SDK
 *   transactions don't support query reads).
 * - Inside the transaction, re-reads the house doc and short-circuits if
 *   another device already ran the rollover today (race guard via
 *   `lastRolloverDayKey` — coarser `lastRolloverWeekKey` was insufficient now
 *   that daily and multi-day custom chores need to fire on subsequent days).
 * - Per-chore `autoRotate` (gated by the house-wide `weeklyScrambleEnabled`
 *   master switch) controls assignee rotation. Even when rotation is off,
 *   orphaned assignees (member left the house) are repaired.
 *
 * Returns null when no rollover work was performed (race-guard hit, or no
 * chores were due).
 */
export async function maybeRolloverChores(
  houseId: string
): Promise<{ rolled: number; weeksAdvanced: number } | null> {
  // 1) One-shot read of all chores OUTSIDE the transaction (Firestore JS SDK
  //    transactions don't support query reads). We filter to chores that
  //    *might* roll — i.e., anything not 'once'.
  const snap = await getDocs(choresCol(houseId));
  const candidates = snap.docs
    .map((d) => ({ chore: d.data() as Chore, ref: d.ref }))
    .filter((entry) => entry.chore.recurrence !== 'once');

  const now = new Date();
  const todayDayKey = getDayKey(now);
  const currentWeekKey = getWeekKey(now);

  // 2) Transaction: read+verify the house doc, then write house + chore updates.
  const result = await runTransaction(db, async (tx) => {
    const houseSnap = await tx.get(houseDoc(houseId));
    if (!houseSnap.exists()) return null;
    const house = houseSnap.data() as House;

    // Race guard: another device already rolled today.
    if (house.lastRolloverDayKey === todayDayKey) return null;

    const memberIds = house.memberIds ?? [];
    const sortedMembers = [...memberIds].sort();
    const masterSwitchOn = house.weeklyScrambleEnabled !== false; // default ON

    let rolled = 0;
    let maxWeeksAdvanced = 0;

    for (const { chore, ref } of candidates) {
      const decision = evaluateRoll(chore, now);
      if (!decision) continue;

      const update: Record<string, unknown> = {
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        lastTriggeredKey: todayDayKey,
      };
      if (decision.bumpWeekKey) update.weekKey = currentWeekKey;

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
        // Even when not rotating, repair an orphaned assignee (member left).
        update.assignedTo = sortedMembers[0];
      }

      tx.update(ref, update);
      rolled += 1;
      if (decision.shift > maxWeeksAdvanced) maxWeeksAdvanced = decision.shift;
    }

    const nextOffset = (house.rotationOffset ?? 0) + (rolled > 0 ? 1 : 0);
    tx.update(houseDoc(houseId), {
      lastRolloverDayKey: todayDayKey,
      lastRolloverWeekKey: currentWeekKey,
      rotationOffset: nextOffset,
    });

    return { rolled, weeksAdvanced: maxWeeksAdvanced };
  });

  return result;
}
