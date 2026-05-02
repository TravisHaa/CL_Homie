import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@/src/firebase/auth';
import { PillInput } from '@/src/components/lofi/PillInput';
import { PillButton } from '@/src/components/lofi/PillButton';
import { LOFI } from '@/src/utils/lofiTheme';
import { useState } from 'react';

const schema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const [authError, setAuthError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit({ email, password, displayName }: FormData) {
    setAuthError('');
    try {
      await signUp(email, password, displayName);
    } catch (err: any) {
      const msg = err.message ?? 'Sign up failed';
      setAuthError(msg);
      if (Platform.OS !== 'web') Alert.alert('Sign up failed', msg);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>

          <Field label="Your name" error={errors.displayName?.message}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <PillInput
                  placeholder="Write here"
                  autoCapitalize="words"
                  onChangeText={onChange}
                  value={value}
                  invalid={!!errors.displayName}
                />
              )}
            />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <PillInput
                  placeholder="Write here"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  value={value}
                  invalid={!!errors.email}
                />
              )}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <PillInput
                  placeholder="Write here"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                  invalid={!!errors.password}
                />
              )}
            />
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword?.message}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <PillInput
                  placeholder="Write here"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                  invalid={!!errors.confirmPassword}
                />
              )}
            />
          </Field>

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <PillButton
            label="Continue"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LOFI.bg },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  field: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
  },
  errorText: { fontSize: 12, color: LOFI.error, marginLeft: 6 },
  authError: { color: LOFI.error, fontSize: 13, textAlign: 'center' },
  footer: { paddingHorizontal: 40, paddingBottom: 36, alignItems: 'center' },
});
