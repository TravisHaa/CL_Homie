import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { differenceInCalendarDays } from 'date-fns';
import { pantryCol } from '@/src/firebase/firestore';
import { db } from '@/src/firebase/config';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import type { PantryItem } from '@/src/types';

export function daysUntilExpiry(item: PantryItem): number {
  if (!item.expirationDate) return Infinity;
  return differenceInCalendarDays(item.expirationDate.toDate(), new Date());
}

export interface AddPantryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isShared: boolean;
  expirationDate: Date | null;
}

export function usePantry() {
  const houseId = useHouseStore((s) => s.house?.id);
  const userProfile = useAuthStore((s) => s.userProfile);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pantry', houseId],
    queryFn: () => Promise.resolve([] as PantryItem[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    const unsub = onSnapshot(pantryCol(houseId), (snap) => {
      const fetched = snap.docs.map((d) => d.data());
      queryClient.setQueryData(['pantry', houseId], fetched);
    });
    return unsub;
  }, [houseId, queryClient]);

  const expiringItems = items.filter((item) => daysUntilExpiry(item) <= 3);

  async function addPantryItem(input: AddPantryItemInput) {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    try {
      await addDoc(pantryCol(houseId), {
        id: '',
        name: input.name,
        quantity: input.quantity,
        unit: input.unit,
        category: input.category,
        isShared: input.isShared,
        expirationDate: input.expirationDate
          ? Timestamp.fromDate(input.expirationDate)
          : null,
        expirationConfidence: 'manual' as const,
        ownedBy: userProfile.id,
        addedBy: userProfile.id,
        barcode: null,
        imageUrl: null,
        createdAt: Timestamp.now(),
      } as PantryItem);
    } catch (e) {
      throw e;
    }
  }

  async function deletePantryItem(itemId: string) {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    try {
      await deleteDoc(doc(db, 'houses', houseId, 'pantryItems', itemId));
    } catch (e) {
      throw e;
    }
  }

  return { items, expiringItems, isLoading, addPantryItem, deletePantryItem };
}
