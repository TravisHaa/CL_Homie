import { CHORE_THEME } from '@/src/theme/chores';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function ChoresEmptyState() {
  return (
    <View style={styles.card}>
      <Ionicons name="sparkles-outline" size={40} color={CHORE_THEME.accent} />
      <Text style={styles.title}>No chores yet this week</Text>
      <Text style={styles.body}>
        Tap + to add one, or your recurring chores will appear here soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: CHORE_THEME.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    marginHorizontal: 4,
    marginTop: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 17,
    fontFamily: 'GowunBatang_700Bold',
    color: '#2E0800',
    marginTop: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: 'AlbertSans_400Regular',
    color: '#7A6652',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 280,
  },
});
