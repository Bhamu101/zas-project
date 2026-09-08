import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a no-op stub (does nothing at all —
// confirmed by reading node_modules/react-native-web/dist/exports/Alert),
// so every confirm/notify dialog in this app was silently dead when run via
// `expo start --web` (this project's whole dev-testing setup). These
// wrappers fall back to the browser's window.confirm/alert on web and use
// the real native Alert on iOS/Android, so callers don't need a per-platform
// branch themselves.

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  opts?: { destructive?: boolean }
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: opts?.destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
