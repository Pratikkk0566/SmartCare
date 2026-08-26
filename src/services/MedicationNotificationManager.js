/**
 * MedicationNotificationManager.js
 * 
 * Native device alarm & local notification manager for MedicationSchedulingEngine.
 * Handles deterministic scheduling, alarms, snooze, cancel, and action buttons.
 */

import { Platform } from 'react-native';
import { ALARM_STATUS } from './MedicationSchedulingEngine';

let PushNotification = null;
let PushNotificationIOS = null;

try {
  PushNotification = require('react-native-push-notification').default;
  if (Platform.OS === 'ios') {
    PushNotificationIOS = require('@react-native-community/push-notification-ios').default;
  }
} catch {
  // Graceful fallback if native module isn't loaded in test environment
}

const ALARM_CHANNEL_ID = 'medicare-engine-alarms-v2';

export class MedicationNotificationManager {
  constructor() {
    this._channelCreated = false;
    this._onNotificationAction = null;
  }

  ensureChannel() {
    if (this._channelCreated || !PushNotification) return;

    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: ALARM_CHANNEL_ID,
          channelName: 'Medication Alarm Reminders',
          channelDescription: 'High-priority alarms and reminders for scheduled doses',
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
          playSound: true,
        },
        (created) => {
          this._channelCreated = true;
          console.log('[MedicationNotificationManager] Channel created:', created);
        }
      );
    } else {
      this._channelCreated = true;
    }
  }

  setActionHandler(handler) {
    this._onNotificationAction = handler;
  }

  /**
   * Schedule a deterministic alarm
   */
  async schedule(alarm) {
    if (!PushNotification) {
      console.log('[MedicationNotificationManager] Local push notification not available; simulated alarm:', alarm.title);
      return alarm;
    }

    this.ensureChannel();

    try {
      const scheduledDate = new Date(alarm.scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        console.warn('[MedicationNotificationManager] Invalid scheduledAt date:', alarm.scheduledAt);
        return alarm;
      }

      // If scheduled time is in the past, do not schedule native alarm
      if (scheduledDate.getTime() <= Date.now()) {
        return alarm;
      }

      // Generate numeric ID for native push notification
      const numericId = Math.abs(this._hashString(alarm.notificationId || alarm.id || alarm.alarmId));

      PushNotification.localNotificationSchedule({
        id: String(numericId),
        channelId: ALARM_CHANNEL_ID,
        title: alarm.title || '💊 Medicine Reminder',
        message: alarm.body || `Time to take ${alarm.medicineName || 'your medicine'}`,
        date: scheduledDate,
        allowWhileIdle: true,
        soundName: 'default',
        vibrate: true,
        vibration: 1000,
        playSound: true,
        importance: 'high',
        priority: 'high',
        visibility: 'public',
        userInfo: {
          alarmId: alarm.id || alarm.alarmId,
          scheduleId: alarm.scheduleId,
          medicineId: alarm.medicineId,
          doseQuantity: alarm.doseQuantity,
          medicineName: alarm.medicineName,
          type: 'medication_engine_alarm',
        },
        actions: Platform.OS === 'android' ? ['Taken', 'Snooze (15m)', 'Skip'] : undefined,
      });

      console.log(`[MedicationNotificationManager] Scheduled alarm #${numericId} at ${alarm.scheduledAt} for ${alarm.medicineName}`);
      return alarm;
    } catch (error) {
      console.warn('[MedicationNotificationManager] Error scheduling alarm:', error);
      return alarm;
    }
  }

  /**
   * Cancel an alarm by notificationId or alarm string
   */
  async cancel(notificationId) {
    if (!PushNotification || !notificationId) return;

    try {
      const numericId = Math.abs(this._hashString(notificationId));
      PushNotification.cancelLocalNotification(String(numericId));
      console.log(`[MedicationNotificationManager] Cancelled alarm #${numericId}`);
    } catch (error) {
      console.warn('[MedicationNotificationManager] Error cancelling alarm:', error);
    }
  }

  /**
   * Trigger immediate test alarm
   */
  async triggerImmediateTest({ title = '💊 Medicine Reminder Test', message = 'Time to take your scheduled dose!' } = {}) {
    if (!PushNotification) return;
    this.ensureChannel();

    PushNotification.localNotification({
      channelId: ALARM_CHANNEL_ID,
      title,
      message,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      actions: Platform.OS === 'android' ? ['Taken', 'Snooze (15m)', 'Skip'] : undefined,
    });
  }

  _hashString(str = '') {
    let hash = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit int
    }
    return Math.abs(hash) % 1000000;
  }
}
