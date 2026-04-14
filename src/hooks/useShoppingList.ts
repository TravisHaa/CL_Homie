import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { shoppingCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import type { ShoppingItem } from '@/src/types';

export interface AddItemInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

export function useShoppingList() {
  const houseId = useHouseStore((s) => s.house?.id);
  const userProfile = useAuthStore((s) => s.userProfile);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shopping', houseId],
    queryFn: () => Promise.resolve([] as ShoppingItem[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    const unsub = onSnapshot(shoppingCol(houseId), (snap) => {
      const snapshotItems = snap.docs.map((d) => d.data());
      queryClient.setQueryData(['shopping', houseId], snapshotItems);
    });
    return unsub;
  }, [houseId, queryClient]);

  const addShoppingItem = async (input: AddItemInput) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    try {
      await addDoc(shoppingCol(houseId), {
        name: input.name,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        isChecked: false,
        addedBy: userProfile.id,
        checkedBy: null,
        checkedAt: null,
        createdAt: serverTimestamp(),
      } as any);
    } catch (err) {
      throw err;
    }
  };

  const toggleShoppingItem = async (itemId: string, currentValue: boolean) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    try {
      await updateDoc(doc(db, 'houses', houseId, 'shoppingItems', itemId), {
        isChecked: !currentValue,
        checkedBy: !currentValue ? userProfile.id : null,
        checkedAt: !currentValue ? serverTimestamp() : null,
      });
    } catch (err) {
      throw err;
    }
  };

  const clearChecked = async () => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    const checkedItems = items.filter((i) => i.isChecked);
    if (checkedItems.length === 0) return;
    const batch = writeBatch(db);
    for (const item of checkedItems) {
      batch.delete(doc(db, 'houses', houseId, 'shoppingItems', item.id));
    }
    try {
      await batch.commit();
    } catch (err) {
      throw err;
    }
  };

  return { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked };
}
