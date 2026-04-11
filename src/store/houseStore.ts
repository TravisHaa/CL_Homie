import { create } from 'zustand';
import { House, User } from '../types';

interface MemberInfo {
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

interface HouseState {
  house: House | null;
  memberMap: Record<string, MemberInfo>; // userId -> display info
  setHouse: (house: House | null) => void;
  setMemberMap: (members: User[]) => void;
}

export const useHouseStore = create<HouseState>((set) => ({
  house: null,
  memberMap: {},
  setHouse: (house) => set({ house }),
  setMemberMap: (members) => {
    const memberMap: Record<string, MemberInfo> = {};
    for (const m of members) {
      memberMap[m.id] = {
        displayName: m.displayName,
        color: m.color,
        avatarUrl: m.avatarUrl,
      };
    }
    set({ memberMap });
  },
}));
