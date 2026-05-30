import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth } from './config';
import { userDoc, deviceDoc } from './firestore';
import { ROOMMATE_COLORS } from '../utils/colors';
import { getOrCreateDeviceId } from '../utils/deviceId';

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Pick a random color from the palette for this user
  const color = ROOMMATE_COLORS[Math.floor(Math.random() * ROOMMATE_COLORS.length)];

  // Must be awaited: this is a full-document write with houseId: null. If left
  // fire-and-forget it can resolve *after* a subsequent create/join-house merge
  // write, overwriting the profile back to houseId: null and dropping the
  // just-joined house. Awaiting guarantees this lands before navigation.
  await setDoc(userDoc(credential.user.uid), {
    id: credential.user.uid,
    email,
    displayName,
    avatarUrl: null,
    houseId: null,
    color,
    createdAt: serverTimestamp(),
  } as any);

  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function sendResetPasswordEmail(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function verifyResetPasswordCode(code: string) {
  return verifyPasswordResetCode(auth, code);
}

export async function confirmResetPassword(code: string, password: string) {
  await confirmPasswordReset(auth, code, password);
}

export async function signOut() {
  const uid = auth.currentUser?.uid;
  if (uid && Platform.OS !== 'web') {
    try {
      const deviceId = await getOrCreateDeviceId();
      await setDoc(
        deviceDoc(uid, deviceId),
        {
          expoPushToken: null,
          notificationsEnabled: false,
          updatedAt: serverTimestamp(),
        } as any,
        { merge: true }
      );
    } catch (err) {
      console.warn('[Auth] failed to deactivate device on signOut:', err);
    }
  }
  await firebaseSignOut(auth);
}
