import FontAwesome from '@expo/vector-icons/FontAwesome';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');
const CODE_LENGTH = 6;

export default function VerifyPhoneScreen() {
  const { flow, phone = '' } = useLocalSearchParams<{
    flow?: 'login' | 'signup';
    phone?: string;
  }>();
  const { width, height } = useWindowDimensions();
  const [code, setCode] = useState('');
  const isComplete = code.length === CODE_LENGTH;

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
  }

  function goBackToPhoneNumber() {
    const currentFlow = flow === 'login' ? 'login' : 'signup';
    router.replace(
      `/(auth)/phone-number?flow=${currentFlow}&phone=${phone}` as Href
    );
  }

  function continueAfterVerification() {
    const destination =
      flow === 'login' ? '/(tabs)' : '/(auth)/home-choice';
    router.replace(destination as Href);
  }

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={goBackToPhoneNumber}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <FontAwesome name="angle-left" size={38} color={PALETTE.ink} />
          </Pressable>

          <View style={styles.form}>
            <Text style={styles.title}>
              We sent a code to{phone ? `\n${phone}` : ''}
            </Text>

            <Text style={styles.label}>Enter the code sent to your number</Text>
            <TextInput
              accessibilityLabel="Verification code"
              autoComplete="sms-otp"
              autoFocus
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onChangeText={updateCode}
              placeholder="Write here"
              placeholderTextColor={PALETTE.ink}
              returnKeyType="done"
              style={styles.input}
              textContentType="oneTimeCode"
              value={code}
            />

            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t receive the code? </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                hitSlop={8}
                onPress={() => setCode('')}
              >
                <Text style={styles.resendLink}>Resend code.</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isComplete }}
            disabled={!isComplete}
            onPress={continueAfterVerification}
            style={({ pressed }) => [
              styles.continueButton,
              !isComplete && styles.continueButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </KeyboardAvoidingView>
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
  keyboard: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 22,
  },
  backButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    top: 20,
    width: 48,
    zIndex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 500,
    transform: [{ translateY: -36 }],
    width: '100%',
  },
  title: {
    color: PALETTE.ink,
    fontFamily: 'GowunBatang_400Regular',
    fontSize: 20,
    lineHeight: 27,
    marginBottom: 33,
    textAlign: 'center',
  },
  label: {
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: PALETTE.field,
    borderRadius: 22,
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    height: 49,
    paddingHorizontal: 16,
    width: '100%',
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  resendPrompt: {
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
  },
  resendLink: {
    color: PALETTE.coral,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: PALETTE.teal,
    borderRadius: 22,
    bottom: 62,
    height: 44,
    justifyContent: 'center',
    minWidth: 84,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  continueButtonDisabled: {
    opacity: 0.62,
  },
  continueText: {
    color: PALETTE.onAction,
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.68,
  },
});
