import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { deviceDoc } from '../firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useHouseStore } from '../store/houseStore';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { resolveProjectId } from '../utils/pushToken';
import type { DevicePlatform } from '../types';

export function useNotificationsRegistration() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const houseId = useHouseStore((s) => s.house?.id ?? null);

  useEffect(() => {
    if (!firebaseUser) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      const deviceId = await getOrCreateDeviceId();
      const platform = Platform.OS as DevicePlatform;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status === 'undetermined') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }

      const writeInactive = async () => {
        if (cancelled) return;
        await setDoc(
          deviceDoc(firebaseUser.uid, deviceId),
          {
            id: deviceId,
            deviceId,
            platform,
            expoPushToken: null,
            notificationsEnabled: false,
            houseId,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          } as any,
          { merge: true }
        );
      };

      if (status !== 'granted' || !Device.isDevice) {
        await writeInactive();
        return;
      }

      const projectId = resolveProjectId();
      if (!projectId) {
        console.warn(
          '[Notifications] no EAS projectId — skipping token fetch. Run `eas init` to enable push tokens.'
        );
        await writeInactive();
        return;
      }

      const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;

      await setDoc(
        deviceDoc(firebaseUser.uid, deviceId),
        {
          id: deviceId,
          deviceId,
          platform,
          expoPushToken: tokenRes.data,
          notificationsEnabled: true,
          houseId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        } as any,
        { merge: true }
      );
    })().catch((err) => {
      console.warn('[Notifications] registration failed:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid, houseId]);
}
