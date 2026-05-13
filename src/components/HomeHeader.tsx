import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore } from '@/src/store/houseStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export function HomeHeader() {
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const inviteCode = useHouseStore((s) => s.house?.inviteCode);
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const members = Object.entries(memberMap).map(([id, info]) => ({ id, ...info }));
  const now = new Date();

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <LinearGradient
      colors={['#FFDFD2', '#9EC5D1']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        <View style={styles.center}>
          <Text style={styles.houseName}>{house?.name ?? 'Home'}</Text>
          <Text style={styles.houseDate}>{format(now, 'EEEE, MMMM d')}</Text>
          {inviteCode && (
            <View style={styles.inviteRow}>
              <Text style={styles.inviteCodeText}>
                Code <Text style={styles.inviteCodeValue}>{inviteCode}</Text>
              </Text>
              <Pressable
                onPress={handleCopy}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.inviteCopyAction}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={styles.avatarRow}>
          {members.map((m) => (
            <View key={m.id} style={[styles.avatar, { backgroundColor: m.color }]}>
              <Text style={styles.avatarInitial}>
                {m.displayName[0].toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          hitSlop={8}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="settings-outline" size={24} color="#3A3835" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#D7B58A',
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  houseName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3A3835',
    letterSpacing: -0.5,
  },
  houseDate: {
    fontSize: 12,
    color: '#7A7670',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  inviteCodeText: { fontSize: 12, color: '#7A7670' },
  inviteCodeValue: { fontWeight: '800', letterSpacing: 2, color: '#2A2A27' },
  inviteCopyAction: { fontSize: 12, fontWeight: '700', color: '#E17055' },
  center: { flex: 1 },
  avatarRow: { flexDirection: 'row', gap: 6 },
  settingsBtn: { padding: 4 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A4E2A',
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
