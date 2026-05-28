/**
 * Homie design tokens — single source of truth for the whole app.
 *
 * Two token generations live here, both sourced from Figma:
 *  - The original auth/onboarding keys (cream/ink/teal/terracotta/…), kept
 *    intact because every (auth) screen consumes them.
 *  - The V3 ("Post-DD") redesign group + TYPE/RADIUS/SPACING/SHADOWS, used by
 *    the app-wide redesign. Pulled from Figma variables on the V3 board
 *    (file vHSQVWWJUkFGm0cJtzjhT7): Gowun Batang headings, Albert Sans body,
 *    cream/white surfaces, espresso ink, grid-green, card/magnet shadows.
 */
export const PALETTE = {
  // ── Surfaces ──────────────────────────────────────────────
  /** Page background — warm cream ("background off white"). */
  cream: '#FCF5EE',
  /** Primary card/surface white ("Backgrounds/Primary"). */
  white: '#FFFFFF',
  /** Alternate sand surface (tinted cards). */
  sand: '#F1E6DE',
  /** Input fill — sits on the cream background. */
  field: '#FFF8F1',

  // ── Text / ink ────────────────────────────────────────────
  /** Primary text & icons — espresso brown ("dark brown"). */
  ink: '#2E0800',
  /** Secondary text — espresso @ 67% ("dark brown semi-transparent" #2E0800AB). */
  inkMuted: 'rgba(46, 8, 0, 0.67)',
  /** De-emphasized text — espresso @ 45%. */
  inkFaint: 'rgba(46, 8, 0, 0.45)',
  /** Hairline dividers / borders over cream — espresso @ 14%. */
  inkHairline: 'rgba(46, 8, 0, 0.14)',
  /** Text on teal/dark buttons. */
  onAction: '#FFFFFF',

  // ── Brand / accents ───────────────────────────────────────
  /** Primary action buttons. */
  teal: '#4D797E',
  /** Soft teal tint (selected pills, chips, dividers). */
  tealTint: '#DEEDEE',
  /** Light blue pill accent. */
  pillBlue: '#B5E2F1',
  /** Link / inline-accent text. */
  terracotta: '#E38C6E',
  /** Sparing highlight accent. */
  coral: '#FF6237',
  /** Positive accent / fresh. */
  green: '#7FC373',
  /** Grid pattern green (backgrounds). */
  gridGreen: '#D6DA80',

  // ── Status ────────────────────────────────────────────────
  /** Strong destructive/danger (V3). */
  danger: '#E00000',
  /** Expiring-soon red (pantry). */
  expiry: '#E93C3C',
  /** Validation / auth error (auth screens). */
  error: '#FF6B6B',
  /** Neutral placeholder avatar dot. */
  avatar: '#6D6D6D',
} as const;

/** expo-google-fonts family names (loaded in app/_layout.tsx). */
export const FONTS = {
  /** Gowun Batang Bold — display / headings. */
  display: 'GowunBatang_700Bold',
  bodyRegular: 'AlbertSans_400Regular',
  bodyMedium: 'AlbertSans_500Medium',
  bodySemiBold: 'AlbertSans_600SemiBold',
  bodyBold: 'AlbertSans_700Bold',
} as const;

/** Typography scale (from Figma text variables). Spread into a Text style. */
export const TYPE = {
  /** Hero / screen title — Gowun Batang Bold 32 ("Header 1"). */
  header: { fontFamily: FONTS.display, fontSize: 32, lineHeight: 38 },
  /** Section / card title — Gowun Batang Bold 24. */
  title: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 30 },
  /** Emphasis heading — Gowun Batang Bold 16 ("Body 1"). */
  heading: { fontFamily: FONTS.display, fontSize: 16, lineHeight: 20 },
  /** Body emphasis — Albert Sans Medium 14 ("Body Medium"). */
  bodyMedium: { fontFamily: FONTS.bodyMedium, fontSize: 14 },
  /** Body — Albert Sans Regular 14. */
  body: { fontFamily: FONTS.bodyRegular, fontSize: 14 },
  /** Caption — Albert Sans Regular 12 ("Small"). */
  small: { fontFamily: FONTS.bodyRegular, fontSize: 12 },
  /** Label — Albert Sans Medium 12. */
  label: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
} as const;

/** Corner radii. */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

/** Spacing scale. */
export const SPACING = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 } as const;

/** Shadow presets (from Figma effect variables); warm brown #403021. */
export const SHADOWS = {
  /** "card v1" — soft drop shadow for cards. */
  card: {
    shadowColor: '#403021',
    shadowOpacity: 0.17,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  /** "magnet v1" — tight contact shadow. */
  magnet: {
    shadowColor: '#403021',
    shadowOpacity: 0.5,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const;
