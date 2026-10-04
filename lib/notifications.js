import { Platform } from 'react-native';
import Constants from 'expo-constants';

let Notifications = null;
try {
  // Dynamically require or import expo-notifications safely
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.warn('expo-notifications initialization skipped:', e?.message || e);
}

/**
 * Request notification permissions and fetch Expo Push Token.
 * Note: Remote push notifications require a custom development build (eas build --profile development)
 * and are not supported in Expo Go on Android since SDK 53.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  // Check if running inside Expo Go
  const isExpoGo =
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === 'storeClient';

  if (isExpoGo) {
    console.info(
      'Push notifications note: Remote push notifications require a development build and are disabled in Expo Go.'
    );
    return null;
  }

  if (!Notifications) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission was not granted by user.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'b92c10c3-4b3f-4127-b0ee-593bc3d52b6d';

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenResponse.data;
  } catch (error) {
    console.warn('Push notification registration warning:', error?.message || error);
    return null;
  }
}
