# Bugs

Traced screen → hook → Firestore write → snapshot listener → re-render for each area below. Every finding cites the exact file/lines I read; nothing here is inferred from a file I didn't open. Findings already covered in `ARCHITECTURE.md` (broken `functions/src/index.ts` import, missing Firestore rule for `users/{uid}/devices`, dead `googleEventId`, unpersisted noticeboard, stale rollover comment, missing `recurrenceAnchorKey` type field) are not repeated here.

---

## CHORES

### 1. Weekly chores rotate and un-complete on the ISO-week boundary (Monday), not on their configured day
**File/line:** `functions/jobs/dailyChoreReset.ts:277-286` (`evaluateRoll`, `case 'weekly'`)

```ts
case 'weekly': {
  let weeksElapsed: number;
  try {
    weeksElapsed = weeksBetween(chore.weekKey, currentWeekKey);
  } catch {
    return { shift: 1, bumpWeekKey: true };
  }
  if (weeksElapsed <= 0) return null;
  return { shift: weeksElapsed, bumpWeekKey: true };
}
```

This is the only recurring-cadence branch in `evaluateRoll` that does **not** call `isChoreDueOn`. Every other multi-day-per-week-or-less cadence (`monthly`, `biweekly`, `custom`/weeks) explicitly gates on `isChoreDueOn(chore, now)` — the surrounding comments for those cases even say this was added because "the daily visibility re-stamp... resets `weekKey`... so `monthsBetween`/`weeksBetween` would silently prevent every fire," and monthly's comment cites this exact class of bug as user-reported. `weekly` was seemingly never given the same fix: it fires purely off `weeksBetween(chore.weekKey, currentWeekKey) > 0`, i.e. whenever the ISO week number changes — which happens every Monday — regardless of `chore.dayOfWeek`.

This directly contradicts `docs/chore-recurrence.md`: *"Weekly — fires once a week on a single day you pick... uncrossed only when their next scheduled fire day arrives. Completing one of these 'ahead of time' keeps it marked done until that next fire."* It also contradicts the client's own `isChoreDueOn` (`src/utils/choreSchedule.ts:63-64`, `chore.dayOfWeek === dow`), which correctly only shows the chore as "due" on its chosen day — so the client's display and the server's actual mutation of `assignedTo`/`isCompleted` disagree.

**Repro steps:**
1. Create a chore "Take out trash," recurrence **Weekly**, day **Wednesday**, Auto-Rotate on, in a house with 2+ members.
2. Complete it on a Wednesday.
3. Let real time (or the Functions emulator/shell) pass to the following Monday — three days before the chore is next due.
4. Open the Chores tab Monday morning.

**What happens:** The chore is un-completed and reassigned to the next roommate on Monday.
**What should happen:** Per the app's own documentation and the day-of-week picker in the chore form, it should stay completed and keep its assignee until the following Wednesday.

**Severity:** wrong-data (high user-visibility — every weekly chore not due on Monday behaves this way, every week; likely to visibly misfire during any demo that spans a Monday).

**Minimal fix:** In the `'weekly'` case of `evaluateRoll`, gate on `isChoreDueOn(chore, now)` the same way `monthly`/`biweekly`/custom-weeks already do, e.g.:
```ts
case 'weekly': {
  if (!isChoreDueOn(chore, now)) return null;
  if (lastDay && lastDay >= todayDayKey) return null;
  return { shift: 1, bumpWeekKey: chore.weekKey !== currentWeekKey };
}
```

---

### 2. Editing a chore's recurrence type leaves `lastTriggeredKey` / `recurrenceAnchorKey` stale, bypassing first-cycle protection and corrupting custom-cadence timing
**File/line:** `src/hooks/useChores.ts:180-239` (`updateChore`), specifically the `patch.recurrence` branch at `214-236`

