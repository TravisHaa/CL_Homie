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

      unsubProfile = onSnapshot(userDoc(firebaseUser.uid), async (snap) => {
        try {
          if (snap.exists()) {
            const profile = snap.data();
            setUserProfile(profile);

            if (profile.houseId) {
              // Subscribe to house doc
              unsubHouse?.();
              unsubHouse = onSnapshot(houseDoc(profile.houseId), (houseSnap) => {
                if (houseSnap.exists()) setHouse(houseSnap.data());
              });

              // Subscribe to all members in this house
              unsubMembers?.();
              const membersQ = query(usersCol(), where('houseId', '==', profile.houseId));
              unsubMembers = onSnapshot(membersQ, (membersSnap) => {
                setMemberMap(membersSnap.docs.map((d) => d.data()));
              });
            }
          } else {
            // No Firestore profile yet — create one
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
            // onSnapshot will fire again with the new doc
            return;
          }
        } catch (err) {
          console.error('[useAuthListener] profile error:', err);
        } finally {
          setIsLoading(false);
        }
      });
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubHouse?.();
      unsubMembers?.();
    };
  }, []);
}
