import FontAwesome from '@expo/vector-icons/FontAwesome';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  confirmPhoneLogin,
  confirmPhoneSignUp,
  createRecaptchaVerifier,
  getPhoneAuthErrorMessage,
  isPhoneAuthSupported,
  PhoneAuthNoAccountError,
  startPhoneVerification,
  toE164,
} from '@/src/firebase/auth';
import {
  clearPendingPhoneConfirmation,
  getPendingPhoneConfirmation,
  setPendingPhoneConfirmation,
} from '@/src/firebase/phoneAuthSession';
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');
const CODE_LENGTH = 6;
const RECAPTCHA_CONTAINER_ID = 'recaptcha-container-verify-phone';
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyPhoneScreen() {
  const { flow, phone = '' } = useLocalSearchParams<{
    flow?: 'login' | 'signup';
    phone?: string;
  }>();
  const currentFlow = flow === 'login' ? 'login' : 'signup';
  const { width, height } = useWindowDimensions();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const isComplete = code.length === CODE_LENGTH;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If there's no in-flight verification session (e.g. the page was
  // reloaded on web, losing in-memory state), silently re-send a code so
  // the screen isn't a dead end.
  useEffect(() => {
    if (!getPendingPhoneConfirmation() && phone) {
      void sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
    if (error) setError('');
  }

  function goBackToPhoneNumber() {
    router.replace(
      `/(auth)/phone-number?flow=${currentFlow}&phone=${phone}` as Href
    );
  }

  async function sendCode() {
    setError('');
    if (!isPhoneAuthSupported()) {
      setError(
        'Phone sign-in isn’t available in this preview build yet — try the web version, or use email.'
      );
      return;
    }
    try {
      const phoneE164 = toE164(phone);
      verifierRef.current?.clear();
      const verifier = createRecaptchaVerifier(RECAPTCHA_CONTAINER_ID);
      verifierRef.current = verifier;
      const confirmation = await startPhoneVerification(phoneE164, verifier);
      setPendingPhoneConfirmation(confirmation);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getPhoneAuthErrorMessage(err));
    }
  }

  async function handleResend() {
    if (isResending || isVerifying || resendCooldown > 0) return;
    setIsResending(true);
    setCode('');
    await sendCode();
    setIsResending(false);
  }

  async function continueAfterVerification() {
    if (!isComplete || isVerifying) return;
    setError('');

    const confirmation = getPendingPhoneConfirmation();
    if (!confirmation) {
      setError('Your verification session expired. Requesting a new code…');
      void sendCode();
      return;
    }

    setIsVerifying(true);
    try {
      if (currentFlow === 'signup') {
        await confirmPhoneSignUp(confirmation, code, toE164(phone));
        clearPendingPhoneConfirmation();
        router.replace('/(auth)/home-choice');
      } else {
        await confirmPhoneLogin(confirmation, code);
        clearPendingPhoneConfirmation();
        // AuthGate routes based on the now-populated profile/houseId.
      }
    } catch (err) {
      // A successful confirm() that we then rejected for business reasons
      // (no matching account) has already consumed the verification —
      // retrying the same code won't work, so force a fresh send instead.
      if (err instanceof PhoneAuthNoAccountError) {
        clearPendingPhoneConfirmation();
      }
      setError(getPhoneAuthErrorMessage(err));
      setCode('');
    } finally {
      setIsVerifying(false);
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t receive the code? </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                accessibilityState={{ disabled: resendCooldown > 0 || isResending }}
                disabled={resendCooldown > 0 || isResending}
                hitSlop={8}
                onPress={handleResend}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (resendCooldown > 0 || isResending) && styles.resendLinkDisabled,
                  ]}
                >
                  {isResending
                    ? 'Sending…'
                    : resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : 'Resend code.'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Invisible reCAPTCHA mount point — web only, required by Firebase's ApplicationVerifier. */}
          <View nativeID={RECAPTCHA_CONTAINER_ID} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isComplete || isVerifying }}
            disabled={!isComplete || isVerifying}
            onPress={continueAfterVerification}
            style={({ pressed }) => [
              styles.continueButton,
              (!isComplete || isVerifying) && styles.continueButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueText}>
              {isVerifying ? 'Verifying…' : 'Continue'}
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
  resendLinkDisabled: {
    color: PALETTE.inkFaint,
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
