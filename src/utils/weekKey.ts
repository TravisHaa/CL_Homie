import {
    differenceInCalendarDays,
    differenceInCalendarMonths,
    format,
    getDaysInMonth,
    getWeek,
    getWeekYear,
    nextSunday,
    setWeek,
    setWeekYear,
    startOfWeek,
} from 'date-fns';

// US-week options: weeks start on Sunday; week 1 is the week that contains
// Jan 1 (firstWeekContainsDate: 1). Centralised so every helper here computes
// keys against the exact same convention.
const US_WEEK_OPTS = { weekStartsOn: 0, firstWeekContainsDate: 1 } as const;

/**
 * Returns a stable US-week identifier like "2026-W15" (weeks run Sun–Sat).
 * Used to key weekly chores for efficient querying.
 */
export function getWeekKey(date: Date = new Date()): string {
  const week = getWeek(date, US_WEEK_OPTS);
  const year = getWeekYear(date, US_WEEK_OPTS);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Parses a week key like "2026-W15" into the Sunday (00:00 local) of that US week.
 * Throws if the input is not a well-formed week key.
 */
export function parseWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (!match) throw new Error(`Invalid week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  // Anchor on a date guaranteed to be inside the target US-week-year, then set week.
  const anchor = setWeekYear(new Date(year, 5, 1), year, US_WEEK_OPTS);
  const inWeek = setWeek(anchor, week, US_WEEK_OPTS);
  return startOfWeek(inWeek, US_WEEK_OPTS);
}

/**
 * Signed US-week difference: b - a. Same week → 0.
 */
export function weeksBetween(a: string, b: string): number {
  const aSun = parseWeekKey(a);
  const bSun = parseWeekKey(b);
  return Math.round(differenceInCalendarDays(bSun, aSun) / 7);
}

/**
 * Signed calendar-month difference between the Sundays of two week keys: b - a.
 */
export function monthsBetween(a: string, b: string): number {
  return differenceInCalendarMonths(parseWeekKey(b), parseWeekKey(a));
}

/**
 * The next Sunday strictly after `from`. If `from` is itself a Sunday,
 * returns the following Sunday (consistent with date-fns `nextSunday`).
 */
export function nextSundayDate(from: Date = new Date()): Date {
  return nextSunday(from);
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
 * Monotonic US-week index (US-week-year * 54 + week). Lets us compare two
 * dates by US-week regardless of year boundaries. Multiplier 54 (vs the
 * intuitive 53) safely covers the rare years that contain a 53rd US week.
 */
export function weekIndex(date: Date): number {
  return getWeekYear(date, US_WEEK_OPTS) * 54 + getWeek(date, US_WEEK_OPTS);
}

/**
 * Clamp a target day-of-month to the actual length of the month containing
 * `reference`. e.g. dayOfMonth=31 in February → 28 or 29.
 */
export function clampDayOfMonth(reference: Date, dayOfMonth: number): number {
  const max = getDaysInMonth(reference);
  return Math.min(Math.max(1, dayOfMonth), max);
}
