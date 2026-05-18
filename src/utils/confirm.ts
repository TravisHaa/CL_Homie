import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Cross-platform confirmation prompt.
 *
 * On native (iOS/Android) this wraps `Alert.alert` with Cancel + Confirm
 * buttons. On web `Alert.alert` from react-native-web does not render
 * buttons, so we fall back to `window.confirm`.
 *
 * Resolves `true` if the user confirms, `false` if they cancel or dismiss.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // window.confirm is synchronous, but we expose a Promise for parity.
    const result =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(text)
        : false;
    return Promise.resolve(result);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
