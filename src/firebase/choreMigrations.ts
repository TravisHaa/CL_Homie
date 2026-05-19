import { getDocs, runTransaction } from 'firebase/firestore';

import type { Chore, House } from '@/src/types';

import { db } from './config';
import { choresCol, houseDoc } from './firestore';

/**
 * Latest schema version. Bump and add a new migration block below when adding
 * future schema changes. The transaction is idempotent — if the house is
 * already at or beyond `LATEST`, this is a no-op.
 */
export const LATEST_CHORE_SCHEMA_VERSION = 1;

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
 */
export async function migrateChoreSchema(houseId: string): Promise<void> {
  // Read all chores up front (Firestore JS SDK transactions can't query).
  const snap = await getDocs(choresCol(houseId));
  const entries = snap.docs.map((d) => ({ chore: d.data() as Chore, ref: d.ref }));

  await runTransaction(db, async (tx) => {
    const houseSnap = await tx.get(houseDoc(houseId));
    if (!houseSnap.exists()) return;
    const house = houseSnap.data() as House;
    const current = house.choreSchemaVersion ?? 0;
    if (current >= LATEST_CHORE_SCHEMA_VERSION) return;

    const masterDefault = house.weeklyScrambleEnabled !== false; // default ON

    for (const { chore, ref } of entries) {
      const update: Record<string, unknown> = {};

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

      if (Object.keys(update).length > 0) tx.update(ref, update);
    }

    tx.update(houseDoc(houseId), {
      choreSchemaVersion: LATEST_CHORE_SCHEMA_VERSION,
    });
  });
}
