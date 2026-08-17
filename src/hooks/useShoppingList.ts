import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { shoppingCol, pantryCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { useAuthStore } from '@/src/store/authStore';
import type { ShoppingItem } from '@/src/types';

export interface AddItemInput {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price?: string;
  assignedTo?: string;
  neededBy?: Date | null;
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
    const unsub = onSnapshot(
      shoppingCol(houseId),
      (snap) => {
        const snapshotItems = snap.docs.map((d) => d.data());
        queryClient.setQueryData(['shopping', houseId], snapshotItems);
      },
      (err) => {
        if (err.code !== 'permission-denied') console.error('[useShoppingList]', err);
      }
    );
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
        price: input.price ?? '',
        assignedTo: input.assignedTo ?? 'anyone',
        neededBy: input.neededBy ? Timestamp.fromDate(input.neededBy) : null,
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

  const toggleShoppingItem = async (itemId: string, currentValue: boolean, expirationDate?: Date) => {
    if (!houseId || !userProfile) throw new Error('No house connected. Join a house first.');
    const shoppingRef = doc(db, 'houses', houseId, 'shoppingItems', itemId);
    const intendedChecked = !currentValue;
    const FOOD_CATEGORIES = new Set(['food', 'produce', 'dairy', 'meat', 'snacks', 'beverages', 'condiments', 'grains']);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(shoppingRef);
        if (!snap.exists()) return;
        const data = snap.data() as ShoppingItem;
        const wasChecked = data.isChecked;

        tx.update(shoppingRef, {
          isChecked: intendedChecked,
          checkedBy: intendedChecked ? userProfile.id : null,
          checkedAt: intendedChecked ? serverTimestamp() : null,
        });

        // Gate the pantry-add on the server's own fresh `isChecked` (`wasChecked`),
        // not the caller's possibly-stale `currentValue` — otherwise two
        // roommates racing to check the same item can each capture a stale
        // "unchecked" snapshot and both add a pantry entry for one purchase.
        if (intendedChecked && !wasChecked && FOOD_CATEGORIES.has(data.category.toLowerCase())) {
          const pantryRef = doc(pantryCol(houseId));
          tx.set(pantryRef, {
            id: '',
            name: data.name,
            quantity: data.quantity,
            unit: data.unit,
            category: data.category,
            isShared: true,
            expirationDate: expirationDate ? Timestamp.fromDate(expirationDate) : null,
            expirationConfidence: 'manual' as const,
            ownedBy: userProfile.id,
            addedBy: userProfile.id,
            barcode: null,
            imageUrl: null,
            createdAt: Timestamp.now(),
          });
        }
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

  const updateShoppingItem = async (itemId: string, updates: { name?: string; price?: string }) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    await updateDoc(doc(db, 'houses', houseId, 'shoppingItems', itemId), updates);
  };

  const deleteShoppingItem = async (itemId: string) => {
    if (!houseId) throw new Error('No house connected. Join a house first.');
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'houses', houseId, 'shoppingItems', itemId));
  };

  return { items, isLoading, addShoppingItem, toggleShoppingItem, clearChecked, deleteShoppingItem, updateShoppingItem };
}
