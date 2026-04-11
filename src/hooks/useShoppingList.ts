import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot } from 'firebase/firestore';
import { shoppingCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { ShoppingItem } from '@/src/types';

export function useShoppingList() {
  const houseId = useHouseStore((s) => s.house?.id);
  const queryClient = useQueryClient();

  const result = useQuery<ShoppingItem[]>({
    queryKey: ['shopping', houseId],
    queryFn: () => Promise.resolve([] as ShoppingItem[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    const unsub = onSnapshot(shoppingCol(houseId), (snap) => {
      const data = snap.docs.map((d) => d.data());
      queryClient.setQueryData(['shopping', houseId], data);
    });
    return unsub;
  }, [houseId, queryClient]);

  return result;
}
