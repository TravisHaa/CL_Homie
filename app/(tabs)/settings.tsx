import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderImage } from '@/src/components/HeaderImage';
import { GridBackground } from '@/src/components/GridBackground';
import { houseDoc } from '@/src/firebase/firestore';
import { leaveHouse } from '@/src/firebase/house';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { updateDoc } from 'firebase/firestore';

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
  const scrollRef = useRef<ScrollView>(null);
  const { scrollToBottom } = useLocalSearchParams<{ scrollToBottom?: string }>();

  useEffect(() => {
    if (scrollToBottom === '1') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
    }
  }, [scrollToBottom]);

  const [isLeavingHouse, setIsLeavingHouse] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const router = useRouter();
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const houseId = useAuthStore((s) => s.userProfile?.houseId ?? null);
  const currentUid = useAuthStore((s) => s.firebaseUser?.uid ?? null);
  const userProfile = useAuthStore((s) => s.userProfile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  async function handleLeaveHouse() {
    if (!currentUid || !houseId) return;
    setLeaveError(null);
    setIsLeavingHouse(true);
    try {
      await leaveHouse({ uid: currentUid, houseId });
      const profile = useAuthStore.getState().userProfile;
      if (profile) useAuthStore.getState().setUserProfile({ ...profile, houseId: null });
      useHouseStore.getState().setHouse(null);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Could not leave house. Please try again.';
      setLeaveError(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', message);
      }
    } finally {
      setIsLeavingHouse(false);
    }
  }

  async function confirmLeaveHouse() {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.(
        "Leave house?\n\nYou'll be removed from this house and will need an invite code to rejoin."
      );
      if (confirmed) await handleLeaveHouse();
    } else {
      Alert.alert(
        'Leave house?',
        "You'll be removed from this house and will need an invite code to rejoin.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave house', style: 'destructive', onPress: handleLeaveHouse },
        ]
      );
    }
  }

  async function saveHouseName() {
    const trimmed = editNameValue.trim();
    if (!trimmed || !houseId || trimmed === house?.name) { setIsEditingName(false); return; }
    try {
      await updateDoc(houseDoc(houseId), { name: trimmed });
    } catch (err) {
      console.error('[settings] rename house', err);
    }
    setIsEditingName(false);
  }

  async function copyInviteCode() {
    if (!house?.inviteCode) return;
    await Clipboard.setStringAsync(house.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

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

  return (
    <View style={styles.safe}>
      <GridBackground />
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <HeaderImage height={117} />
        <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)')} hitSlop={10} accessibilityLabel="Back to home">
          <Ionicons name="chevron-back" size={22} color="#2E0800" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile card ── */}
        <Text style={styles.profileSectionLabel}>My account</Text>
        <Pressable style={styles.profileCard} onPress={() => router.push('/(tabs)/myaccount')} android_ripple={{ color: '#eee' }}>
          <View style={styles.profileAvatar}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.profileAvatarImg} />
            ) : (
              <View style={[styles.profileAvatarImg, styles.profileAvatarFallback]}>
                <Text style={styles.profileAvatarInitial}>
                  {userProfile?.displayName?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{userProfile?.displayName ?? 'You'}</Text>
            <Text style={styles.profileEmail}>{firebaseUser?.email ?? ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#7A6652" />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.profileSectionLabel}>Household</Text>
          {houseId && house ? (
            <View style={styles.householdCard}>
              {/* House name */}
              <View style={styles.householdNameRow}>
                {isEditingName ? (
                  <TextInput
                    style={styles.householdNameInput}
                    value={editNameValue}
                    onChangeText={setEditNameValue}
                    onBlur={saveHouseName}
                    onSubmitEditing={saveHouseName}
                    autoFocus
                    returnKeyType="done"
                    maxLength={40}
                  />
                ) : (
                  <Pressable style={{ flex: 1 }} onPress={() => { setEditNameValue(house.name); setIsEditingName(true); }}>
                    <Text style={styles.householdName}>{house.name}</Text>
                  </Pressable>
                )}
                <Pressable hitSlop={8} onPress={() => { setEditNameValue(house.name); setIsEditingName(true); }}>
                  <Ionicons name="pencil-outline" size={18} color="#7A6652" />
                </Pressable>
              </View>

              {/* Invite code */}
              <Text style={styles.householdSectionLabel}>Invite Code</Text>
              <Pressable style={styles.inviteCodeBox} onPress={copyInviteCode}>
                <Text style={styles.inviteCodeText}>{house.inviteCode}</Text>
                <Ionicons
                  name={codeCopied ? 'checkmark-outline' : 'copy-outline'}
                  size={20}
                  color={codeCopied ? '#3D6B5E' : '#7A6652'}
                />
              </Pressable>

              {/* People */}
              <Text style={styles.householdSectionLabel}>People</Text>
              <View style={styles.peopleList}>
                {members.map((m) => {
                  const isOwner = m.id === house.createdBy;
                  const isYou = m.id === currentUid;
                  const avatarInfo = memberMap[m.id];
                  return (
                    <View key={m.id} style={styles.memberCard}>
                      <View style={[styles.memberAvatar, { backgroundColor: m.color ?? '#C8B89A' }]}>
                        {avatarInfo?.avatarUrl ? (
                          <Image source={{ uri: avatarInfo.avatarUrl }} style={styles.memberAvatarImg} />
                        ) : (
                          <Text style={styles.memberAvatarInitial}>
                            {m.displayName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.memberCardName}>
                        {m.displayName}{isYou ? ' (you)' : ''}
                      </Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{isOwner ? 'Owner' : 'Member'}</Text>
                      </View>
                      {!isOwner && (
                        <Pressable hitSlop={8}>
                          <Ionicons name="ellipsis-vertical" size={16} color="#7A6652" />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              {leaveError && <Text style={styles.errorText}>{leaveError}</Text>}

              {/* Disband */}
              <Pressable
                style={({ pressed }) => [styles.disbandButton, pressed && { opacity: 0.75 }]}
                onPress={confirmLeaveHouse}
                disabled={isLeavingHouse}
              >
                {isLeavingHouse ? (
                  <ActivityIndicator color="#C0392B" />
                ) : (
                  <Text style={styles.disbandButtonText}>Disband Household</Text>
                )}
              </Pressable>
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

      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCF5EE' },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  profileSectionLabel: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 18,
    color: '#2E0800',
    marginBottom: 10,
  },

  // ── Header title ────────────────────────────────────────────────────────────
  backButton: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    zIndex: 10,
  },
  headerTitle: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2E0800',
  },

  // ── Profile card ────────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileAvatarFallback: {
    backgroundColor: '#C8B89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 20,
    color: '#fff',
  },
  profileName: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#7A6652',
  },
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

  // ── Household redesign ────────────────────────────────────────────────────────
  householdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  householdNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  householdName: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 20,
    color: '#2E0800',
    flex: 1,
  },
  householdNameInput: {
    flex: 1,
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 20,
    color: '#2E0800',
    borderBottomWidth: 1.5,
    borderBottomColor: '#7A6652',
    paddingVertical: 2,
  },
  householdSectionLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#2E0800',
    marginBottom: 8,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  inviteCodeText: {
    flex: 1,
    fontFamily: 'SpaceMono',
    fontSize: 16,
    letterSpacing: 3,
    color: '#2E0800',
  },
  peopleList: { gap: 8, marginBottom: 18 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  memberAvatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 18,
    color: '#fff',
  },
  memberCardName: {
    flex: 1,
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#2E0800',
  },
  roleBadge: {
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  disbandButton: {
    borderWidth: 1.5,
    borderColor: '#C0392B',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disbandButtonText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#C0392B',
  },

  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: { opacity: 0.75 },
  secondaryButtonText: { color: S.textStrong, fontWeight: '700' },
  leaveButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: S.dangerBorder,
    backgroundColor: S.dangerBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonPressed: { opacity: 0.75 },
  leaveButtonText: { color: S.dangerText, fontWeight: '700' },
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
  leaveButtonDisabled: { opacity: 0.6 },
  errorText: { color: S.dangerText, fontSize: 12, marginTop: 8 },
});
