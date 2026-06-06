import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/src/firebase/auth';
import { PALETTE } from '@/src/theme/palette';
const bg = require('@/assets/images/phoneBG.png');
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const [authError, setAuthError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit({ email, password }: FormData) {
    setAuthError('');
    try {
      console.log('[Login] attempting signIn for', email);
      await signIn(email, password);
      console.log('[Login] signIn succeeded — waiting for AuthGate redirect');
    } catch (err: any) {
      console.error('[Login] signIn error:', err.code, err.message);
      setAuthError(err.message ?? 'Login failed');
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
            <Text style={styles.title}>Sign into your account</Text>

            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}

            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <Text style={styles.signupText}>
              New to Homie?{' '}
              <Link href="/(auth)/setup-account" style={styles.signupLink}>
                Get started.
              </Link>
            </Text>

            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Signing in...' : 'Continue'}
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 22,
    height: 44,
    width: 44,
    justifyContent: 'center',
    zIndex: 1,
  },
  backIcon: {
    color: PALETTE.ink,
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '300',
  },
  form: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 354,
    width: '100%',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 34,
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: PALETTE.ink,
    fontWeight: '400',
  },
  input: {
    alignSelf: 'center',
    height: 48,
    width: '100%',
    borderRadius: 24,
    backgroundColor: PALETTE.field,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 24,
    color: PALETTE.ink,
    borderWidth: 0,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: PALETTE.error,
  },
  errorText: {
    color: PALETTE.error,
    fontSize: 12,
    marginTop: -18,
    marginBottom: 12,
    marginLeft: 16,
  },
  forgot: {
    color: PALETTE.ink,
    fontSize: 14,
    marginTop: -16,
  },
  signupText: {
    color: PALETTE.ink,
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
  signupLink: {
    color: PALETTE.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  authError: {
    color: PALETTE.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: PALETTE.onAction,
    fontSize: 13,
    fontWeight: '500',
  },
});
