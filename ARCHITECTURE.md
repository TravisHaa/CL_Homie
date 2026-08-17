# Architecture

This document describes what's actually in the repository as of the `DemoReady` branch, verified by reading the source. Where I couldn't verify behavior (didn't run the app, didn't trace every code path), I've said so explicitly rather than guessing.

## 1. What the product does

Homie (`package.json` name: `"homie"`) is a mobile app, built with Expo/React Native, for college students in shared housing. Per `README.md`, it replaces group chats/spreadsheets/sticky notes with one shared household hub. The five feature areas, all backed by a shared house record in Firestore:

- **Chores** — recurring or one-time chores assigned to roommates, with optional auto-rotation across housemates.
- **Calendar** — shared events, assignable to roommates, synced to each assignee's native device calendar.
- **Pantry** — tracked food items with expiration dates, barcode lookup, and AI-predicted expiration for items without a barcode.
- **Shopping list** — shared checklist grouped by category.
- **Home dashboard** — a "fridge magnet" style overview pulling from the other four.

Beyond that original scope, the app now also has house creation/joining/switching/leaving, a noticeboard, an account/profile screen, and a dedicated chore-rotation settings screen — none of which are mentioned in the README's feature table, so the README is behind the code here.

## 2. Tech stack and key dependencies

Read directly from `package.json`:

| Layer | Choice | Version |
|---|---|---|
| Framework | Expo (managed) | `expo ~54.0.35`, `expo-router ~6.0.24` |
| Language | TypeScript | `~5.9.2` |
| UI runtime | React / React Native | `react 19.1.0`, `react-native 0.81.5` |
| Navigation | Expo Router (file-based) | v6 |
| Backend | Firebase (client SDK) | `firebase ^12.12.0` |
| Backend (server) | Firebase Cloud Functions | `firebase-functions ^6.1.0`, `firebase-admin ^12.7.0` (in `functions/package.json`, separate dependency tree) |
| Global state | Zustand | `^5.0.12` |
| Server-state cache | TanStack Query | `^5.97.0` |
| Forms | react-hook-form + zod | `^7.72.1` / `^4.3.6` |
| Bottom sheets | `@gorhom/bottom-sheet` | `^5.2.9` |
| Camera / barcode | `expo-camera` | `~17.0.10` |
| Native device calendar | `expo-calendar` | `~15.0.8` |
| Push notifications | `expo-notifications` | `~0.32.17` |
| OAuth (Google) | `expo-auth-session` | `~7.0.11` |
| Date logic | `date-fns` | `^4.1.0` (used both client-side and in Cloud Functions) |
| Drag-and-drop lists | `react-native-draggable-flatlist` | `^4.0.3` |

`postinstall` runs `patch-package`; there's one patch applied — `patches/react-native+0.81.5.patch` (I did not read its contents; if RN native behavior looks off, check this file before assuming it's stock RN 0.81.5). Package overrides pin `postcss` and `uuid` to specific majors, presumably for a transitive dependency conflict — not investigated further.

There are **no lint or test scripts** in the root `package.json`. There's one leftover test file, `components/__tests__/StyledText-test.js`, but no test runner is configured to execute it. `functions/package.json` has `build`, `build:watch`, `serve`, `shell`, `deploy`, `logs` — no test script there either.

## 3. Directory structure

```
app/                  Expo Router file-based routes (screens). See §5.
src/                  Application code: hooks, Firestore access, stores, types, theme, utils.
functions/            Firebase Cloud Functions — separate npm package, deployed independently.
components/           Leftover Expo Router template scaffold (ExternalLink, Themed, StyledText,
                       useColorScheme, useClientOnlyValue). Only consumer is app/(tabs)/two.tsx,
                       itself an unused template screen. Dead code — see §6.
constants/             Colors.ts — part of the same template scaffold as components/. Not
                       confirmed as unused (didn't grep every import), but not referenced by
                       src/theme, which is what the real screens use.
assets/                Fonts, images, SVGs referenced by app.json and screens.
docs/                  Hand-written design docs (docs/chore-recurrence.md is a genuinely useful,
                       user-facing spec of chore recurrence behavior) and docs/slides/ (a Python
                       script + markdown, apparently for generating a slide deck — not part of
                       the app runtime).
patches/               patch-package patch for react-native.
firestore.rules        Firestore security rules (single file, see §4 and §6).
firebase.json           Firebase CLI config: functions source dir, firestore rules path, emulator ports.
.firebaserc              Points the default Firebase project alias at "homie-ed113".
AGENTS.md                 Agent/contributor process rules (git hygiene, file-safety rules) — not
                           architecture, skipped here beyond noting it exists.
CONTRIBUTING.md            Not read in this pass — flagging as unverified.
```

