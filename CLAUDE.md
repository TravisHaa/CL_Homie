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

There are no lint or test scripts configured yet.

## Implementation Status

All core features are implemented on the `staging` branch with real Firestore integrations. `main` holds the earlier foundation (auth, routing, design system only).

| Feature | Screen | Hook | Components | Status |
|---|---|---|---|---|
| Home Dashboard | `app/(tabs)/index.tsx` | reads all 4 hooks | — | Done |
| Chores | `app/(tabs)/chores.tsx` | `useChores` | `ChoreCard`, `ChoreForm` | Done (hidden tab) |
| Calendar | `app/(tabs)/calendar.tsx` | `useCalendarEvents` | `EventCard`, `EventForm` | Done (hidden tab) |
| Pantry | `app/(tabs)/pantry.tsx` | `usePantry` | `PantryItemCard`, `AddPantryItemForm` | Done |
| Shopping | `app/(tabs)/shopping.tsx` | `useShoppingList` | `ShoppingItemRow`, `AddShoppingItemForm` | Done |
| Auth | `app/(auth)/*.tsx` | `useAuth` | — | Done |

Not yet built: Firebase Cloud Functions (weekly chore reset, expiration alerts), push notifications, barcode scanning, Google Calendar sync.

## Current State & Known Issues (as of 2026-04-14)

**Branch:** `staging` — actively being tested on `localhost:8081` via `npm run web`.

### Temporary code in place — must be cleaned up

1. **Join-house gate is commented out** in `app/_layout.tsx` (lines ~65-70). The block redirecting users without a `houseId` to `/(auth)/join-house` is commented out so login can be tested without needing a house. Restore it once auth flow is confirmed working.

2. **Debug logs are still in** `src/hooks/useAuth.ts` and `app/_layout.tsx`. These `console.log('[Auth]...')` and `console.log('[AuthGate]...')` calls should be removed once the login redirect is confirmed working.

### Auth flow investigation in progress

The login redirect was broken — after a valid sign-in, the user stayed on the login screen. Root causes found and partially fixed:
- `isLoading` could deadlock if Firestore profile snapshot threw a permission error (fixed with try/finally)
- `houseStore` was never populated after login (fixed — `useAuthListener` now subscribes to house doc + members when profile has a `houseId`)
- `Alert.alert` doesn't work on web — replaced with inline `authError` state in `login.tsx`
- The Metro dev server was disconnecting, serving stale bundles. If the app looks wrong, **hard-refresh the browser (Cmd+Shift+R)** before debugging

### What needs to happen next
1. Confirm login redirect works (user should land on home tab after signing in)
2. Test that all 4 tabs load real Firestore data once a house exists
3. Remove debug logs from `useAuth.ts` and `_layout.tsx`
4. Restore join-house gate in `_layout.tsx`
5. Merge `staging` → `main` once all tabs verified

## Architecture

### Routing (Expo Router v3 — file-based)

```
app/
  _layout.tsx          ← Root: QueryClientProvider + AuthGate
  (auth)/
    login.tsx
    signup.tsx
    join-house.tsx     ← Create or join a house via 6-char invite code
  (tabs)/
    _layout.tsx        ← Tab navigator (Home, Pantry, Shopping, Settings)
    index.tsx          ← Home dashboard ("fridge magnet" aesthetic)
    chores.tsx         ← Hidden tab (navigable from home)
    calendar.tsx       ← Hidden tab (navigable from home)
    pantry.tsx
    shopping.tsx
    settings.tsx
```

`chores` and `calendar` tabs exist as files but are hidden from the tab bar in `(tabs)/_layout.tsx` (listed in `HIDDEN`). **Do not move them to `TABS`** — they are intentionally accessed via navigation from the home dashboard sticky notes only. The nav bar must stay at exactly 4 tabs: Home, Pantry, Shopping, Settings.

### Auth Flow

`app/_layout.tsx` contains `AuthGate`, which listens to Zustand (`useAuthStore`) and redirects:
- No Firebase user → `/(auth)/login`
- Firebase user, no `houseId` on profile → `/(auth)/join-house` (**currently commented out for testing**)
- Firebase user with `houseId` → `/(tabs)`

