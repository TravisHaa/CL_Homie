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
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');

const joinSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
});

export default function JoinHouseScreen() {
  const { width, height } = useWindowDimensions();
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
      const houseData = snap.docs[0].data();
      const nextMemberCount = houseData.memberIds?.includes(firebaseUser.uid)
        ? houseData.memberIds.length
        : (houseData.memberIds?.length ?? 0) + 1;
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
      router.replace({
        pathname: '/(auth)/home-status',
        params: {
          mode: 'joined',
          houseName: houseData.name,
          creatorName:
            houseData.memberNames?.[houseData.createdBy] ??
            userProfile?.displayName ??
            displayName,
          memberCount: String(nextMemberCount),
        },
      });
    } catch (err) {
      showError(err, 'Could not join the house. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
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
            <Text style={styles.title}>Enter your home's code</Text>
            <Text style={styles.subtitle}>
              Contact your home admin to receive{'\n'}your join code
            </Text>

            <TextInput
              style={styles.input}
              placeholder="xxxxxx"
              placeholderTextColor={PALETTE.ink}
              autoCapitalize="characters"
              maxLength={6}
              onChangeText={setInviteCodeInput}
              value={inviteCodeInput}
            />
            {validationError && <Text style={styles.errorText}>{validationError}</Text>}
            {joinError && <Text style={styles.errorText}>{joinError}</Text>}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, isJoining && styles.buttonDisabled]}
            onPress={submitJoin}
            disabled={isJoining}
          >
            <Text style={styles.buttonText}>{isJoining ? 'Joining...' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
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
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 27,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
    zIndex: 1,
  },
  backIcon: {
    color: PALETTE.ink,
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 42,
  },
  form: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 354,
    width: '100%',
  },
  title: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: PALETTE.inkMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    backgroundColor: PALETTE.field,
    borderRadius: 21,
    borderWidth: 0,
    color: PALETTE.ink,
    fontSize: 12,
    height: 42,
    maxWidth: 356,
    paddingHorizontal: 15,
    width: '100%',
  },
  errorText: {
    color: PALETTE.error,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: PALETTE.teal,
    borderRadius: 19,
    bottom: 61,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 83,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: PALETTE.onAction, fontSize: 12, fontWeight: '500' },
});
