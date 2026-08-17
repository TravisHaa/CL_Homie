# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (opens QR code for Expo Go or press w for web)
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

There are no lint or test scripts configured for the Expo app.

### Cloud Functions (`functions/`)

The Firebase Cloud Functions package is separate from the Expo app and has its own `package.json`:

```bash
cd functions
npm run build        # tsc
npm run build:watch
npm run serve         # build + firebase emulators:start --only functions,firestore
npm run shell         # build + firebase functions:shell
npm run deploy        # firebase deploy --only functions
npm run logs
```

**Known issue:** `functions/src/index.ts` re-exports `weeklyChoreReset` from `../jobs/weeklyChoreReset`, but the actual job file is `functions/jobs/dailyChoreReset.ts` and exports `dailyChoreReset`. This import is currently broken — `npm run build` in `functions/` will fail until the export name/path is fixed. Check this before assuming the scheduled chore-reset function deploys as-is.

## Implementation Status

All core features are implemented on `main`/`DemoReady` with real Firestore integrations. Feature set has grown well beyond the original four screens — chores, calendar, pantry, and shopping now share the app with house management, a noticeboard, account settings, and a rotation-schedule screen.

| Feature | Screen(s) | Hook | Status |
|---|---|---|---|
| Home Dashboard | `app/(tabs)/index.tsx` | reads all feature hooks | Done |
| Chores | `app/(tabs)/chores.tsx`, `app/rotation.tsx` | `useChores` | Done (hidden tab) |
| Calendar | `app/(tabs)/calendar.tsx` | `useCalendarEvents`, `useGoogleCalendar` | Done (visible tab) |
| Pantry | `app/(tabs)/pantry.tsx` | `usePantry` | Done, incl. barcode scanning (`BarcodeScannerModal`) |
| Shopping | `app/(tabs)/shopping.tsx` | `useShoppingList` | Done |
| House management | `app/(tabs)/house.tsx`, `app/(auth)/{home-choice,create-house,join-house,home-status}.tsx` | `useHouseStore`, `src/firebase/house.ts` | Done — create/join/switch/leave |
| Noticeboard | `app/(tabs)/noticeboard.tsx` | local state (not yet wired to Firestore) | UI built, no persistence hook |
| My Account | `app/(tabs)/myaccount.tsx` | `useAuthStore`, avatar upload via Firebase Storage | Done |
| Settings | `app/(tabs)/settings.tsx` | `useAuthStore`, `useHouseStore`, `leaveHouse` | Done |
| Auth | `app/(auth)/*.tsx` | `useAuth` | Done — includes password reset flow |
| Push notifications | `src/hooks/useNotifications.ts`, `src/utils/pushNotifications.ts` | — | Done (device push tokens in `users/{uid}/devices`) |
| Cloud Functions | `functions/jobs/dailyChoreReset.ts`, `functions/src/google-oauth.ts` | — | Implemented, but see the broken `index.ts` export noted above |
| Google Calendar sync | `src/hooks/useGoogleCalendar.ts`, `src/utils/calendarSync.ts`, `functions/src/google-oauth.ts` | — | Implemented (OAuth token exchange lives server-side in Cloud Functions) |

`app/(tabs)/two.tsx` is leftover Expo Router template scaffolding (unused "Tab Two" demo screen) — not part of the product, safe to ignore or remove.

## Architecture

### Routing (Expo Router v6 — file-based)

```
app/
  _layout.tsx           ← Root: fonts, QueryClientProvider, BottomSheetModalProvider, AuthGate
  modal.tsx              ← Global modal route
  rotation.tsx            ← Chore rotation schedule screen (top-level route, not a tab)
  (auth)/
    login.tsx
    signup.tsx
    forgot-password.tsx
    reset-code.tsx
    reset-password.tsx
    setup-account.tsx
    home-choice.tsx      ← Landing point for users with no house: choose create vs. join
    create-house.tsx
    join-house.tsx        ← Join a house via 6-char invite code
    home-status.tsx        ← Confirmation screen, also reachable by members switching houses
  (tabs)/
    _layout.tsx          ← Tab navigator
    index.tsx             ← Home dashboard ("fridge magnet" aesthetic) — visible
    calendar.tsx           ← visible
    pantry.tsx             ← visible
    shopping.tsx            ← visible
    chores.tsx              ← hidden, reached from home dashboard sticky notes
    house.tsx                ← hidden, house switch/invite-code management
    settings.tsx               ← hidden
    noticeboard.tsx             ← hidden
    myaccount.tsx                 ← hidden
    two.tsx                       ← hidden, unused template scaffold
```

