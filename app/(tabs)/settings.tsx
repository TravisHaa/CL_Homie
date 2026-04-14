import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/src/firebase/auth';

const S = {
  lavenderBg: '#F2EFFF',
  cardBg: '#E8E2FF',
  cardBorder: '#CBC1FA',
  textStrong: '#372B73',
  textSoft: '#7A6BB0',
  dangerBg: '#FFF1F2',
  dangerBorder: '#FDA4AF',
  dangerText: '#9F1239',
};

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;

    // On Expo Web, `Alert.alert` may not present a dialog reliably. Use a web-native confirm,
    // and run the sign-out directly from this handler for consistent behavior.
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.(
        'Sign out?\n\nYou’ll need to log in again to access your house.'
      );
      if (!confirmed) return;
    } else {
      // Native: show a confirmation dialog, then proceed.
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert('Sign out?', 'You’ll need to log in again to access your house.', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Sign out', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }

    try {
      setIsSigningOut(true);
      // AuthGate listens to Firebase auth state and will redirect on sign-out.
      await signOut();
    } catch (err) {
      console.error('[Settings] signOut failed:', err);
      Alert.alert('Sign out failed', 'Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Settings gets its own themed intro panel to match tab identity. */}
        <View style={styles.hero}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Coming soon</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign out</Text>
            <Text style={styles.cardBody}>
              Sign out of this device. Your data stays in your Firebase account.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={handleSignOut}
              disabled={isSigningOut}
              style={({ pressed }) => [
                styles.signOutButton,
                isSigningOut && styles.signOutButtonDisabled,
                pressed && !isSigningOut && styles.signOutButtonPressed,
              ]}
            >
              {isSigningOut ? (
                <View style={styles.signOutButtonInner}>
                  <ActivityIndicator />
                  <Text style={styles.signOutButtonText}>Signing out…</Text>
                </View>
              ) : (
                <Text style={styles.signOutButtonText}>Sign out</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.lavenderBg },
  container: { flex: 1, padding: 20 },
  hero: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 28, fontWeight: '800', color: S.textStrong },
  subtitle: { color: S.textSoft, marginTop: 8 },
  section: { marginTop: 18 },
  sectionTitle: { color: S.textStrong, fontWeight: '800', letterSpacing: 0.2, marginBottom: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: S.textStrong },
  cardBody: { color: S.textSoft, marginTop: 6, lineHeight: 18 },
  signOutButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: S.dangerBorder,
    backgroundColor: S.dangerBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonPressed: { opacity: 0.85 },
  signOutButtonDisabled: { opacity: 0.6 },
  signOutButtonText: { color: S.dangerText, fontWeight: '800' },
  signOutButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
