import { db } from '@/src/firebase/config';
import { choresCol } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { computeCreationLastTriggeredKey } from '@/src/utils/choreSchedule';
import { getDayKey, getWeekKey } from '@/src/utils/weekKey';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useChores() {
  const queryClient = useQueryClient();
  const house = useHouseStore((s) => s.house);
  const houseId = house?.id ?? null;
  const userProfile = useAuthStore((s) => s.userProfile);
  const weekKey = getWeekKey();

  const { data: chores = [] } = useQuery<Chore[]>({
    queryKey: ['chores', houseId, weekKey],
    queryFn: () => Promise.resolve([] as Chore[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  // Track first-snapshot arrival for each onSnapshot listener so the UI can
  // show a real loading state during the Firestore warmup. The previous
  // `useQuery.isLoading` flipped to false instantly because the dummy queryFn
  // resolves with `[]` synchronously, which caused a flash of the empty state
  // on first mount and on every week rollover.
  const [snapshotsReady, setSnapshotsReady] = useState({ week: false, once: false });

  useEffect(() => {
    if (!houseId) return;

    // Reset readiness whenever the subscription key changes (house switch or
    // ISO-week rollover) so we re-enter the loading state until the new
    // listeners deliver their first snapshots.
    setSnapshotsReady({ week: false, once: false });

    const col = choresCol(houseId);

    // Query 1: current week's chores (recurring + once due this week)
    const q1 = query(col, where('weekKey', '==', weekKey));
    // Query 2: incomplete one-time chores from any week (catches overdue)
    const q2 = query(col, where('recurrence', '==', 'once'), where('isCompleted', '==', false));

    let weekData: Chore[] = [];
    let onceData: Chore[] = [];

    const merge = () => {
      const map = new Map<string, Chore>();
      weekData.forEach((c) => map.set(c.id, c));
      onceData.forEach((c) => map.set(c.id, c));
      const merged = Array.from(map.values());
      merged.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.title.localeCompare(b.title);
      });
      queryClient.setQueryData(['chores', houseId, weekKey], merged);
    };

    const onErr = (err: { code: string }) => {
      if (err.code !== 'permission-denied') console.error('[useChores]', err);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      weekData = snap.docs.map((d) => d.data());
      merge();
      setSnapshotsReady((s) => (s.week ? s : { ...s, week: true }));
    }, onErr);

    const unsub2 = onSnapshot(q2, (snap) => {
      onceData = snap.docs.map((d) => d.data());
      merge();
      setSnapshotsReady((s) => (s.once ? s : { ...s, once: true }));
    }, onErr);

    return () => {
      unsub1();
      unsub2();
    };
  }, [houseId, weekKey, queryClient]);

  // Loading = we have a house but at least one snapshot listener has not yet
  // delivered. With no house there is nothing to load, so don't spin forever.
  const isLoading = !!houseId && !(snapshotsReady.week && snapshotsReady.once);

  const addChore = async (
    input: Pick<Chore, 'title' | 'recurrence'> & {
      assignedTo?: string;        // optional when autoRotate=true; we'll seed
      autoRotate?: boolean;
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      customRecurrence?: Chore['customRecurrence'];
      dueAt?: Timestamp | null;
    }
  ) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    const choreWeekKey = input.recurrence === 'once' && input.dueAt
      ? getWeekKey(input.dueAt.toDate())
      : weekKey;

    // Auto-rotate is only meaningful for recurring chores (anything but 'once').
    // Daily is supported: see the lastTriggeredKey pre-stamp below for how the
    // seeded assignee keeps today and rotation kicks in on the next reset.
    const autoRotate = !!input.autoRotate && input.recurrence !== 'once';

    // Seed assignee for new auto-rotate chores using house.rotationOffset so
    // successive creations stagger across members.
    let assignedTo = input.assignedTo ?? '';
    if (autoRotate && house) {
      const sortedMembers = [...(house.memberIds ?? [])].sort();
      if (sortedMembers.length > 0) {
        const offset = (house.rotationOffset ?? 0) % sortedMembers.length;
        assignedTo = sortedMembers[offset];
      }
    }
    if (!assignedTo) {
      throw new Error('A chore must be assigned to someone, or use auto-rotate with members in the house.');
    }

    // Stable, timezone-independent cadence anchor (see Chore.recurrenceAnchorKey).
    // For recurring chores this is the device-local day-of-creation; for one-time
    // chores the field is irrelevant and stored as null.
    const now = new Date();
    const todayDayKey = getDayKey(now);
    const recurrenceAnchorKey = input.recurrence === 'once' ? null : todayDayKey;

    // Pre-stamp `lastTriggeredKey` when the chore is being created ON one of
    // its own fire days. The seeded assignee (`assignedTo` above) is treated
    // as having already taken that fire, so the very next cadence rollover
    // rotates to the following member instead of awarding the seeded user a
    // second consecutive turn. Combined with the `isFirstAdvance` guard in
    // `rolloverHouse`, this gives the correct rotation timing for:
    //   - Mon-created Mon-weekly chore  → Alice gets Mon X, Bob gets Mon X+1.
    //   - 15-created day-15 monthly      → Alice gets Mar 15, Bob Apr 15.
    //   - custom-weeks fired-today chore → Alice gets today, rotation next cycle.
    // Chores created on a non-fire day keep `lastTriggeredKey = null`, which
    // the rollover treats as "first cadence advance" and skips rotation for,
    // so the seeded assignee still owns the chore's first natural occurrence.
    // Delegated to `computeCreationLastTriggeredKey` so the monthly clamp
    // (day-31 in Feb → last day of month) stays in lockstep with `isChoreDueOn`.
    const lastTriggeredKey = computeCreationLastTriggeredKey(
      input.recurrence,
      {
        dayOfWeek: input.dayOfWeek ?? null,
        dayOfMonth: input.dayOfMonth ?? null,
        customRecurrence: input.customRecurrence ?? null,
      },
      now
    );

    try {
      await addDoc(choresCol(houseId), {
        id: '', // stripped by converter on write
        title: input.title,
        assignedTo,
        recurrence: input.recurrence,
        autoRotate,
        dayOfWeek: input.dayOfWeek ?? null,
        dayOfMonth: input.dayOfMonth ?? null,
        customRecurrence: input.customRecurrence ?? null,
        dueAt: input.dueAt ?? null,
        lastTriggeredKey,
        recurrenceAnchorKey,
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        weekKey: choreWeekKey,
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      throw err;
    }
  };

  const toggleChore = async (choreId: string, currentValue: boolean) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    const choreRef = doc(db, 'houses', houseId, 'chores', choreId);
    await updateDoc(choreRef, {
      isCompleted: !currentValue,
      completedAt: !currentValue ? serverTimestamp() : null,
      completedBy: !currentValue ? userProfile.id : null,
    });
  };

  const updateChore = async (
    choreId: string,
    patch: Partial<
      Pick<
        Chore,
        | 'title'
        | 'assignedTo'
        | 'dueAt'
        | 'recurrence'
        | 'dayOfWeek'
        | 'dayOfMonth'
        | 'customRecurrence'
        | 'autoRotate'
      >
    >,
    opts?: { recurrence?: Chore['recurrence'] }
  ) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    const choreRef = doc(db, 'houses', houseId, 'chores', choreId);
    const update: Record<string, unknown> = { ...patch };

    // Effective recurrence after this update: prefer the patched value, else
    // the caller-provided current recurrence (legacy opts arg).
    const effectiveRecurrence = patch.recurrence ?? opts?.recurrence;

    // Mirror addChore: a one-time chore's weekKey is derived from dueAt so it
    // remains visible in the right week query when the date changes.
    if ('dueAt' in patch && effectiveRecurrence === 'once') {
      update.weekKey = patch.dueAt ? getWeekKey(patch.dueAt.toDate()) : weekKey;
    }

    // Switching recurrence: clear fields that don't apply to the new shape so
    // stale data doesn't leak into rollover decisions. Completion state is
    // intentionally preserved across recurrence changes.
    if (patch.recurrence) {
      const r = patch.recurrence;
      // Always reset shape-specific fields; the caller can re-set them in the
      // same patch and our spread above will win.
      const shapeReset: Record<string, unknown> = {
        dayOfWeek: null,
        dayOfMonth: null,
        customRecurrence: null,
      };
      if (r === 'once') {
        shapeReset.autoRotate = false;
      } else {
        // daily / weekly / monthly / custom — all recurring shapes share the
        // same dueAt/weekKey reset; autoRotate is preserved (or overridden by
        // an explicit value in `patch`).
        update.dueAt = null;
        update.weekKey = weekKey;
        if (r === 'weekly' && patch.dayOfWeek == null) shapeReset.dayOfWeek = 0;
        if (r === 'monthly' && patch.dayOfMonth == null) shapeReset.dayOfMonth = 1;
      }
      // Apply resets first, then let the patch's explicit values win via spread.
      Object.assign(update, shapeReset, patch);

      // Re-anchor the cadence so the new recurrence starts a fresh cycle from
      // today instead of inheriting state from the previous shape:
      //   - `recurrenceAnchorKey` controls the modulus in `isChoreDueOn` and
      //     `evaluateRoll` for custom-days / custom-weeks. Without a reset,
      //     switching `once`-with-null-anchor → custom-days falls back to
      //     `createdAt` (potentially weeks ago), inflating `shift` on the
      //     first advance.
      //   - `lastTriggeredKey` controls the `isFirstAdvance` guard in
      //     `rolloverHouse`. Carrying it over from the prior cadence causes
      //     the user-picked assignee to be rotated away on the new cadence's
      //     very first scheduled fire. Pre-stamping it via the shared helper
      //     keeps the seeded assignee on the current occurrence when today
      //     happens to be a fire day for the new shape.
      const now = new Date();
      const todayDayKey = getDayKey(now);
      const effectiveShape = {
        dayOfWeek: (update.dayOfWeek as number | null | undefined) ?? null,
        dayOfMonth: (update.dayOfMonth as number | null | undefined) ?? null,
        customRecurrence:
          (update.customRecurrence as Chore['customRecurrence']) ?? null,
      };
      update.recurrenceAnchorKey = r === 'once' ? null : todayDayKey;
      update.lastTriggeredKey = computeCreationLastTriggeredKey(
        r,
        effectiveShape,
        now
      );
    }

    await updateDoc(choreRef, update);
  };

  const deleteChore = async (choreId: string) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    await deleteDoc(doc(db, 'houses', houseId, 'chores', choreId));
  };

  return { chores, isLoading, addChore, toggleChore, updateChore, deleteChore };
}