`(tabs)/_layout.tsx` defines a `TABS` array (Home, Calendar, Pantry, Shopping — exactly 4 tabs shown in the bar) and a `HIDDEN` array (`chores`, `two`, `house`, `settings`, `noticeboard`, `myaccount`) rendered as `href: null` screens so they exist as routes but never appear in the tab bar. **When adding a new hidden screen, add its route name to `HIDDEN`, not `TABS`** — the nav bar must stay at exactly 4 tabs.

### Auth Flow

`app/_layout.tsx` contains `AuthGate`, which listens to Zustand (`useAuthStore`) and redirects:
- No Firebase user → `/(auth)/signup`
- Firebase user, no `houseId` on profile → `/(auth)/home-choice` (unless already on one of the house-setup screens: `home-choice`, `join-house`, `create-house`, `home-status`)
- Firebase user with `houseId` → `/(tabs)` (unless on `home-status`, `create-house`, or `join-house` — these stay reachable for house switching, e.g. from the house tab or settings)

`AuthGate` also runs a one-shot chore schema migration (`migrateChoreSchema`, keyed by `houseId` via a ref so it only runs once per house per session) — the actual weekly/nightly chore rollover is owned by the scheduled Cloud Function, not the client.

`src/hooks/useAuth.ts` → `useAuthListener()` bootstraps all auth state:
1. `onAuthStateChanged` fires → sets `firebaseUser` in Zustand
2. Attaches `onSnapshot` to `users/{uid}` profile doc (auto-creates if missing)
3. If profile has `houseId`: also subscribes to `houses/{houseId}` doc (→ `setHouse`) and queries `users` where `houseId == profile.houseId` (→ `setMemberMap`)
4. If `houseId` is cleared (leave/switch house), tears down the house/member listeners and wipes `houseStore` so stale data can't leak back in via a delayed snapshot
5. `setIsLoading(false)` is always called in a `finally` block — even on Firestore permission errors (error callbacks are wired on every `onSnapshot`)

`useAuth.ts` still has `console.log('[Auth] ...')` calls throughout — useful for debugging the listener chain, but noisy; be aware they exist rather than assuming missing logs mean a step didn't run.

**Important:** `houseStore` is populated entirely by `useAuthListener` — nothing else calls `setHouse` or `setMemberMap` directly except `src/firebase/house.ts` helpers that mutate Firestore (which then flow back through the listener). All feature hooks depend on `useHouseStore(s => s.house?.id)` being non-null to enable their Firestore queries.

### State Management

Two Zustand stores:
- `src/store/authStore.ts` — `firebaseUser` (Firebase Auth object), `userProfile` (Firestore `User` doc), `isLoading`
- `src/store/houseStore.ts` — `house` (Firestore `House` doc), `memberMap` (userId → `{displayName, color, avatarUrl}`)

TanStack Query wraps Firestore `onSnapshot` listeners for feature data (chores, events, pantry, shopping). Pattern for all hooks: `queryFn: () => Promise.resolve([])` seeds the cache; a `useEffect` with `onSnapshot` calls `queryClient.setQueryData` as the live update path.

Hook return shapes (use these exact destructured names — mismatching caused bugs before):
- `useChores()` → `{ chores, isLoading, addChore, toggleChore, updateChore, deleteChore }`
- `useCalendarEvents()` → `{ events, isLoading, addEvent, updateEvent }` — also exports `NewEventInput` type
- `usePantry()` → `{ items, expiringItems, isLoading, addPantryItem, updatePantryItem, deletePantryItem }` — also exports `daysUntilExpiry(item)` util and `AddPantryItemInput` type
- `useShoppingList()` → `{ items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked, deleteShoppingItem, updateShoppingItem }` — also exports `AddItemInput` type
- `useGoogleCalendar()` — manages OAuth linking + sync state for Google Calendar; token exchange happens server-side via the `exchangeGoogleAuthCode` Cloud Function, never in the client
- `useNotificationsRegistration()` (`src/hooks/useNotifications.ts`) — registers the device's Expo push token into `users/{uid}/devices/{deviceId}` on mount, called once from `AuthGate`

