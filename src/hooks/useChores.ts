import { db } from '@/src/firebase/config';
import { choresCol } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { getWeekKey } from '@/src/utils/weekKey';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, doc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
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

  return { chores, isLoading, addChore, toggleChore };
}
