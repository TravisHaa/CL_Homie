import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { eventsCol, eventDoc } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import {
  getOrCreateHomieCalendar,
  addEventToDeviceCalendar,
  updateEventInDeviceCalendar,
  removeEventFromDeviceCalendar,
} from '@/src/utils/calendarSync';
import { sendEventAssignedPush } from '@/src/utils/pushNotifications';
import type { CalendarEvent } from '@/src/types';

// Shape we cache per event to detect when an already-synced device-calendar
// entry needs an update.
interface SyncedShape {
  title: string;
  description: string;
  start: number;
  end: number;
}

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

  // Per-user device-calendar reconciliation state.
  // NOTE: each device only stores its OWN native event id (in
  // deviceCalendarIds[me]). Other assignees converge on their own device the
  // next time their snapshot listener fires or the app foregrounds — there is
  // no cross-device propagation here, only local edit/delete mirroring.
  // Last-synced shape per eventId, so we can detect content edits.
  const syncedShapes = useRef<Map<string, SyncedShape>>(new Map());
  // Set of event ids that currently have deviceCalendarIds[me] — used to
  // detect events deleted from Firestore (gone from `events`) so we can remove
  // the orphaned native event.
  const hadNativeIds = useRef<Set<string>>(new Set());
  // Companion to hadNativeIds: eventId -> this user's native id, so a
  // DELETE-DIFF (doc gone from `events`) can still resolve the native id to
  // remove from the device calendar.
  const nativeIdByEvent = useRef<Map<string, string>>(new Map());

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

  // Reconciliation: mirror this user's assigned events into their device
  // calendar. Handles ADD / UPDATE / UNASSIGN / DELETE-DIFF for `me` only.
  useEffect(() => {
    if (!userProfile || !houseId) return;
    const me = userProfile.id;

    // DELETE-DIFF: ids that had a native event last run but no longer appear in
    // `events` (the Firestore doc was deleted by another client).
    // The doc is gone from Firestore, so its native id is no longer in
    // `events`; we recover it from nativeIdByEvent (cached on the prior run).
    const presentIds = new Set(events.map((e) => e.id));
    const deletedNative: string[] = [];
    for (const prevId of hadNativeIds.current) {
      if (!presentIds.has(prevId)) deletedNative.push(prevId);
    }

    // Build the next-run refs and gather actionable diffs.
    const nextHadNative = new Set<string>();
    const adds: CalendarEvent[] = [];
    const updates: { e: CalendarEvent; nativeId: string }[] = [];
    const unassigns: { e: CalendarEvent; nativeId: string }[] = [];

    for (const e of events) {
      const nativeId = e.deviceCalendarIds?.[me];
      const assigned = e.assignedTo?.includes(me);

      if (assigned && !nativeId) {
        // ADD: assigned but not yet on this device.
        adds.push(e);
      } else if (assigned && nativeId) {
        // Possible UPDATE: compare current content against last-synced shape.
        nextHadNative.add(e.id);
        const prev = syncedShapes.current.get(e.id);
        const cur: SyncedShape = {
          title: e.title,
          description: e.description,
          start: e.startTime.toMillis(),
          end: e.endTime.toMillis(),
        };
        if (
          !prev ||
          prev.title !== cur.title ||
          prev.description !== cur.description ||
          prev.start !== cur.start ||
          prev.end !== cur.end
        ) {
          updates.push({ e, nativeId });
        }
      } else if (!assigned && nativeId) {
        // UNASSIGN: removed from assignees but native id lingers.
        unassigns.push({ e, nativeId });
      }
    }

    // Resolve native ids for DELETE-DIFF from the prior snapshot cache. The
    // current `events` no longer contains them, so read the native id we cached
    // when they last had one. We stash native ids alongside the shape cache.
    const deletes: string[] = [];
    for (const id of deletedNative) {
      const nativeId = nativeIdByEvent.current.get(id);
      if (nativeId) deletes.push(nativeId);
    }

    // Rebuild nativeIdByEvent for the next run from currently-present events.
    nativeIdByEvent.current = new Map();
    for (const e of events) {
      const nid = e.deviceCalendarIds?.[me];
      if (nid) nativeIdByEvent.current.set(e.id, nid);
    }

    hadNativeIds.current = nextHadNative;

    if (!adds.length && !updates.length && !unassigns.length && !deletes.length) {
      return;
    }

    (async () => {
      for (const e of adds) {
        await syncEventForCurrentUser({
          eventFirestoreId: e.id,
          houseId,
          userId: me,
          title: e.title,
          description: e.description,
          startDate: e.startTime.toDate(),
          endDate: e.endTime.toDate(),
        });
        syncedShapes.current.set(e.id, {
          title: e.title,
          description: e.description,
          start: e.startTime.toMillis(),
          end: e.endTime.toMillis(),
        });
      }

      for (const { e, nativeId } of updates) {
        await updateEventInDeviceCalendar(nativeId, {
          title: e.title,
          notes: e.description,
          startDate: e.startTime.toDate(),
          endDate: e.endTime.toDate(),
        });
        // No Firestore write — the native id is unchanged.
        syncedShapes.current.set(e.id, {
          title: e.title,
          description: e.description,
          start: e.startTime.toMillis(),
          end: e.endTime.toMillis(),
        });
      }

      for (const { e, nativeId } of unassigns) {
        await removeEventFromDeviceCalendar(nativeId);
        await updateDoc(eventDoc(houseId, e.id), {
          [`deviceCalendarIds.${me}`]: deleteField(),
        });
        syncedShapes.current.delete(e.id);
      }

      for (const nativeId of deletes) {
        await removeEventFromDeviceCalendar(nativeId);
      }
      for (const id of deletedNative) {
        syncedShapes.current.delete(id);
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
      googleEventId: {},
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

  const deleteEvent = async (id: string) => {
    if (!houseId || !userProfile) throw new Error('No house connected.');
    const evt = events.find((e) => e.id === id);
    const myNativeId = evt?.deviceCalendarIds?.[userProfile.id];
    if (myNativeId) await removeEventFromDeviceCalendar(myNativeId);
    await deleteDoc(eventDoc(houseId, id));
  };

  return { events, isLoading, addEvent, updateEvent, deleteEvent };
}
