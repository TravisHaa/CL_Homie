import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');

type AuthMethodScreenProps = {
  title: string;
  onBackPress: () => void;
  onEmailPress: () => void;
  onMobilePress: () => void;
};

export function AuthMethodScreen({
  title,
  onBackPress,
  onEmailPress,
  onMobilePress,
}: AuthMethodScreenProps) {
  const { width, height } = useWindowDimensions();

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBackPress}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <FontAwesome name="angle-left" size={38} color={PALETTE.ink} />
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.options}>
            <MethodButton label="Continue with email" onPress={onEmailPress} />
            <MethodButton label="Continue with mobile" onPress={onMobilePress} />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function MethodButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text style={styles.optionText}>{label}</Text>
      <FontAwesome name="angle-right" size={27} color={PALETTE.ink} />
    </Pressable>
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
  backButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    left: 30,
    position: 'absolute',
    top: 20,
    width: 48,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 36,
    transform: [{ translateY: -55 }],
  },
  title: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'GowunBatang_400Regular' : 'serif',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 28,
    textAlign: 'center',
  },
  options: {
    gap: 16,
    maxWidth: 500,
    width: '100%',
  },
  option: {
    alignItems: 'center',
    backgroundColor: PALETTE.field,
    borderRadius: 20,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingLeft: 17,
    paddingRight: 18,
    width: '100%',
  },
  optionText: {
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.68,
  },
});
