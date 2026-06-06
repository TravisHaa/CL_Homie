import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_600SemiBold,
  AlbertSans_700Bold,
  AlbertSans_800ExtraBold,
} from '@expo-google-fonts/albert-sans';
import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

const PHONE_W = 412;
const PHONE_H = 915;

import { migrateChoreSchema } from '@/src/firebase/choreMigrations';
import { useAuthListener } from '@/src/hooks/useAuth';
import { useNotificationsRegistration } from '@/src/hooks/useNotifications';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    AlbertSans_700Bold,
    AlbertSans_800ExtraBold,
    GowunBatang_400Regular,
    GowunBatang_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const { height: windowHeight } = useWindowDimensions();
  const scale = Platform.OS === 'web' ? Math.min(1, (windowHeight - 32) / PHONE_H) : 1;
  const frameWidth = Math.round(PHONE_W * scale);
  const frameHeight = Math.round(PHONE_H * scale);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        {Platform.OS === 'web' ? (
          <View style={styles.webOuter}>
            <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden', borderRadius: 40 }}>
              <View style={{
                width: PHONE_W,
                height: PHONE_H,
                transform: [{ scale }],
                // @ts-ignore — web-only
                transformOrigin: 'top left',
              }}>
                <BottomSheetModalProvider>
                  <AuthGate />
                </BottomSheetModalProvider>
              </View>
            </View>
          </View>
        ) : (
          <BottomSheetModalProvider>
            <AuthGate />
          </BottomSheetModalProvider>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webOuter: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function AuthGate() {
  useAuthListener();
  useNotificationsRegistration();

  const { firebaseUser, userProfile, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Run one-shot chore schema migration once per house per session. Chore
  // rollover itself is owned by the scheduled Cloud Function
  // `functions/jobs/dailyChoreReset.ts`; the client no longer triggers it.
  const houseId = useHouseStore((s) => s.house?.id) ?? null;
  const migratedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!houseId || migratedForRef.current === houseId) return;
    migratedForRef.current = houseId;
    (async () => {
      try {
        await migrateChoreSchema(houseId);
      } catch (e) {
        console.warn('[Migration] failed', e);
      }
    })();
  }, [houseId]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!firebaseUser) {
      if (!inAuthGroup) router.replace('/(auth)/signup');
    } else if (!userProfile?.houseId) {
      const onHouseSetupScreen =
        segments[0] === '(auth)' &&
        (segments[1] === 'home-choice' ||
          segments[1] === 'join-house' ||
          segments[1] === 'create-house' ||
          segments[1] === 'home-status');
      if (!onHouseSetupScreen) {
        router.replace('/(auth)/home-choice');
      }
    } else {
      // Members with a house can still reach the house-switch / confirmation
      // screens (navigated to from the house tab and settings to create or join
      // a different house). Don't bounce them straight back to the tabs.
      const onAllowedAuthScreen =
        segments[1] === 'home-status' ||
        segments[1] === 'create-house' ||
        segments[1] === 'join-house';
      if (inAuthGroup && !onAllowedAuthScreen) router.replace('/(tabs)');
    }
  }, [firebaseUser, userProfile, isLoading, segments]);

  return <Slot />;
}
