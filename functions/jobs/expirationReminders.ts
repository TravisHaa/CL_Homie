/**
 * Daily pantry-expiry reminder push notifications (#35).
 *
 * Runs every day at 09:00 America/Los_Angeles. For each house it scans the
 * `pantryItems` subcollection for items expiring within the next 3 days
 * (inclusive of today), groups them by owner, and sends ONE summary push per
 * registered device. Notified items are stamped with `notifiedExpiryFor =
 * <today-day-key>` so a same-day re-run (retry, manual shell invocation) does
 * not double-notify.
 *
 * Why a local copy of the day-key / expiry helpers instead of importing from
 * `src/`: the client utilities (`src/hooks/usePantry.ts`, `src/utils/weekKey.ts`)
 * import the Firebase web SDK and the React Native runtime, which cannot load
 * inside a Node.js Cloud Function. The Admin SDK is used here; the helpers below
 * mirror the client logic verbatim.
 *
 * Observability — structured Cloud Logging events (counts only, no PII):
 *   - expirationReminders.start  { todayDayKey, houseCount }
 *   - expirationReminders.house  { houseId, expiringItems, owners, devices, sent, errors }
 *   - expirationReminders.end    { durationMs, totals }
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import {
  Firestore,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { ExpoPushMessage, sendExpoPushMessages } from '../src/push';

// ---------------------------------------------------------------------------
// Admin SDK init (idempotent — required for emulator + production reuse).
// ---------------------------------------------------------------------------

if (getApps().length === 0) {
  initializeApp();
}

const TIME_ZONE = 'America/Los_Angeles';
const EXPIRY_WINDOW_DAYS = 3;

// ---------------------------------------------------------------------------
// Local types — minimal projections of the shapes in `src/types/index.ts`.
// ---------------------------------------------------------------------------

interface PantryItem {
  id: string;
  name: string;
  expirationDate: Timestamp | null;
  ownedBy: string;
  notifiedExpiryFor?: string | null;
}

interface DeviceToken {
  expoPushToken: string | null;
  notificationsEnabled: boolean;
}

// Mirror of `PantryExpiryPushData` in src/types/index.ts (functions can't
// import from src/). Keep in lockstep with the client deep-link router.
interface PantryExpiryPushData {
  type: 'pantry_expiry';
  houseId: string;
  itemId: string;
  itemName?: string;
  daysUntilExpiry?: number;
}

// ---------------------------------------------------------------------------
// Day-key / expiry helpers — mirror `src/hooks/usePantry.ts` (daysUntilExpiry)
// and the YYYY-MM-DD day-key convention used by weeklyChoreReset. Timezone math
// is done with Intl.DateTimeFormat (zero runtime deps; matches the date-fns the
// rest of functions/ already pins).
// ---------------------------------------------------------------------------

const PT_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Stable PT day identifier like "2026-05-28". */
function getDayKey(date: Date): string {
  // en-CA renders as YYYY-MM-DD.
  return PT_FORMATTER.format(date);
}

/**
 * Start of the PT calendar day containing `now`, expressed as a real instant.
 * Computed by measuring PT's offset from UTC at `now` and subtracting it from
 * the naive midnight of that day-key.
 */
function startOfDayPT(now: Date): Date {
  const [y, m, d] = getDayKey(now).split('-').map(Number);
  const naiveMidnightUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  // Offset (ms) between PT wall-clock and UTC at `now`.
  const offsetMs = ptOffsetMs(now);
  return new Date(naiveMidnightUtc - offsetMs);
}

/** PT UTC-offset in ms at the given instant (negative west of UTC). */
function ptOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );
  return asUtc - at.getTime();
}

