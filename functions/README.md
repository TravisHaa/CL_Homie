# Homie Cloud Functions

Server-side scheduled jobs for Homie. The current deliverable is the
**weekly chore reset** (`weeklyChoreReset`), which is the authoritative
source for advancing each house's recurring chores to the new week.
The client-side rollover in `src/firebase/choreRollover.ts` is a
temporary same-session fallback and will be retired in a follow-up issue
once this function is observed running cleanly in production.

## Prerequisites (one-time)

1. Upgrade the Firebase project to the **Blaze (pay-as-you-go)** plan.
   Cloud Functions cannot be deployed on the Spark plan.
2. Set your Firebase project alias in `../.firebaserc` (replace
   `<replace-me>`).
3. Install the Firebase CLI globally if you haven't already:
   `npm install -g firebase-tools`
4. Sign in: `firebase login`.
5. Set a small billing budget + alert in the GCP console as a safety net.

The first `firebase deploy` will prompt you to enable required APIs:
Cloud Functions, Cloud Build, Artifact Registry, Cloud Scheduler,
Pub/Sub, Eventarc.

## Local development

```bash
# From this directory:
npm install
npm run build           # one-shot TypeScript build
npm run build:watch     # rebuild on change

# From the repo root, run the functions + Firestore emulators:
firebase emulators:start --only functions,firestore

# Or use the Functions shell to invoke handlers manually:
npm run shell
> weeklyChoreReset()    # invokes the scheduled function once
```

The emulators do **not** require the Blaze plan.

## Deploy

```bash
npm run deploy
```

## Observability

Cloud Logging filter for this function:

```
resource.type="cloud_function"
resource.labels.function_name="weeklyChoreReset"
```

The function emits structured events with severities `info` and `error`:

- `weeklyChoreReset.start` — `{ targetWeekKey, targetDayKey, houseCount }`
- `weeklyChoreReset.house` — `{ houseId, status, rolled, weeksAdvanced, errorMessage? }`
  where `status` is one of `rolled | noop | empty | error`.
- `weeklyChoreReset.end` — `{ durationMs, totals: { rolled, noop, empty, errors } }`

No PII is logged; only `houseId` and counts.

## Schedule

`0 23 * * 0` in `America/Los_Angeles` — late Sunday Pacific, just before
the Monday ISO-week flip. The handler computes its target week from
`nextMondayDate(now)` rather than `now`, so a small schedule drift in
either direction does not change the resulting `weekKey`.
