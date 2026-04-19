import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/src/firebase/auth';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';

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

  const router = useRouter();
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const houseId = useAuthStore((s) => s.userProfile?.houseId ?? null);
  const currentUid = useAuthStore((s) => s.firebaseUser?.uid ?? null);

  // Prefer the live memberMap (has color + displayName). 
  const members = useMemo(() => {
    const fromMap = Object.entries(memberMap).map(([id, m]) => ({
      id,
      displayName: m.displayName,
      color: m.color as string | undefined,
    }));
    if (fromMap.length > 0) return fromMap;
    const names = house?.memberNames ?? {};
    return Object.entries(names).map(([id, displayName]) => ({
      id,
      displayName,
      color: undefined as string | undefined,
    }));
  }, [memberMap, house?.memberNames]);

  const memberCount = house?.memberIds?.length ?? members.length;

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
          <Text style={styles.sectionTitle}>House</Text>
          {houseId && house ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{house.name}</Text>

              <View style={styles.inviteRow}>
                <Text style={styles.inviteLabel}>Invite code</Text>
                <View style={styles.invitePill}>
                  <Text style={styles.invitePillText}>{house.inviteCode}</Text>
                </View>
              </View>

              <Text style={styles.membersHeading}>
                Members · {memberCount}
              </Text>
              <View style={styles.memberList}>
                {members.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: m.color ?? S.cardBorder },
                      ]}
                    />
                    <Text style={styles.memberName}>
                      {m.displayName}
                      {m.id === currentUid ? ' (you)' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : houseId && !house ? (
            <View style={[styles.card, styles.houseLoading]}>
              <ActivityIndicator />
              <Text style={styles.cardBody}>Loading your house…</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No house yet</Text>
              <Text style={styles.cardBody}>
                Join an existing house with an invite code, or create a new one.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Join or create a house"
                onPress={() => router.push('/(auth)/join-house')}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.ctaButtonPressed,
                ]}
              >
                <Text style={styles.ctaButtonText}>Join or create a house</Text>
              </Pressable>
            </View>
          )}
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
  inviteRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteLabel: { color: S.textSoft, fontWeight: '700' },
  invitePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  invitePillText: {
    fontFamily: Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', default: 'SpaceMono' }),
    fontSize: 14,
    letterSpacing: 2,
    color: S.textStrong,
    fontWeight: '700',
  },
  membersHeading: {
    marginTop: 14,
    color: S.textStrong,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  memberList: { marginTop: 8, gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  memberName: { color: S.textStrong, fontWeight: '600' },
  houseLoading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.textStrong,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPressed: { opacity: 0.85 },
  ctaButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
