import {
    differenceInCalendarDays,
    differenceInCalendarMonths,
    getISOWeek,
    getISOWeekYear,
    nextMonday,
    setISOWeek,
    setISOWeekYear,
    startOfISOWeek,
} from 'date-fns';

/**
 * Returns a stable week identifier like "2026-W15".
 * Used to key weekly chores for efficient querying.
 */
export function getWeekKey(date: Date = new Date()): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Parses a week key like "2026-W15" into the Monday (00:00 local) of that ISO week.
 * Throws if the input is not a well-formed week key.
 */
export function parseWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  // Anchor on a date guaranteed to be inside the target ISO year, then set week.
  const anchor = setISOWeekYear(new Date(year, 5, 1), year);
  const inWeek = setISOWeek(anchor, week);
  return startOfISOWeek(inWeek);
}

/**
 * Signed ISO-week difference: b - a. Same week → 0.
 */
export function isoWeeksBetween(a: string, b: string): number {
  const aMon = parseWeekKey(a);
  const bMon = parseWeekKey(b);
  return Math.round(differenceInCalendarDays(bMon, aMon) / 7);
}

/**
 * Signed calendar-month difference between the Mondays of two week keys: b - a.
 */
export function monthsBetween(a: string, b: string): number {
  return differenceInCalendarMonths(parseWeekKey(b), parseWeekKey(a));
}

/**
 * The next Monday strictly after `from`. If `from` is itself a Monday,
 * returns the following Monday (consistent with date-fns `nextMonday`).
 */
export function nextMondayDate(from: Date = new Date()): Date {
  return nextMonday(from);
}
