import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { apiFetch } from './apiClient';

let pushConfigured = false;

export function configurePushNotifications() {
  if (pushConfigured) return;
  pushConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    null
  );
}

export async function registerForPushNotificationsAsync() {
  configurePushNotifications();
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Rent Your Ride',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = getExpoProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse?.data;
  if (!token) return null;

  try {
    await apiFetch('/v1/users/me/push-token', {
      method: 'POST',
      json: {
        token,
        platform: Platform.OS,
      },
    });
  } catch (e) {
    console.warn('[push] token registration failed', e?.message || e);
  }

  return token;
}

export async function unregisterPushToken(token) {
  if (!token) return;
  try {
    await apiFetch('/v1/users/me/push-token/remove', {
      method: 'POST',
      json: { token },
    });
  } catch (_) {
    /* ignore */
  }
}

export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function addNotificationReceivedListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}
