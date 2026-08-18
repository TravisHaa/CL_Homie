import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { joinHouseByInviteCode } from '@/src/firebase/house';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';

const G = {
  bg: '#FFFBF5',
  textPrimary: '#2E0800',
  textSecondary: '#636e72',
  border: '#DFE6E9',
  cardBg: '#FFFFFF',
  warnBg: '#FFF8EC',
  warnBorder: '#F6D860',
  warnText: '#7A5B00',
  error: '#FF6B6B',
};

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

export default function HouseScreen() {
  const router = useRouter();
  const house = useHouseStore((s) => s.house);
  const { firebaseUser, userProfile } = useAuthStore();

  const [inviteCode, setInviteCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const displayName =
    userProfile?.displayName ??
    firebaseUser?.displayName ??
    firebaseUser?.email?.split('@')[0] ??
    'User';

  const currentHouseId = userProfile?.houseId ?? null;

  async function doSwitch(code: string) {
    if (!firebaseUser) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await joinHouseByInviteCode({
        uid: firebaseUser.uid,
        displayName,
        inviteCode: code,
        currentHouseId,
      });
      router.back();
    } catch (err) {
      setSwitchError(
        (err as { message?: string })?.message ?? 'Could not switch house. Please try again.'
      );
    } finally {
      setIsSwitching(false);
    }
  }

  function handleSubmit() {
    setValidationError(null);
    setSwitchError(null);
    const parsed = joinSchema.safeParse({ inviteCode });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid invite code.');
      return;
    }
    const code = parsed.data.inviteCode;
    const houseName = house?.name ?? 'your current house';

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.(
        `Switch houses?\n\nYou'll leave "${houseName}" and join the new one. This cannot be undone.`
      );
      if (confirmed) doSwitch(code);
    } else {
      Alert.alert(
        'Switch houses?',
        `You'll leave "${houseName}" and join the new one. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', style: 'destructive', onPress: () => doSwitch(code) },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
        >
          <Ionicons name="chevron-back" size={20} color={G.textPrimary} />
          <Text style={styles.backLabel}>Settings</Text>
        </Pressable>

        <Text style={styles.title}>Switch House</Text>
        {house && (
          <Text style={styles.subtitle}>
            Currently in{' '}
            <Text style={styles.currentHouseName}>{house.name}</Text>
          </Text>
        )}

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="mail-open-outline" size={20} color={G.textPrimary} />
              <Text style={styles.cardTitle}>Join with invite code</Text>
            </View>

            <View style={styles.warnBanner}>
              <Ionicons name="warning-outline" size={15} color={G.warnText} />
              <Text style={styles.warnText}>
                You'll be removed from your current house when you switch.
              </Text>
            </View>

            <Text style={styles.label}>Invite code</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              autoCapitalize="characters"
              maxLength={6}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              value={inviteCode}
            />
            {validationError && <Text style={styles.errorText}>{validationError}</Text>}
            {switchError && <Text style={styles.errorText}>{switchError}</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={isSwitching}
              style={({ pressed }) => [
                styles.switchButton,
                isSwitching && styles.switchButtonDisabled,
                pressed && !isSwitching && styles.switchButtonPressed,
              ]}
            >
              <Text style={styles.switchButtonText}>
                {isSwitching ? 'Switching…' : 'Switch house'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new house"
            onPress={() => router.push('/(auth)/create-house')}
            style={({ pressed }) => [styles.secondaryCard, pressed && styles.secondaryCardPressed]}
          >
            <View style={styles.secondaryCardInner}>
              <Ionicons name="add-circle-outline" size={20} color={G.textPrimary} />
              <View style={styles.secondaryCardBody}>
                <Text style={styles.secondaryCardTitle}>Create a new house</Text>
                <Text style={styles.secondaryCardDesc}>Start fresh and invite your housemates.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={G.textSecondary} />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: G.bg },
  container: { flex: 1, padding: 20 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backRowPressed: { opacity: 0.6 },
  backLabel: { color: G.textPrimary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: G.textPrimary, marginBottom: 6 },
  subtitle: { color: G.textSecondary, fontSize: 14, marginBottom: 24 },
  currentHouseName: { color: G.textPrimary, fontWeight: '700' },
  section: { marginBottom: 12 },
  card: {
    borderWidth: 1.5,
    borderColor: G.border,
    borderRadius: 12,
    backgroundColor: G.cardBg,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: G.textPrimary },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: G.warnBg,
    borderWidth: 1,
    borderColor: G.warnBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warnText: { flex: 1, fontSize: 12, color: G.warnText, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', color: G.textPrimary },
  input: {
    borderWidth: 1.5,
    borderColor: G.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    letterSpacing: 2,
  },
  errorText: { color: G.error, fontSize: 12 },
  switchButton: {
    backgroundColor: G.textPrimary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  switchButtonPressed: { opacity: 0.85 },
  switchButtonDisabled: { opacity: 0.5 },
  switchButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryCard: {
    borderWidth: 1.5,
    borderColor: G.border,
    borderRadius: 12,
    backgroundColor: G.cardBg,
    padding: 16,
  },
  secondaryCardPressed: { opacity: 0.7 },
  secondaryCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secondaryCardBody: { flex: 1 },
  secondaryCardTitle: { fontSize: 15, fontWeight: '700', color: G.textPrimary },
  secondaryCardDesc: { color: G.textSecondary, marginTop: 2, fontSize: 13 },
});
