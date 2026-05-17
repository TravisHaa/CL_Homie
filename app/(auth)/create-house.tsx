import {
  Alert,
  ImageBackground,
  Platform,
  SafeAreaView,
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
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/src/firebase/config';
import { houseDoc, userDoc } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { nanoid } from '@/src/utils/nanoid';

const bg = require('@/assets/images/background-gradient.jpg');

const createSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  houseName: z.string().min(2, 'House name must be at least 2 characters'),
});

export default function CreateHouseScreen() {
  const { firebaseUser, userProfile } = useAuthStore();
  const [displayNameInput, setDisplayNameInput] = useState(
    userProfile?.displayName ??
      firebaseUser?.displayName ??
      firebaseUser?.email?.split('@')[0] ??
      ''
  );
  const [houseNameInput, setHouseNameInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function showError(error: unknown, fallbackMessage: string) {
    const err = error as { code?: string; message?: string };
    let message = err?.message ?? fallbackMessage;
    if (err?.code === 'permission-denied') {
      message =
        'Permission denied in Firestore rules. Allow signed-in users to create houses and update their own user profile.';
    }
    console.error('[CreateHouse]', err?.code ?? 'unknown-error', message);
    setCreateError(message);
    if (Platform.OS !== 'web') {
      Alert.alert('Error', message);
    }
  }

  async function submitCreate() {
    setValidationError(null);
    setCreateError(null);

    const parsed = createSchema.safeParse({
      displayName: displayNameInput,
      houseName: houseNameInput,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid house details.');
      return;
    }

    if (!firebaseUser) {
      setCreateError('You must be logged in to create a house.');
      return;
    }

    setIsCreating(true);
    try {
      const { displayName, houseName } = parsed.data;
      console.log('[CreateHouse] create submit', houseName);

      const inviteCode = nanoid(6).toUpperCase();
      const houseRef = doc(collection(db, 'houses'));
      const batch = writeBatch(db);

      const prevHouseId = userProfile?.houseId;
      if (prevHouseId) {
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

      batch.set(houseRef, {
        name: houseName,
        inviteCode,
        memberIds: [firebaseUser.uid],
        memberNames: {
          [firebaseUser.uid]: displayName,
        },
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      batch.update(userDoc(firebaseUser.uid), {
        displayName,
        houseId: houseRef.id,
      });
      await batch.commit();
      console.log('[CreateHouse] create success', houseRef.id, inviteCode);
    } catch (err) {
      showError(err, 'Could not create the house. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ImageBackground source={bg} style={styles.background} resizeMode="contain">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.title}>Create a home</Text>

            <Text style={styles.label}>What is your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Write here"
              placeholderTextColor="#2b1b16"
              autoCapitalize="words"
              onChangeText={setDisplayNameInput}
              value={displayNameInput}
            />

            <Text style={styles.label}>What's the name of your home?</Text>
            <TextInput
              style={styles.input}
              placeholder="Write here"
              placeholderTextColor="#2b1b16"
              onChangeText={setHouseNameInput}
              value={houseNameInput}
            />

            {validationError && <Text style={styles.errorText}>{validationError}</Text>}
            {createError && <Text style={styles.errorText}>{createError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, isCreating && styles.buttonDisabled]}
            onPress={submitCreate}
            disabled={isCreating}
          >
            <Text style={styles.buttonText}>
              {isCreating ? 'Creating...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  backButton: {
    height: 44,
    justifyContent: 'center',
    marginTop: 28,
    width: 44,
  },
  backIcon: {
    color: '#2b1b16',
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 42,
  },
  form: {
    marginTop: 170,
  },
  title: {
    color: '#2b1b16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    marginBottom: 34,
    textAlign: 'center',
  },
  label: {
    color: '#2b1b16',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff8f1',
    borderRadius: 24,
    color: '#2b1b16',
    fontSize: 14,
    height: 48,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: -12,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#4d7580',
    borderRadius: 19,
    bottom: 66,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 84,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
