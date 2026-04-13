import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { userDoc, houseDoc, usersCol } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useHouseStore } from '../store/houseStore';
import { ROOMMATE_COLORS } from '../utils/colors';

export function useAuthListener() {
  const { setFirebaseUser, setUserProfile, setIsLoading } = useAuthStore();
  const { setHouse, setMemberMap } = useHouseStore();

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubHouse: (() => void) | undefined;
    let unsubMembers: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged fired, uid=', firebaseUser?.uid ?? 'null');
      // Clean up previous subscriptions on auth change
      unsubProfile?.();
      unsubHouse?.();
      unsubMembers?.();

      setFirebaseUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setHouse(null);
        setMemberMap([]);
        setIsLoading(false);
        return;
      }

      unsubProfile = onSnapshot(
        userDoc(firebaseUser.uid),
        async (snap) => {
          console.log('[Auth] profile snapshot fired, exists=', snap.exists());
          try {
            if (snap.exists()) {
              const profile = snap.data();
              console.log('[Auth] profile loaded, houseId=', profile.houseId);
              setUserProfile(profile);

              if (profile.houseId) {
                // Subscribe to house doc
                unsubHouse?.();
                unsubHouse = onSnapshot(houseDoc(profile.houseId), (houseSnap) => {
                  console.log('[Auth] house snapshot, exists=', houseSnap.exists());
                  if (houseSnap.exists()) setHouse(houseSnap.data());
                });

                // Subscribe to all members in this house
                unsubMembers?.();
                const membersQ = query(usersCol(), where('houseId', '==', profile.houseId));
                unsubMembers = onSnapshot(membersQ, (membersSnap) => {
                  console.log('[Auth] members snapshot, count=', membersSnap.size);
                  setMemberMap(membersSnap.docs.map((d) => d.data()));
                });
              }
            } else {
              console.log('[Auth] no profile doc — creating one');
              const color = ROOMMATE_COLORS[Math.floor(Math.random() * ROOMMATE_COLORS.length)];
              await setDoc(userDoc(firebaseUser.uid), {
                id: firebaseUser.uid,
                email: firebaseUser.email ?? '',
                displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
                avatarUrl: null,
                houseId: null,
                color,
                createdAt: serverTimestamp(),
              } as any);
              console.log('[Auth] profile doc created, waiting for snapshot re-fire');
              return;
            }
          } catch (err) {
            console.error('[Auth] profile snapshot error:', err);
          } finally {
            console.log('[Auth] setIsLoading(false)');
            setIsLoading(false);
          }
        },
        (err) => {
          console.error('[Auth] onSnapshot permission error:', err.code, err.message);
          setIsLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubHouse?.();
      unsubMembers?.();
    };
  }, []);
}