### Firebase / Firestore

- `src/firebase/config.ts` — Firebase app init from `EXPO_PUBLIC_*` env vars
- `src/firebase/auth.ts` — `signUp`, `signIn`, `signOut` helpers
- `src/firebase/firestore.ts` — Typed collection refs using a generic `makeConverter<T>()` that strips `id` on write and injects `snapshot.id` on read. Always use these refs (never raw `collection(db, ...)`) to get typed documents.
- `src/firebase/house.ts` — house lifecycle helpers: `joinHouseByInviteCode`, `leaveHouse`, `setMemberOrder` (roommate rotation order), `setWeeklyScrambleEnabled`
- `src/firebase/choreMigrations.ts` — `migrateChoreSchema(houseId)`, versioned against `LATEST_CHORE_SCHEMA_VERSION` (currently `4`); run once per house on login, not on every chore write

Collection refs: `usersCol()`, `housesCol()`, `choresCol(houseId)`, `eventsCol(houseId)`, `pantryCol(houseId)`, `shoppingCol(houseId)`, `predictionsCol()`, `devicesCol(userId)` / `deviceDoc(userId, deviceId)`

### TypeScript Types

All Firestore document shapes live in `src/types/index.ts`: `User`, `House`, `Chore` (+ `ChoreRecurrence`, `CustomRecurrence`), `CalendarEvent`, `PantryItem` (+ `ExpirationConfidence`), `ShoppingItem`, `DeviceToken` (+ `DevicePlatform`), `ExpirationPrediction`.

### Firestore Data Model

```
/users/{userId}
/users/{userId}/devices/{deviceId}    ← Expo push tokens, one per device
/houses/{houseId}
/houses/{houseId}/chores/{choreId}    ← weekKey field: "2026-W15" for weekly queries
/houses/{houseId}/events/{eventId}    ← color denormalized from user at write time
/houses/{houseId}/pantryItems/{itemId}
/houses/{houseId}/shoppingItems/{itemId}
/predictions/{barcode}                ← GPT-4o expiration cache
```

### Environment Variables

Copy `.env.example` to `.env` and fill in Firebase values. All client-side vars use the `EXPO_PUBLIC_` prefix (required by Expo to expose them in the bundle). OpenAI and Google Calendar client-secret keys must only ever be set in the Cloud Functions environment (`firebase functions:config:set ...`), never in `.env` — see `.env.example` for the full list including `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` (barcode/label lookups) and `EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID`.

### Parallel Feature Development (Git Worktrees)

There are many long-lived remote feature branches (`feature/*`, `fix/*`) beyond the ones originally scaffolded for parallel worktree development — check `git branch -a` before assuming a feature is unbuilt; it may already exist on an unmerged branch.

### Design System

Homie uses **two distinct visual themes** applied per-screen, plus a third specifically for the chore subsystem. Never mix them — each screen belongs to exactly one theme. When building or modifying UI, identify the screen's theme first and follow its spec exclusively.

---

#### Theme A — Fridge Magnet (`index.tsx` only)

The home screen is a refrigerator door. The user has implemented a detailed version of this — read `index.tsx` directly for the full implementation rather than guessing from this spec. Key components defined in the file:

- `<Note tilt color bg showMarginLine foldCorner>` — paper note card with a colored top strip, `<Magnet>` overlapping the strip, subtle ruled lines, optional red margin line, optional folded corner
- `<Magnet color>` — circular magnet with shine arc and center dimple
- `<LetterTile char color rotate nudgeTop>` — plastic letter tile (decorative "HOMIE" row)
- `<EmojiMagnet emoji color rotate size>` — round emoji magnet (decorative)