`src/` breaks down as:

```
src/types/index.ts     All Firestore document shape definitions (see §4).
src/firebase/          config.ts (app init), auth.ts (signUp/signIn/signOut), firestore.ts
                        (typed collection/doc refs), house.ts (join/leave/rotation-order
                        mutations), choreMigrations.ts (versioned one-shot schema migrations).
src/store/             Two Zustand stores: authStore.ts, houseStore.ts.
src/hooks/              useAuth.ts, useChores.ts, useCalendarEvents.ts, usePantry.ts,
                        useShoppingList.ts, useGoogleCalendar.ts, useNotifications.ts.
src/components/         Feature UI, organized in subfolders per feature (chores/, calendar/,
                        pantry/, shopping/, noticeboard/, settings/) plus a few shared components
                        at the top level (GridBackground, HomeHeader, ImageCropModal,
                        NotificationCard).
src/services/           openFoodFacts.ts — barcode → product lookup against the free Open Food
                        Facts API.
src/utils/               weekKey.ts, choreSchedule.ts (client mirror of the server rollover
                        schedule logic — see §6), calendarSync.ts (device calendar via
                        expo-calendar), pushNotifications.ts, colors.ts, categories.ts,
                        confirm.ts, deviceId.ts, nanoid.ts.
src/theme/               palette.ts (PALETTE — single source of truth for onboarding + chore
                        theme colors), chores.ts (CHORE_THEME, derived from PALETTE).
```

`functions/` breaks down as:

```
functions/jobs/dailyChoreReset.ts    The authoritative server-side chore rollover job (~700+
                                      lines, extensively commented). Scheduled Cloud Function.
functions/src/index.ts                Entry point Firebase deploys from — re-exports the
                                      deployable functions. Currently broken, see §6.
functions/src/google-oauth.ts         exchangeGoogleAuthCode / unlinkGoogleCalendar — callable
                                      Cloud Functions handling the Google OAuth token exchange
                                      server-side (client secret never touches the client).
functions/package.json                Independent dependency tree (firebase-admin,
                                      firebase-functions, date-fns) and build scripts.
```

## 4. Data model

Types are centralized in `src/types/index.ts`, and all Firestore access goes through typed converters/collection refs in `src/firebase/firestore.ts` (a generic `makeConverter<T>()` strips `id` on write, injects `snapshot.id` on read — the codebase enforces using these refs rather than raw `collection(db, ...)` calls).

### Collections (verified against `firestore.ts` + `firestore.rules`)

```
/users/{userId}
/users/{userId}/devices/{deviceId}     # Expo push tokens (see §6 — rules gap)
/users/{userId}/private/google         # Google OAuth refresh token, written only by
                                        # functions/src/google-oauth.ts (Admin SDK bypasses
                                        # rules; comment in that file says clients must never
                                        # read this path — consistent with rules having no
                                        # matching allow-rule for it)
/houses/{houseId}
/houses/{houseId}/chores/{choreId}
/houses/{houseId}/events/{eventId}
/houses/{houseId}/pantryItems/{itemId}
/houses/{houseId}/shoppingItems/{itemId}
/predictions/{barcode}                 # cached expiration predictions, keyed by barcode
```

### Key types (`src/types/index.ts`)

