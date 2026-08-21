import { type Href, router } from 'expo-router';

import { AuthMethodScreen } from '@/src/components/auth/AuthMethodScreen';

export default function CreateAccountOptionsScreen() {
  return (
    <AuthMethodScreen
      title="Create Your Account"
      onBackPress={() => router.replace('/(auth)/signup')}
      onEmailPress={() => router.push('/(auth)/setup-account')}
      onMobilePress={() =>
        router.push('/(auth)/phone-number?flow=signup' as Href)
      }
    />
  );
}
