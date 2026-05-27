import * as admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

// Initialize the Admin SDK here too. Do not rely on another module (e.g.
// weeklyChoreReset) being imported first — if export order changes or these
// functions load in isolation, admin.firestore() would throw "default app
// does not exist". getApps() guard keeps it idempotent.
if (getApps().length === 0) {
  initializeApp();
}

const GOOGLE_OAUTH_CLIENT_ID = defineSecret('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');

interface ExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Exchanges a Google OAuth authorization code (PKCE) for refresh + access
 * tokens, then stores the refresh token in users/{uid}/private/google
 * (subcollection that must be locked down by Firestore rules — clients
 * never read this path).
 */
export const exchangeGoogleAuthCode = onCall<ExchangeRequest>(
  {
    secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { code, codeVerifier, redirectUri } = request.data ?? ({} as ExchangeRequest);
    if (!code || !codeVerifier || !redirectUri) {
      throw new HttpsError(
        'invalid-argument',
        'code, codeVerifier, and redirectUri are required.'
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error('Google token exchange failed', { status: tokenRes.status, errText });
      throw new HttpsError('internal', 'Google token exchange failed.');
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokens.refresh_token) {
      // Google only returns a refresh token on first consent. The client requests
      // prompt=consent specifically to force this — if it's still missing, fail loud.
      logger.error('No refresh_token in Google response', { uid, scope: tokens.scope });
      throw new HttpsError(
        'failed-precondition',
        'Google did not return a refresh token. Revoke the app in your Google account and try again.'
      );
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.doc(`users/${uid}/private/google`).set({
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      linkedAt: now,
      updatedAt: now,
    });

    await db.doc(`users/${uid}`).set(
      { googleCalendarLinked: true },
      { merge: true }
    );

    return { ok: true } as const;
  }
);

/**
 * Revokes the stored refresh token at Google and clears local state.
 * Best-effort revocation: if the network call fails we still clear local
 * state so the user can re-link cleanly.
 */
export const unlinkGoogleCalendar = onCall(
  {
    secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const db = admin.firestore();
    const tokenRef = db.doc(`users/${uid}/private/google`);
    const snap = await tokenRef.get();
    const refreshToken = snap.exists ? (snap.data()?.refreshToken as string | undefined) : undefined;

    if (refreshToken) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refreshToken }).toString(),
        });
      } catch (err) {
        logger.warn('Google token revoke failed (continuing)', err);
      }
    }

    await tokenRef.delete().catch(() => undefined);
    await db.doc(`users/${uid}`).set(
      { googleCalendarLinked: false },
      { merge: true }
    );

    return { ok: true } as const;
  }
);