`updateChore` resets `dayOfWeek`/`dayOfMonth`/`customRecurrence`/`dueAt`/`weekKey` when `patch.recurrence` is set, but never once references `lastTriggeredKey` or `recurrenceAnchorKey` anywhere in the function (confirmed by reading the full body — neither field name appears). Compare to `addChore` (`useChores.ts:104-143`), which carefully computes fresh values for both on every creation specifically so the "first advance keeps the seeded assignee" guard (`isFirstAdvance = chore.lastTriggeredKey == null` in `dailyChoreReset.ts:515`) works, and so `custom` cadences anchor to the right start date (`recurrenceAnchorKey`, used by `resolveAnchorDate` in both `choreSchedule.ts:26-35` and its server mirror).

When a user changes a chore's recurrence type via `ChoreDetailSheet` (`src/components/chores/ChoreDetailSheet.tsx:188-190`, which only sets `patch.recurrence` — it never touches these two fields either), the chore keeps whatever `lastTriggeredKey`/`recurrenceAnchorKey` it had from its *previous* cadence:
- `lastTriggeredKey` is non-null (it fired before), so `isFirstAdvance` is `false` on the very next server run — the newly-chosen assignee can be auto-rotated away before ever completing the chore once, defeating the documented "first cycle protection."
- For a switch *into* `custom`/weeks, `resolveAnchorDate` (`choreSchedule.ts:26-35`) falls back to the stale `recurrenceAnchorKey` from the chore's original creation date (potentially months earlier, under a totally different cadence), so `cyclesSinceAnchor % cr.count` is computed against an arbitrary, unrelated date rather than the edit date — the chore can come out already "due" or not due for a full extra cycle, unpredictably.

**Repro steps:**
1. Create a chore as **Custom: every 3 days**, Auto-Rotate on. It gets `lastTriggeredKey` = today, `recurrenceAnchorKey` = today (per `computeCreationLastTriggeredKey`).
2. Two days later, open the chore and edit its recurrence to **Weekly, Friday**, keep Auto-Rotate on, pick yourself as... (n/a, auto-rotate seeds automatically) — save.
3. Let the server rollover run through the next several days.

