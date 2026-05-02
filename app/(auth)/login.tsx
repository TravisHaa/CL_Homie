import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/src/firebase/auth';
import { PillInput } from '@/src/components/lofi/PillInput';
import { PillButton } from '@/src/components/lofi/PillButton';
import { LOFI } from '@/src/utils/lofiTheme';

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
      await signIn(email, password);
    } catch (err: any) {
      setAuthError(err.message ?? 'Login failed');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.title}>Sign into your account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
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
            <Text style={styles.helper}>
              {errors.email?.message ?? 'Forgot email?'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
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
            <Text style={styles.helper}>
              {errors.password?.message ?? 'Forgot password?'}
            </Text>
          </View>

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
        </View>

        <View style={styles.footer}>
          <PillButton
            label="Continue"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
          <TouchableOpacity onPress={() => {}} style={styles.linkBtn}>
            <Text style={styles.linkText}>Need an account? Tap "Get started"</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LOFI.bg },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 40, justifyContent: 'center', gap: 18 },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  field: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LOFI.text,
    textAlign: 'center',
  },
  helper: { fontSize: 12, color: LOFI.textMuted, marginLeft: 6 },
  authError: { color: LOFI.error, fontSize: 13, textAlign: 'center' },
  footer: { paddingHorizontal: 40, paddingBottom: 36, gap: 8, alignItems: 'center' },
  linkBtn: { padding: 8 },
  linkText: { fontSize: 12, color: LOFI.textMuted },
});
