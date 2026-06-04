import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RotationCard } from '@/src/components/settings/RotationCard';

const S = {
  bg: '#FFFBF5',
  textStrong: '#372B73',
  border: '#CBC1FA',
};

export default function RotationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rotation schedule"
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={S.textStrong} />
        </Pressable>
        <Text style={styles.title}>Rotation Schedule</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RotationCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: S.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: S.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: S.textStrong,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
