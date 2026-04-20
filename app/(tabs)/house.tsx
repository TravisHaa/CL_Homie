import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const G = {
  bg: '#FFFBF5',
  textPrimary: '#2D3436',
  textSecondary: '#636e72',
  border: '#DFE6E9',
  cardBg: '#FFFFFF',
};

export default function HouseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.backRowPressed]}
        >
          <Ionicons name="chevron-back" size={20} color={G.textPrimary} />
          <Text style={styles.backLabel}>Settings</Text>
        </Pressable>

        <Text style={styles.title}>Switch House</Text>
        <Text style={styles.subtitle}>
          Leave your current house first, then join or create a new one.
        </Text>

        <View style={styles.optionCard}>
          <View style={styles.optionIconWrap}>
            <Ionicons name="mail-open-outline" size={22} color={G.textPrimary} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Join a different house</Text>
            <Text style={styles.optionDesc}>Enter an invite code from a housemate.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join a different house"
            onPress={() => router.push('/(auth)/join-house')}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <Text style={styles.optionButtonText}>Go</Text>
          </Pressable>
        </View>

        <View style={styles.optionCard}>
          <View style={styles.optionIconWrap}>
            <Ionicons name="add-circle-outline" size={22} color={G.textPrimary} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>Create a new house</Text>
            <Text style={styles.optionDesc}>Start fresh and invite your housemates.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new house"
            onPress={() => router.push('/(auth)/join-house')}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <Text style={styles.optionButtonText}>Go</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: G.bg },
  container: { flex: 1, padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20, alignSelf: 'flex-start' },
  backRowPressed: { opacity: 0.6 },
  backLabel: { color: G.textPrimary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: G.textPrimary, marginBottom: 8 },
  subtitle: { color: G.textSecondary, lineHeight: 20, marginBottom: 24 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: G.border,
    borderRadius: 12,
    backgroundColor: G.cardBg,
    padding: 16,
    marginBottom: 12,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: G.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: G.textPrimary },
  optionDesc: { color: G.textSecondary, marginTop: 2, fontSize: 13 },
  optionButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: G.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: G.bg,
  },
  optionButtonPressed: { opacity: 0.7 },
  optionButtonText: { fontWeight: '700', color: G.textPrimary },
});
