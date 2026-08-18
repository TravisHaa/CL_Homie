import {
  ImageBackground,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link, router } from 'expo-router';

import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');

export default function SignupScreen() {
  const { width, height } = useWindowDimensions();

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>Homie</Text>
            <Text style={styles.subtitle}>
              keep all your household logistics in one place :)
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => router.push('/(auth)/setup-account')}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>

            <Text style={styles.loginText}>
              I already have an account.{' '}
              <Link href="/(auth)/login" style={styles.loginLink}>
                Log in.
              </Link>
            </Text>
          </View>
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
    paddingHorizontal: 22,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    transform: [{ translateY: -40 }],
  },
  title: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    marginBottom: 10,
  },
  subtitle: {
    color: PALETTE.inkMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    bottom: 142,
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    backgroundColor: PALETTE.teal,
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: PALETTE.onAction,
    fontSize: 12,
    fontWeight: '700',
  },
  loginText: {
    color: PALETTE.ink,
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
  loginLink: {
    color: PALETTE.ink,
    fontSize: 12,
    fontWeight: '700',
  },
});
