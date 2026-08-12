import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

export function configurePushNotifications(onNotification) {
  if (!PushNotification) return;

  PushNotification.configure({
    onRegister: () => {},
    onNotification: notification => {
      if (onNotification) onNotification(notification);
      if (Platform.OS === 'ios') notification.finish(PushNotificationIOS?.FetchResult?.NoData || 'NoData');
    },
    onAction: notification => {
      console.log('[NotificationService] Action:', notification.action);
      if (notification.action === 'Taken') {
        // Handle "Taken" action from notification
        const doseId = notification.userInfo?.doseId || notification.data?.doseId;
        if (doseId && onNotification) {
          onNotification({
            ...notification,
            action: 'mark_taken',
            doseId,
          });
        }
      }
    },
    onRegistrationError: err => {
      console.error('[NotificationService] Registration error:', err);
    },
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

/**
 * Schedule a single medicine reminder
 * Works completely offline using device's local notification system
 */
export function scheduleMedicineReminder({id, doseId, medicineName, dose, time, date, foodInstruction}) {
  if (!PushNotification) {
    console.warn('[NotificationService] react-native-push-notification not linked');
    return false;
  }

  try {
    // Parse time string (supports both 12-hour and 24-hour format)
    let hour, minute;
    
    if (time.includes('AM') || time.includes('PM')) {
      // 12-hour format
      const parts = time.split(' ');
      if (parts.length < 2) {
        console.warn('[NotificationService] Invalid time format:', time);
        return false;
      }
      const [timePart, meridiem] = parts;
      const [hourStr, minuteStr] = timePart.split(':');
      hour = parseInt(hourStr, 10);
      minute = parseInt(minuteStr, 10);
      
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
    } else {
      // 24-hour format
      const [hourStr, minuteStr] = time.split(':');
      hour = parseInt(hourStr, 10);
      minute = parseInt(minuteStr, 10);
    }

    // Create fire date
    const fireDate = date ? new Date(date) : new Date();
    fireDate.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (fireDate <= new Date()) {
      fireDate.setDate(fireDate.getDate() + 1);
    }

    // Build message with food instruction
    let message = `Time to take ${medicineName} — ${dose}`;
    if (foodInstruction) {
      const foodText = {
        before_food: 'Before food',
        after_food: 'After food',
        with_food: 'With food',
        empty_stomach: 'On empty stomach',
      };
      message += ` • ${foodText[foodInstruction] || ''}`;
    }

    // Schedule notification
    PushNotification.localNotificationSchedule({
      id: String(id),
      channelId: CHANNEL_ID,
      title: '💊 Medicine Reminder',
      message,
      date: fireDate,
      allowWhileIdle: true,
      repeatType: 'day', // Repeat daily
      soundName: 'default',
      vibrate: true,
      playSound: true,
      importance: 'high',
      priority: 'high',
      visibility: 'public',
      userInfo: {
        doseId,
        medicineId: id,
        type: 'medicine_reminder',
      },
      actions: Platform.OS === 'android' ? ['Taken', 'Snooze', 'Skip'] : undefined,
    });

    console.log(`[NotificationService] Scheduled reminder for ${medicineName} at ${time} (ID: ${id})`);
    return true;
  } catch (error) {
    console.error('[NotificationService] Error scheduling reminder:', error);
    return false;
  }
}

/**
 * Schedule reminders for all scheduled doses
 * Completely offline operation
 */
export async function scheduleAllMedicineReminders(scheduledDoses, medicines) {
  if (!PushNotification) {
    console.warn('[NotificationService] react-native-push-notification not linked');
    return 0;
  }

  // Cancel all existing reminders first
  PushNotification.cancelAllLocalNotifications();

  let scheduledCount = 0;
  const scheduledNotifications = [];

  // Group doses by medicine
  const medicineMap = {};
  if (medicines) {
    medicines.forEach(med => {
      medicineMap[med.id] = med;
    });
  }

  // Schedule each dose
  for (const dose of scheduledDoses) {
    if (dose.status !== 'upcoming' && dose.status !== 'due') {
      continue; // Only schedule upcoming/due doses
    }

    const medicine = medicineMap[dose.medicineId];
    if (!medicine) {
      console.warn(`[NotificationService] Medicine not found for dose ${dose.id}`);
      continue;
    }

    const notifId = scheduledNotifications.length + 1000;
    const success = scheduleMedicineReminder({
      id: notifId,
      doseId: dose.id,
      medicineName: medicine.name,
      dose: dose.dose,
      time: dose.scheduledTime,
      date: dose.scheduledDate,
      foodInstruction: medicine.foodInstruction,
    });

    if (success) {
      scheduledCount++;
      scheduledNotifications.push({
        notificationId: notifId,
        doseId: dose.id,
        medicineId: medicine.id,
        scheduledDate: dose.scheduledDate,
        scheduledTime: dose.scheduledTime,
      });
    }
  }

  // Save mapping of notification IDs to dose IDs
  try {
    await AsyncStorage.setItem(
      SCHEDULED_NOTIFICATIONS_KEY,
      JSON.stringify(scheduledNotifications)
    );
  } catch (error) {
    console.error('[NotificationService] Error saving notification mapping:', error);
  }

  console.log(`[NotificationService] Scheduled ${scheduledCount} reminders`);
  return scheduledCount;
}

/**
 * Schedule reminders for a specific prescription
 */
export async function schedulePrescriptionReminders(prescriptionId, scheduledDoses, medicines) {
  if (!PushNotification) return 0;

  // Filter doses for this prescription
  const medicineIds = medicines
    .filter(m => m.prescriptionId === prescriptionId)
    .map(m => m.id);

  const relevantDoses = scheduledDoses.filter(d =>
    medicineIds.includes(d.medicineId)
  );

  const relevantMedicines = medicines.filter(m => m.prescriptionId === prescriptionId);

  return await scheduleAllMedicineReminders(relevantDoses, relevantMedicines);
}

/**
 * Cancel a specific reminder
 */
export function cancelReminder(notificationId) {
  if (!PushNotification) return;
  
  PushNotification.cancelLocalNotification(String(notificationId));
  console.log(`[NotificationService] Cancelled reminder ${notificationId}`);
}

/**
 * Cancel all reminders for a medicine
 */
export async function cancelMedicineReminders(medicineId) {
  if (!PushNotification) return;

  try {
    // Get notification mapping
    const data = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    const notifications = data ? JSON.parse(data) : [];

    // Find and cancel notifications for this medicine
    const toCancel = notifications.filter(n => n.medicineId === medicineId);
    toCancel.forEach(n => {
      PushNotification.cancelLocalNotification(String(n.notificationId));
    });

    // Update mapping
    const remaining = notifications.filter(n => n.medicineId !== medicineId);
    await AsyncStorage.setItem(
      SCHEDULED_NOTIFICATIONS_KEY,
      JSON.stringify(remaining)
    );

    console.log(`[NotificationService] Cancelled ${toCancel.length} reminders for medicine ${medicineId}`);
  } catch (error) {
    console.error('[NotificationService] Error cancelling medicine reminders:', error);
  }
}

/**
 * Cancel all reminders
 */
export async function cancelAllReminders() {
  if (!PushNotification) return;
  
  PushNotification.cancelAllLocalNotifications();
  await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
  console.log('[NotificationService] Cancelled all reminders');
}

/**
 * Set app badge count
 */
export function setBadgeCount(count) {
  if (!PushNotification) return;
  PushNotification.setApplicationIconBadgeNumber(count);
}

/**
 * Check if notification permissions are granted
 */
export function checkPermissions(callback) {
  if (!PushNotification) {
    callback({alert: false, badge: false, sound: false});
    return;
  }

  PushNotification.checkPermissions(callback);
}

/**
 * Request notification permissions
 */
export function requestPermissions() {
  if (!PushNotification) {
    return Promise.reject(new Error('PushNotification not available'));
  }

  return new Promise((resolve) => {
    PushNotification.requestPermissions((permissions) => {
      resolve(permissions);
    });
  });
}

/**
 * Show immediate notification (for testing)
 */
export function showImmediateNotification(title, message, data = {}) {
  if (!PushNotification) return;

  PushNotification.localNotification({
    channelId: CHANNEL_ID,
    title,
    message,
    playSound: true,
    soundName: 'default',
    importance: 'high',
    priority: 'high',
    userInfo: data,
  });
}

/**
 * Legacy support - schedule from old medicines array format
 */
export function scheduleAllMedicineRemindersLegacy(medicines) {
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
