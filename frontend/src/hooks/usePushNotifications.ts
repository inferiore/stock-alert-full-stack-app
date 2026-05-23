import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

// Show notifications as banners when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const token = useAuthStore((s) => s.token);
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!token) return;

    void registerAndSync();

    listenerRef.current = Notifications.addNotificationReceivedListener((notification) => {
      // Foreground notification received — expo-notifications displays it via the handler above.
      // Additional in-app handling (e.g. a toast) can be added here.
      console.log('[Push] Foreground notification:', notification.request.content.title);
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, [token]);
}

async function registerAndSync(): Promise<void> {
  if (!Device.isDevice) {
    // Simulators/emulators cannot receive push notifications
    console.warn('[Push] Push notifications require a physical device.');
    return;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Stock Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted — push notifications disabled.');
    return;
  }

  try {
    // getDevicePushTokenAsync returns the raw FCM (Android) or APNs (iOS) token
    // so the backend can use Firebase Admin SDK directly without Expo routing
    const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
    await usersApi.updateFcmToken(fcmToken);
    console.log('[Push] FCM token synced.');
  } catch (err) {
    console.warn('[Push] Could not get/sync FCM token:', err);
  }
}
