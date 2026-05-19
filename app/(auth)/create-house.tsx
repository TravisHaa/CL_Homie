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
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { auth, db } from '@/src/firebase/config';
import { houseDoc, userDoc } from '@/src/firebase/firestore';
import { useAuthStore } from '@/src/store/authStore';
import { nanoid } from '@/src/utils/nanoid';

const bg = require('@/assets/images/phoneBG.png');

const createSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  houseName: z.string().min(2, 'House name must be at least 2 characters'),
});

export default function CreateHouseScreen() {
  const { width, height } = useWindowDimensions();
  const { firebaseUser, userProfile } = useAuthStore();
  const currentUser = firebaseUser ?? auth.currentUser;
  const [displayNameInput, setDisplayNameInput] = useState(
    userProfile?.displayName ??
      currentUser?.displayName ??
      currentUser?.email?.split('@')[0] ??
      ''
  );
  const [houseNameInput, setHouseNameInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (displayNameInput) return;

    const displayName =
      userProfile?.displayName ??
      currentUser?.displayName ??
      currentUser?.email?.split('@')[0] ??
      '';

    if (displayName) {
      setDisplayNameInput(displayName);
    }
  }, [currentUser, displayNameInput, userProfile]);

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
    const activeUser = firebaseUser ?? auth.currentUser;

    const parsed = createSchema.safeParse({
      displayName: displayNameInput,
      houseName: houseNameInput,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Invalid house details.');
      return;
    }

    if (!activeUser) {
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
        if (prevMemberIds.includes(activeUser.uid)) {
          batch.update(houseDoc(prevHouseId), {
            memberIds: arrayRemove(activeUser.uid),
            [`memberNames.${activeUser.uid}`]: deleteField(),
          });
        }
      }

      batch.set(houseRef, {
        name: houseName,
        inviteCode,
        memberIds: [activeUser.uid],
        memberNames: {
          [activeUser.uid]: displayName,
        },
        createdBy: activeUser.uid,
        createdAt: serverTimestamp(),
      });
      batch.set(
        userDoc(activeUser.uid),
        {
          id: activeUser.uid,
          email: activeUser.email ?? '',
          displayName,
          houseId: houseRef.id,
        },
        { merge: true }
      );
      await batch.commit();
      console.log('[CreateHouse] create success', houseRef.id, inviteCode);
      router.replace({
        pathname: '/(auth)/home-status',
        params: {
          mode: 'created',
          houseName,
          creatorName: displayName,
          memberCount: '1',
        },
      });
    } catch (err) {
      showError(err, 'Could not create the house. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ImageBackground
      source={bg}
      style={[styles.background, { width, height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.replace('/(auth)/home-choice')}
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
    overflow: 'hidden',
  },
  backgroundImage: {
    height: '100%',
    width: '100%',
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
    alignSelf: 'center',
    marginTop: 170,
    maxWidth: 326,
    width: '100%',
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
