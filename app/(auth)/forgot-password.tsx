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
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { sendResetPasswordEmail } from '@/src/firebase/auth';

const bg = require('@/assets/images/phoneBG.png');

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const [resetError, setResetError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit({ email }: FormData) {
    setResetError('');
    try {
      await sendResetPasswordEmail(email);
      router.push({
        pathname: '/(auth)/reset-code',
        params: { email },
      });
    } catch (err: any) {
      setResetError(err.message ?? 'Could not send reset email.');
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
            <Text style={styles.title}>Reset Your Password</Text>

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
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            ) : null}
            {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Sending...' : 'Continue'}
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
    marginBottom: 24,
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
    marginLeft: 16,
    marginTop: -18,
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
