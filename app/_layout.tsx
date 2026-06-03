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
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { migrateChoreSchema } from '@/src/firebase/choreMigrations';
import { maybeRolloverChores } from '@/src/firebase/choreRollover';
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

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <AuthGate />
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

function AuthGate() {
  useAuthListener();
  useNotificationsRegistration();

  const { firebaseUser, userProfile, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Primary weekly chore-rollover trigger. Runs once per house per session.
  // The transaction inside maybeRolloverChores has its own race-guard, so the
  // backup trigger in useChores is harmless if this already ran.
  const houseId = useHouseStore((s) => s.house?.id) ?? null;
  const rolledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!houseId || rolledForRef.current === houseId) return;
    rolledForRef.current = houseId;
    // Run schema migration before rollover so the engine sees the new shape.
    (async () => {
      try {
        await migrateChoreSchema(houseId);
      } catch (e) {
        console.warn('[Migration] failed', e);
      }
      try {
        await maybeRolloverChores(houseId);
      } catch (e) {
        console.warn('[Rollover] failed', e);
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
