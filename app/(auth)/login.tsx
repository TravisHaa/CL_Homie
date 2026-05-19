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
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/src/firebase/auth';
const bg = require('@/assets/images/phoneBG.png');
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const [authError, setAuthError] = useState('');
  const { width, height } = useWindowDimensions();
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
      style={[styles.container, { width, height }]}
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
                  placeholder="Write here"
                  placeholderTextColor="#2b1b16"
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
                  placeholder="Write here"
                  placeholderTextColor="#2b1b16"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            <TouchableOpacity>
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
    alignSelf: 'flex-start',
    height: 44,
    width: 44,
    justifyContent: 'center',
    marginTop: 28,
  },
  backIcon: {
    color: '#2b1b16',
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '300',
  },
  form: {
    alignSelf: 'center',
    marginTop: 128,
    maxWidth: 326,
    width: '100%',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 34,
    color: '#2b1b16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#2b1b16',
    fontWeight: '400',
  },
  input: {
    alignSelf: 'center',
    height: 48,
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#fff8f1',
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 24,
    color: '#2b1b16',
    borderWidth: 0,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: -18,
    marginBottom: 12,
    marginLeft: 16,
  },
  forgot: {
    color: '#ef7f65',
    fontSize: 14,
    marginTop: -16,
  },
  signupText: {
    color: '#2b1b16',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
  signupLink: {
    color: '#ef7f65',
    fontSize: 12,
    fontWeight: '700',
  },
  authError: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    position: 'absolute',
    bottom: 66,
    alignSelf: 'center',
    backgroundColor: '#4d7580',
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
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
});
