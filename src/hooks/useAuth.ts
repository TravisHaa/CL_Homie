import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { userDoc } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useHouseStore } from '../store/houseStore';

/**
 * Sets up Firebase auth listener and syncs user profile + house data.
 * Call once in the root layout.
 */
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

      // Listen to user profile doc
      const unsubProfile = onSnapshot(userDoc(firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data());
        }
        setIsLoading(false);
      });

      return unsubProfile;
    });

    return unsubAuth;
  }, []);
}
