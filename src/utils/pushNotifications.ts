import { getDocs } from 'firebase/firestore';
import { devicesCol } from '@/src/firebase/firestore';

export async function sendEventAssignedPush(params: {
  assigneeUserIds: string[];
  eventTitle: string;
  assignerName: string;
}): Promise<void> {
  if (!params.assigneeUserIds.length) return;

  // Collect push tokens from each assignee's devices subcollection
  const tokenResults = await Promise.all(
    params.assigneeUserIds.map((uid) => getDocs(devicesCol(uid)))
  );

  const tokens: string[] = [];
  for (const snap of tokenResults) {
    for (const doc of snap.docs) {
      const token = doc.data().expoPushToken;
      if (token) tokens.push(token);
    }
  }

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