**What happens:** Because `lastTriggeredKey` is still set from step 1 (2 days ago), `isFirstAdvance` is false on the very first rollover after the edit — if `weeklyScrambleEnabled` and `autoRotate` are on, the assignee can rotate away on the next run even though nobody has had a turn under the new "Weekly/Friday" schedule yet. (Combined with bug #1, this compounds — the rotation may also happen on the wrong day.)
**What should happen:** Changing recurrence should be treated like re-creating the cadence: the first occurrence under the new schedule should stay with the current assignee, and any `custom` cadence should anchor to the edit date, not a leftover date from the prior cadence.

**Severity:** wrong-data.

**Minimal fix:** In `useChores.ts`'s `updateChore`, whenever `patch.recurrence` is present, also reset `update.lastTriggeredKey = null` and recompute `update.recurrenceAnchorKey = getDayKey(new Date())` (mirroring what `addChore` does at creation), rather than leaving both untouched.

---

### 3. Server rollover always uses America/Los_Angeles calendar days/weeks; client "today"/weekKey use device-local time — recurring chores disappear from the Chores tab for hours near the weekly boundary for non-Pacific users
**File/line:** `functions/jobs/dailyChoreReset.ts:616-625` (`runDailyChoreReset`, `targetWeekKey`/`targetDayKey` derived from `getWeekKey(now)`/`getDayKey(now)`, both implemented with plain `date-fns format`/`getISOWeek` with no explicit timezone — see the local helpers at lines 127-154) vs. `src/hooks/useChores.ts:16` (`const weekKey = getWeekKey();`, computed in the device's local timezone) and the query at `useChores.ts:31` (`where('weekKey', '==', weekKey)`).

The scheduled function (`dailyChoreReset.ts:721-731`) is configured to *trigger* at `00:01 America/Los_Angeles`, but once it's running, `getWeekKey`/`getDayKey` format the wall-clock `Date` using the Cloud Functions runtime's local timezone (UTC on Cloud Run/Functions Gen2), not explicitly Pacific — the file's own top comment (`dailyChoreReset.ts:1-11`) only reasons about *when the job fires*, not about what calendar date/week non-Pacific users' devices consider "current" the rest of the day. The chore's `weekKey` field only gets re-stamped once, right after the PT/UTC day flips (~00:01 PT). Any client whose local calendar date/ISO-week flips **before** or **well after** that moment computes a different `weekKey` locally than what's currently stamped on the chore documents.

**Repro steps (concrete, using the ISO-week boundary — the more severe case):**
1. Set a device's timezone to something east of the US (e.g. Auckland, UTC+12/+13) — about 20 hours ahead of Pacific Time.
2. Have a house with a recurring weekly/daily chore.
3. Watch the Chores tab across the transition from Sunday to Monday **in the device's local time**. Pacific Time is still mid-Sunday-afternoon at that point, so `dailyChoreReset` hasn't run for the new week yet.
4. On the Chores tab, the client computes `weekKey = getWeekKey()` in device-local time — already the *new* week's key — and queries `where('weekKey','==', <new week key>)`.

**What happens:** The chore documents are still stamped with *last* week's `weekKey` (the server won't re-stamp them to the new week until ~00:01 PT, roughly 20 hours after the Auckland device's own Monday started), so `useChores`'s query 1 (`useChores.ts:31`) returns nothing for them — every recurring weekly/daily chore silently disappears from the Chores tab for that whole window. (One-time chores stay visible via the separate `recurrence=='once'` query at `useChores.ts:33`, so this specifically affects recurring chores.) The reverse (a user west of Pacific, e.g. Hawaii) sees the opposite skew: their chores flip to the new week's state a couple of hours **before** their own local midnight.
**What should happen:** Chores shouldn't vanish from the list for any user regardless of timezone; visibility shouldn't depend on how far the device's timezone is from `America/Los_Angeles`.

**Severity:** wrong-data (would visibly break a demo run in almost any timezone other than US Pacific, for up to ~20 hours a week around the Monday transition, and to a lesser degree around every daily transition).

**Minimal fix:** This is an architectural tradeoff (a single global rollover instant vs. per-user local time), not a one-line fix. A workable minimal mitigation: have the client's `weekKey` query also accept the *previous* server-stamped week (query both `targetWeekKey` and the prior one, or query by house-level `lastRolloverWeekKey` synced from `houseStore.house` instead of recomputing locally) so the visibility window matches what the server has actually stamped rather than the device's own clock.

---

### 4. A chore permanently assigned to a member who leaves the house keeps that member as `assignedTo` until its next cadence advance
**File/line:** `src/firebase/house.ts:15-23` (`leaveHouse`) and `functions/jobs/dailyChoreReset.ts:528-533` (the only place a stale `assignedTo` gets corrected, and only inside the `if (decision)` branch)

`leaveHouse` only updates the house doc's `memberIds`/`memberNames` and the user doc's `houseId` — it never touches `houses/{houseId}/chores`. A chore that is *not* auto-rotate (pinned to a specific person) keeps `assignedTo` pointing at the departed user's uid. The only code that ever corrects a stale `assignedTo` is the `else if` fallback inside `dailyChoreReset.ts`'s per-chore loop (`orderedMembers.length > 0 && !orderedMembers.includes(chore.assignedTo)` → reassign to `orderedMembers[0]`), and that fallback only runs when `decision` is non-null, i.e. only on an actual cadence advance for that chore — which for a monthly or long custom-interval chore could be weeks away.

**Repro steps:**
1. House with 2 members, Alice and Bob. Create a **Monthly, day 1** chore pinned to Bob (auto-rotate off).
2. Bob leaves the house (`leaveHouse` from Settings).
3. Open the Chores tab (or Rotation screen) as Alice before the 1st of next month.

**What happens:** The chore still shows `assignedTo = Bob`'s uid. Since `memberMap` (populated by `useAuthListener`'s `users where houseId==houseId` query) no longer contains Bob, any UI reading `memberMap[chore.assignedTo]` renders a blank/`"—"` assignee (confirmed defensive in `app/rotation.tsx:188-201`, unverified in `ChoreCard.tsx` which I did not read) for a chore effectively assigned to nobody in the house, until the 1st of next month.
**What should happen:** A chore assigned to someone who's no longer in the house should be reassigned (or clearly flagged as unassigned) immediately, not silently wait for its next fire.

**Severity:** wrong-data.

**Minimal fix:** In `leaveHouse` (and the equivalent house-switch path in `joinHouseByInviteCode`), batch-reassign or clear `assignedTo` on any of that house's chores/events currently held by the departing uid, in the same batch that removes them from `memberIds`.

---

### 5. Legacy `'biweekly'` chores are invisible in the client's "Today" filter and show a blank schedule label until migration runs
**File/line:** `src/utils/choreSchedule.ts:56-96` (`isChoreDueOn`, `default: return false` at line 93-94) and `:161-180` (`recurrenceLabel`, `default: return ''` at line 177-178)

The client's `ChoreRecurrence` type (`src/types/index.ts:34-39`) has no `'biweekly'` member, and both `isChoreDueOn` and `recurrenceLabel` fall through to their `default` branches for any recurrence value they don't recognize. The server's copy of the same logic (`functions/jobs/dailyChoreReset.ts:216-221`) *does* handle `'biweekly'` explicitly and keeps firing it correctly — the two are deliberately not in lockstep here, per the comment at `dailyChoreReset.ts:73-78` explaining the case is kept alive server-side "until [the house] open[s] the app once" (`migrateChoreSchema` v1, `src/firebase/choreMigrations.ts:76-87`, rewrites it to `custom`).

**Repro steps:** Requires a house whose chores were created before the `custom`-recurrence schema existed and that hasn't had any member open the app since (so `choreSchemaVersion < 1`) — I could not construct this via the current UI (there's no way to create a `'biweekly'` chore from `ChoreForm`, which only offers `once/daily/weekly/monthly/custom`), so this only affects pre-existing/legacy data, not new demo data. Marking this **UNVERIFIED as a live repro path** in the current build, though the code path itself is directly readable.