- **`User`** — `id, email, displayName, avatarUrl, houseId, color, googleCalendarLinked?, createdAt`.
- **`House`** — `id, name, inviteCode, memberIds[], memberNames?, createdBy, createdAt`, plus chore-rollover bookkeeping fields: `weeklyScrambleEnabled?`, `lastRolloverWeekKey?`, `lastRolloverDayKey?`, `rotationOffset?`, `choreSchemaVersion?`. **Note:** the comment above `weeklyScrambleEnabled` still says rollover is "client-driven; see `src/firebase/choreRollover.ts`" — that file does not exist in `src/firebase/` (I checked — only `firestore.ts`, `house.ts`, `config.ts`, `choreMigrations.ts`, `auth.ts` are there). Rollover is now server-side only, per an explicit comment at the top of `functions/jobs/dailyChoreReset.ts`: *"This file is the single source of truth for the rollover decision. There is no client-side `evaluateRoll` / `rolloverHouse` anymore."* The type-file comment is stale documentation, not a description of current behavior.
- **`Chore`** — `id, title, assignedTo, recurrence (ChoreRecurrence), autoRotate?, dayOfWeek, dayOfMonth?, customRecurrence?, dueAt, isCompleted, completedAt, completedBy, weekKey, lastTriggeredKey?, createdBy, createdAt`. **Gap found:** `useChores.ts` (`addChore`) writes a `recurrenceAnchorKey` field on every created chore, and both `src/utils/choreSchedule.ts` and `functions/jobs/dailyChoreReset.ts` read `chore.recurrenceAnchorKey` as a load-bearing field for rollover-date math — but `recurrenceAnchorKey` is **not declared on the `Chore` interface** in `src/types/index.ts`. It only compiles today because the write site casts through untyped `addDoc` calls and the read sites use their own local/duplicated type shapes rather than importing `Chore` directly. This is a real type/schema drift, not a hypothetical one.
- **`ChoreRecurrence`** = `'once' | 'daily' | 'weekly' | 'monthly' | 'custom'`. The Cloud Function's local recurrence type additionally carries a `'biweekly'` legacy value with a comment explaining it's a schema-v0 leftover, normalized by `choreMigrations.ts` v1 the next time the client opens — kept alive server-side "until they open the app once." So a house that's never been opened since that migration shipped could still have `biweekly` chores server-side that the client-side `ChoreRecurrence` type doesn't model. Unverified whether any such house currently exists in production data.
- **`CalendarEvent`** — `id, title, description, startTime, endTime, createdBy, color, googleEventId, assignedTo[], deviceCalendarIds ({userId: nativeCalendarEventId}), createdAt`. `googleEventId` is defined but I found no code path that ever sets it to anything but `null` (see §6) — device-calendar sync via `deviceCalendarIds` is what's actually implemented.
- **`PantryItem`** — `id, name, barcode, quantity, unit, expirationDate, expirationConfidence ('scanned'|'predicted'|'manual'), isShared, ownedBy, category, imageUrl, addedBy, createdAt`.
- **`ShoppingItem`** — `id, name, category, quantity, unit, isChecked, price?, assignedTo?, addedBy, checkedBy, checkedAt, neededBy?, createdAt`.
- **`DeviceToken`** — `id, expoPushToken, platform ('ios'|'android'|'web'), deviceId, notificationsEnabled, houseId, updatedAt, createdAt`. Lives at `users/{userId}/devices/{deviceId}`.
- **`ExpirationPrediction`** — `id, estimatedDays, range, category, cachedAt`.

### Migrations

`src/firebase/choreMigrations.ts` exports `LATEST_CHORE_SCHEMA_VERSION = 4` and `migrateChoreSchema(houseId)`, run once per house per app session from `AuthGate` in `app/_layout.tsx` (guarded by a ref so it fires once per `houseId`, not on every render). It's a versioned, incremental migration — I read the v4 block specifically: it backfills `recurrenceAnchorKey` on every recurring chore (computed from existing data), and sets it to `null` for `once` chores. Versions 1–3 exist in the file but I did not read them in full; version 1 is referenced elsewhere as the one that rewrites legacy `biweekly` chores to `custom {count: 2, unit: 'weeks'}`.

## 5. How the pieces connect

**Entry point → fonts/providers → auth gate → routing:**

1. `app/_layout.tsx` is the root. It loads fonts (`useFonts`), wraps the tree in `QueryClientProvider` (one `QueryClient` instance module-scoped, not per-render) and `BottomSheetModalProvider`, then renders `AuthGate`.
2. `AuthGate` (defined in the same file) calls `useAuthListener()` and `useNotificationsRegistration()` unconditionally, reads `{ firebaseUser, userProfile, isLoading }` from `useAuthStore`, and redirects via `expo-router`'s `useRouter()`/`useSegments()`:
   - no `firebaseUser` → `/(auth)/signup`
   - `firebaseUser` but no `userProfile.houseId` → `/(auth)/home-choice` (unless already on one of `home-choice`/`join-house`/`create-house`/`home-status`)
   - `firebaseUser` with `houseId` → `/(tabs)` (unless on `home-status`/`create-house`/`join-house`, which stay reachable for switching houses)
   It also fires the one-shot `migrateChoreSchema(houseId)` call described above.
