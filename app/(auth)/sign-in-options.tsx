import { type Href, router } from 'expo-router';

import { AuthMethodScreen } from '@/src/components/auth/AuthMethodScreen';

export default function SignInOptionsScreen() {
  return (
    <AuthMethodScreen
      title="Sign into your account"
      onBackPress={() => router.replace('/(auth)/signup')}
      onEmailPress={() => router.push('/(auth)/login')}
      onMobilePress={() =>
        router.push('/(auth)/phone-number?flow=login' as Href)
      }
    />
  );
}
