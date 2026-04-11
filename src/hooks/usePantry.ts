import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot } from 'firebase/firestore';
import { pantryCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { PantryItem } from '@/src/types';

export function usePantry() {
  const houseId = useHouseStore((s) => s.house?.id);
  const queryClient = useQueryClient();

  const result = useQuery<PantryItem[]>({
    queryKey: ['pantry', houseId],
    queryFn: () => Promise.resolve([] as PantryItem[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    const unsub = onSnapshot(pantryCol(houseId), (snap) => {
      const data = snap.docs.map((d) => d.data());
      queryClient.setQueryData(['pantry', houseId], data);
    });
    return unsub;
  }, [houseId, queryClient]);

  return result;
}
