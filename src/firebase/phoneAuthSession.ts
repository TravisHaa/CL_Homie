import type { ConfirmationResult } from 'firebase/auth';

// Holds the in-flight phone verification session in memory only. Firebase's
// ConfirmationResult wraps a live verifier reference and must never be
// serialized into a route param (expo-router params end up in the URL/history
// on web, and are logged in native nav state) — screens read/write this
// module-level slot instead.
let pendingConfirmation: ConfirmationResult | null = null;

export function setPendingPhoneConfirmation(confirmation: ConfirmationResult) {
  pendingConfirmation = confirmation;
}

export function getPendingPhoneConfirmation(): ConfirmationResult | null {
  return pendingConfirmation;
}

export function clearPendingPhoneConfirmation() {
  pendingConfirmation = null;
}
