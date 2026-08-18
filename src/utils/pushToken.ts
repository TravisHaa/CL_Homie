import Constants from 'expo-constants';

/**
 * Resolves the EAS project ID required by `Notifications.getExpoPushTokenAsync`.
 *
 * Shared by `useNotificationsRegistration` (initial token write) and
 * `useNotificationSettings` (re-enable flow) so the lookup logic lives in one
 * place. Returns undefined when the project has not been linked via `eas init`.
 */
export function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId
  );
}
