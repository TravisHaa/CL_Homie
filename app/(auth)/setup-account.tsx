import {
  Alert,
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
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { auth } from '@/src/firebase/config';
import { signUp } from '@/src/firebase/auth';
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function SetupAccountScreen() {
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
    try {
      const displayName = email.split('@')[0] || 'Homie';
      await signUp(email, password, displayName);
      router.replace('/(auth)/home-choice');
    } catch (err: any) {
      if (auth.currentUser) {
        router.replace('/(auth)/home-choice');
        return;
      }

      Alert.alert('Sign up failed', err.message);
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
            onPress={() => router.replace('/(auth)/signup')}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.title}>Set up your account</Text>

            <Text style={styles.label}>Enter your email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Write here"
                  placeholderTextColor={PALETTE.ink}
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

            <Text style={styles.label}>Enter a password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Write here"
                  placeholderTextColor={PALETTE.ink}
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Creating...' : 'Continue'}
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
    position: 'absolute',
    top: 12,
    left: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
    zIndex: 1,
  },
  backIcon: {
    color: PALETTE.ink,
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 42,
  },
  form: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 354,
    width: '100%',
  },
  title: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    marginBottom: 34,
    textAlign: 'center',
  },
  label: {
    color: PALETTE.ink,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    alignSelf: 'center',
    backgroundColor: PALETTE.field,
    borderRadius: 24,
    borderWidth: 0,
    color: PALETTE.ink,
    fontSize: 14,
    height: 48,
    marginBottom: 24,
    paddingHorizontal: 16,
    width: '100%',
  },
  inputError: {
    borderColor: PALETTE.error,
    borderWidth: 1.5,
  },
  errorText: {
    color: PALETTE.error,
    fontSize: 12,
    marginLeft: 16,
    marginTop: -18,
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: PALETTE.teal,
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
    color: PALETTE.onAction,
    fontSize: 13,
    fontWeight: '500',
  },
});