`src/hooks/useAuth.ts` → `useAuthListener()` bootstraps all auth state:
1. `onAuthStateChanged` fires → sets `firebaseUser` in Zustand
2. Attaches `onSnapshot` to `users/{uid}` profile doc (auto-creates if missing)
3. If profile has `houseId`: also subscribes to `houses/{houseId}` doc (→ `setHouse`) and queries `users` where `houseId == profile.houseId` (→ `setMemberMap`)
4. `setIsLoading(false)` is always called in a `finally` block — even on Firestore permission errors (error callback provided to `onSnapshot`)

**Important:** `houseStore` is populated entirely by `useAuthListener` — nothing else calls `setHouse` or `setMemberMap`. All feature hooks depend on `useHouseStore(s => s.house?.id)` being non-null to enable their Firestore queries.

### State Management

Two Zustand stores:
- `src/store/authStore.ts` — `firebaseUser` (Firebase Auth object), `userProfile` (Firestore `User` doc), `isLoading`
- `src/store/houseStore.ts` — `house` (Firestore `House` doc), `memberMap` (userId → `{displayName, color, avatarUrl}`)

TanStack Query wraps Firestore `onSnapshot` listeners for feature data (chores, events, pantry, shopping).

Hook return shapes (use these exact destructured names — mismatching caused bugs before):
- `useChores()` → `{ chores, isLoading, addChore, toggleChore }`
- `useCalendarEvents()` → `{ events, isLoading, addEvent }` — also exports `NewEventInput` type
- `usePantry()` → `{ items, expiringItems, isLoading, addPantryItem, deletePantryItem }` — also exports `daysUntilExpiry(item)` util and `AddPantryItemInput` type
- `useShoppingList()` → `{ items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked }` — also exports `AddItemInput` type

Pattern for all hooks: `queryFn: () => Promise.resolve([])` seeds the cache; a `useEffect` with `onSnapshot` calls `queryClient.setQueryData` as the live update path.

### Firebase / Firestore

- `src/firebase/config.ts` — Firebase app init from `EXPO_PUBLIC_*` env vars
- `src/firebase/auth.ts` — `signUp`, `signIn`, `signOut` helpers
- `src/firebase/firestore.ts` — Typed collection refs using a generic `makeConverter<T>()` that strips `id` on write and injects `snapshot.id` on read. Always use these refs (never raw `collection(db, ...)`) to get typed documents.

Collection refs: `usersCol()`, `housesCol()`, `choresCol(houseId)`, `eventsCol(houseId)`, `pantryCol(houseId)`, `shoppingCol(houseId)`, `predictionsCol()`

### TypeScript Types

All Firestore document shapes live in `src/types/index.ts`: `User`, `House`, `Chore`, `CalendarEvent`, `PantryItem`, `ShoppingItem`, `ExpirationPrediction`.

### Firestore Data Model

```
/users/{userId}
/houses/{houseId}
/houses/{houseId}/chores/{choreId}    ← weekKey field: "2026-W15" for weekly queries
/houses/{houseId}/events/{eventId}    ← color denormalized from user at write time
/houses/{houseId}/pantryItems/{itemId}
/houses/{houseId}/shoppingItems/{itemId}
/predictions/{barcode}                ← GPT-4o expiration cache
```

### Environment Variables

Copy `.env.example` to `.env` and fill in Firebase values. All client-side vars use the `EXPO_PUBLIC_` prefix (required by Expo to expose them in the bundle).

### Parallel Feature Development (Git Worktrees)

Feature branches (`feature/chores`, `feature/calendar`, `feature/pantry`, `feature/shopping`, `feature/home`) are meant to be checked out as git worktrees in sibling directories so multiple agents can work in parallel without conflicts. See `WORKTREES.md` for setup.

### Design System

Homie uses **two distinct visual themes** applied per-screen. Never mix them — each screen belongs to exactly one theme. When building or modifying UI, identify the screen's theme first and follow its spec exclusively.

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

#### Theme B — Thermal Receipt (`chores.tsx`, `shopping.tsx`)

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

#### Global Tokens (auth, settings, modals, calendar, pantry)

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
| `index.tsx` | Fridge Magnet |
| `chores.tsx` | Thermal Receipt |
| `shopping.tsx` | Thermal Receipt |
| `calendar.tsx` | Global (neutral) |
| `pantry.tsx` | Global (neutral) |
| `settings.tsx` | Global (neutral) |
| `(auth)/*` | Global (neutral) |
