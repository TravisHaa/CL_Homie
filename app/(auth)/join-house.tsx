import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';
import { houseDoc, userDoc } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

export default function JoinHouseScreen() {
  const { firebaseUser, userProfile } = useAuthStore();
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  function showError(error: unknown, fallbackMessage: string) {
    const err = error as { code?: string; message?: string };
    let message = err?.message ?? fallbackMessage;
    if (err?.code === 'permission-denied') {
      message =
        'Permission denied in Firestore rules. Allow signed-in users to join houses and update their own user profile.';
    }
    console.error('[JoinHouse]', err?.code ?? 'unknown-error', message);
    setJoinError(message);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', message);
    }
  }

  async function submitJoin() {
    setValidationError(null);
    setJoinError(null);

    const parsed = joinSchema.safeParse({ inviteCode: inviteCodeInput });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid invite code.');
      return;
    }

    if (!firebaseUser) {
      setJoinError('You must be logged in to join a house.');
      return;
    }

    setIsJoining(true);
    try {
      const inviteCode = parsed.data.inviteCode;
      console.log('[JoinHouse] join submit', inviteCode);

      const q = query(
        collection(db, 'houses'),
        where('inviteCode', '==', inviteCode)
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
      const batch = writeBatch(db);

      const prevHouseId = userProfile?.houseId;
      if (prevHouseId && prevHouseId !== houseRef.id) {
        const prevHouseSnap = await getDoc(houseDoc(prevHouseId));
        const prevMemberIds: string[] = prevHouseSnap.exists()
          ? (prevHouseSnap.data()?.memberIds ?? [])
          : [];
        if (prevMemberIds.includes(firebaseUser.uid)) {
          batch.update(houseDoc(prevHouseId), {
            memberIds: arrayRemove(firebaseUser.uid),
            [`memberNames.${firebaseUser.uid}`]: deleteField(),
          });
        }
      }

      const displayName =
        userProfile?.displayName ??
        firebaseUser.displayName ??
        firebaseUser.email?.split('@')[0] ??
        'User';

      batch.update(houseRef, {
        memberIds: arrayUnion(firebaseUser.uid),
        [`memberNames.${firebaseUser.uid}`]: displayName,
      });
      batch.update(userDoc(firebaseUser.uid), { houseId: houseRef.id });
      await batch.commit();
      console.log('[JoinHouse] join success', houseRef.id);
    } catch (err) {
      showError(err, 'Could not join the house. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a home</Text>
      <Text style={styles.subtitle}>Enter your house invite code.</Text>

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
        {validationError && <Text style={styles.errorText}>{validationError}</Text>}
        {joinError && <Text style={styles.errorText}>{joinError}</Text>}

        <TouchableOpacity
          style={[styles.button, isJoining && styles.buttonDisabled]}
          onPress={submitJoin}
          disabled={isJoining}
        >
          <Text style={styles.buttonText}>{isJoining ? 'Joining...' : 'Join House'}</Text>
        </TouchableOpacity>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a home"
          onPress={() => router.push('/(auth)/create-house')}
        >
          <Text style={styles.createLink}>Create a home instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    justifyContent: 'center',
    padding: 32,
  },
  title: { fontSize: 32, fontWeight: '800', color: '#2D3436', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#636e72', marginBottom: 32 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  input: {
    backgroundColor: '#fff',
    borderColor: '#DFE6E9',
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 16,
    padding: 14,
  },
  errorText: { color: '#FF6B6B', fontSize: 12 },
  button: {
    alignItems: 'center',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  createLink: {
    color: '#636e72',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
