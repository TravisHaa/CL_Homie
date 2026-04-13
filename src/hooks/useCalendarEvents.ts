import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { eventsCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import type { CalendarEvent } from '@/src/types';

export interface NewEventInput {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
}

export function useCalendarEvents() {
  const houseId = useHouseStore((s) => s.house?.id ?? null);
  const userProfile = useAuthStore((s) => s.userProfile);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', houseId],
    queryFn: () => Promise.resolve([] as CalendarEvent[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;

    const unsub = onSnapshot(eventsCol(houseId), (snap) => {
      const evts = snap.docs.map((d) => d.data());
      evts.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
      queryClient.setQueryData(['events', houseId], evts);
    });

    return unsub;
  }, [houseId, queryClient]);

  const addEvent = async (input: NewEventInput) => {
    if (!houseId || !userProfile) return;

    await addDoc(eventsCol(houseId), {
      id: '',
      title: input.title,
      description: input.description,
      startTime: Timestamp.fromDate(input.startTime),
      endTime: Timestamp.fromDate(input.endTime),
      color: userProfile.color,
      googleEventId: null,
      createdBy: userProfile.id,
      createdAt: serverTimestamp(),
    } as any);
  };

  return { events, isLoading, addEvent };
}
