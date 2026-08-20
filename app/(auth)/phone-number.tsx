import FontAwesome from '@expo/vector-icons/FontAwesome';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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
import type { RecaptchaVerifier } from 'firebase/auth';

import {
  createRecaptchaVerifier,
  getPhoneAuthErrorMessage,
  isPhoneAuthSupported,
  startPhoneVerification,
  toE164,
} from '@/src/firebase/auth';
import { setPendingPhoneConfirmation } from '@/src/firebase/phoneAuthSession';
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');
const RECAPTCHA_CONTAINER_ID = 'recaptcha-container-phone-number';

function formatPhoneNumber(digits: string) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} - ${digits.slice(6)}`;
}

export default function PhoneNumberScreen() {
  const { flow, phone = '' } = useLocalSearchParams<{
    flow?: 'login' | 'signup';
    phone?: string;
  }>();
  const { width, height } = useWindowDimensions();
  const [phoneDigits, setPhoneDigits] = useState(() =>
    phone.replace(/\D/g, '').slice(-10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const isComplete = phoneDigits.length === 10;
  const formattedNumber = useMemo(
    () => formatPhoneNumber(phoneDigits),
    [phoneDigits]
  );

  function updatePhoneNumber(value: string) {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    setPhoneDigits(digits.slice(0, 10));
    if (error) setError('');
  }

  function goBack() {
    const destination =
      flow === 'login'
        ? '/(auth)/sign-in-options'
        : '/(auth)/create-account-options';
    router.replace(destination as Href);
  }

  async function continueToVerification() {
    console.log('[PhoneAuth] continueToVerification pressed', { isComplete, isSubmitting });
    if (!isComplete || isSubmitting) return;
    setError('');

    if (!isPhoneAuthSupported()) {
      console.log('[PhoneAuth] platform unsupported');
      setError(
        'Phone sign-in isn’t available in this preview build yet — try the web version, or use email.'
      );
      return;
    }

    setIsSubmitting(true);
    const currentFlow = flow === 'login' ? 'login' : 'signup';
    try {
      const phoneE164 = toE164(phoneDigits);
      console.log('[PhoneAuth] starting verification for', phoneE164);
      verifierRef.current?.clear();
      const verifier = createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID);
      console.log('[PhoneAuth] recaptcha verifier created');
      verifierRef.current = verifier;
      const confirmation = await startPhoneVerification(phoneE164, verifier);
      console.log('[PhoneAuth] signInWithPhoneNumber resolved, navigating');
      setPendingPhoneConfirmation(confirmation);
      router.push(
        `/(auth)/verify-phone?flow=${currentFlow}&phone=${phoneDigits}` as Href
      );
    } catch (err) {
      console.error('[PhoneAuth] verification failed:', err);
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(getPhoneAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
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
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <FontAwesome name="angle-left" size={38} color={PALETTE.ink} />
          </Pressable>

          <View style={styles.form}>
            <Text style={styles.title}>What’s your phone number?</Text>

            <View style={styles.inputShell}>
              <Text style={styles.prefix}>+1 (</Text>
              <TextInput
                accessibilityLabel="Phone number"
                autoComplete="tel"
                autoFocus
                caretHidden={false}
                keyboardType="number-pad"
                maxLength={15}
                onChangeText={updatePhoneNumber}
                placeholder="___ ___ - ____"
                placeholderTextColor={PALETTE.ink}
                returnKeyType="done"
                style={styles.input}
                textContentType="telephoneNumber"
                value={formattedNumber}
              />
              <Text style={styles.suffix}>)</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Invisible reCAPTCHA mount point — web only, required by Firebase's ApplicationVerifier. */}
          <View nativeID={RECAPTCHA_CONTAINER_ID} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isComplete || isSubmitting }}
            disabled={!isComplete || isSubmitting}
            onPress={continueToVerification}
            style={({ pressed }) => [
              styles.continueButton,
              (!isComplete || isSubmitting) && styles.continueButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueText}>
              {isSubmitting ? 'Sending…' : 'Continue'}
            </Text>
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
    paddingHorizontal: 36,
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 500,
    transform: [{ translateY: -38 }],
    width: '100%',
  },
  title: {
    color: PALETTE.ink,
    fontFamily: 'GowunBatang_400Regular',
    fontSize: 19,
    lineHeight: 27,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: PALETTE.field,
    borderColor: PALETTE.teal,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    height: 49,
    justifyContent: 'center',
    paddingHorizontal: 18,
    width: '100%',
  },
  prefix: {
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 18,
  },
  input: {
    color: PALETTE.ink,
    flexGrow: 0,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 18,
    minWidth: 150,
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  suffix: {
    color: PALETTE.ink,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 18,
  },
  errorText: {
    color: PALETTE.error,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
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
