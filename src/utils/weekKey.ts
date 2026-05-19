import {
    differenceInCalendarDays,
    differenceInCalendarMonths,
    format,
    getDaysInMonth,
    getISOWeek,
    getISOWeekYear,
    nextMonday,
    setISOWeek,
    setISOWeekYear,
    startOfISOWeek,
} from 'date-fns';

/**
 * Returns a stable ISO-week identifier like "2026-W15" (weeks run Mon–Sun).
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
  // Anchor on a date guaranteed to be inside the target ISO-week-year, then set week.
  const anchor = setISOWeekYear(new Date(year, 5, 1), year);
  const inWeek = setISOWeek(anchor, week);
  return startOfISOWeek(inWeek);
}

/**
 * Signed ISO-week difference: b - a. Same week → 0.
 */
export function weeksBetween(a: string, b: string): number {
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

/**
 * Stable day identifier in device-local time, like "2026-05-04".
 * Used as the per-day rollover race-guard and for daily/custom-multi-day chores.
 */
export function getDayKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Signed day difference: b - a. Same day → 0.
 */
export function daysBetweenKeys(a: string, b: string): number {
  return differenceInCalendarDays(parseDayKey(b), parseDayKey(a));
}

/**
 * Parses a day key like "2026-05-04" into a local-midnight Date.
 */
export function parseDayKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid day key: ${key}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Monotonic ISO-week index (true week count). Lets us compare two dates by
 * ISO-week regardless of year boundaries. Defined as the number of full ISO
 * weeks (Mon-start) between `date` and a fixed epoch Monday. The previous
 * `isoYear * 53 + isoWeek` formula was not monotonic across ISO years that
 * end at week 52 (e.g. 2022-W52 → 2023-W01 produced a diff of 2 instead of
 * 1), which corrupted the biweekly / custom-weeks cadence modulus in
 * `isChoreDueOn`.
 */
const WEEK_INDEX_EPOCH = new Date(1970, 0, 5); // 1970-01-05 was a Monday (local).
export function weekIndex(date: Date): number {
  return Math.round(
    differenceInCalendarDays(startOfISOWeek(date), WEEK_INDEX_EPOCH) / 7
  );
}

/**
 * Clamp a target day-of-month to the actual length of the month containing
 * `reference`. e.g. dayOfMonth=31 in February → 28 or 29.
 */
export function clampDayOfMonth(reference: Date, dayOfMonth: number): number {
  const max = getDaysInMonth(reference);
  return Math.min(Math.max(1, dayOfMonth), max);
}
