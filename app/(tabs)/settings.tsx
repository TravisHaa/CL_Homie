import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const S = {
  lavenderBg: '#F2EFFF',
  cardBg: '#E8E2FF',
  cardBorder: '#CBC1FA',
  textStrong: '#372B73',
  textSoft: '#7A6BB0',
};

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Settings gets its own themed intro panel to match tab identity. */}
        <View style={styles.hero}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.lavenderBg },
  container: { flex: 1, padding: 20 },
  hero: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 28, fontWeight: '800', color: S.textStrong },
  subtitle: { color: S.textSoft, marginTop: 8 },
});
