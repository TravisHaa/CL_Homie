import { getDocs, runTransaction } from 'firebase/firestore';

import type { Chore, House } from '@/src/types';
import { getWeekKey, isoWeeksBetween, monthsBetween } from '@/src/utils/weekKey';

import { db } from './config';
import { choresCol, houseDoc } from './firestore';

/**
 * Computes how many rotation steps a chore should advance, based on its
 * recurrence and the elapsed time since its last weekKey.
 *
 * Returns 0 when the chore should NOT roll this run.
 */
function computeCadenceShift(chore: Chore, currentKey: string): number {
  if (chore.recurrence === 'once') return 0;

  // If a chore has no/invalid weekKey for some reason, treat it as needing a
  // single roll so it joins this week's listing rather than silently lingering.
  let weeksElapsed: number;
  try {
    weeksElapsed = isoWeeksBetween(chore.weekKey, currentKey);
  } catch {
    return 1;
  }
  if (weeksElapsed <= 0) return 0;

  switch (chore.recurrence) {
    case 'weekly':
      return weeksElapsed;
    case 'biweekly':
      return weeksElapsed >= 2 ? Math.floor(weeksElapsed / 2) : 0;
    case 'monthly': {
      let monthsElapsed: number;
      try {
        monthsElapsed = monthsBetween(chore.weekKey, currentKey);
      } catch {
        return 0;
      }
      return monthsElapsed >= 1 ? monthsElapsed : 0;
    }
    default:
      return 0;
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
 * Performs a guarded weekly chore rollover for the given house.
 *
 * - Pre-fetches recurring chores OUTSIDE the transaction (Firestore JS SDK
 *   transactions don't support query reads).
 * - Inside the transaction, re-reads the house doc and short-circuits if
 *   another device already rolled this week (race guard via lastRolloverWeekKey).
 * - When weeklyScrambleEnabled is on and there's >1 member, rotates assignees
 *   deterministically using a lexicographic sort of memberIds.
 *
 * Returns null when no rollover work was performed (e.g., race-guard hit, or
 * no recurring chores need rolling).
 *
 * NOTE: Firestore caps a transaction at 500 writes. With 1 house doc + N chore
 * updates, the practical limit is ~499 chores per house — far above realistic
 * usage. We do not chunk in v1.
 */
export async function maybeRolloverChores(
  houseId: string
): Promise<{ rolled: number; weeksAdvanced: number } | null> {
  // 1) One-shot read of recurring chores OUTSIDE the transaction.
  // We keep the doc refs alongside the parsed data so the transaction can
  // update them directly without an O(N) lookup per chore.
  const snap = await getDocs(choresCol(houseId));
  const recurring = snap.docs
    .map((d) => ({ chore: d.data() as Chore, ref: d.ref }))
    .filter((entry) => entry.chore.recurrence !== 'once');

  // 2) Transaction: read+verify the house doc, then write house + chore updates.
  const result = await runTransaction(db, async (tx) => {
    const houseSnap = await tx.get(houseDoc(houseId));
    if (!houseSnap.exists()) return null;
    const house = houseSnap.data() as House;

    const currentKey = getWeekKey();

    // Race guard: another device already rolled this week.
    if (house.lastRolloverWeekKey === currentKey) return null;

    const memberIds = house.memberIds ?? [];
    const sortedMembers = [...memberIds].sort();
    const scramble = !!house.weeklyScrambleEnabled && sortedMembers.length > 1;

    let rolled = 0;
    let maxWeeksAdvanced = 0;

    for (const { chore, ref } of recurring) {
      const shift = computeCadenceShift(chore, currentKey);
      if (shift <= 0) continue;

      const update: Record<string, unknown> = {
        weekKey: currentKey,
        isCompleted: false,
        completedAt: null,
        completedBy: null,
      };

      if (scramble) {
        update.assignedTo = nextAssignee(chore.assignedTo, sortedMembers, shift);
      } else if (sortedMembers.length > 0 && !sortedMembers.includes(chore.assignedTo)) {
        // Even with scramble off, repair an orphaned assignee.
        update.assignedTo = sortedMembers[0];
      }

      tx.update(ref, update);
      rolled += 1;
      if (shift > maxWeeksAdvanced) maxWeeksAdvanced = shift;
    }

    const nextOffset = (house.rotationOffset ?? 0) + 1;
    tx.update(houseDoc(houseId), {
      lastRolloverWeekKey: currentKey,
      rotationOffset: nextOffset,
    });

    return { rolled, weeksAdvanced: maxWeeksAdvanced };
  });

  return result;
}
