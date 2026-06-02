/**
 * Homie onboarding palette — single source of truth for the auth/onboarding flow.
 *
 * Sourced directly from Figma: file Kect2o2ssL6O19bzMzx8fr,
 * "V2 - Current › onboarding screens" (canvas node 794:1845).
 * Keeping every auth screen pointed here stops per-screen hexes from drifting
 * (which is how `#4d7580` vs `#4D797E` and the stray salmon button crept in).
 *
 * The look is deliberately NOT the generic cream + charcoal/black-button aesthetic:
 * espresso ink for text, teal for primary actions, terracotta for links.
 */
export const PALETTE = {
  /** Page background — warm cream (also baked into phoneBG.png). */
  cream: '#FCF5EE',
  /** Primary text & icons — espresso brown. */
  ink: '#2E0800',
  /** Secondary text (subtitles, helper copy) — espresso @ 67%. */
  inkMuted: 'rgba(46, 8, 0, 0.67)',
  /** De-emphasized text (muted option labels) — espresso @ 45%. */
  inkFaint: 'rgba(46, 8, 0, 0.45)',
  /** Hairline dividers / borders over cream — espresso @ 14%. */
  inkHairline: 'rgba(46, 8, 0, 0.14)',
  /** Primary action buttons. */
  teal: '#4D797E',
  /** Link / inline-accent text. */
  terracotta: '#E38C6E',
  /** Sparing highlight accent. */
  coral: '#FF6237',
  /** Positive accent. */
  green: '#7FC373',
  /** Text on teal buttons. */
  onAction: '#FFFFFF',
  /** Input fill — sits on the cream background image. */
  field: '#FFF8F1',
  /** Neutral placeholder avatar dot. */
  avatar: '#6D6D6D',
  /** Validation / auth error. */
  error: '#FF6B6B',
} as const;
