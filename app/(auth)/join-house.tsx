import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
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
  const { firebaseUser } = useAuthStore();

  const joinForm = useForm<{ inviteCode: string }>({
    resolver: zodResolver(joinSchema),
  });

  const createForm = useForm<{ houseName: string }>({
    resolver: zodResolver(createSchema),
  });

  async function handleJoin({ inviteCode }: { inviteCode: string }) {
    if (!firebaseUser) return;
    try {
      const q = query(
        collection(db, 'houses'),
        where('inviteCode', '==', inviteCode.toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Not found', 'No house found with that invite code.');
        return;
      }
      const houseRef = snap.docs[0].ref;
      await updateDoc(houseRef, { memberIds: arrayUnion(firebaseUser.uid) });
      await updateDoc(userDoc(firebaseUser.uid), { houseId: houseRef.id });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleCreate({ houseName }: { houseName: string }) {
    if (!firebaseUser) return;
    try {
      const inviteCode = nanoid(6).toUpperCase();
      const houseRef = await addDoc(collection(db, 'houses'), {
        name: houseName,
        inviteCode,
        memberIds: [firebaseUser.uid],
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(userDoc(firebaseUser.uid), { houseId: houseRef.id });
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
          <Controller
            control={joinForm.control}
            name="inviteCode"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="ABC123"
                autoCapitalize="characters"
                maxLength={6}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {joinForm.formState.errors.inviteCode && (
            <Text style={styles.errorText}>{joinForm.formState.errors.inviteCode.message}</Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={joinForm.handleSubmit(handleJoin)}
            disabled={joinForm.formState.isSubmitting}
          >
            <Text style={styles.buttonText}>
              {joinForm.formState.isSubmitting ? 'Joining...' : 'Join House'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>House name</Text>
          <Controller
            control={createForm.control}
            name="houseName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. The Dungeon, 204 Oak St"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {createForm.formState.errors.houseName && (
            <Text style={styles.errorText}>{createForm.formState.errors.houseName.message}</Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={createForm.handleSubmit(handleCreate)}
            disabled={createForm.formState.isSubmitting}
          >
            <Text style={styles.buttonText}>
              {createForm.formState.isSubmitting ? 'Creating...' : 'Create House'}
            </Text>
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
