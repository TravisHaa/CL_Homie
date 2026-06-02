# Homie Cloud Functions

Server-side scheduled jobs for Homie. The current deliverable is the
**daily chore reset** (`dailyChoreReset`), which is the authoritative
(and only) source for advancing each house's recurring chores to the
current day / week / month. The client has no rollover code path of its
own — it just observes Firestore state mutated by this function.

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
> dailyChoreReset()     # invokes the scheduled function once (cadence-respecting; off-cycle calls only uncross)

# Force-rotate every recurring chore by one step regardless of cadence
# (useful for testing rotation off-cycle). Production cron never sets force=true.
> require('./lib/jobs/dailyChoreReset').runDailyChoreReset(new Date(), { force: true })
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
resource.labels.function_name="dailyChoreReset"
```

The function emits structured events with severities `info` and `error`:

- `dailyChoreReset.start` — `{ targetWeekKey, targetDayKey, houseCount }`
- `dailyChoreReset.house` — `{ houseId, status, rolled, weeksAdvanced, errorMessage? }`
  where `status` is one of `rolled | noop | empty | error`.
- `dailyChoreReset.end` — `{ durationMs, totals: { rolled, noop, empty, errors } }`

No PII is logged; only `houseId` and counts.

## Schedule

`1 0 * * *` in `America/Los_Angeles` — every day at 00:01 Pacific, the
first minute of the new calendar day and well clear of the 02:00 DST
jumps. Daily firing is required for correctness: cadences whose due-day
isn't a Monday (e.g. a "Wednesday only" custom-weeks chore or a "day 15"
monthly chore) need their `weekKey` re-stamped on the day they actually
fire, otherwise the `useChores` listener (which filters by `weekKey ==
currentWeek`) silently hides them from the Chores tab. The handler is
idempotent within a day, so repeated invocations are safe.
