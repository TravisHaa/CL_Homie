import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { GridBackground } from '@/src/components/GridBackground';
import { ImageCropModal } from '@/src/components/ImageCropModal';
import { useAuthStore } from '@/src/store/authStore';
import { signOut } from '@/src/firebase/auth';
import { db, storage } from '@/src/firebase/config';
import { HeaderImage } from '@/src/components/HeaderImage';

export default function MyAccountScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((s) => s.userProfile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const [uploading, setUploading] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

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

  return (
    <View style={styles.container}>
      <GridBackground />

      {/* Header */}
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <HeaderImage height={117} pointerEvents="none" />
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

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.75 }]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut
              ? <ActivityIndicator color="#C0392B" />
              : <Text style={styles.signOutBtnText}>Sign Out</Text>
            }
          </Pressable>

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
    color: '#2E0800',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE8E0',
  },

  signOutBtn: {
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: '#C0392B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#C0392B',
  },
});
