import { getDocs, runTransaction } from 'firebase/firestore';

import type { Chore, House } from '@/src/types';
import { getWeekKey } from '@/src/utils/weekKey';

import { db } from './config';
import { choresCol, houseDoc } from './firestore';

/**
 * Latest schema version. Bump and add a new migration block below when adding
 * future schema changes. The transaction is idempotent — if the house is
 * already at or beyond `LATEST`, this is a no-op.
 */
export const LATEST_CHORE_SCHEMA_VERSION = 2;

/**
 * One-shot, idempotent migration of a house's chores to the new rotation
 * schema. Runs at app start (after auth) once per house. Safe to call
 * repeatedly thanks to the `choreSchemaVersion` guard inside the transaction.
 *
 * v1 changes:
 *  - 'biweekly' chores → 'custom' { count: 2, unit: 'weeks', daysOfWeek: [chore.dayOfWeek ?? 1] }.
 *  - All recurring chores get `autoRotate` seeded from `house.weeklyScrambleEnabled`.
 *  - 'once' / no-recurrence chores get `autoRotate: false`.
 *  - Backfills missing `dayOfMonth`, `customRecurrence`, `lastTriggeredKey` to null.
 *
 * v2 changes (Sun–Sat US weeks):
 *  - Re-stamps every chore's `weekKey` under the new US-week formula
 *    (`getWeekKey` now uses weekStartsOn:0, firstWeekContainsDate:1).
 *    `once` chores re-derive from `dueAt`; everything else uses `getWeekKey(now)`.
 *  - Resets `lastTriggeredKey` to null on non-`once` chores so the next
 *    rollover doesn't trip on a stale ISO-anchored day key for a Sunday-due
 *    chore whose key was already ≥ today.
 */
export async function migrateChoreSchema(houseId: string): Promise<void> {
  // Read all chores up front (Firestore JS SDK transactions can't query).
  const snap = await getDocs(choresCol(houseId));
  const entries = snap.docs.map((d) => ({ chore: d.data() as Chore, ref: d.ref }));

  // Captured once so every chore re-stamped in v2 gets the same week key.
  const now = new Date();
  const nowWeekKey = getWeekKey(now);

  await runTransaction(db, async (tx) => {
    const houseSnap = await tx.get(houseDoc(houseId));
    if (!houseSnap.exists()) return;
    const house = houseSnap.data() as House;
    const current = house.choreSchemaVersion ?? 0;
    if (current >= LATEST_CHORE_SCHEMA_VERSION) return;

    const masterDefault = house.weeklyScrambleEnabled !== false; // default ON

    for (const { chore, ref } of entries) {
      const update: Record<string, unknown> = {};

      // ---- v1 block (only runs if the house hasn't been migrated at all). --
      if (current < 1) {
        if (chore.recurrence === 'biweekly') {
          update.recurrence = 'custom';
          update.customRecurrence = {
            count: 2,
            unit: 'weeks',
            daysOfWeek: [chore.dayOfWeek ?? 1],
          };
          update.dayOfWeek = null;
        }

        // Seed autoRotate where missing.
        if (typeof chore.autoRotate !== 'boolean') {
          const isRecurring =
            chore.recurrence !== 'once' && chore.recurrence !== 'daily';
          update.autoRotate = isRecurring && masterDefault;
        }

        if (chore.dayOfMonth === undefined) update.dayOfMonth = null;
        if (chore.customRecurrence === undefined && update.customRecurrence === undefined) {
          update.customRecurrence = null;
        }
        if (chore.lastTriggeredKey === undefined) update.lastTriggeredKey = null;
      }

      // ---- v2 block: re-stamp weekKey under the US-week formula. ----------
      if (current < 2) {
        if (chore.recurrence === 'once' && chore.dueAt) {
          update.weekKey = getWeekKey(chore.dueAt.toDate());
        } else {
          update.weekKey = nowWeekKey;
          // Belt-and-suspenders: clear lastTriggeredKey on recurring chores so
          // the next rollover doesn't short-circuit on a stale day key (e.g.
          // a Sunday-due chore whose old ISO key was already ≥ today).
          if (chore.recurrence !== 'once') {
            update.lastTriggeredKey = null;
          }
        }
      }

      if (Object.keys(update).length > 0) tx.update(ref, update);
    }

    tx.update(houseDoc(houseId), {
      choreSchemaVersion: LATEST_CHORE_SCHEMA_VERSION,
    });
  });
}
