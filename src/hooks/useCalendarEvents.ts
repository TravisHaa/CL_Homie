import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { eventsCol, eventDoc } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import {
  getOrCreateHomieCalendar,
  addEventToDeviceCalendar,
  updateEventOnDeviceCalendar,
  removeEventFromDeviceCalendar,
} from '@/src/utils/calendarSync';
import { getOrCreateDeviceId } from '@/src/utils/deviceId';
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
  deviceKey: string;
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
    [`deviceCalendarIds.${params.deviceKey}`]: nativeId,
  });
}

export function useCalendarEvents() {
  const houseId = useHouseStore((s) => s.house?.id ?? null);
  const userProfile = useAuthStore((s) => s.userProfile);
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', houseId],
    queryFn: () => Promise.resolve([] as CalendarEvent[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;

    const unsub = onSnapshot(
      eventsCol(houseId),
      (snap) => {
        const evts = snap.docs.map((d) => d.data());
        evts.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
        queryClient.setQueryData(['events', houseId], evts);
      },
      (err) => {
        if (err.code !== 'permission-denied') console.error('[useCalendarEvents]', err);
      }
    );

    return unsub;
  }, [houseId, queryClient]);

  // Reconciliation: sync any assigned events that haven't been written to
  // this device's native calendar yet. This is the *only* place that syncs
  // a newly-created event to the device calendar — addEvent used to also
  // call syncEventForCurrentUser directly, which raced with this effect
  // (both would fire for a self-assigned event) and could create two
  // duplicate native calendar entries for the same event.
  useEffect(() => {
    if (!events.length || !userProfile || !houseId || !deviceId) return;

    const deviceKey = `${userProfile.id}:${deviceId}`;
    const unsynced = events.filter(
      (e) =>
        e.assignedTo?.includes(userProfile.id) &&
        !e.deviceCalendarIds?.[deviceKey]
    );
    if (!unsynced.length) return;

    (async () => {
      for (const event of unsynced) {
        await syncEventForCurrentUser({
          eventFirestoreId: event.id,
          houseId,
          deviceKey,
          title: event.title,
          description: event.description,
          startDate: event.startTime.toDate(),
          endDate: event.endTime.toDate(),
        });
      }
    })();
  }, [events, userProfile?.id, houseId, deviceId]);

  const addEvent = async (input: NewEventInput) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');

    await addDoc(eventsCol(houseId), {
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

    // Device-calendar sync for the current user (and every other assignee on
    // their own devices) happens via the reconciliation effect above once the
    // onSnapshot listener picks up this new doc — no explicit sync call here.

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

    // Keep this device's own already-synced native calendar entry (if any)
    // in sync too — Firestore has no native updateEventAsync call otherwise,
    // so an edit here previously left the device calendar showing stale data.
    if (userProfile && deviceId) {
      const deviceKey = `${userProfile.id}:${deviceId}`;
      const existing = events.find((e) => e.id === id);
      const nativeId = existing?.deviceCalendarIds?.[deviceKey];
      if (nativeId) {
        await updateEventOnDeviceCalendar({
          nativeEventId: nativeId,
          title: updates.title,
          description: updates.description,
          startDate: updates.startTime,
          endDate: updates.endTime,
        });
      }
    }
  };

  const deleteEvent = async (id: string) => {
    if (!houseId) throw new Error('No house connected.');
    const existing = events.find((e) => e.id === id);
    if (existing?.deviceCalendarIds) {
      for (const nativeId of Object.values(existing.deviceCalendarIds)) {
        if (nativeId) await removeEventFromDeviceCalendar(nativeId);
      }
    }
    await deleteDoc(eventDoc(houseId, id));
  };

  return { events, isLoading, addEvent, updateEvent, deleteEvent };
}