3. `useAuthListener()` (`src/hooks/useAuth.ts`) is the sole writer of `authStore` and `houseStore`: it attaches `onAuthStateChanged`, then an `onSnapshot` on the user's profile doc (auto-creating it with a random `ROOMMATE_COLORS` color if missing), and — only if the profile has a `houseId` — subordinate `onSnapshot` listeners on the house doc and a `users` query filtered by `houseId`. All three listeners are torn down and re-attached on every auth-state change, and explicitly torn down (with store cleared) if `houseId` is removed (leave/switch house), guarding against a stale listener repopulating the store after the user has left.
4. **Routing**: Expo Router file-based, two top-level groups — `(auth)/*` and `(tabs)/*` — plus two ungrouped top-level routes, `app/modal.tsx` and `app/rotation.tsx`. `(tabs)/_layout.tsx` renders exactly 4 visible tabs (`index`/Home, `calendar`, `pantry`, `shopping`) via a `TABS` array, and a separate `HIDDEN` array (`chores`, `two`, `house`, `settings`, `noticeboard`, `myaccount`) registers those routes with `href: null` so they're navigable but never shown in the tab bar.
5. **State → data layer**: feature screens call feature hooks (`useChores`, `useCalendarEvents`, `usePantry`, `useShoppingList`), all following the same pattern — a TanStack Query entry seeded with `queryFn: () => Promise.resolve([])` (so `useQuery` has something to return immediately) paired with a `useEffect` that opens a Firestore `onSnapshot` listener and pushes updates into the query cache via `queryClient.setQueryData`. Query is `enabled: !!houseId`, so nothing fires until `houseStore.house` is populated by step 3. Mutations (`addChore`, `toggleChore`, etc.) call Firestore writes directly (`addDoc`/`updateDoc`/`deleteDoc`) — they don't go through TanStack Query mutations, they rely on the snapshot listener to reflect the write back into the cache.
6. **Cross-feature side effects**: `useCalendarEvents`'s `addEvent` does three things beyond the Firestore write — syncs the event to the current user's native device calendar (`src/utils/calendarSync.ts`, via `expo-calendar`), reconciles any other-assigned-but-unsynced events on every render via a second `useEffect`, and fires a push notification to other assignees (`sendEventAssignedPush`, best-effort — failure is swallowed with a comment that the roommate will sync next app open).
7. **Server side**: the only Cloud Functions are the scheduled `dailyChoreReset` (runs 00:01 America/Los_Angeles daily, is the sole authority for chore rollover — the client never computes rollover, only renders and reads) and the two Google OAuth callables. Both live in `functions/`, a separate npm/TS project deployed independently via `firebase deploy --only functions`.

## 6. Unfinished, stubbed, or inconsistent — verified findings

- **`functions/src/index.ts` has a broken import.** It does `export { weeklyChoreReset } from '../jobs/weeklyChoreReset'`, but the actual file is `functions/jobs/dailyChoreReset.ts`, exporting `dailyChoreReset` (not `weeklyChoreReset`). No file named `weeklyChoreReset.ts` exists anywhere in `functions/`. `npm run build` in `functions/` (`tsc`) will fail on this import, meaning the scheduled chore-reset function almost certainly cannot deploy from `index.ts` as it stands. This should be verified by actually running `npm run build` in `functions/` before relying on it.

- **Firestore rules appear to have no rule for `users/{userId}/devices/{deviceId}`.** `useNotifications.ts` does a client-side `setDoc(deviceDoc(firebaseUser.uid, deviceId), ..., {merge: true})` to register push tokens. I read the entirety of `firestore.rules` (66 lines) — it has a rule for `match /users/{userId}` but no nested `match` for a `devices` subcollection, and no catch-all `match /{document=**}`. Firestore security rules don't cascade to subcollections automatically, so — unless I'm missing a rule defined elsewhere (I only found the one `firestore.rules` file referenced from `firebase.json`) — these writes should be rejected with `permission-denied` against the deployed rules. The hook already wraps the write in a try/catch that logs a warning on failure, so this may already be failing silently in practice. Worth confirming against the actual deployed rules in the Firebase console, since `firestore.rules` in the repo may not be what's live.

