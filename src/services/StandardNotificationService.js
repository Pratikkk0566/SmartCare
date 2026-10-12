/** Short notification sounds are independent of medication alarm ringtone channels. */
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
const CHANNEL = 'smartcare-notifications-v1';
export async function displayStandardNotification({ title, body }) {
  if (Platform.OS === 'android')
    await notifee.createChannel({
      id: CHANNEL,
      name: 'General notifications',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
      vibration: true,
    });
  return notifee.displayNotification({
    id: 'smartcare-feedback',
    title,
    body,
    android: {
      channelId: CHANNEL,
      smallIcon: 'ic_medication_notification',
      sound: 'default',
      loopSound: false,
      timeoutAfter: 5000,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        banner: false,
        list: false,
        sound: true,
        badge: false,
      },
    },
  });
}
