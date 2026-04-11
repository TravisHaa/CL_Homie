import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onSnapshot } from 'firebase/firestore';
import { eventsCol } from '@/src/firebase/firestore';
import { useHouseStore } from '@/src/store/houseStore';
import { CalendarEvent } from '@/src/types';

export function useCalendarEvents() {
  const houseId = useHouseStore((s) => s.house?.id);
  const queryClient = useQueryClient();

  const result = useQuery<CalendarEvent[]>({
    queryKey: ['events', houseId],
    queryFn: () => Promise.resolve([] as CalendarEvent[]),
    staleTime: Infinity,
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    const unsub = onSnapshot(eventsCol(houseId), (snap) => {
      const data = snap.docs.map((d) => d.data());
      queryClient.setQueryData(['events', houseId], data);
    });
    return unsub;
  }, [houseId, queryClient]);

  return result;
}
