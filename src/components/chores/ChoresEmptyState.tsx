import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const CH = {
  plateBorder: '#F4BA93',
  textStrong: '#5A2F1A',
  textSoft: '#946345',
  accent: '#D97745',
};

export function ChoresEmptyState() {
  return (
    <View style={styles.card}>
      <Ionicons name="sparkles-outline" size={40} color={CH.accent} />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CH.plateBorder,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: CH.textStrong,
    marginTop: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: CH.textSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 280,
  },
});
