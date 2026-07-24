import {Platform, Alert} from 'react-native';

let PushNotification = null;
let PushNotificationIOS = null;

try {
  PushNotification = require('react-native-push-notification').default;
  if (Platform.OS === 'ios') {
    PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
  }
} catch {
  // Library not linked yet — graceful fallback
}

const CHANNEL_ID = 'medicare-medicine-reminders';

export function configurePushNotifications(onNotification) {
  if (!PushNotification) return;

  PushNotification.configure({
     onRegister: () => {},
    onNotification: notification => {
      if (onNotification) onNotification(notification);
      if (Platform.OS === 'ios') notification.finish(PushNotificationIOS?.FetchResult?.NoData || 'NoData');
    },
    onAction: () => {},
    onRegistrationError: () => {},
    permissions: {alert: true, badge: true, sound: true},
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: CHANNEL_ID,
        channelName: 'Medicine Reminders',
        channelDescription: 'Alerts for your scheduled medicines',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      () => {},
    );
  }
}

export function scheduleMedicineReminder({id, medicineName, dose, time, date}) {
  if (!PushNotification) {
    console.warn('[NotificationService] react-native-push-notification not linked');
    return;
  }

  const parts = time.split(' ');
if (parts.length < 2) return; // or handle 24hr format
const [timePart, meridiem] = parts;
  const [hourStr, minuteStr] = timePart.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const fireDate = date ? new Date(date) : new Date();
  fireDate.setHours(hour, minute, 0, 0);

  if (fireDate <= new Date()) {
    fireDate.setDate(fireDate.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    id: String(id),
    channelId: CHANNEL_ID,
    title: '💊 Medicine Reminder',
    message: `Time to take ${medicineName} — ${dose}`,
    date: fireDate,
    allowWhileIdle: true,
    repeatType: 'day',
    soundName: 'default',
    vibrate: true,
    importance: 'high',
    priority: 'high',
  });
}

export function scheduleAllMedicineReminders(medicines) {
  if (!PushNotification) return;
  PushNotification.cancelAllLocalNotifications();
  let notifId = 100;
  medicines.forEach(med => {
    med.schedule.forEach(s => {
      scheduleMedicineReminder({
        id: notifId++,
        medicineName: med.name,
        dose: s.dose,
        time: s.time,
      });
    });
  });
}

export function cancelAllReminders() {
  if (!PushNotification) return;
  PushNotification.cancelAllLocalNotifications();
}

export function setBadgeCount(count) {
  if (!PushNotification) return;
  PushNotification.setApplicationIconBadgeNumber(count);
}
