import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@/src/firebase/auth';
import { HiFiInput } from '@/src/components/hifi/HiFiInput';
import { HiFiButton } from '@/src/components/hifi/HiFiButton';
import { HIFI } from '@/src/utils/hifiTheme';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit({ email, password }: FormData) {
    setAuthError('');
    try {
      const displayName = email.split('@')[0] ?? 'Homie';
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
        <View style={styles.body}>
          <View style={styles.form}>
            <Text style={styles.title}>Set up your homie account</Text>

            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>Add your email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <HiFiInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={onChange}
                      value={value}
                      invalid={!!errors.email}
                    />
                  )}
                />
                {errors.email ? (
                  <Text style={styles.errorHelper}>{errors.email.message}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Create a password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <HiFiInput
                      secureTextEntry
                      onChangeText={onChange}
                      value={value}
                      invalid={!!errors.password}
                    />
                  )}
                />
                {errors.password ? (
                  <Text style={styles.errorHelper}>
                    {errors.password.message}
                  </Text>
                ) : null}
              </View>
            </View>

            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
          </View>
        </View>

        <View style={styles.footer}>
          <HiFiButton
            label="Continue"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HIFI.bg },
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  form: { width: '100%', gap: 36 },
  title: {
    fontSize: 20,
    fontWeight: '400',
    color: HIFI.text,
    textAlign: 'center',
  },
  fields: { gap: 24 },
  field: { gap: 16 },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: HIFI.text,
    textAlign: 'center',
  },
  errorHelper: {
    fontSize: 14,
    fontWeight: '300',
    color: HIFI.error,
    marginTop: 8,
    marginLeft: 4,
  },
  authError: {
    color: HIFI.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 60,
  },
});
