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
- Firebase user, no `houseId` on profile → `/(auth)/join-house`
- Firebase user with `houseId` → `/(tabs)`

`src/hooks/useAuth.ts` → `useAuthListener()` bootstraps all auth state. It runs `onAuthStateChanged`, then attaches a Firestore `onSnapshot` to the user's profile doc. If the profile doc doesn't exist (account created in Firebase console), it auto-creates one.

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

Background: `#FFFBF5` (warm off-white). Primary text/button: `#2D3436`. Border/input: `#DFE6E9`. Error: `#FF6B6B`. Roommate colors are sourced from `src/utils/colors.ts` (`ROOMMATE_COLORS`). All inputs use `borderWidth: 1.5`, `borderRadius: 12`, `padding: 14`. All buttons use `backgroundColor: '#2D3436'`, `borderRadius: 12`, `padding: 16`.
