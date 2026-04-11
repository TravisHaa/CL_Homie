import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { userDoc } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useHouseStore } from '../store/houseStore';
import { ROOMMATE_COLORS } from '../utils/colors';

export function useAuthListener() {
  const { setFirebaseUser, setUserProfile, setIsLoading } = useAuthStore();
  const { setHouse } = useHouseStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setHouse(null);
        setIsLoading(false);
        return;
      }

      const unsubProfile = onSnapshot(userDoc(firebaseUser.uid), async (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
          // Account exists in Firebase Auth but no Firestore doc (e.g. created via console)
          // Create a basic profile so the app can proceed
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
        }
        setIsLoading(false);
      });

      return unsubProfile;
    });

    return unsubAuth;
  }, []);
}