/** Calendar-day difference between two instants in PT (b - a). */
function daysBetweenPT(a: Date, b: Date): number {
  const [ay, am, ad] = getDayKey(a).split('-').map(Number);
  const [by, bm, bd] = getDayKey(b).split('-').map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Per-house processing.
// ---------------------------------------------------------------------------

interface HouseResult {
  houseId: string;
  expiringItems: number;
  owners: number;
  devices: number;
  sent: number;
  errors: number;
}

async function remindHouse(
  db: Firestore,
  houseId: string,
  now: Date,
  todayDayKey: string,
  startOfToday: Date,
  cutoff: Date
): Promise<HouseResult> {
  const result: HouseResult = {
    houseId,
    expiringItems: 0,
    owners: 0,
    devices: 0,
    sent: 0,
    errors: 0,
  };

  const pantryRef = db
    .collection('houses')
    .doc(houseId)
    .collection('pantryItems');

  const snap = await pantryRef
    .where('expirationDate', '<=', Timestamp.fromDate(cutoff))
    .where('expirationDate', '>=', Timestamp.fromDate(startOfToday))
    .get();

  const items = snap.docs
    .map((d) => ({
      item: { id: d.id, ...(d.data() as Omit<PantryItem, 'id'>) },
      ref: d.ref,
    }))
    // Idempotency: skip items already notified today.
    .filter((entry) => entry.item.notifiedExpiryFor !== todayDayKey)
    .filter((entry) => entry.item.expirationDate != null);

  result.expiringItems = items.length;
  if (items.length === 0) return result;

  // Group by owner.
  const byOwner = new Map<string, typeof items>();
  for (const entry of items) {
    const owner = entry.item.ownedBy;
    if (!owner) continue;
    const bucket = byOwner.get(owner);
    if (bucket) bucket.push(entry);
    else byOwner.set(owner, [entry]);
  }
  result.owners = byOwner.size;

  const messages: ExpoPushMessage[] = [];
  const notifiedRefs: FirebaseFirestore.DocumentReference[] = [];

  for (const [ownerId, ownerItems] of byOwner) {
    // Sort by soonest-expiring so the deep-link target is the most urgent item.
    const sorted = [...ownerItems].sort((a, b) => {
      const at = a.item.expirationDate!.toMillis();
      const bt = b.item.expirationDate!.toMillis();
      return at - bt;
    });
    const soonest = sorted[0];

    const tokens = await collectOwnerTokens(db, ownerId);
    if (tokens.length === 0) continue;
    result.devices += tokens.length;

    const count = sorted.length;
    const data: PantryExpiryPushData = {
      type: 'pantry_expiry',
      houseId,
      itemId: soonest.item.id,
      itemName: soonest.item.name,
      daysUntilExpiry: Math.max(
        0,
        daysBetweenPT(now, soonest.item.expirationDate!.toDate())
      ),
    };

    for (const token of tokens) {
      messages.push({
        to: token,
        title: 'Food expiring soon',
        body: `${count} item${count === 1 ? '' : 's'} in your pantry expire within ${EXPIRY_WINDOW_DAYS} days`,
        data: data as unknown as Record<string, unknown>,
        sound: 'default',
      });
    }

    // Stamp every item for this owner regardless of token count? No — only
    // stamp when at least one device was targeted, so an owner with no device
    // can still be notified later that day once they register.
    for (const entry of sorted) notifiedRefs.push(entry.ref);
  }

  if (messages.length === 0) return result;

  // Guard the real Expo POST under the emulator.
  if (process.env.FUNCTIONS_EMULATOR) {
    logger.info('expirationReminders.emulator_mock_send', {
      houseId,
      messageCount: messages.length,
      messages,
    });
    result.sent = messages.length;
  } else {
    const sendResult = await sendExpoPushMessages(messages);
    result.sent = sendResult.sent;
    result.errors = sendResult.errors;
  }

  // Batch-write the idempotency stamp on every notified item.
  const batch = db.batch();
  for (const ref of notifiedRefs) {
    batch.update(ref, { notifiedExpiryFor: todayDayKey });
  }
  await batch.commit();

  return result;
}

/**
 * Reads `users/{uid}/devices` via the Admin SDK and returns the distinct,
 * non-empty Expo push tokens for devices with notifications enabled.
 */
async function collectOwnerTokens(
  db: Firestore,
  ownerId: string
): Promise<string[]> {
  const devicesSnap = await db
    .collection('users')
    .doc(ownerId)
    .collection('devices')
    .get();

  const tokens = new Set<string>();
  for (const doc of devicesSnap.docs) {
    const device = doc.data() as DeviceToken;
    if (device.notificationsEnabled === true && device.expoPushToken) {
      tokens.add(device.expoPushToken);
    }
  }
  return [...tokens];
}

// ---------------------------------------------------------------------------
// Orchestrator. Exported (without the schedule wrapper) so it can be invoked
// directly from the Functions shell or unit tests.
// ---------------------------------------------------------------------------

export interface ExpirationRunSummary {
  durationMs: number;
  totals: {
    houses: number;
    expiringItems: number;
    owners: number;
    devices: number;
    sent: number;
    errors: number;
  };
  results: HouseResult[];
}

export async function runExpirationReminders(
  now: Date = new Date()
): Promise<ExpirationRunSummary> {
  const db = getFirestore();
  const startedAt = Date.now();

  const todayDayKey = getDayKey(now);
  const startOfToday = startOfDayPT(now);
  const cutoff = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86_400_000);

  const housesSnap = await db.collection('houses').get();
  const houseIds = housesSnap.docs.map((d) => d.id);

  logger.info('expirationReminders.start', {
    todayDayKey,
    houseCount: houseIds.length,
  });

  const settled = await Promise.allSettled(
    houseIds.map((id) =>
      remindHouse(db, id, now, todayDayKey, startOfToday, cutoff)
    )
  );

  const results: HouseResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    const err = s.reason as Error | undefined;
    logger.error('expirationReminders.house', {
      houseId: houseIds[i],
      errorMessage: err?.message ?? String(s.reason),
    });
    return {
      houseId: houseIds[i],
      expiringItems: 0,
      owners: 0,
      devices: 0,
      sent: 0,
      errors: 1,
    };
  });

  for (const r of results) {
    logger.info('expirationReminders.house', {
      houseId: r.houseId,
      expiringItems: r.expiringItems,
      owners: r.owners,
      devices: r.devices,
      sent: r.sent,
      errors: r.errors,
    });
  }

  const totals = {
    houses: results.length,
    expiringItems: results.reduce((n, r) => n + r.expiringItems, 0),
    owners: results.reduce((n, r) => n + r.owners, 0),
    devices: results.reduce((n, r) => n + r.devices, 0),
    sent: results.reduce((n, r) => n + r.sent, 0),
    errors: results.reduce((n, r) => n + r.errors, 0),
  };

  const summary: ExpirationRunSummary = {
    durationMs: Date.now() - startedAt,
    totals,
    results,
  };

  logger.info('expirationReminders.end', {
    durationMs: summary.durationMs,
    totals,
  });

  return summary;
}

// ---------------------------------------------------------------------------
// Scheduled function. `0 9 * * *` = 09:00 daily in America/Los_Angeles.
// ---------------------------------------------------------------------------

export const expirationReminders = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: TIME_ZONE,
    region: 'us-central1',
    retryCount: 0,
  },
  async (_event) => {
    await runExpirationReminders();
  }
);
