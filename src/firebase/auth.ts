import {
    confirmPasswordReset,
    createUserWithEmailAndPassword,
    getAdditionalUserInfo,
    signOut as firebaseSignOut,
    RecaptchaVerifier,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    updateProfile,
    verifyPasswordResetCode,
    type ConfirmationResult,
} from 'firebase/auth';
import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { User } from '../types';
import { ROOMMATE_COLORS } from '../utils/colors';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { auth } from './config';
import { deviceDoc, userDoc } from './firestore';

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

// ---------------------------------------------------------------------------
// Phone authentication
//
// Firebase JS SDK phone auth requires an ApplicationVerifier (RecaptchaVerifier),
// which renders into a real DOM node — there is no DOM in React Native, so this
// only works on Platform.OS === 'web'. Native (iOS/Android) support requires
// migrating to @react-native-firebase/auth (native silent verification) plus a
// custom dev client build; that is a separate, larger change and is
// deliberately not implemented here. Callers must check isPhoneAuthSupported()
// before starting verification.
// ---------------------------------------------------------------------------

export class PhoneAuthUnsupportedPlatformError extends Error {
  constructor() {
    super('Phone sign-in is not available on this platform yet.');
    this.name = 'PhoneAuthUnsupportedPlatformError';
  }
}

// Thrown when a "login" attempt verifies a phone number that has no existing
// Homie account. Firebase's signInWithPhoneNumber silently creates a new
// Firebase Auth user for any never-before-seen number — without this guard,
// "Log in with mobile" would quietly behave like signup. See
// confirmPhoneLogin below for the cleanup this triggers.
export class PhoneAuthNoAccountError extends Error {
  constructor() {
    super('No account found for this phone number.');
    this.name = 'PhoneAuthNoAccountError';
  }
}

export function isPhoneAuthSupported() {
  return Platform.OS === 'web';
}

/** Converts 10 stored digits to E.164 US format: +1XXXXXXXXXX. */
export function toE164(digits: string): string {
  const clean = digits.replace(/\D/g, '');
  if (clean.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits');
  }
  return `+1${clean}`;
}

/**
 * Creates an invisible reCAPTCHA verifier bound to a DOM node. Web only —
 * throws PhoneAuthUnsupportedPlatformError on native. Callers should create a
 * fresh verifier per verification attempt (including resends) rather than
 * reusing one across screens.
 */
export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!isPhoneAuthSupported()) {
    throw new PhoneAuthUnsupportedPlatformError();
  }
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

export async function startPhoneVerification(
  phoneE164: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}

/**
 * Confirms an SMS code for the signup flow. If this is a brand-new Firebase
 * Auth identity, provisions a Homie profile using the same defaults as
 * email signUp(). If the phone number already belongs to an existing
 * account (isNewUser === false), that existing profile is returned
 * untouched — houseId and every other field are preserved, never reset.
 */
export async function confirmPhoneSignUp(
  confirmation: ConfirmationResult,
  code: string,
  phoneE164: string
): Promise<User> {
  const credential = await confirmation.confirm(code);
  const uid = credential.user.uid;

  const existingSnap = await getDoc(userDoc(uid));
  if (existingSnap.exists()) {
    return existingSnap.data();
  }

  const color = ROOMMATE_COLORS[Math.floor(Math.random() * ROOMMATE_COLORS.length)];
  const profile: User = {
    id: uid,
    email: null,
    phoneNumber: phoneE164,
    displayName: `Homie ${phoneE164.slice(-4)}`,
    avatarUrl: null,
    houseId: null,
    color,
    createdAt: serverTimestamp() as any,
  };

  // merge: true guards against a concurrent partial write (e.g. a retried
  // confirm) clobbering fields rather than overwriting them.
  await setDoc(userDoc(uid), profile, { merge: true });
  return profile;
}

/**
 * Confirms an SMS code for the login flow. Never provisions a new account:
 * if Firebase created a brand-new Auth identity for this number (no prior
 * account existed) or an Auth identity exists but has no matching Homie
 * profile (orphaned account), the session is torn down and
 * PhoneAuthNoAccountError is thrown instead of letting the user in.
 */
export async function confirmPhoneLogin(
  confirmation: ConfirmationResult,
  code: string
): Promise<User> {
  const credential = await confirmation.confirm(code);
  const info = getAdditionalUserInfo(credential);
  const user = credential.user;

  if (info?.isNewUser) {
    // No account existed for this number before this call created one.
    // Delete it (best effort — the user just verified ownership of the
    // number, so this delete is within Firebase's "recent login" window)
    // so a failed login attempt doesn't leave a dangling Auth account.
    try {
      await user.delete();
    } catch (err) {
      console.warn('[Auth] failed to delete unintended phone account:', err);
      await firebaseSignOut(auth).catch(() => {});
    }
    throw new PhoneAuthNoAccountError();
  }

  const snap = await getDoc(userDoc(user.uid));
  if (!snap.exists()) {
    // Auth identity exists but the Homie profile doesn't — don't delete
    // (this wasn't just created by us), just refuse to sign in as it.
    await firebaseSignOut(auth).catch(() => {});
    throw new PhoneAuthNoAccountError();
  }

  return snap.data();
}

/** User-facing message for a caught phone-auth error. */
export function getPhoneAuthErrorMessage(err: unknown): string {
  if (err instanceof PhoneAuthUnsupportedPlatformError) {
    return 'Phone sign-in isn’t available in this preview build yet — try the web version, or use email.';
  }
  if (err instanceof PhoneAuthNoAccountError) {
    return 'We couldn’t find an account with that number. Try signing up instead.';
  }
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'That doesn’t look like a valid phone number.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please wait a bit and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/invalid-verification-code':
      return 'That code isn’t right. Double-check and try again.';
    case 'auth/code-expired':
      return 'That code expired. Request a new one.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-app-credential':
    case 'auth/argument-error':
      return 'Verification setup failed. Please try again.';
    default:
      return (err as Error)?.message || 'Something went wrong. Please try again.';
  }
}
