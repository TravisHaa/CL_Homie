import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { choresCol } from '@/src/firebase/firestore';
import { db } from '@/src/firebase/config';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import { getWeekKey } from '@/src/utils/weekKey';
import type { Chore } from '@/src/types';

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
    const q = query(col, where('weekKey', '==', weekKey));

    const unsub = onSnapshot(q, (snap) => {
      const data: Chore[] = snap.docs.map((d) => d.data());
      // Sort client-side to avoid composite index errors
      data.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.title.localeCompare(b.title);
      });
      queryClient.setQueryData(['chores', houseId, weekKey], data);
    });

    return unsub;
  }, [houseId, weekKey, queryClient]);

  const addChore = async (
    input: Pick<Chore, 'title' | 'assignedTo' | 'recurrence' | 'dayOfWeek'>
  ) => {
    if (!houseId || !userProfile) return;
    await addDoc(choresCol(houseId), {
      id: '', // stripped by converter on write
      ...input,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      weekKey,
      createdBy: userProfile.id,
      createdAt: serverTimestamp(),
    });
  };

  const toggleChore = async (choreId: string, currentValue: boolean) => {
    if (!houseId || !userProfile) return;
    const choreRef = doc(db, 'houses', houseId, 'chores', choreId);
    await updateDoc(choreRef, {
      isCompleted: !currentValue,
      completedAt: !currentValue ? serverTimestamp() : null,
      completedBy: !currentValue ? userProfile.id : null,
    });
  };

  return { chores, isLoading, addChore, toggleChore };
}
