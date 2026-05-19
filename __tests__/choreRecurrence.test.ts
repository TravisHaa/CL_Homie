/**
 * Regression tests for the chore-recurrence pipeline. Run with:
 *
 *   npx tsx --test __tests__/choreRecurrence.test.ts
 *
 * Uses Node's built-in `node:test` runner (no Jest dependency). The tests
 * exercise only the pure helpers in `src/utils/weekKey.ts` and
 * `src/utils/choreSchedule.ts`; Firestore I/O paths
 * (`useChores`, `functions/jobs/dailyChoreReset.ts`, `choreMigrations.ts`)
 * are covered by higher-level QA and emulator runs.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type { Chore } from '../src/types';
import { isChoreDueOn } from '../src/utils/choreSchedule';
import { getDayKey, getWeekKey, weekIndex } from '../src/utils/weekKey';

// ---------------------------------------------------------------------------
// Test helpers.
// ---------------------------------------------------------------------------

/**
 * Minimal Firestore `Timestamp` stand-in. The production Chore type imports
 * `Timestamp` from `firebase/firestore`, but the schedule helpers only call
 * `.toDate()` on it, so a tiny shim is enough to keep the tests free of any
 * firebase runtime dependency.
 */
function fakeTimestamp(date: Date): { toDate: () => Date } {
  return { toDate: () => date };
}

function makeChore(overrides: Partial<Chore>): Chore {
  return {
    id: 'test',
    title: 'test',
    assignedTo: 'alice',
    recurrence: 'weekly',
    autoRotate: false,
    dayOfWeek: null,
    dayOfMonth: null,
    customRecurrence: null,
    dueAt: null,
    isCompleted: false,
    completedAt: null,
    completedBy: null,
    weekKey: '2026-W20',
    lastTriggeredKey: null,
    recurrenceAnchorKey: null,
    createdBy: 'alice',
    // Cast through unknown because the production type expects the full
    // firebase Timestamp; the helpers only ever call `.toDate()`.
    createdAt: fakeTimestamp(new Date(2026, 4, 11)) as unknown as Chore['createdAt'],
    ...overrides,
  } as Chore;
}

// ---------------------------------------------------------------------------
// Fix 1 — weekIndex monotonicity across the ISO year boundary.
// ---------------------------------------------------------------------------

test('weekIndex is monotonic across consecutive weeks', () => {
  // 2022 ends at W52 → 2023 starts at W01. The old `isoYear*53+isoWeek`
  // formula produced a diff of (2023*53+1) - (2022*53+52) = 2, not 1.
  const dec26_2022 = new Date(2022, 11, 26); // Mon, 2022-W52
  const jan2_2023 = new Date(2023, 0, 2);    // Mon, 2023-W01
  assert.equal(weekIndex(jan2_2023) - weekIndex(dec26_2022), 1);

  // Also covers years that have 53 ISO weeks (e.g. 2020-W53 → 2021-W01).
  const dec28_2020 = new Date(2020, 11, 28); // Mon, 2020-W53
  const jan4_2021 = new Date(2021, 0, 4);    // Mon, 2021-W01
  assert.equal(weekIndex(jan4_2021) - weekIndex(dec28_2020), 1);
});

test('weekIndex difference equals the calendar week count', () => {
  const a = new Date(2026, 0, 5);   // Mon, 2026-W02
  const b = new Date(2026, 11, 28); // Mon, 2026-W53 (2026 has 53 weeks)
  // 53 - 2 = 51 weeks. (`differenceInCalendarDays / 7` gives the same
  // answer regardless of ISO-year overflow.)
  assert.equal(weekIndex(b) - weekIndex(a), 51);
});

// ---------------------------------------------------------------------------
// Fix 4 — custom-days uses strict modulus from the anchor on fresh chores.
// ---------------------------------------------------------------------------

test('custom-days: not due on every day before first fire (strict modulus from anchor)', () => {
  // "Every 3 days" anchored on May 11 2026 (Mon). Should fire May 11, 14, 17,
  // … and NOT fire on May 12 or 13. The old logic returned true every day
  // because `!lastTriggeredKey` short-circuited to "always due".
  const chore = makeChore({
    recurrence: 'custom',
    customRecurrence: { count: 3, unit: 'days' },
    recurrenceAnchorKey: '2026-05-11',
    lastTriggeredKey: null,
  });

  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 11)), true);  // anchor day
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 12)), false);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 13)), false);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 14)), true);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 15)), false);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 17)), true);
});

