import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';

import { sendPasswordReset } from '@/src/firebase/auth';
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');
const emailSchema = z.string().email('Enter a valid email');

export default function ForgotPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError('');
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data);
      setSent(true);
    } catch (err: any) {
      // Don't reveal whether an account exists — show the same confirmation.
      if (err?.code === 'auth/user-not-found') setSent(true);
      else setError(err?.message ?? 'Could not send reset email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
      imageStyle={styles.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.title}>Reset Your Password</Text>
            {sent ? (
              <Text style={styles.sent}>
                Check your email — we sent a reset link to{'\n'}
                <Text style={styles.sentEmail}>{email.trim()}</Text>
              </Text>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, !!error && styles.inputError]}
                  placeholder="Write here"
                  placeholderTextColor={PALETTE.ink}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            )}
          </View>

          {sent ? (
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Back to login</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Sending…' : 'Continue'}</Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  bg: { height: '100%', width: '100%' },
  safe: { flex: 1 },
  keyboard: { flex: 1, alignItems: 'center', paddingHorizontal: 22, width: '100%' },
  backButton: { position: 'absolute', top: 12, left: 22, height: 44, width: 44, justifyContent: 'center', zIndex: 1 },
  backIcon: { color: PALETTE.ink, fontSize: 42, lineHeight: 42, fontWeight: '300' },
  form: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 354, width: '100%' },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 34,
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  label: { fontSize: 14, textAlign: 'center', marginBottom: 16, color: PALETTE.ink },
  input: {
    alignSelf: 'center',
    height: 48,
    width: '100%',
    borderRadius: 24,
    backgroundColor: PALETTE.field,
    paddingHorizontal: 16,
    fontSize: 14,
    color: PALETTE.ink,
  },
  inputError: { borderWidth: 1.5, borderColor: PALETTE.error },
  error: { color: PALETTE.error, fontSize: 12, marginTop: 8, marginLeft: 16 },
  sent: { color: PALETTE.ink, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sentEmail: { fontWeight: '700' },
  button: {
    position: 'absolute',
    bottom: 66,
    alignSelf: 'center',
    backgroundColor: PALETTE.teal,
    minWidth: 84,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 19,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: PALETTE.onAction, fontSize: 13, fontWeight: '500' },
});