- **`googleEventId` on `CalendarEvent` is dead.** The field is declared on the type and always written as `null` in `useCalendarEvents.ts`'s `addEvent`. I grepped the whole repo for `googleapis`, `calendar/v3`, and any other write to `googleEventId` — none exist. What's actually implemented and working (per the code) is: (a) Google account **linking** — `useGoogleCalendar.ts` does a full PKCE OAuth flow and calls the `exchangeGoogleAuthCode` Cloud Function, which stores a refresh token server-side — and (b) **device-native-calendar** sync via `expo-calendar` (`calendarSync.ts`), which is unrelated to Google's API and doesn't use the stored OAuth token at all. So "Google Calendar sync" as a user-facing feature (Homie events appearing in the user's actual Google Calendar) has the auth handshake built but no code that calls the Google Calendar API to create/update events. Whether this is intentionally deferred or an oversight, I can't tell from the code alone.

- **Noticeboard has no persistence.** `app/(tabs)/noticeboard.tsx` holds notices in local `useState<Notice[]>([])` only. There's no Firestore collection, hook, or `onSnapshot` wiring for it anywhere in the repo (confirmed by grep — no `firebase`/`Firestore`/`onSnapshot` import in the file). Every notice is lost on reload/app restart. This is UI-complete but has no backend.

- **Stale type-vs-implementation comment on `House.weeklyScrambleEnabled`** — described above in §4. The comment claims rollover logic lives in a file that doesn't exist and is client-driven, when the actual (and clearly deliberate, well-documented) design moved that logic server-side. Low risk since it's just a comment, but it will mislead anyone who trusts it without checking `functions/jobs/dailyChoreReset.ts`.

- **`recurrenceAnchorKey` missing from the `Chore` type** — described in §4. Functionally load-bearing (used by both the client schedule-display logic and the server rollover logic) but absent from the canonical type definition.

- **Two unrelated "component library" trees.** Top-level `components/` and `constants/` are Expo Router's default template scaffold (`ExternalLink.tsx`, `Themed.tsx`, `StyledText.tsx`, `useColorScheme.ts`/`.web.ts`, `useClientOnlyValue.ts`/`.web.ts`, `Colors.ts`, plus a `__tests__/StyledText-test.js` with no test runner wired to run it). The only consumer I found is `app/(tabs)/two.tsx`, itself an unused "Tab Two" demo screen registered as a hidden tab route. All of this appears to be dead scaffold code left over from `npx create-expo-app`, distinct from the real, actively-used `src/components/` tree. I didn't exhaustively verify zero other imports of `constants/Colors.ts` — worth a repo-wide grep before deleting.

- **`app.json` has no `extra.eas.projectId`.** `README.md` documents this as a required one-time `eas init` step for push notifications to fetch real tokens; `useNotifications.ts` checks for it (`resolveProjectId()`) and falls back to writing an "inactive" device doc with a console warning if it's missing. Consistent with the README calling this optional/deferred rather than a bug — flagging only because it means push notifications are currently non-functional on whatever environment this was last run in, unless `eas init` has been run outside what's in git (`app.json` is tracked and shows no `extra` key at all).

- **`patches/react-native+0.81.5.patch` exists but its contents are unverified** — I did not read this patch file, so I can't say what native behavior it changes. Check it before debugging any RN-core-level oddity.

- **`CONTRIBUTING.md` was not read in this pass** — it's a substantial file (~9KB) that may contain additional process/architecture context not reflected here.

## Open questions I could not verify from static reading alone

- Whether the deployed Firestore rules in production match the `firestore.rules` file in this repo (relevant to the devices-subcollection gap above).
- Whether `functions/src/index.ts`'s broken import means the scheduled job is currently *not* running in production, or whether production is running an older/different `index.ts` than what's in this branch.
- Migration versions 1–3 in `choreMigrations.ts` were not read in full (only v4 and scattered references to v1's `biweekly` rewrite).
- Whether any house documents currently exist with the legacy `biweekly` recurrence value server-side.