test('custom-days: lastTriggeredKey overrides the anchor', () => {
  // After the first fire, cadence rebases off `lastTriggeredKey` so manual
  // toggles + automated rolls stay aligned even if the chore was completed
  // off-cycle.
  const chore = makeChore({
    recurrence: 'custom',
    customRecurrence: { count: 3, unit: 'days' },
    recurrenceAnchorKey: '2026-05-11',
    lastTriggeredKey: '2026-05-15',
  });
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 16)), false);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 18)), true);
});

test('custom-days: count=1 fires every day', () => {
  const chore = makeChore({
    recurrence: 'custom',
    customRecurrence: { count: 1, unit: 'days' },
    recurrenceAnchorKey: '2026-05-11',
    lastTriggeredKey: null,
  });
  for (let d = 11; d <= 17; d++) {
    assert.equal(
      isChoreDueOn(chore, new Date(2026, 4, d)),
      true,
      `expected count=1 daily to fire on May ${d}`
    );
  }
});

// ---------------------------------------------------------------------------
// Fix 7 — custom-weeks honours `recurrenceAnchorKey` over `createdAt`.
// ---------------------------------------------------------------------------

test('custom-weeks: cadence anchored to recurrenceAnchorKey, not createdAt', () => {
  // createdAt is in a *different* ISO week than recurrenceAnchorKey to
  // demonstrate the new precedence: the anchor key wins.
  const chore = makeChore({
    recurrence: 'custom',
    customRecurrence: { count: 2, unit: 'weeks', daysOfWeek: [3] }, // Wednesdays
    // createdAt would land in 2026-W19 (Wed May 6), but the anchor pins the
    // cadence to 2026-W20 instead.
    createdAt: fakeTimestamp(new Date(2026, 4, 6)) as unknown as Chore['createdAt'],
    recurrenceAnchorKey: '2026-05-13', // Wed of 2026-W20
  });

  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 13)), true);  // anchor Wed
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 20)), false); // +1 week
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 27)), true);  // +2 weeks
  assert.equal(isChoreDueOn(chore, new Date(2026, 5, 3)), false);
  assert.equal(isChoreDueOn(chore, new Date(2026, 5, 10)), true);  // +4 weeks
});

test('custom-weeks: falls back to createdAt when recurrenceAnchorKey is missing', () => {
  // Legacy chores (pre-migration v4) only have createdAt — the resolver must
  // still produce a sensible cadence for them.
  const chore = makeChore({
    recurrence: 'custom',
    customRecurrence: { count: 2, unit: 'weeks', daysOfWeek: [3] },
    createdAt: fakeTimestamp(new Date(2026, 4, 13)) as unknown as Chore['createdAt'],
    recurrenceAnchorKey: null,
  });
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 13)), true);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 27)), true);
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 20)), false);
});

// ---------------------------------------------------------------------------
// Existing semantics that must continue to hold (guard against regression).
// ---------------------------------------------------------------------------

test('weekly: fires only on dayOfWeek', () => {
  const chore = makeChore({
    recurrence: 'weekly',
    dayOfWeek: 1, // Mondays
  });
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 11)), true);  // Mon
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 12)), false); // Tue
  assert.equal(isChoreDueOn(chore, new Date(2026, 4, 18)), true);  // Mon
});

test('monthly: dayOfMonth clamps to the last day of short months', () => {
  const chore = makeChore({
    recurrence: 'monthly',
    dayOfMonth: 31,
  });
  // February has no 31st — chore should fire on Feb 28 (2026 is not a leap year).
  assert.equal(isChoreDueOn(chore, new Date(2026, 1, 28)), true);
  assert.equal(isChoreDueOn(chore, new Date(2026, 1, 27)), false);
  // March fires on the literal 31st.
  assert.equal(isChoreDueOn(chore, new Date(2026, 2, 31)), true);
});

test('daily: always due', () => {
  const chore = makeChore({ recurrence: 'daily' });
  for (let d = 1; d <= 30; d++) {
    assert.equal(isChoreDueOn(chore, new Date(2026, 4, d)), true);
  }
});

// ---------------------------------------------------------------------------
// Smoke checks on the surrounding helpers — these are tiny but cheap to keep
// honest while we're here.
// ---------------------------------------------------------------------------

test('getDayKey and getWeekKey are stable across local time of day', () => {
  const morning = new Date(2026, 4, 11, 0, 30);
  const noon = new Date(2026, 4, 11, 12, 0);
  const evening = new Date(2026, 4, 11, 23, 59);
  assert.equal(getDayKey(morning), '2026-05-11');
  assert.equal(getDayKey(noon), '2026-05-11');
  assert.equal(getDayKey(evening), '2026-05-11');
  // Mon May 11 2026 is in ISO week 20.
  assert.equal(getWeekKey(morning), '2026-W20');
  assert.equal(getWeekKey(evening), '2026-W20');
});
