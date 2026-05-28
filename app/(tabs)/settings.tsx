import { Avatar, initialsOf } from '@/src/components/ui';
import { RotationCard } from '@/src/components/settings/RotationCard';
import { signOut } from '@/src/firebase/auth';
import { leaveHouse } from '@/src/firebase/house';
import { useGoogleCalendar } from '@/src/hooks/useGoogleCalendar';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { FONTS, PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NOTIF_PREFS = [
  { key: 'choreReminders', label: 'Chore reminders' },
  { key: 'shoppingUpdates', label: 'Shopping List updates' },
  { key: 'pantryExpiration', label: 'Pantry expiration alerts' },
  { key: 'houseAnnouncements', label: 'House Announcements' },
  { key: 'anonymousNudges', label: 'Anonymous Nudges' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUid = useAuthStore((s) => s.firebaseUser?.uid ?? null);
  const houseId = useAuthStore((s) => s.userProfile?.houseId ?? null);
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const gcal = useGoogleCalendar();

  const [busy, setBusy] = useState<null | 'signout' | 'leave'>(null);
  const [notif, setNotif] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map((p) => [p.key, true]))
  );

  const members = useMemo(
    () => Object.entries(memberMap).map(([id, m]) => ({ id, ...m })),
    [memberMap]
  );

  async function copyInvite() {
    if (house?.inviteCode) await Clipboard.setStringAsync(house.inviteCode);
  }

  function confirm(message: string): boolean {
    if (Platform.OS === 'web') return !!globalThis.confirm?.(message);
    return true; // native confirm handled inline; simplified here
  }

  async function onLeave() {
    if (!currentUid || !houseId || !confirm('Leave house? You will need an invite code to rejoin.')) return;
    setBusy('leave');
    try {
      await leaveHouse({ uid: currentUid, houseId });
      const p = useAuthStore.getState().userProfile;
      if (p) useAuthStore.getState().setUserProfile({ ...p, houseId: null });
      useHouseStore.getState().setHouse(null);
    } finally {
      setBusy(null);
    }
  }

  async function onSignOut() {
    if (!confirm('Sign out?')) return;
    setBusy('signout');
    try {
      await signOut();
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={PALETTE.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* My Account */}
        <Text style={styles.section}>My Account</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <Avatar name={userProfile?.displayName} uri={userProfile?.avatarUrl} color={userProfile?.color} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{userProfile?.displayName ?? 'You'}</Text>
              <Text style={styles.email}>{userProfile?.email ?? ''}</Text>
            </View>
            <Pressable hitSlop={8} onPress={onSignOut}>
              {busy === 'signout' ? <ActivityIndicator /> : <Ionicons name="log-out-outline" size={24} color={PALETTE.ink} />}
            </Pressable>
          </View>
        </View>

        {/* Household */}
        <Text style={styles.section}>Household</Text>
        {house ? (
          <View style={styles.card}>
            <Text style={styles.houseName}>{house.name}</Text>
            <Text style={styles.fieldLabel}>Invite Code</Text>
            <Pressable style={styles.invitePill} onPress={copyInvite}>
              <Text style={styles.inviteText}>{house.inviteCode}</Text>
              <Ionicons name="copy-outline" size={18} color={PALETTE.inkMuted} />
            </Pressable>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.base }]}>People</Text>
            <View style={{ gap: SPACING.sm }}>
              {members.map((m) => {
                const isOwner = house.createdBy === m.id;
                return (
                  <View key={m.id} style={styles.personRow}>
                    <Avatar name={m.displayName} uri={m.avatarUrl} color={m.color} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>
                        {m.displayName}{m.id === currentUid ? ' (you)' : ''}
                      </Text>
                    </View>
                    <View style={[styles.rolePill, isOwner && styles.ownerPill]}>
                      <Text style={styles.roleText}>{isOwner ? 'Owner' : 'Member'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <RotationCard />

            <Pressable style={styles.leaveBtn} onPress={onLeave} disabled={busy === 'leave'}>
              <Text style={styles.leaveText}>{busy === 'leave' ? 'Leaving…' : 'Leave Household'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.email}>You're not in a house yet.</Text>
            <Pressable style={styles.cta} onPress={() => router.push('/(auth)/join-house')}>
              <Text style={styles.ctaText}>Join or create a house</Text>
            </Pressable>
          </View>
        )}

        {/* Calendar sync (preserves the Google Calendar OAuth feature) */}
        <Text style={styles.section}>Calendar sync</Text>
        <View style={styles.card}>
          <Text style={styles.name}>Google Calendar</Text>
          <Text style={styles.email}>
            {gcal.isLinked ? 'Connected — assigned events export to your calendar.' : 'Connect to export events you’re assigned to.'}
          </Text>
          <Pressable
            style={styles.syncBtn}
            disabled={gcal.isLinking || !gcal.canLink}
            onPress={() => (gcal.isLinked ? gcal.unlink() : gcal.link())}
          >
            <Text style={styles.syncText}>
              {gcal.isLinking ? 'Connecting…' : gcal.isLinked ? 'Disconnect' : 'Connect Google Calendar'}
            </Text>
          </Pressable>
        </View>

        {/* Notifications */}
        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          {NOTIF_PREFS.map((p, i) => (
            <View key={p.key} style={[styles.toggleRow, i < NOTIF_PREFS.length - 1 && styles.toggleDivider]}>
              <Text style={styles.toggleLabel}>{p.label}</Text>
              <Switch
                value={notif[p.key]}
                onValueChange={(v) => setNotif((s) => ({ ...s, [p.key]: v }))}
                trackColor={{ true: PALETTE.teal, false: PALETTE.inkHairline }}
                thumbColor={PALETTE.white}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  content: { padding: SPACING.base, paddingBottom: 120, gap: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  headerTitle: { ...TYPE.title, color: PALETTE.ink },
  section: { ...TYPE.heading, color: PALETTE.ink, marginTop: SPACING.base },
  card: {
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    gap: SPACING.sm,
    shadowColor: '#403021', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  name: { ...TYPE.bodyMedium, color: PALETTE.ink },
  email: { ...TYPE.small, color: PALETTE.inkMuted },
  houseName: { ...TYPE.heading, color: PALETTE.ink },
  fieldLabel: { ...TYPE.label, color: PALETTE.inkMuted },
  invitePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PALETTE.sand, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: SPACING.base,
  },
  inviteText: { fontFamily: FONTS.bodyMedium, fontSize: 14, letterSpacing: 2, color: PALETTE.ink },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: PALETTE.sand, borderRadius: RADIUS.md, padding: SPACING.sm },
  personName: { ...TYPE.bodyMedium, color: PALETTE.ink },
  rolePill: { backgroundColor: PALETTE.tealTint, borderRadius: RADIUS.pill, paddingVertical: 4, paddingHorizontal: 12 },
  ownerPill: { backgroundColor: PALETTE.ink },
  roleText: { ...TYPE.label, color: PALETTE.onAction },
  leaveBtn: { borderWidth: 1.5, borderColor: PALETTE.danger, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center', marginTop: SPACING.sm },
  leaveText: { ...TYPE.bodyMedium, color: PALETTE.danger },
  cta: { backgroundColor: PALETTE.teal, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center' },
  ctaText: { ...TYPE.bodyMedium, color: PALETTE.onAction },
  syncBtn: { backgroundColor: PALETTE.sand, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center', marginTop: SPACING.xs },
  syncText: { ...TYPE.bodyMedium, color: PALETTE.ink },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md },
  toggleDivider: { borderBottomWidth: 1, borderBottomColor: PALETTE.inkHairline },
  toggleLabel: { ...TYPE.body, color: PALETTE.ink },
});
