import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { userDoc, houseDoc } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { nanoid } from '@/src/utils/nanoid';
import { PillInput } from '@/src/components/lofi/PillInput';
import { PillButton } from '@/src/components/lofi/PillButton';
import { SegmentedToggle } from '@/src/components/lofi/SegmentedToggle';
import { LOFI } from '@/src/utils/lofiTheme';

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

const createSchema = z.object({
  houseName: z.string().min(2, 'House name must be at least 2 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
});

type Mode = 'join' | 'create';

export default function JoinHouseScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(modeParam === 'create' ? 'create' : 'join');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [houseNameInput, setHouseNameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { firebaseUser, userProfile } = useAuthStore();

  const fallbackName =
    userProfile?.displayName ??
    firebaseUser?.displayName ??
    firebaseUser?.email?.split('@')[0] ??
    'User';

  function showError(err: unknown, fallback: string) {
    const e = err as { code?: string; message?: string };
    let message = e?.message ?? fallback;
    if (e?.code === 'permission-denied') {
      message =
        'Permission denied. Allow signed-in users to create houses and update their profile.';
    }
    setError(message);
    if (Platform.OS !== 'web') Alert.alert('Error', message);
  }

  async function handleJoin(inviteCode: string) {
    if (!firebaseUser) return setError('You must be logged in.');
    const q = query(collection(db, 'houses'), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      setError('No house found with that invite code.');
      return;
    }
    const houseRef = snap.docs[0].ref;
    const batch = writeBatch(db);
    const prevHouseId = userProfile?.houseId;
    if (prevHouseId && prevHouseId !== houseRef.id) {
      batch.update(houseDoc(prevHouseId), {
        memberIds: arrayRemove(firebaseUser.uid),
        [`memberNames.${firebaseUser.uid}`]: deleteField(),
      });
    }
    batch.update(houseRef, {
      memberIds: arrayUnion(firebaseUser.uid),
      [`memberNames.${firebaseUser.uid}`]: fallbackName,
    });
    batch.update(userDoc(firebaseUser.uid), { houseId: houseRef.id });
    await batch.commit();
  }

  async function handleCreate(houseName: string, displayName: string) {
    if (!firebaseUser) return setError('You must be logged in.');
    const inviteCode = nanoid(6).toUpperCase();
    const houseRef = doc(collection(db, 'houses'));
    const batch = writeBatch(db);
    const prevHouseId = userProfile?.houseId;
    if (prevHouseId) {
      batch.update(houseDoc(prevHouseId), {
        memberIds: arrayRemove(firebaseUser.uid),
        [`memberNames.${firebaseUser.uid}`]: deleteField(),
      });
    }
    batch.set(houseRef, {
      name: houseName,
      inviteCode,
      memberIds: [firebaseUser.uid],
      memberNames: { [firebaseUser.uid]: displayName },
      createdBy: firebaseUser.uid,
      createdAt: serverTimestamp(),
    });
    batch.update(userDoc(firebaseUser.uid), { houseId: houseRef.id, displayName });
  await batch.commit();
  }

  async function onContinue() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'join') {
        const parsed = joinSchema.safeParse({ inviteCode: inviteCodeInput });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Invalid invite code.');
          return;
        }
        await handleJoin(parsed.data.inviteCode);
      } else {
        const parsed = createSchema.safeParse({
          houseName: houseNameInput,
          displayName: displayNameInput || fallbackName,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
          return;
        }
        await handleCreate(parsed.data.houseName, parsed.data.displayName);
      }
    } catch (err) {
      showError(err, 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.toggleWrap}>
          <SegmentedToggle<Mode>
            value={mode}
            onChange={(v) => {
              setMode(v);
              setError(null);
            }}
            options={[
              { value: 'join', label: 'Join home' },
              { value: 'create', label: 'Create home' },
            ]}
          />
        </View>

        <View style={styles.body}>
          {mode === 'join' ? (
            <View style={styles.section}>
              <Text style={styles.title}>Enter your home code</Text>
              <Text style={styles.subtitle}>
                Contact your home admin to receive your join code
              </Text>
              <PillInput
                placeholder="Enter code"
                autoCapitalize="characters"
                maxLength={6}
                onChangeText={setInviteCodeInput}
                value={inviteCodeInput}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.title}>Welcome to Homie!</Text>
              <Text style={styles.label}>What's the name of your home?</Text>
              <PillInput
                placeholder="Write here"
                onChangeText={setHouseNameInput}
                value={houseNameInput}
              />
              <Text style={[styles.label, { marginTop: 12 }]}>What is your name?</Text>
              <PillInput
                placeholder="Write here"
                autoCapitalize="words"
                onChangeText={setDisplayNameInput}
                value={displayNameInput}
              />
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <PillButton
            label={mode === 'join' ? 'Continue' : 'Create home'}
            onPress={onContinue}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LOFI.bg },
  flex: { flex: 1 },
  toggleWrap: { paddingTop: 16, paddingBottom: 8 },
  body: { flex: 1, paddingHorizontal: 40, justifyContent: 'center', gap: 12 },
  section: { gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: LOFI.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
  },
  error: { color: LOFI.error, fontSize: 13, textAlign: 'center', marginTop: 8 },
  footer: { paddingHorizontal: 40, paddingBottom: 36, alignItems: 'center' },
});
