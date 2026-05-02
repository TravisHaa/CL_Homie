import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PillButton } from '@/src/components/lofi/PillButton';
import { LOFI } from '@/src/utils/lofiTheme';

export default function GetStartedScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.middle}>
        <Text style={styles.brand}>Homie</Text>
      </View>
      <View style={styles.actions}>
        <PillButton label="Get started" onPress={() => router.push('/(auth)/signup')} />
        <PillButton
          label="I already have an account"
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LOFI.bg },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 44, fontWeight: '700', color: LOFI.text, letterSpacing: -0.5 },
  actions: {
    paddingHorizontal: 40,
    paddingBottom: 48,
    gap: 12,
  },
});
