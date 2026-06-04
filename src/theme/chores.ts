/**
 * Chore subsystem theme — composite tokens that resolve to PALETTE.
 *
 * Sourced from the Figma "Chore Tracker" frame (file 5HytbjMjgLB2Gu7lSGXqk2,
 * node 794:1845). All values are derived from `src/theme/palette.ts`; nothing
 * new is introduced here. Every chore-touching component should import
 * `CHORE_THEME` instead of declaring its own `CH = { peachBg, plateBg, ... }`
 * block so the cream/espresso/teal system stays consistent.
 */
import { PALETTE } from './palette';

export const CHORE_THEME = {
  /** Screen + sheet background — warm cream. */
  bg: PALETTE.cream,
  /** Primary text / icons — espresso. */
  text: PALETTE.ink,
  /** Secondary text (assignee, labels, helper copy). */
  textMuted: PALETTE.inkMuted,
  /** De-emphasized text (completed chores, +N more). */
  textFaint: PALETTE.inkFaint,
  /** Hairline borders and dividers over cream. */
  hairline: PALETTE.inkHairline,
  /** List item / card / input fill. */
  cardBg: PALETTE.field,
  /** Primary action color — teal. Buttons, FAB, ring fill, active chips. */
  accent: PALETTE.teal,
  /** Text that sits on top of the accent (buttons, active chip text). */
  onAccent: PALETTE.onAction,
  /** Positive accent (e.g. completed check). */
  positive: PALETTE.green,
  /** Due today highlight — terracotta. */
  dueToday: PALETTE.terracotta,
  /** Overdue highlight — coral. */
  overdue: PALETTE.coral,
  /** Destructive action (delete) — reuse coral, no separate red. */
  danger: PALETTE.coral,
  /** Circular progress ring track (background arc). */
  ringTrack: PALETTE.inkHairline,
  /** Circular progress ring fill (foreground arc). */
  ringFill: PALETTE.teal,
} as const;
