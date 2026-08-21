import { getDocs } from 'firebase/firestore';
import { devicesCol } from '@/src/firebase/firestore';
import type { NoticePushData } from '@/src/types';

async function collectTokens(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const tokenResults = await Promise.all(userIds.map((uid) => getDocs(devicesCol(uid))));
  const tokens: string[] = [];
  for (const snap of tokenResults) {
    for (const doc of snap.docs) {
      const device = doc.data();
      if (device.notificationsEnabled && device.expoPushToken) tokens.push(device.expoPushToken);
    }
  }
  return tokens;
}

export async function sendEventAssignedPush(params: {
  assigneeUserIds: string[];
  eventTitle: string;
  assignerName: string;
}): Promise<void> {
  const tokens = await collectTokens(params.assigneeUserIds);
  if (!tokens.length) return;

  const messages = tokens.map((token) => ({
    to: token,
    title: `${params.assignerName} added you to an event`,
    body: params.eventTitle,
    data: { type: 'calendar_event' },
    sound: 'default',
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}

export async function sendNoticePush(params: {
  recipientUserIds: string[];
  houseId: string;
  noticeId: string;
  title: string;
  notes: string;
  authorName: string;
}): Promise<void> {
  const tokens = await collectTokens(params.recipientUserIds);
  if (!tokens.length) return;

  const data: NoticePushData = { type: 'notice', houseId: params.houseId, noticeId: params.noticeId };
  const messages = tokens.map((token) => ({
    to: token,
    title: `${params.authorName} posted a notice`,
    body: params.notes ? `${params.title} — ${params.notes}` : params.title,
    data,
    sound: 'default',
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}
