import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/src/firebase/auth';

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
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Homie</Text>
        <Text style={styles.tagline}>Your shared home, organized.</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Password"
              secureTextEntry
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

        {authError ? <Text style={styles.authError}>{authError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/signup" style={styles.link}>
          Don't have an account? Sign up
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    color: '#2D3436',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    color: '#636e72',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#FF6B6B' },
  errorText: { color: '#FF6B6B', fontSize: 12, marginTop: -6 },
  authError: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', marginTop: -4 },
  button: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', color: '#636e72', marginTop: 8 },
});