**Color tokens (from the `C` const in `index.tsx`)**
```
fridgeBg:     '#CECCCA'   // fridge door
noteCream:    '#FFFEF2'   // primary note paper
noteAlt:      '#FFF8E6'   // alternate note paper
noteText:     '#2A2A27'
noteMeta:     '#7A7670'
noteLabel:    '#B0ACA8'
noteLines:    '#EDE8DE'   // ruled lines
noteMargin:   '#F5C0B8'   // red margin line
magnetPurple: '#6C5CE7'
magnetYellow: '#F9A825'
magnetCoral:  '#E17055'
magnetMint:   '#00B894'
progressBg:   '#E8E4DC'
```

**Tilt variants:** `'left'` (-1.8deg), `'right'` (2.4deg), `'mild'` (0.8deg), `'steep'` (-3deg)

**Layout rules**
- `borderRadius: 4` max — paper corners, never rounded UI corners
- Each `<Note>` has a colored top strip + `<Magnet>` overlapping it at the top center
- Decorative "HOMIE" letter tiles row sits between the header and the notes

---

#### Theme B — Thermal Receipt (`shopping.tsx`)

> **Note:** `chores.tsx` was previously also a Thermal Receipt screen. As of the Figma redesign it lives on its own — see "Theme C — Chore Tracker" below.

These screens look like a printed receipt from a thermal printer. Off-white paper, monospace type, dashed separators, items laid out as receipt line items (name left, value right). Think deli counter or grocery checkout tape.

**Color tokens**
```
RECEIPT_BG       #FAFAF7   // thermal paper — very slightly warm white
RECEIPT_CARD_BG  #FFFFFF
RECEIPT_BORDER   #E8E8E4
RECEIPT_DASHED   #CCCCBB   // dashed divider color
RECEIPT_TEXT     #1A1A1A   // header / store name
RECEIPT_BODY     #2D2D2D   // line items
RECEIPT_MUTE     #999990   // quantities, meta, dates
RECEIPT_DONE_BG  #F5F5F0
RECEIPT_DONE_TXT #AAAAAA
```

**Typography** — SpaceMono is already loaded in `_layout.tsx`, use it here
- Screen header: `fontSize: 18, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase'`
- Date/sub-header: `fontSize: 11, letterSpacing: 1.5, color: RECEIPT_MUTE, textTransform: 'uppercase'`
- Line item name: `fontSize: 14, fontWeight: '600', fontFamily: 'SpaceMono'`
- Line item value: `fontSize: 14, fontFamily: 'SpaceMono'`
- Section total: `fontSize: 15, fontWeight: '800', fontFamily: 'SpaceMono'`

**Dividers**
```ts
// Between sections
dashedDivider: {
  borderBottomWidth: 1,
  borderBottomColor: '#CCCCBB',
  borderStyle: 'dashed',
  marginVertical: 12,
}
// Within a section
thinRule: { height: 1, backgroundColor: '#E8E8E4', marginVertical: 8 }
```

**Line item layout** (dot-leader implied by space-between)
```tsx
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
  <Text style={lineItemName}>{item.title}</Text>
  <Text style={lineItemValue}>{status}</Text>
</View>
// Completed: textDecorationLine: 'line-through', color: RECEIPT_DONE_TXT
```

**Section header** (category label)
```ts
{ fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#999990', textTransform: 'uppercase', paddingVertical: 6 }
```

**Receipt container**
```ts
{
  backgroundColor: '#FAFAF7',
  marginHorizontal: 16, marginVertical: 8,
  borderRadius: 2,          // thermal paper — nearly zero rounding
  padding: 16,
  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
}
```

**Bottom of receipt** — each receipt section ends with a dashed divider + summary line (e.g. `3/6 DONE` or `4 ITEMS LEFT`) in SpaceMono. Optionally add a decorative barcode strip (alternating thin/thick `View` strips, purely decorative).

---

#### Theme C — Chore Tracker (`chores.tsx`, `rotation.tsx`, chore bottom sheets, home chore widget)

