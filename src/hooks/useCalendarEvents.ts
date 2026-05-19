import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { eventsCol, eventDoc } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import {
  getOrCreateHomieCalendar,
  addEventToDeviceCalendar,
} from '@/src/utils/calendarSync';
import { sendEventAssignedPush } from '@/src/utils/pushNotifications';
import type { CalendarEvent } from '@/src/types';

export interface NewEventInput {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  assignedTo: string[];
}

async function syncEventForCurrentUser(params: {
  eventFirestoreId: string;
  houseId: string;
  userId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  const calendarId = await getOrCreateHomieCalendar();
  if (!calendarId) return;

  const nativeId = await addEventToDeviceCalendar({
    title: params.title,
    description: params.description,
    startDate: params.startDate,
    endDate: params.endDate,
    calendarId,
  });
  if (!nativeId) return;

  await updateDoc(eventDoc(params.houseId, params.eventFirestoreId), {
    [`deviceCalendarIds.${params.userId}`]: nativeId,
  });
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

  // Reconciliation: sync any assigned events that haven't been written to the device calendar yet
  useEffect(() => {
    if (!events.length || !userProfile || !houseId) return;

    const unsynced = events.filter(
      (e) =>
        e.assignedTo?.includes(userProfile.id) &&
        !e.deviceCalendarIds?.[userProfile.id]
    );
    if (!unsynced.length) return;

    (async () => {
      for (const event of unsynced) {
        await syncEventForCurrentUser({
          eventFirestoreId: event.id,
          houseId,
          userId: userProfile.id,
          title: event.title,
          description: event.description,
          startDate: event.startTime.toDate(),
          endDate: event.endTime.toDate(),
        });
      }
    })();
  }, [events, userProfile?.id, houseId]);

  const addEvent = async (input: NewEventInput) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');

    const docRef = await addDoc(eventsCol(houseId), {
      id: '',
      title: input.title,
      description: input.description,
      startTime: Timestamp.fromDate(input.startTime),
      endTime: Timestamp.fromDate(input.endTime),
      color: userProfile.color,
      googleEventId: null,
      assignedTo: input.assignedTo,
      deviceCalendarIds: {},
      createdBy: userProfile.id,
      createdAt: serverTimestamp(),
    } as any);

    // Immediately sync to device calendar if the current user is assigned
    if (input.assignedTo.includes(userProfile.id)) {
      await syncEventForCurrentUser({
        eventFirestoreId: docRef.id,
        houseId,
        userId: userProfile.id,
        title: input.title,
        description: input.description,
        startDate: input.startTime,
        endDate: input.endTime,
      });
    }

    // Notify any other assigned roommates so their reconciliation effect fires
    const otherAssignees = input.assignedTo.filter((uid) => uid !== userProfile.id);
    if (otherAssignees.length > 0) {
      sendEventAssignedPush({
        assigneeUserIds: otherAssignees,
        eventTitle: input.title,
        assignerName: userProfile.displayName,
      }).catch(() => {
        // Non-critical — roommate will still sync next time they open the app
      });
    }
  };

  const updateEvent = async (id: string, updates: NewEventInput) => {
    if (!houseId) throw new Error('No house connected.');
    await updateDoc(eventDoc(houseId, id), {
      title: updates.title,
      description: updates.description,
      startTime: Timestamp.fromDate(updates.startTime),
      endTime: Timestamp.fromDate(updates.endTime),
      assignedTo: updates.assignedTo,
    });
  };

  return { events, isLoading, addEvent, updateEvent };
}
