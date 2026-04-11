import { getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Returns a stable week identifier like "2026-W15".
 * Used to key weekly chores for efficient querying.
 */
export function getWeekKey(date: Date = new Date()): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