The chores subsystem matches the Figma "Chore Tracker" frame (file `5HytbjMjgLB2Gu7lSGXqk2`, node `794:1845`). Cream surfaces, espresso ink, teal as the single primary accent. Centerpiece is a circular completion dial showing `{pct}%` for the week.

**Tokens** — never declare local `CH = { ... }` blocks in chore files. Always import:

```ts
import { CHORE_THEME } from '@/src/theme/chores';
// CHORE_THEME.bg / .text / .textMuted / .textFaint / .hairline
// .cardBg / .accent / .onAccent / .ringTrack / .ringFill
// .dueToday / .overdue / .danger (all derived from PALETTE)
```

`CHORE_THEME` resolves to the values in `src/theme/palette.ts` (cream `#FCF5EE`, espresso `#2E0800`, teal `#4D797E`, terracotta `#E38C6E`, coral `#FF6237`). `PALETTE` doubles as the source of truth for the `(auth)` onboarding flow too — nothing in either theme is hand-picked per screen.

**Centerpiece** — `src/components/chores/ProgressRing.tsx`. Pure-RN (no `react-native-svg` dep), implemented with two rotating half-discs over a track + an inner punch-out. Props: `size`, `stroke`, `progress`, `trackColor?`, `fillColor?`, `centerColor?`, `children`. `centerColor` MUST match whatever sits behind the ring (cream on the chores tab, `noteCream` on the home magnet note) or you'll see a colored disc in the middle.

**Layout rules**
- `borderRadius: 14` for cards and buttons; pill-radius 999 is banned for chore UI (drop it during any future edits).
- Day-of-week chips and the day-of-month grid: idle = `cardBg` + `hairline` border, active = filled `accent` + `onAccent` text.
- FAB on the chores tab: 44pt, filled `accent`, white `+`.
- Done chores: `textDecorationLine: 'line-through'` + `color: textFaint`. The check button is a 22pt circle, idle hairline border, done filled teal with a white checkmark.

**Files in this theme**
- `app/(tabs)/chores.tsx` — header, ProgressRing dial, member avatar row, FlatList
- `app/rotation.tsx` — rotation schedule screen, uses `RotationCard` and `useChores`
- `src/components/chores/{ChoreCard, ChoreForm, ChoreDetailSheet, ChoresEmptyState, AssignmentTile, RecurrenceDropdown, MonthDayPicker, ProgressRing}.tsx`
- `src/components/settings/RotationCard.tsx`
- The chore "Note" widget on `app/(tabs)/index.tsx` (Fridge Magnet wrapper stays; only the inner progress bar was swapped for a 56pt teal ProgressRing).

---

#### Global Tokens (auth, settings, house, myaccount, calendar, pantry)

```
APP_BG         #FFFBF5   // warm off-white
TEXT_PRIMARY   #2D3436
TEXT_SECONDARY #636e72
BORDER         #DFE6E9
ERROR          #FF6B6B
```

```ts
// All form inputs
input: { borderWidth: 1.5, borderRadius: 12, borderColor: '#DFE6E9', padding: 14, backgroundColor: '#fff' }

// Primary action buttons
primaryButton: { backgroundColor: '#2D3436', borderRadius: 12, padding: 16 }

// Tab bar
tabBar: { backgroundColor: '#FFFBF5', borderTopWidth: 0, shadowOpacity: 0 }
```

**Roommate colors** — sourced from `src/utils/colors.ts` (`ROOMMATE_COLORS`). Used for chore assignment dots, calendar event colors, and member avatars. Never hardcode a user color — always read from `memberMap[userId].color`.

---

#### Screen → Theme reference

| Screen | Theme |
|---|---|
| `index.tsx` | Fridge Magnet (chore widget restyled with `ProgressRing` from Theme C) |
| `chores.tsx`, `rotation.tsx` | Chore Tracker |
| `shopping.tsx` | Thermal Receipt |
| `calendar.tsx`, `pantry.tsx` | Global (neutral) |
| `house.tsx`, `settings.tsx`, `myaccount.tsx` | Global (neutral) |
| `noticeboard.tsx` | Custom (grid background + Figma header SVG; not yet mapped to a documented theme) |
| `(auth)/*` | Global (neutral), onboarding screens sourced from `PALETTE` |
