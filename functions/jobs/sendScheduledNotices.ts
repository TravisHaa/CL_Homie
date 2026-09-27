/**
 * Fires notice-board notices whose author scheduled them for a future time.
 *
 * `useNotices.addNotice` (src/hooks/useNotices.ts) writes a notice with
 * `status: 'scheduled'` when the author picks a future send time, and sends
 * the push immediately (status: 'sent') otherwise. This job is the other half
 * of that contract: every 5 minutes it scans all houses' `notices`
 * subcollections for `status == 'scheduled' && scheduledAt <= now`, pushes to
 * every house member except the author, and flips the doc to `sent`.
 *
 * Runs frequently (vs. daily) because a schedule granularity coarser than a
 * few minutes would make "sends at 3:05pm" visibly wrong to users.
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { ExpoPushMessage, sendExpoPushMessages } from '../src/push';

if (getApps().length === 0) {
  initializeApp();
}

interface NoticeDoc {
  title: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  status: 'sent' | 'scheduled';
  scheduledAt: Timestamp | null;
}

interface DeviceToken {
  expoPushToken: string | null;
  notificationsEnabled: boolean;
}

async function collectRecipientTokens(
  db: Firestore,
  memberIds: string[],
  excludeUserId: string
): Promise<string[]> {
  const recipients = memberIds.filter((id) => id !== excludeUserId);
  if (recipients.length === 0) return [];

  const snaps = await Promise.all(
    recipients.map((uid) => db.collection('users').doc(uid).collection('devices').get())
  );

  const tokens = new Set<string>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const device = doc.data() as DeviceToken;
      if (device.notificationsEnabled === true && device.expoPushToken) {
        tokens.add(device.expoPushToken);
      }
    }
  }
  return [...tokens];
}

interface HouseResult {
  houseId: string;
  due: number;
  sent: number;
  errors: number;
}

async function processHouse(db: Firestore, houseId: string, now: Date): Promise<HouseResult> {
  const result: HouseResult = { houseId, due: 0, sent: 0, errors: 0 };

  const houseSnap = await db.collection('houses').doc(houseId).get();
  const memberIds: string[] = houseSnap.data()?.memberIds ?? [];

  const dueSnap = await db
    .collection('houses')
    .doc(houseId)
    .collection('notices')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', Timestamp.fromDate(now))
    .get();

  result.due = dueSnap.size;
  if (dueSnap.empty) return result;

  const batch = db.batch();
  for (const doc of dueSnap.docs) {
    const notice = doc.data() as NoticeDoc;
    const tokens = await collectRecipientTokens(db, memberIds, notice.createdBy);

    if (tokens.length > 0) {
      const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        title: `${notice.createdByName} posted a notice`,
        body: notice.notes ? `${notice.title} — ${notice.notes}` : notice.title,
        data: { type: 'notice', houseId, noticeId: doc.id },
        sound: 'default',
      }));

      if (process.env.FUNCTIONS_EMULATOR) {
        logger.info('sendScheduledNotices.emulator_mock_send', { houseId, noticeId: doc.id, messageCount: messages.length });
        result.sent += messages.length;
      } else {
        const sendResult = await sendExpoPushMessages(messages);
        result.sent += sendResult.sent;
        result.errors += sendResult.errors;
      }
    }

    batch.update(doc.ref, { status: 'sent', sentAt: Timestamp.fromDate(now) });
  }
  await batch.commit();

  return result;
}

export async function runSendScheduledNotices(now: Date = new Date()): Promise<HouseResult[]> {
  const db = getFirestore();
  const housesSnap = await db.collection('houses').get();
  const houseIds = housesSnap.docs.map((d) => d.id);

  const settled = await Promise.allSettled(houseIds.map((id) => processHouse(db, id, now)));

  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    logger.error('sendScheduledNotices.house', {
      houseId: houseIds[i],
      errorMessage: s.reason instanceof Error ? s.reason.message : String(s.reason),
    });
    return { houseId: houseIds[i], due: 0, sent: 0, errors: 1 };
  });
}

export const sendScheduledNotices = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'us-central1',
    retryCount: 0,
  },
  async (_event) => {
    const results = await runSendScheduledNotices();
    const totals = results.reduce(
      (acc, r) => ({
        due: acc.due + r.due,
        sent: acc.sent + r.sent,
        errors: acc.errors + r.errors,
      }),
      { due: 0, sent: 0, errors: 0 }
    );
    if (totals.due > 0) {
      logger.info('sendScheduledNotices.run', totals);
    }
  }
);
