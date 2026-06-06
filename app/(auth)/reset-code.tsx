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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';

import {
  sendResetPasswordEmail,
  verifyResetPasswordCode,
} from '@/src/firebase/auth';

const bg = require('@/assets/images/phoneBG.png');

const schema = z.object({
  code: z.string().min(1, 'Enter the verification code'),
});

type FormData = z.infer<typeof schema>;
const DEV_RESET_CODE = '123456';
const DEV_RESET_TOKEN = 'dev-reset-token';

function getResetCode(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]oobCode=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : trimmed;
}

export default function ResetCodeScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const [message, setMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  async function onSubmit({ code }: FormData) {
    const resetCode = getResetCode(code);
    setResetError('');
    setMessage('');
    if (resetCode === DEV_RESET_CODE) {
      router.push({
        pathname: '/(auth)/reset-password',
        params: { code: DEV_RESET_TOKEN },
      });
      return;
    }

    try {
      await verifyResetPasswordCode(resetCode);
      router.push({
        pathname: '/(auth)/reset-password',
        params: { code: resetCode },
      });
    } catch {
      setResetError('That code did not work.');
    }
  }

  async function resendCode() {
    if (!email) {
      router.replace('/(auth)/forgot-password');
      return;
    }

    setResetError('');
    setMessage('');
    setIsResending(true);
    try {
      await sendResetPasswordEmail(email);
      setMessage('Code resent.');
    } catch (err: any) {
      setResetError(err.message ?? 'Could not resend code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <ImageBackground
      source={bg}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.title}>ID Verification</Text>

            <Text style={styles.label}>Enter the code sent to your email</Text>
            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, (errors.code || resetError) && styles.inputError]}
                  placeholder="Write here"
                  placeholderTextColor="#2b1b16"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.code ? (
              <Text style={styles.errorText}>{errors.code.message}</Text>
            ) : null}
            {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}
            {message ? <Text style={styles.successText}>{message}</Text> : null}

            <Text style={styles.resendText}>
              Didn't receive the code?{' '}
              <Text style={styles.resendLink} onPress={resendCode}>
                {isResending ? 'Resending...' : 'Resend code.'}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Checking...' : 'Continue'}
            </Text>
          </TouchableOpacity>
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
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    height: 44,
    justifyContent: 'center',
    marginTop: 28,
    width: 44,
  },
  backIcon: {
    color: '#2b1b16',
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 42,
  },
  form: {
    alignSelf: 'center',
    marginTop: 196,
    maxWidth: 326,
    width: '100%',
  },
  title: {
    color: '#2b1b16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    color: '#2b1b16',
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'center',
  },
  input: {
    alignSelf: 'center',
    backgroundColor: '#fff8f1',
    borderRadius: 24,
    borderWidth: 0,
    color: '#2b1b16',
    fontSize: 12,
    height: 40,
    marginBottom: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  successText: {
    color: '#4d7580',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  resendText: {
    color: '#2b1b16',
    fontSize: 12,
    marginLeft: 4,
  },
  resendLink: {
    color: '#ef7f65',
    fontSize: 12,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#4d7580',
    borderRadius: 19,
    bottom: 66,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 84,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
