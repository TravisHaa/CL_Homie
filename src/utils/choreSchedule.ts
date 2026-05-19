import { differenceInCalendarMonths, isSameDay } from 'date-fns';

import type { Chore, CustomRecurrence } from '@/src/types';

import {
    clampDayOfMonth,
    daysBetweenKeys,
    getDayKey,
    isoWeekIndex,
} from './weekKey';

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
    case 'biweekly': {
      if (chore.dayOfWeek !== dow) return false;
      const anchor = chore.createdAt?.toDate?.() ?? date;
      const cyclesSinceAnchor = isoWeekIndex(date) - isoWeekIndex(anchor);
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
      // weeks
      if (!cr.daysOfWeek?.includes(dow)) return false;
      const anchor = chore.createdAt?.toDate?.() ?? date;
      const cyclesSinceAnchor = isoWeekIndex(date) - isoWeekIndex(anchor);
      return cyclesSinceAnchor >= 0 && cyclesSinceAnchor % cr.count === 0;
    }
    default:
      return false;
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
    case 'biweekly':
      return chore.dayOfWeek != null
        ? `Every other ${DAY_NAMES_LONG[chore.dayOfWeek]}`
        : 'Every 2 weeks';
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
