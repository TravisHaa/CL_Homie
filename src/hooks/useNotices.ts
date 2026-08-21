import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { noticesCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import { sendNoticePush } from '@/src/utils/pushNotifications';
import type { Notice, NoticeTag } from '@/src/types';

export interface NewNoticeInput {
  title: string;
  notes: string;
  tag: NoticeTag | null;
  scheduledAt: Date | null;
}

export function useNotices() {
  const houseId = useHouseStore((s) => s.house?.id ?? null);
  const memberIds = useHouseStore((s) => s.house?.memberIds ?? []);
  const userProfile = useAuthStore((s) => s.userProfile);
  const queryClient = useQueryClient();

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices', houseId],
    queryFn: () => Promise.resolve([] as Notice[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;

    const unsub = onSnapshot(
      noticesCol(houseId),
      (snap) => {
        const items = snap.docs.map((d) => d.data());
        items.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        queryClient.setQueryData(['notices', houseId], items);
      },
      (err) => {
        if (err.code !== 'permission-denied') console.error('[useNotices]', err);
      }
    );

    return unsub;
  }, [houseId, queryClient]);

  const addNotice = async (input: NewNoticeInput) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');

    // A notice "sends" immediately unless the author picked a future time.
    const isFuture = !!input.scheduledAt && input.scheduledAt.getTime() > Date.now();
    const status = isFuture ? 'scheduled' : 'sent';

    const docRef = await addDoc(noticesCol(houseId), {
      id: '',
      title: input.title,
      notes: input.notes,
      tag: input.tag,
      createdBy: userProfile.id,
      createdByName: userProfile.displayName,
      status,
      scheduledAt: input.scheduledAt ? Timestamp.fromDate(input.scheduledAt) : null,
      sentAt: status === 'sent' ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
    } as any);

    if (status === 'sent') {
      const recipients = memberIds.filter((uid) => uid !== userProfile.id);
      if (recipients.length > 0) {
        sendNoticePush({
          recipientUserIds: recipients,
          houseId,
          noticeId: docRef.id,
          title: input.title,
          notes: input.notes,
          authorName: userProfile.displayName,
        }).catch(() => {
          // Non-critical — the notice is already posted and visible on the board.
        });
      }
    }
    // Scheduled notices are picked up and pushed by the sendScheduledNotices
    // Cloud Function once scheduledAt has passed (functions/jobs/sendScheduledNotices.ts).
  };

  return { notices, isLoading, addNotice };
}
