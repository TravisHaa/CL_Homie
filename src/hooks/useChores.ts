import { maybeRolloverChores } from '@/src/firebase/choreRollover';
import { db } from '@/src/firebase/config';
import { choresCol } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { getWeekKey } from '@/src/utils/weekKey';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect } from 'react';

export function useChores() {
  const queryClient = useQueryClient();
  const house = useHouseStore((s) => s.house);
  const houseId = house?.id ?? null;
  const userProfile = useAuthStore((s) => s.userProfile);
  const weekKey = getWeekKey();

  const { data: chores = [], isLoading } = useQuery<Chore[]>({
    queryKey: ['chores', houseId, weekKey],
    queryFn: () => Promise.resolve([] as Chore[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;

    // Backup weekly-rollover trigger. The transaction's lastRolloverWeekKey
    // race-guard makes this idempotent if AuthGate already ran it.
    maybeRolloverChores(houseId).catch((e) =>
      console.warn('[Rollover] failed', e)
    );

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

    const unsub1 = onSnapshot(q1, (snap) => {
      weekData = snap.docs.map((d) => d.data());
      merge();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      onceData = snap.docs.map((d) => d.data());
      merge();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [houseId, weekKey, queryClient]);

  const addChore = async (
    input: Pick<Chore, 'title' | 'assignedTo' | 'recurrence' | 'dayOfWeek'> & {
      dueAt?: Timestamp | null;
    }
  ) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    const choreWeekKey = input.recurrence === 'once' && input.dueAt
      ? getWeekKey(input.dueAt.toDate())
      : weekKey;
    try {
      await addDoc(choresCol(houseId), {
        id: '', // stripped by converter on write
        ...input,
        dueAt: input.dueAt ?? null,
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
    patch: Partial<Pick<Chore, 'title' | 'assignedTo' | 'dueAt'>>,
    opts?: { recurrence?: Chore['recurrence'] }
  ) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    const choreRef = doc(db, 'houses', houseId, 'chores', choreId);
    const update: Record<string, unknown> = { ...patch };
    // Mirror addChore: a one-time chore's weekKey is derived from dueAt so it
    // remains visible in the right week query when the date changes.
    if ('dueAt' in patch && opts?.recurrence === 'once') {
      update.weekKey = patch.dueAt ? getWeekKey(patch.dueAt.toDate()) : weekKey;
    }
    await updateDoc(choreRef, update);
  };

  const deleteChore = async (choreId: string) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    await deleteDoc(doc(db, 'houses', houseId, 'chores', choreId));
  };

  return { chores, isLoading, addChore, toggleChore, updateChore, deleteChore };
}
