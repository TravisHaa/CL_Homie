import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { deleteUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { GridBackground } from '@/src/components/GridBackground';
import { ImageCropModal } from '@/src/components/ImageCropModal';
import { useAuthStore } from '@/src/store/authStore';
import { signOut } from '@/src/firebase/auth';
import { db, storage } from '@/src/firebase/config';
import HeaderSvg from '@/assets/images/header.svg';

export default function MyAccountScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser);
  const [uploading, setUploading] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  async function pickAvatar() {
    if (!firebaseUser?.uid) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;
    setCropUri(result.assets[0].uri);
  }

  async function uploadAvatar(uri: string) {
    if (!firebaseUser?.uid) return;
    setCropUri(null);
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `users/${firebaseUser.uid}/avatar`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', firebaseUser.uid), { avatarUrl: url });
      if (userProfile) setUserProfile({ ...userProfile, avatarUrl: url });
    } catch (e: any) {
      console.error('[MyAccount] avatar upload failed', e);
      Alert.alert('Upload failed', e?.message ?? 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleLogOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      setFirebaseUser(null);
      setUserProfile(null);
      router.replace('/(auth)/signup');
    } catch (e: any) {
      Alert.alert('Log out failed', e?.message ?? 'Could not log out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (!firebaseUser) return;
    setIsDeletingAccount(true);
    try {
      await deleteUser(firebaseUser);
      setFirebaseUser(null);
      setUserProfile(null);
      router.replace('/(auth)/signup');
    } catch (e: any) {
      const needsFreshLogin = e?.code === 'auth/requires-recent-login';
      Alert.alert(
        'Delete account failed',
        needsFreshLogin
          ? 'For your security, please log out and log back in before deleting your account.'
          : e?.message ?? 'Could not delete your account. Please try again.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function confirmDeleteAccount() {
    const message = 'This permanently deletes your login account. This action cannot be undone.';

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.(`Delete account?\n\n${message}`);
      if (confirmed) void handleDeleteAccount();
      return;
    }

    Alert.alert('Delete account?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: handleDeleteAccount },
    ]);
  }

  return (
    <View style={styles.container}>
      <GridBackground />

      {/* Header */}
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <HeaderSvg width="100%" height={117} preserveAspectRatio="xMidYMid slice" />
        <Pressable style={styles.backBtn} onPress={() => router.push('/(tabs)/settings')} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#2E0800" />
        </Pressable>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ImageCropModal
        visible={!!cropUri}
        imageUri={cropUri ?? ''}
        onConfirm={uploadAvatar}
        onCancel={() => setCropUri(null)}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Pressable onPress={pickAvatar} disabled={uploading} style={styles.avatarPressable}>
              {userProfile?.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {userProfile?.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                {uploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={16} color="#fff" />
                }
              </View>
            </Pressable>
          </View>

          {/* Info rows */}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Name</Text>
              <Text style={styles.rowValue}>{userProfile?.displayName ?? '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{firebaseUser?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.accountActions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.logOutButton,
                pressed && styles.actionButtonPressed,
                (isSigningOut || isDeletingAccount) && styles.actionButtonDisabled,
              ]}
              onPress={handleLogOut}
              disabled={isSigningOut || isDeletingAccount}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              {isSigningOut ? (
                <ActivityIndicator color="#2E0800" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={22} color="#2E0800" />
                  <Text style={styles.logOutButtonText}>Log Out</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.deleteButton,
                pressed && styles.actionButtonPressed,
                (isSigningOut || isDeletingAccount) && styles.actionButtonDisabled,
              ]}
              onPress={confirmDeleteAccount}
              disabled={isSigningOut || isDeletingAccount}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              {isDeletingAccount ? (
                <ActivityIndicator color="#D00A0A" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCF5EE' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 },

  backBtn: {
    position: 'absolute',
    bottom: 18,
    left: 20,
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

  avatarWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: '#C8B89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 36,
    color: '#fff',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D1A0E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FCF5EE',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#7A6652',
  },
  rowValue: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#2D1A0E',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE8E0',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  logOutButton: {
    borderColor: '#2E0800',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  logOutButtonText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#2E0800',
  },
  deleteButton: {
    borderColor: '#D00A0A',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  deleteButtonText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#D00A0A',
  },
});
