import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

import { signOut } from '@/src/firebase/auth';

const bg = require('@/assets/images/phoneBG.png');

export default function HomeChoiceScreen() {
  const { width, height } = useWindowDimensions();

  async function backToSignUp() {
    await signOut();
    router.replace('/(auth)/setup-account');
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
            accessibilityLabel="Back to sign up"
            style={styles.backButton}
            onPress={backToSignUp}
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back to sign up</Text>
          </TouchableOpacity>

          <View style={styles.main}>
            <Text style={styles.title}>Now, select from the options below</Text>

            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Join a Home"
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.optionCardMuted,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => router.push('/(auth)/join-house')}
              >
                <FontAwesome name="home" size={18} color="#6e655f" />
                <Text style={styles.optionTextMuted}>Join a Home</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a Home"
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.optionCardActive,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => router.push('/(auth)/create-house')}
              >
                <FontAwesome name="pencil-square-o" size={18} color="#3c160f" />
                <Text style={styles.optionText}>Create a Home</Text>
              </Pressable>
            </View>
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
    flex: 1,
    paddingHorizontal: 22,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    height: 44,
    marginTop: 28,
  },
  backIcon: {
    color: '#2b1b16',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 38,
    marginRight: 6,
  },
  backLabel: {
    color: '#2b1b16',
    fontSize: 12,
  },
  main: {
    alignItems: 'center',
    marginTop: 105,
  },
  title: {
    color: '#2b1b16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 46,
    maxWidth: 250,
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    width: '100%',
  },
  optionCard: {
    alignItems: 'center',
    borderRadius: 22,
    height: 154,
    justifyContent: 'center',
    maxWidth: 146,
    width: '46%',
  },
  optionCardMuted: {
    backgroundColor: 'rgba(255, 248, 241, 0.42)',
  },
  optionCardActive: {
    backgroundColor: 'rgba(255, 248, 241, 0.86)',
    borderColor: '#3c160f',
    borderWidth: 1.3,
  },
  optionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    color: '#3c160f',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
  },
  optionTextMuted: {
    color: '#6e655f',
    fontSize: 12,
    marginTop: 14,
  },
});
