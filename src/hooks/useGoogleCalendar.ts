import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/src/firebase/config';
import { useAuthStore } from '@/src/store/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export function useGoogleCalendar() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const isLinked = !!userProfile?.googleCalendarLinked;

  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'homie',
    path: 'oauth/google',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? '',
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const code = response.params.code;
    const codeVerifier = request?.codeVerifier;
    if (!code || !codeVerifier) return;

    (async () => {
      try {
        const exchange = httpsCallable<
          { code: string; codeVerifier: string; redirectUri: string },
          { ok: true }
        >(functions, 'exchangeGoogleAuthCode');
        await exchange({ code, codeVerifier, redirectUri });
        setError(null);
      } catch (err: any) {
        console.error('[GCal] exchangeGoogleAuthCode failed:', err);
        setError(err?.message ?? 'Failed to link Google Calendar');
      } finally {
        setIsLinking(false);
      }
    })();
  }, [response, request, redirectUri]);

  async function link() {
    if (!clientId) {
      setError('Missing EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID');
      return;
    }
    setError(null);
    setIsLinking(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') {
        setIsLinking(false);
        if (result?.type === 'error') {
          setError(result.error?.message ?? 'Google sign-in failed');
        }
      }
      // success path falls through to the useEffect above
    } catch (err: any) {
      setIsLinking(false);
      setError(err?.message ?? 'Could not start Google sign-in');
    }
  }

  async function unlink() {
    setError(null);
    try {
      const revoke = httpsCallable<undefined, { ok: true }>(
        functions,
        'unlinkGoogleCalendar'
      );
      await revoke();
    } catch (err: any) {
      console.error('[GCal] unlinkGoogleCalendar failed:', err);
      setError(err?.message ?? 'Failed to unlink Google Calendar');
    }
  }

  return {
    isLinked,
    isLinking,
    error,
    link,
    unlink,
    canLink: !!clientId && !!request,
  };
}
