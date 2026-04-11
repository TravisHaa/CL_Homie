import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './config';
import { userDoc } from './firestore';
import { ROOMMATE_COLORS } from '../utils/colors';

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Pick a random color from the palette for this user
  const color = ROOMMATE_COLORS[Math.floor(Math.random() * ROOMMATE_COLORS.length)];

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

export async function signOut() {
  await firebaseSignOut(auth);
}
