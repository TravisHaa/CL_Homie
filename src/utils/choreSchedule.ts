import { differenceInCalendarMonths, isSameDay } from 'date-fns';

import type { Chore, CustomRecurrence } from '@/src/types';

import {
    clampDayOfMonth,
    daysBetweenKeys,
    getDayKey,
    parseDayKey,
    weekIndex,
} from './weekKey';

/**
 * Resolve a chore's cadence anchor as a local-midnight Date. Prefers the
 * timezone-stable `recurrenceAnchorKey` (a YYYY-MM-DD string written at
 * creation in device-local time); falls back to `createdAt.toDate()` for
 * legacy chores that haven't been touched by migration v4, and to `fallback`
 * (typically `now`) for the pathological case where neither is present.
 *
 * Used by `isChoreDueOn` (biweekly / custom-weeks / custom-days) and by the
 * Cloud Function's mirrored copy. Centralising it here keeps the resolution
 * rules in one place — `createdAt.toDate()` reads were the original source
 * of cross-timezone drift between the React Native client (device TZ) and
 * the Cloud Function runtime (UTC).
 */
export function resolveAnchorDate(chore: Chore, fallback: Date): Date {
  if (chore.recurrenceAnchorKey) {
    try {
      return parseDayKey(chore.recurrenceAnchorKey);
    } catch {
      // Malformed string — fall through to other sources.
    }
  }
  return chore.createdAt?.toDate?.() ?? fallback;
}

const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Whether a chore is scheduled to be active on the given day. Used by the
 * "Today" filter on the home screen and by the rollover engine to decide
 * whether a multi-occurrence custom chore should fire today.
 *
 * Note: this is purely a *schedule* check — completion state is the caller's
 * concern.
 */
export function isChoreDueOn(chore: Chore, date: Date): boolean {
  const dow = date.getDay();
  switch (chore.recurrence) {
    case 'once':
      return chore.dueAt ? isSameDay(chore.dueAt.toDate(), date) : false;
    case 'daily':
      return true;
    case 'weekly':
      return chore.dayOfWeek === dow;
    case 'monthly': {
      if (chore.dayOfMonth == null) return false;
      const target = clampDayOfMonth(date, chore.dayOfMonth);
      return date.getDate() === target;
    }
    case 'custom': {
      const cr = chore.customRecurrence;
      if (!cr || cr.count < 1) return false;
      if (cr.unit === 'days') {
        // Anchor to the chore's `recurrenceAnchorKey` (or createdAt fallback)
        // until it has fired at least once; afterwards `lastTriggeredKey`
        // takes over. Strict modulus matches "every N days starting on
        // creation" — the old `!lastTriggeredKey ? true` short-circuit fired
        // every day until the first rollover, which the user reported as a
        // bug for new chores.
        const todayKey = getDayKey(date);
        const anchorKey =
          chore.lastTriggeredKey ?? chore.recurrenceAnchorKey ?? getDayKey(resolveAnchorDate(chore, date));
        const elapsed = daysBetweenKeys(anchorKey, todayKey);
        if (elapsed < 0) return false;
        return elapsed % cr.count === 0;
      }
      // weeks
      if (!cr.daysOfWeek?.includes(dow)) return false;
      const anchor = resolveAnchorDate(chore, date);
      const cyclesSinceAnchor = weekIndex(date) - weekIndex(anchor);
      return cyclesSinceAnchor >= 0 && cyclesSinceAnchor % cr.count === 0;
    }
    default:
      return false;
  }
}

/**
 * Shape inputs that determine which days a recurring chore fires on. Mirrors
 * the optional fields on `Chore` that govern cadence, with `null`-tolerant
 * types so callers can spread a partial patch directly.
 */
export interface RecurrenceShape {
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  customRecurrence?: CustomRecurrence | null;
}

/**
 * Compute the `lastTriggeredKey` value a chore should be written with at
 * creation (or recurrence-switch) time. Returns today's day key when the
 * chore is being created on one of its own fire days — that "pre-stamp"
 * pins the seeded assignee to the current occurrence and lets the next
 * rollover rotate to the following member. Returns `null` on a non-fire
 * day, which the rollover treats as the chore's first natural advance
 * and skips rotation for (preserving the user's chosen assignee).
 *
 * Stays in lockstep with `isChoreDueOn` above — in particular monthly uses
 * the same `clampDayOfMonth` so day-31 chores created Feb 28 are correctly
 * detected as firing today.
 */
export function computeCreationLastTriggeredKey(
  recurrence: Chore['recurrence'],
  shape: RecurrenceShape,
  now: Date
): string | null {
  if (recurrence === 'once') return null;
  const todayDayKey = getDayKey(now);
  const dow = now.getDay();
  switch (recurrence) {
    case 'daily':
      // Daily fires every day, so creation day is always a fire day.
      return todayDayKey;
    case 'weekly':
      return (shape.dayOfWeek ?? null) === dow ? todayDayKey : null;
    case 'monthly': {
      if (shape.dayOfMonth == null) return null;
      // Clamp target so day-31 in Feb still maps to the last day of the
      // month — matches the schedule check in `isChoreDueOn`.
      return clampDayOfMonth(now, shape.dayOfMonth) === now.getDate()
        ? todayDayKey
        : null;
    }
    case 'custom': {
      const cr = shape.customRecurrence;
      if (!cr) return null;
      if (cr.unit === 'days') {
        // Custom-days anchors to creation day by definition.
        return todayDayKey;
      }
      return cr.daysOfWeek?.includes(dow) ? todayDayKey : null;
    }
    default:
      return null;
  }
}

/**
 * Human-readable schedule string for display in lists / detail sheets.
 */
export function recurrenceLabel(chore: Chore): string {
  switch (chore.recurrence) {
    case 'once':
      return 'One-time';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return chore.dayOfWeek != null
        ? `Every ${DAY_NAMES_LONG[chore.dayOfWeek]}`
        : 'Weekly';
    case 'monthly':
      return chore.dayOfMonth != null
        ? `Monthly on day ${chore.dayOfMonth}`
        : 'Monthly';
    case 'custom':
      return formatCustomRecurrence(chore.customRecurrence);
    default:
      return '';
  }
}

export function formatCustomRecurrence(cr: CustomRecurrence | null | undefined): string {
  if (!cr) return 'Custom';
  if (cr.unit === 'days') {
    return cr.count === 1 ? 'Every day' : `Every ${cr.count} days`;
  }
  const base = cr.count === 1 ? 'Weekly' : `Every ${cr.count} weeks`;
  if (cr.daysOfWeek && cr.daysOfWeek.length > 0) {
    const sorted = [...cr.daysOfWeek].sort();
    const days = sorted.map((d) => DAY_NAMES_SHORT[d]).join(', ');
    return `${base} on ${days}`;
  }
  return base;
}

/**
 * Months elapsed from a chore's anchor `weekKey` to `now`, used for monthly
 * cadence shifts.
 */
export function monthsElapsedSince(weekKeyMonday: Date, now: Date): number {
  return differenceInCalendarMonths(now, weekKeyMonday);
}
