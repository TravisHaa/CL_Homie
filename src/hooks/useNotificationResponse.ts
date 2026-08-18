import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import type { NotificationData } from '../types';

// Module-scope handler controls how notifications surface while the app is
// foregrounded. Set once at import time (Expo recommends a single global
// handler rather than per-mount registration).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function routeForNotification(
  data: unknown,
  push: (path: '/(tabs)/pantry') => void
): void {
  const payload = data as Partial<NotificationData> | undefined;
  if (payload?.type === 'pantry_expiry') {
    push('/(tabs)/pantry');
  }
}

/**
 * Routes notification taps to the relevant screen (#34).
 *
 * Handles both warm taps (listener) and cold-start launches
 * (`getLastNotificationResponseAsync`). A ref guards against double-handling
 * the same cold-start response that the listener might also fire for.
 */
export function useNotificationResponse(): void {
  const router = useRouter();
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledIdRef.current === id) return;
      handledIdRef.current = id;
      routeForNotification(
        response.notification.request.content.data,
        (path) => router.push(path)
      );
    };

    // Cold-start: the notification that launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined);

    // Warm taps while the app is running / backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener(handle);

    return () => sub.remove();
  }, [router]);
}
