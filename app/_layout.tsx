import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

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

  // Run one-shot chore schema migration once per house per session. Weekly
  // rollover itself is owned by the scheduled Cloud Function
  // `functions/jobs/weeklyChoreReset.ts`; the client no longer triggers it.
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
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!userProfile?.houseId) {
      if (segments[0] !== '(auth)' || segments[1] !== 'join-house') {
        router.replace('/(auth)/join-house');
      }
    } else {
      if (inAuthGroup) router.replace('/(tabs)');
    }
  }, [firebaseUser, userProfile, isLoading, segments]);

  return <Slot />;
}
