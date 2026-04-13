import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import 'react-native-reanimated';

import { useAuthListener } from '@/src/hooks/useAuth';
import { useAuthStore } from '@/src/store/authStore';

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

  const { firebaseUser, userProfile, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthGate] effect — isLoading:', isLoading, 'firebaseUser:', !!firebaseUser, 'houseId:', userProfile?.houseId, 'segments:', segments);
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!firebaseUser) {
      if (!inAuthGroup) {
        console.log('[AuthGate] → /(auth)/login');
        router.replace('/(auth)/login');
      }
    // } else if (!userProfile?.houseId) {
    //   if (segments[0] !== '(auth)' || segments[1] !== 'join-house') {
    //     console.log('[AuthGate] → /(auth)/join-house');
    //     router.replace('/(auth)/join-house');
    //   }
    } else {
      if (inAuthGroup) {
        console.log('[AuthGate] → /(tabs)');
        router.replace('/(tabs)');
      }
    }
  }, [firebaseUser, userProfile, isLoading, segments]);

  return <Slot />;
}
