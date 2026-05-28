import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { deviceDoc } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useHouseStore } from '../store/houseStore';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { resolveProjectId } from '../utils/pushToken';
import type { DevicePlatform } from '../types';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface NotificationSettings {
  notificationsEnabled: boolean;
  permissionStatus: PermissionStatus;
  permissionDenied: boolean;
  isLoading: boolean;
  isBusy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  openOSSettings: () => Promise<void>;
}

/**
 * Data layer for the notification-settings UI (#33). Reads the current device's
 * `notificationsEnabled` flag from `users/{uid}/devices/{deviceId}` (live, via
 * onSnapshot) and exposes enable/disable mutators plus the OS permission state.
 *
 * `enable()` requests OS permission, fetches a fresh Expo push token on grant,
 * and flips the device doc to `notificationsEnabled: true`. On denial it surfaces
 * `permissionDenied` so the UI can route the user to OS settings.
 * `disable()` flips the flag to false but keeps the stored token so re-enabling
 * does not require another token fetch.
 */
export function useNotificationSettings(): NotificationSettings {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const houseId = useHouseStore((s) => s.house?.id ?? null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  // Live-read the current device doc flag.
  useEffect(() => {
    if (!firebaseUser || Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const deviceId = await getOrCreateDeviceId();
      if (cancelled) return;
      unsub = onSnapshot(
        deviceDoc(firebaseUser.uid, deviceId),
        (snap) => {
          const data = snap.data();
          setNotificationsEnabled(data?.notificationsEnabled === true);
          setIsLoading(false);
        },
        (err) => {
          if (err.code !== 'permission-denied') {
            console.warn('[NotificationSettings]', err);
          }
          setIsLoading(false);
        }
      );

      // Seed OS permission state.
      try {
        const perms = await Notifications.getPermissionsAsync();
        if (!cancelled) setPermissionStatus(perms.status as PermissionStatus);
      } catch {
        // ignore — leaves status as 'undetermined'
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [firebaseUser?.uid]);

  async function enable(): Promise<void> {
    if (!firebaseUser || Platform.OS === 'web') return;
    setIsBusy(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const platform = Platform.OS as DevicePlatform;

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status as PermissionStatus;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status as PermissionStatus;
      }
      setPermissionStatus(status);

      if (status !== 'granted') {
        // Denied at the OS level — surface so the UI can offer OS settings.
        await setDoc(
          deviceDoc(firebaseUser.uid, deviceId),
          {
            id: deviceId,
            deviceId,
            platform,
            notificationsEnabled: false,
            houseId,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          } as any,
          { merge: true }
        );
        return;
      }

      // Permission granted — fetch a token (best effort) and enable.
      let expoPushToken: string | null = null;
      const projectId = resolveProjectId();
      if (Device.isDevice && projectId) {
        try {
          const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
          expoPushToken = tokenRes.data;
        } catch (err) {
          console.warn('[NotificationSettings] token fetch failed:', err);
        }
      }

      await setDoc(
        deviceDoc(firebaseUser.uid, deviceId),
        {
          id: deviceId,
          deviceId,
          platform,
          ...(expoPushToken ? { expoPushToken } : {}),
          notificationsEnabled: true,
          houseId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        } as any,
        { merge: true }
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function disable(): Promise<void> {
    if (!firebaseUser || Platform.OS === 'web') return;
    setIsBusy(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      // Keep the token so re-enabling doesn't require a fresh fetch.
      await setDoc(
        deviceDoc(firebaseUser.uid, deviceId),
        {
          notificationsEnabled: false,
          updatedAt: serverTimestamp(),
        } as any,
        { merge: true }
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function openOSSettings(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Linking.openSettings();
  }

  return {
    notificationsEnabled,
    permissionStatus,
    permissionDenied: permissionStatus === 'denied',
    isLoading,
    isBusy,
    enable,
    disable,
    openOSSettings,
  };
}
