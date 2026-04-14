import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { userDoc } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { nanoid } from '@/src/utils/nanoid';

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

const createSchema = z.object({
  houseName: z.string().min(2, 'House name must be at least 2 characters'),
});

export default function JoinHouseScreen() {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [houseNameInput, setHouseNameInput] = useState('');
  const [joinValidationError, setJoinValidationError] = useState<string | null>(null);
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { firebaseUser, userProfile } = useAuthStore();
  const displayNameForHouse =
    userProfile?.displayName ??
    firebaseUser?.displayName ??
    firebaseUser?.email?.split('@')[0] ??
    'User';

  // Surface backend failures inline on web where Alert is not visible.
  function showError(
    setError: (msg: string | null) => void,
    error: unknown,
    fallbackMessage: string
  ) {
    const err = error as { code?: string; message?: string };
    let message = err?.message ?? fallbackMessage;
    if (err?.code === 'permission-denied') {
      message =
        'Permission denied in Firestore rules. Allow signed-in users to create houses and update their own user profile.';
    }
    console.error('[JoinHouse]', err?.code ?? 'unknown-error', message);
    setError(message);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', message);
    }
  }

  async function handleJoin({ inviteCode }: { inviteCode: string }) {
    if (!firebaseUser) {
      setJoinError('You must be logged in to join a house.');
      return;
    }
    setJoinError(null);
    try {
      // Debug trace: confirms submit handler is running on the current bundle.
      console.log('[JoinHouse] join submit', inviteCode.toUpperCase());
      const q = query(
        collection(db, 'houses'),
        where('inviteCode', '==', inviteCode.toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        const message = 'No house found with that invite code.';
        setJoinError(message);
        if (Platform.OS !== 'web') {
          Alert.alert('Not found', message);
        }
        return;
      }
      const houseRef = snap.docs[0].ref;
      // Keep house membership + user profile update in one commit.
      const batch = writeBatch(db);
      // Keep a denormalized member name map for quick household rendering.
      batch.update(houseRef, {
        memberIds: arrayUnion(firebaseUser.uid),
        [`memberNames.${firebaseUser.uid}`]: displayNameForHouse,
      });
      batch.update(userDoc(firebaseUser.uid), { houseId: houseRef.id });
      await batch.commit();
      console.log('[JoinHouse] join success', houseRef.id);
    } catch (err) {
      showError(setJoinError, err, 'Could not join the house. Please try again.');
    }
  }

  async function handleCreate({ houseName }: { houseName: string }) {
    if (!firebaseUser) {
      setCreateError('You must be logged in to create a house.');
      return;
    }
    setCreateError(null);
    try {
      // Debug trace: confirms create branch and payload are executing.
      console.log('[JoinHouse] create submit', houseName);
      const inviteCode = nanoid(6).toUpperCase();
      const houseRef = doc(collection(db, 'houses'));

      // Keep house creation + profile houseId update in one commit.
      const batch = writeBatch(db);
      batch.set(houseRef, {
        name: houseName,
        inviteCode,
        memberIds: [firebaseUser.uid],
        // Store a lightweight name map on house for quick lookups.
        memberNames: {
          [firebaseUser.uid]: displayNameForHouse,
        },
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      batch.update(userDoc(firebaseUser.uid), { houseId: houseRef.id });
      await batch.commit();
      console.log('[JoinHouse] create success', houseRef.id, inviteCode);
    } catch (err) {
      showError(setCreateError, err, 'Could not create the house. Please try again.');
    }
  }

  async function submitJoin() {
    setJoinValidationError(null);
    setJoinError(null);
    const parsed = joinSchema.safeParse({ inviteCode: inviteCodeInput });
    if (!parsed.success) {
      setJoinValidationError(parsed.error.issues[0]?.message ?? 'Invalid invite code.');
      return;
    }
    setIsJoining(true);
    try {
      await handleJoin({ inviteCode: parsed.data.inviteCode });
    } finally {
      setIsJoining(false);
    }
  }

  async function submitCreate() {
    setCreateValidationError(null);
    setCreateError(null);
    const parsed = createSchema.safeParse({ houseName: houseNameInput });
    if (!parsed.success) {
      setCreateValidationError(parsed.error.issues[0]?.message ?? 'Invalid house name.');
      return;
    }
    setIsCreating(true);
    try {
      await handleCreate({ houseName: parsed.data.houseName });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Home</Text>
      <Text style={styles.subtitle}>Join an existing house or create a new one</Text>

      <View style={styles.toggle}>
        {(['join', 'create'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.toggleBtn, mode === m && styles.toggleActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === 'join' ? 'Join a house' : 'Create a house'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'join' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Invite code</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            autoCapitalize="characters"
            maxLength={6}
            onChangeText={setInviteCodeInput}
            value={inviteCodeInput}
          />
          {joinValidationError && <Text style={styles.errorText}>{joinValidationError}</Text>}
          {joinError && <Text style={styles.errorText}>{joinError}</Text>}
          <TouchableOpacity style={styles.button} onPress={submitJoin} disabled={isJoining}>
            <Text style={styles.buttonText}>{isJoining ? 'Joining...' : 'Join House'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>House name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Dungeon, 204 Oak St"
            onChangeText={setHouseNameInput}
            value={houseNameInput}
          />
          {createValidationError && <Text style={styles.errorText}>{createValidationError}</Text>}
          {createError && <Text style={styles.errorText}>{createError}</Text>}
          <TouchableOpacity style={styles.button} onPress={submitCreate} disabled={isCreating}>
            <Text style={styles.buttonText}>{isCreating ? 'Creating...' : 'Create House'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5', padding: 32, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#2D3436', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#636e72', marginBottom: 32 },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#2D3436', borderColor: '#2D3436' },
  toggleText: { fontWeight: '600', color: '#636e72' },
  toggleTextActive: { color: '#fff' },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  input: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: { color: '#FF6B6B', fontSize: 12 },
  button: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
