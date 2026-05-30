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
        {/* Header — Figma 1965:9737, Gowun Bold 22 centered, back chevron */}
        <View style={styles.headerRow}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={PALETTE.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* My Account — section title Gowun 16 (2694:27170), account card 1965:9906 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.section}>My Account</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <Avatar name={userProfile?.displayName} uri={userProfile?.avatarUrl} color={userProfile?.color} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name}>{userProfile?.displayName ?? 'You'}</Text>
                <Text style={styles.email}>{userProfile?.email ?? ''}</Text>
              </View>
              {/* Chevron-right per Figma 1965:9904 (rotated up-bold arrow); tap = sign out */}
              <Pressable hitSlop={8} onPress={onSignOut}>
                {busy === 'signout' ? (
                  <ActivityIndicator />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color={PALETTE.ink} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Household — 2694:27172 */}
        <View style={styles.sectionGroup}>
          <Text style={styles.section}>Household</Text>
          {house ? (
            <View style={styles.householdCard}>
              {/* House name row — 2694:27175 (Albert Medium 16 + pencil edit 2694:27177) */}
              <View style={styles.houseNameRow}>
                <Text style={styles.houseName}>{house.name}</Text>
                <Ionicons name="pencil-outline" size={20} color={PALETTE.ink} />
              </View>

              {/* Invite Code — label 2694:27179, pill 2694:27180 (light-tan, rounded 16) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Invite Code</Text>
                <Pressable style={styles.invitePill} onPress={copyInvite}>
                  <Text style={styles.inviteText}>{house.inviteCode}</Text>
                  <Ionicons name="copy-outline" size={19} color={PALETTE.ink} />
                </Pressable>
              </View>

              {/* People — label 2694:27188, person cards 2694:27190..93 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>People</Text>
                <View style={{ gap: SPACING.md, width: '100%' }}>
                  {members.map((m) => {
                    const isOwner = house.createdBy === m.id;
                    return (
                      <View key={m.id} style={styles.personRow}>
                        <Avatar name={m.displayName} uri={m.avatarUrl} color={m.color} size={45} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.personName} numberOfLines={1}>
                            {m.displayName}{m.id === currentUid ? ' (you)' : ''}
                          </Text>
                          {/* Email shown to mirror Figma I2694:27190;2552:21750 */}
                          {m.email ? (
                            <Text style={styles.personEmail} numberOfLines={1}>{m.email}</Text>
                          ) : null}
                        </View>
                        {/* Role pill — dark-brown bg, tan text (I2694:27190;2552:21752;1467:1632) */}
                        <View style={styles.rolePill}>
                          <Text style={styles.roleText}>{isOwner ? 'Owner' : 'Member'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <RotationCard />

              {/* Danger button — 2694:27194 ("Disband Household") border #E00000 */}
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
        </View>

        {/* Calendar sync (preserves the Google Calendar OAuth feature) */}
        <View style={styles.sectionGroup}>
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
        </View>

        {/* Notifications — 2694:27196..27212; stacked rows w/ #BDBDBD border, no gap */}
        <View style={styles.sectionGroup}>
          <Text style={styles.section}>Notifications</Text>
          <View style={styles.notifGroup}>
            {NOTIF_PREFS.map((p) => (
              <View key={p.key} style={styles.notifRow}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.cream },
  // Outer container per 2694:27168 — gap-32 between sections, padded 24
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: 120,
    gap: SPACING.xxl,
  },
  // Header row 1965:9737 — chevron 20, Gowun 22 centered
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 28,
    color: PALETTE.ink,
    textAlign: 'center',
  },
  // Section heading (Gowun 16) + 8px gap to card per 2694:27172
  sectionGroup: { gap: SPACING.sm, width: '100%' },
  section: { ...TYPE.heading, color: PALETTE.ink },

  // Generic white card (Account, Calendar sync) — 1965:9906
  card: {
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    shadowColor: '#403021', shadowOpacity: 0.17, shadowRadius: 10, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  name: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink },
  email: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },

  // Household card — 2694:27174 (px-24 py-16, gap-16, rounded 16)
  householdCard: {
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    gap: SPACING.base,
    alignItems: 'center',
    shadowColor: '#403021', shadowOpacity: 0.17, shadowRadius: 20, shadowOffset: { width: 0, height: 1 }, elevation: 3,
    overflow: 'hidden',
  },
  // House-name row 2694:27175 — Albert Medium 16 + pencil
  houseNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%',
  },
  houseName: { fontFamily: FONTS.bodyMedium, fontSize: 16, color: PALETTE.ink },
  fieldGroup: { width: '100%', gap: SPACING.md },
  fieldLabel: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink },

  // Invite pill 2694:27180 — light-tan, rounded 16, px-12 py-8
  invitePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PALETTE.sand, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  inviteText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink, letterSpacing: 1 },

  // Person card 2694:27190 — light-tan, h-61, rounded 16, p-8, gap-8
  personRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: PALETTE.sand, borderRadius: RADIUS.lg,
    padding: SPACING.sm, minHeight: 61,
  },
  personName: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink },
  personEmail: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: PALETTE.inkMuted },
  // Role pill — dark-brown bg, tan text (1467:1632 / 1633)
  rolePill: {
    backgroundColor: PALETTE.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: PALETTE.sand },

  // Danger button 2694:27194 — outlined #E00000, pill, px-16 py-8
  leaveBtn: {
    borderWidth: 1, borderColor: PALETTE.danger, borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  leaveText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.danger, textAlign: 'center' },

  cta: { backgroundColor: PALETTE.teal, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.onAction },
  syncBtn: { backgroundColor: PALETTE.sand, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: 'center', marginTop: SPACING.xs },
  syncText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink },

  // Notifications group 2694:27198 — stacked rows joined by #BDBDBD border,
  // rounded 16, overflow-clip, drop shadow on container only.
  notifGroup: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#403021', shadowOpacity: 0.17, shadowRadius: 10, shadowOffset: { width: 0, height: 1 }, elevation: 2,
    backgroundColor: PALETTE.white,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: PALETTE.white,
    borderWidth: 1, borderColor: '#BDBDBD',
  },
  toggleLabel: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: PALETTE.ink },
});