**What happens:** Until that house's first post-deploy login, any `'biweekly'` chore is server-correct (still rotates/fires) but client-invisible in "Today" and shows no recurrence text.
**What should happen:** Either the client should also special-case `'biweekly'` (mirroring the server), or migration should be guaranteed to run before any chore UI renders.

**Severity:** cosmetic (self-heals on first login to the affected house; not reachable with fresh demo data).

**Minimal fix:** Add the same `'biweekly'` case to the client's `isChoreDueOn`/`recurrenceLabel` that the server already has, so the two stay in lockstep even before migration runs.

---

## CALENDAR

### 1. Creating an event you're assigned to can create two native device-calendar entries for it
**File/line:** `src/hooks/useCalendarEvents.ts:79-102` (reconciliation effect) racing with `:104-145` (`addEvent`'s own explicit sync), both funneling into `syncEventForCurrentUser` at `:22-46`

`addEvent` does `addDoc(...)` then, if the creator is among `assignedTo`, immediately `await syncEventForCurrentUser(...)` itself. But the `onSnapshot` listener mounted in the separate effect at `useCalendarEvents.ts:60-76` also receives that same freshly-created document (with `deviceCalendarIds: {}`, since that's what `addEvent` wrote initially) via Firestore's local-cache latency compensation — typically before `addEvent`'s own explicit `syncEventForCurrentUser` call (which does async permission checks + a native `Calendar.createEventAsync` call) has finished. That updates `events` state, which re-runs the reconciliation effect at `:79-102`; its `unsynced` filter (`e.assignedTo?.includes(userProfile.id) && !e.deviceCalendarIds?.[userProfile.id]`) matches the same brand-new event (its `deviceCalendarIds[userProfile.id]` isn't set yet), so it *also* calls `syncEventForCurrentUser` for it — concurrently with the explicit call already in flight.

**Repro steps:**
1. As a user who is a member of the house, open the Calendar tab and create a new event, assigning it to yourself (include yourself in `assignedTo`).
2. Check your device's native calendar app immediately after.

**What happens:** Two separate native calendar events can be created for the one Homie event (both `addEventToDeviceCalendar` calls create real entries; only the *last* `updateDoc` to `deviceCalendarIds` wins, so Firestore only ever remembers one of the two native IDs — the other is orphaned and un-deletable through the app).
**What should happen:** Exactly one native calendar entry per event per device.

**Severity:** wrong-data (duplicate, silently orphaned native calendar entries; not a crash, but visibly wrong on the device's actual calendar app, which is exactly what this feature is supposed to keep in sync).

**Minimal fix:** Have `addEvent` skip its own explicit sync call and rely solely on the reconciliation effect (which will pick up the newly-created event on the very next snapshot), or have `syncEventForCurrentUser` guard itself with a simple in-flight `Set<eventId>` lock shared between the two call sites.

---

### 2. Editing an event's time/title never updates the already-synced native device-calendar entry
**File/line:** `src/hooks/useCalendarEvents.ts:147-156` (`updateEvent`) and `src/utils/calendarSync.ts` (whole file — only `createEventAsync`/`deleteEventAsync` are wrapped; there is no `Calendar.updateEventAsync` wrapper anywhere in the codebase, confirmed by reading the full file)

`updateEvent` only writes `{title, description, startTime, endTime, assignedTo}` to Firestore. Nothing in `useCalendarEvents.ts` or `calendarSync.ts` ever calls the native `updateEventAsync` API for an event whose `deviceCalendarIds[userId]` is already set.

**Repro steps:**
1. Create and sync an event assigned to yourself (see native calendar entry appear, per normal flow).
2. Edit the event in Homie — change its time or title — and save.
3. Check the native device calendar entry.

**What happens:** The native calendar entry keeps showing the original time/title indefinitely.
**What should happen:** Editing the event in Homie should update the synced native calendar entry to match.

**Severity:** wrong-data.

**Minimal fix:** Add an `updateEventOnDeviceCalendar` wrapper around `Calendar.updateEventAsync` in `calendarSync.ts`, and call it from `updateEvent` for every assignee that already has a `deviceCalendarIds` entry.

---

### 3. There is no way to delete a calendar event anywhere in the app
**File/line:** `src/hooks/useCalendarEvents.ts:158` (return statement — only `{ events, isLoading, addEvent, updateEvent }`) and `src/utils/calendarSync.ts:93-99` (`removeEventFromDeviceCalendar`, confirmed via repo-wide grep to have zero call sites)

**Repro steps:** Open the Calendar tab, try to find any delete/remove action on an event.

**What happens:** No delete path exists — not in the hook (no `deleteEvent` function), not in `calendar.tsx` (only `addEvent`/`updateEvent` are destructured from the hook, confirmed by grep), and the one function that *would* clean up the device-calendar side of a deletion (`removeEventFromDeviceCalendar`) is dead code with no caller anywhere in the repo.
**What should happen:** Users should be able to delete an event they created (mirroring the delete affordance every other feature — chores, pantry, shopping — already has).

**Severity:** wrong-data (missing core CRUD operation, not just an edge case).

**Minimal fix:** Add a `deleteEvent(id)` to `useCalendarEvents` that calls `deleteDoc(eventDoc(houseId, id))` and, for each uid in the deleted event's `deviceCalendarIds`, calls the already-written (but currently unused) `removeEventFromDeviceCalendar`.

---

### 4. `deviceCalendarIds` is keyed by user, not by device — a user on two devices only gets the event synced to one of them
**File/line:** `src/hooks/useCalendarEvents.ts:22-46` (`syncEventForCurrentUser`, writes `deviceCalendarIds.${params.userId}`) and `:82-86` (reconciliation filter keys off `deviceCalendarIds?.[userProfile.id]`)

The field name and its comment in `src/types/index.ts:78` (`deviceCalendarIds: Record<string, string>; // { [userId]: nativeCalendarEventId }`) both confirm the map is keyed by **user**, not device — even though the app separately models per-device identity elsewhere (`DeviceToken.deviceId`, `src/types/index.ts:118-127`, used for push tokens).

**Repro steps:**
1. Log into the same Homie account on two physical devices (e.g. phone + tablet).
2. Get assigned to a calendar event; let it sync (whichever device's reconciliation effect runs first writes `deviceCalendarIds[userId]`).
3. Check the native calendar on the *other* device.

**What happens:** The second device's reconciliation effect sees `deviceCalendarIds[userProfile.id]` already set (by the first device) and treats the event as already synced — it never gets added to that device's own native calendar.
**What should happen:** Each of the user's devices should get its own native calendar entry.

**Severity:** cosmetic (multi-device-same-account is a narrower scenario than the single-device demo path, and nothing crashes — the event is just silently missing from the second device's calendar).

**Minimal fix:** Key `deviceCalendarIds` by a composite of `userId` + the device id already available via `src/utils/deviceId.ts`, matching the pattern already used for push-token devices.

---

## PANTRY

### 1. `expirationConfidence` is hardcoded to `'manual'` everywhere — the `'scanned'`/`'predicted'` states and the entire `/predictions` cache are unreachable
**File/line:** `src/hooks/usePantry.ts:68` (`addPantryItem`) and `src/hooks/useShoppingList.ts:100` (the pantry-item creation inside `toggleShoppingItem`) — both literally write `expirationConfidence: 'manual' as const`, unconditionally. Repo-wide grep confirms `predictionsCol` (`src/firebase/firestore.ts:63-64`) has zero read or write call sites anywhere in `src/` or `functions/`.

`AddPantryItemForm.tsx` supports scanning a barcode (`BarcodeScannerModal` → `lookupBarcode`) which auto-fills `name`/`category` on a successful lookup (`AddPantryItemForm.tsx:69-72`), but the expiration date itself is always the user's own free-text `YYYY-MM-DD` entry (`AddPantryItemForm.tsx:247-255`) — there is no code path anywhere that produces a `'scanned'` or `'predicted'` confidence value, and no code that ever calls the OpenAI/GPT-4o prediction described in `README.md`'s External APIs table.

**Repro steps:** Scan a barcode in Add Pantry Item, let the name/category auto-fill, then add the item.
**What happens:** The item is saved with `expirationConfidence: 'manual'`, identical to a fully hand-typed entry — there's no way to tell from the data (or the UI, since nothing renders confidence) which items came from a scan vs. manual entry, and the `/predictions` cache collection that's meant to store/reuse AI-predicted expirations is entirely inert.
**What should happen:** A barcode-derived item should be tagged `'scanned'`, and (per the documented design) an item with no barcode match should be eligible for a `'predicted'` GPT-4o expiration estimate, cached in `/predictions/{barcode}`.

**Severity:** wrong-data (the field actively lies about provenance) / feature gap.

**Minimal fix:** Thread the actual source through `AddPantryItemInput` (e.g. `expirationConfidence: barcode ? 'scanned' : 'manual'`) instead of hardcoding; implementing the GPT-4o prediction path itself is a larger feature, not a minimal fix.

---

### 2. Barcode-lookup HTTP errors are cached as permanent "not found" for the rest of the session
**File/line:** `src/services/openFoodFacts.ts:37-41`

```ts
if (!res.ok) {
  const result: LookupResult = { status: 'not_found' };
  sessionCache.set(barcode, result);
  return result;
}
```

Any non-2xx response from Open Food Facts — a rate limit (429), a transient 500/503, etc. — is cached identically to a genuine "this barcode isn't in the database" result, and the cache (`sessionCache`, a module-level `Map`, `openFoodFacts.ts:7`) persists for the lifetime of the JS engine (i.e. the whole app session, across every screen/modal open-close). By contrast, the `catch` block for actual thrown network errors/timeouts (`:58-60`) is explicitly *not* cached, with a comment stating this is intentional so a retry can succeed — the `!res.ok` branch doesn't get the same treatment, seemingly by oversight rather than design.

**Repro steps:** (requires an actual transient HTTP failure from Open Food Facts, e.g. via a proxy that injects a 503 for one request) Scan a barcode while the API returns a non-2xx status once; then scan the same barcode again after the API has recovered, within the same app session.
**What happens:** The second scan instantly returns the cached `'not_found'` without ever hitting the network again — even though the product may genuinely exist and the earlier failure was transient.
**What should happen:** Only a confirmed absence (`data.status !== 1`) should be cached as `'not_found'`; HTTP-level failures should be treated like network errors and left retryable.

**Severity:** wrong-data (silently and permanently wrong for the rest of the session, with no user-visible distinction between "genuinely not found" and "the API hiccuped").

**Minimal fix:** Move the `!res.ok` branch to return `{status:'error'}` without caching, same as the `catch` block below it.

---

### 3. Scanning the same barcode twice creates two separate pantry items instead of merging quantity
**File/line:** `src/hooks/usePantry.ts:55-78` (`addPantryItem` always `addDoc`s a new document; no lookup against existing items with the same `barcode`/`houseId` before insert)

**Repro steps:** Add "Almond Milk" via barcode scan with quantity 1. Scan the same barcode again (e.g. a second carton) and add it again.
**What happens:** Two separate pantry rows for "Almond Milk," each quantity 1, rather than one row at quantity 2.
**What should happen:** Unverified whether this is intended (each physical unit as its own row, e.g. for per-item expiration tracking) or an oversight — flagging as a gap since the `quantity` field on `PantryItem` implies merging was at least considered, but no merge/de-dup logic exists.

**Severity:** cosmetic.

**Minimal fix:** N/A without a product decision on whether pantry items should merge by barcode; if they should, check for an existing item with the same `barcode` + `houseId` before `addDoc` and increment `quantity` instead.

---

## SHOPPING

### 1. Two roommates marking the same item "bought" around the same time creates duplicate pantry entries
**File/line:** `src/hooks/useShoppingList.ts:77-112` (`toggleShoppingItem`)

```ts
const toggleShoppingItem = async (itemId: string, currentValue: boolean, expirationDate?: Date) => {
  ...
  const beingChecked = !currentValue;
  await updateDoc(..., { isChecked: beingChecked, ... });
  if (beingChecked) {
    ... addDoc(pantryCol(houseId), { ...new pantry item... });
  }
};
```

`currentValue` is supplied by the caller from its own (possibly stale) local render of the item, not read fresh from Firestore inside this function. The pantry-add side effect fires unconditionally whenever the *caller's* stale view says the item is currently unchecked, with no check against the item's actual, current server-side `isChecked` state. This is directly reachable through the real UI flow: `app/(tabs)/shopping.tsx:1031` calls `toggleShoppingItem(boughtItem.id, boughtItem.isChecked, boughtExpiry ?? undefined)` from the "Bought" confirmation modal, where `boughtItem` is captured when the modal was opened and can go stale while the user is picking an expiration date in the modal.

**Repro steps:**
1. Two roommates (or two browser tabs logged in as different house members) both have the Shopping tab open, both looking at the same unchecked "Milk" item.
2. Roommate A taps the item, flips to the back face, taps "Bought," picks an expiration date, confirms. (This checks the item and adds a pantry row.)
3. Before Roommate B's screen has received A's update (i.e. B's local list still shows "Milk" unchecked), B independently taps "Milk" → "Bought" → confirms with their own expiration date.

**What happens:** Because B's `boughtItem.isChecked` was `false` (captured before A's write propagated to B's client), B's call also computes `beingChecked = true` and adds a *second* pantry item for "Milk" — the shopping item itself ends up correctly checked (idempotent for that field), but the pantry now has two duplicate rows for one purchase.
**What should happen:** Only the first check-in should create a pantry entry; the second (redundant) check should be a no-op for the pantry side effect.

**Severity:** wrong-data.

**Minimal fix:** Before adding to pantry, read the item's current server state (or pass/derive `beingChecked` from a value read inside a transaction alongside the `isChecked` write) and only run the pantry-add block if the write actually flipped the value from `false`→`true`, e.g. wrap the check in a `runTransaction` that reads `isChecked` fresh and bails out if it's already `true`.

---

### 2. No drag-reorder feature exists for the shopping list
**File/line:** N/A — confirmed by repo-wide grep for `Draggable`: the only usage of `react-native-draggable-flatlist` in the entire codebase is `src/components/settings/RotationCard.tsx:15,197` (the chore rotation-order editor). `app/(tabs)/shopping.tsx` has no drag/reorder code at all.

Noting this so it's clear the "drag reorder persistence" focus area was checked, not skipped — there is currently no such feature on the Shopping screen to have a persistence bug in.

---

## AUTH + HOUSE

### 1. New-user first login: `isLoading` can go `false` for one render before `userProfile` is ever set
**File/line:** `src/hooks/useAuth.ts:92-112`

```ts
} else {
  console.log('[Auth] no profile doc — creating one');
  const color = ROOMMATE_COLORS[...];
  await setDoc(userDoc(firebaseUser.uid), {...});
  console.log('[Auth] profile doc created, waiting for snapshot re-fire');
  return;
}
...
} finally {
  console.log('[Auth] setIsLoading(false)');
  setIsLoading(false);
}
```

The `else` branch (profile doc doesn't exist yet — true for every brand-new signup) creates the doc and `return`s without ever calling `setUserProfile(...)`. The `finally` still runs on that `return`, so `setIsLoading(false)` fires immediately — before the `onSnapshot` listener re-fires with the just-created doc. For one render, `authStore` holds `{firebaseUser: <set>, userProfile: null, isLoading: false}`.

**Repro steps:** Sign up as a brand new user and observe app state immediately after account creation (e.g. via a debug overlay or React DevTools on the `authStore`), before the profile snapshot re-fires (typically tens of milliseconds).

**What happens:** `AuthGate` (`app/_layout.tsx:95-122`) reads this state and, since `isLoading` is `false` and `userProfile?.houseId` is falsy (because `userProfile` is `null`), routes to `/(auth)/home-choice` — which happens to be the *correct* destination for a genuinely house-less new user too, so this specific consumer doesn't misbehave. But the general contract "`isLoading === false` implies `userProfile` is loaded" is violated for that one render; any other current or future code that reads `userProfile` directly once `isLoading` is false (rather than going through `AuthGate`'s redirect) would see `null` and could crash on an unguarded `userProfile.foo` access. I checked `app/(auth)/home-choice.tsx` specifically (grep for `userProfile.`) and found no direct dereference there, so this is not currently crash-triggering in the one place it's reachable.

**What should happen:** `isLoading` shouldn't flip to `false` until `userProfile` has actually been populated (or explicitly confirmed absent-and-unrecoverable).

**Severity:** cosmetic (self-heals within one Firestore round-trip; not currently reachable as a crash given today's consumers, but a latent trap for the next screen that reads `userProfile` without a null check).

**Minimal fix:** Don't `return` out of the `else` branch before the profile is actually available — either wait for the snapshot's re-fire before calling `setIsLoading(false)` (e.g. skip the `finally`'s `setIsLoading(false)` on the create-path and let the next snapshot invocation's `if (snap.exists())` branch set it), or optimistically `setUserProfile()` with the same object just written to Firestore.

---

### 2. The last member leaving a house leaves an orphaned, empty house document with all its data intact
**File/line:** `src/firebase/house.ts:15-23` (`leaveHouse`)

`leaveHouse` unconditionally removes the uid from `memberIds` with no check for whether `memberIds` was already down to 1. There is no cleanup of the house document itself, nor of its `chores`/`events`/`pantryItems`/`shoppingItems` subcollections.

**Repro steps:** As the sole remaining member of a house, go to Settings → Leave House.
**What happens:** The house document persists indefinitely with `memberIds: []` and its original `inviteCode` still valid — all previously-created chores/pantry/shopping/calendar data for that house remains in Firestore, un-owned and unreachable from the UI (no member can query it) unless someone later joins via the still-live invite code, at which point they'd inherit a house pre-populated with a stranger's old chores/pantry/shopping data.
**What should happen:** Unverified whether persisting the house for potential rejoining is an intentional design choice; flagging because it's a real, reachable behavior with no explicit handling either way (no confirmation dialog mentions this, and I did not find any Cloud Function that garbage-collects zero-member houses).

**Severity:** cosmetic (no crash, no immediately-visible wrong data for the leaving user — the consequence is a dormant orphaned record and a slightly surprising invite-code-rejoin experience).

**Minimal fix:** In `leaveHouse`, if `memberIds` would become empty, either delete the house doc (and ideally its subcollections via a Cloud Function, since client-side subcollection deletion is unbounded) or explicitly mark it archived so it can't be rejoined via invite code.
