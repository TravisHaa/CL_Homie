# Homie

A mobile app for college students in shared housing. Homie replaces the group chats, spreadsheets, and sticky notes with one organized home base for your household.

---

## Features

| Feature | Description |
|---|---|
| **Chore tracker** | Weekly chores assigned to roommates, mark complete, recurring schedules |
| **Shared calendar** | Weekly view color-coded by roommate, add household events |
| **Pantry tracker** | Track food items with expiration dates, barcode scanning, shared vs. personal |
| **Shopping list** | Shared checklist grouped by category, real-time updates for all roommates |
| **Home dashboard** | Fridge-magnet style overview of today's chores, events, and expiring items |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (managed workflow) |
| Language | TypeScript |
| Navigation | Expo Router v3 (file-based) |
| Database | Firebase Firestore (real-time NoSQL) |
| Auth | Firebase Authentication |
| Global state | Zustand |
| Server state | TanStack Query (wraps Firestore `onSnapshot`) |
| Forms | react-hook-form + zod |
| Camera / barcode | expo-camera |
| Notifications | expo-notifications |

---

## Project Structure

```
Homie/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout — auth gate, QueryClient provider
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── join-house.tsx      # Enter invite code or create a new house
│   └── (tabs)/
│       ├── index.tsx           # Home dashboard
│       ├── chores.tsx
│       ├── calendar.tsx
│       ├── pantry.tsx
│       └── shopping.tsx
│
├── src/
│   ├── types/                  # TypeScript interfaces for all Firestore entities
│   ├── firebase/
│   │   ├── config.ts           # Firebase app init (reads from .env)
│   │   ├── auth.ts             # signUp, signIn, signOut helpers
│   │   └── firestore.ts        # Typed collection refs with FirestoreDataConverter
│   ├── store/
│   │   ├── authStore.ts        # Zustand: current user + loading state
│   │   └── houseStore.ts       # Zustand: house info + roommate color/name map
│   ├── hooks/                  # useAuth, useChores, useCalendarEvents, usePantry, useShoppingList
│   ├── services/               # External APIs: Google Vision, OpenAI, Google Calendar
│   ├── components/             # Shared UI and feature-specific components
│   └── utils/                  # weekKey, colors, categories, nanoid
│
└── functions/                  # Firebase Cloud Functions (Node.js)
    ├── weeklyChoreReset.ts     # Generates next week's chore docs every Sunday
    └── expirationAlerts.ts     # Checks pantry daily, sends push notifications
```

---

## Firestore Data Model

```
/users/{userId}
  email, displayName, avatarUrl, houseId, color (#hex), createdAt

/houses/{houseId}
  name, inviteCode (6-char), memberIds[], createdBy, createdAt

/houses/{houseId}/chores/{choreId}
  title, assignedTo (userId), recurrence, dayOfWeek, isCompleted,
  weekKey ("2026-W15"), createdBy, createdAt

/houses/{houseId}/events/{eventId}
  title, description, startTime, endTime, createdBy,
  color (denormalized from user), googleEventId, createdAt

/houses/{houseId}/pantryItems/{itemId}
  name, barcode, quantity, unit, expirationDate, expirationConfidence,
  isShared, ownedBy (userId), category, addedBy, createdAt

/houses/{houseId}/shoppingItems/{itemId}
  name, category, quantity, unit, isChecked, addedBy, checkedBy, createdAt

/predictions/{barcode}          ← cached GPT-4o expiration predictions
  estimatedDays, range, category, cachedAt
```

Key design decisions:
- `weekKey` on chores (e.g. `"2026-W15"`) lets you query this week's chores with a single `==` filter — no date range math needed
- `color` is copied onto events at write time so the calendar can render without a join
- `inviteCode` on houses lets anyone join with a 6-character code

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project (free Spark tier is fine)

### 2. Clone and install

```bash
git clone https://github.com/TravisHaa/CL_Homie.git
cd CL_Homie
npm install
```

### 3. Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Enable **Firestore Database** (start in test mode for development)
4. Go to Project Settings → Your apps → add a **Web app** → copy the config

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Firebase values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 5. Run the app

```bash
npx expo start --web      # browser at localhost:8081
npx expo start --ios      # requires Xcode
npx expo start --android  # requires Android Studio
```

---

## Parallel Development with Git Worktrees

Features are developed in parallel using **git worktrees** — each feature branch is checked out into its own folder so multiple Claude agents (or developers) can work simultaneously without conflicts.

```
CL/
├── Homie/            → main branch
├── Homie-chores/     → feature/chores
├── Homie-calendar/   → feature/calendar
├── Homie-pantry/     → feature/pantry
├── Homie-shopping/   → feature/shopping
└── Homie-home/       → feature/home
```

See [WORKTREES.md](./WORKTREES.md) for the full guide including how to run Claude agents in separate tmux windows, merge feature branches, and clean up worktrees when done.

---

## External APIs

| API | Purpose | Key location |
|---|---|---|
| Firebase Auth + Firestore | Auth and database | `.env` |
| Open Food Facts | Product name + category from barcode (free, no key needed) | None |
| Google Vision API | Label detection for non-barcoded items | `.env` |
| OpenAI GPT-4o | Expiration date prediction | Firebase Cloud Functions env only — never in client |
| Google Calendar | Calendar sync (Phase 2) | Firebase Cloud Functions env only |

> **Important:** OpenAI and Google Calendar secrets must only be set in Firebase Cloud Functions environment variables (`firebase functions:config:set ...`). Never put them in `.env` — they would be exposed in the app bundle.

---

## Current Status

- [x] Expo + TypeScript scaffold
- [x] Firebase config and Firestore typed collection refs
- [x] Auth screens (login, signup, join/create house)
- [x] Tab navigation with auth gate
- [x] Zustand stores (auth, house)
- [x] All TypeScript types defined
- [ ] Chores feature (`feature/chores` branch)
- [ ] Calendar feature (`feature/calendar` branch)
- [ ] Pantry feature (`feature/pantry` branch)
- [ ] Shopping list feature (`feature/shopping` branch)
- [ ] Home dashboard (`feature/home` branch)
- [ ] Firebase Cloud Functions (weekly chore reset, expiration alerts)
- [ ] Push notifications
- [ ] Google Calendar sync (Phase 2)
