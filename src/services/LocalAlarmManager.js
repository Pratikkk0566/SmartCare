/**
 * Local Alarm Manager
 * -------------------
 * Manages offline-first medication alarms using native OS notifications.
 * Works completely independently of internet connectivity.
 * 
 * Features:
 * - Rich popup notifications with action buttons
 * - Deep linking back to app
 * - Sound and vibration patterns
 * - Background notification handling
 */

import PushNotification from 'react-native-push-notification';
import { Platform, AppState, Alert, Linking, PermissionsAndroid } from 'react-native';
import MedicationAlarmRepository from '../database/repositories/MedicationAlarmRepository';
import { generateId, getCurrentTimestamp } from '../database/db';

export class LocalAlarmManager {
  constructor() {
    this.alarmRepo = new MedicationAlarmRepository();
    this.isInitialized = false;
    this.maxSnoozeCount = 3; // Maximum number of snoozes allowed
    this.defaultSnoozeMinutes = 15;
    this.rollingWindowDays = 14; // Schedule alarms 14 days ahead
    
    // Navigation callback for deep linking
    this.navigationRef = null;
    
    // Bind methods to preserve 'this' context
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.handleNotification = this.handleNotification.bind(this);
    this.handleNotificationAction = this.handleNotificationAction.bind(this);
  }

  /**
   * Set navigation reference for deep linking
   */
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
    console.log('[LocalAlarmManager] Navigation reference set for deep linking');
  }

  /**
   * Request notification permissions (Android 13+ and iOS)
   */
  async requestPermissions() {
    console.log('[LocalAlarmManager] Requesting notification permissions...');
    
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13+ requires runtime permission for notifications
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Medication Reminders',
              message: 'SmartCare needs notification permission to remind you about your medications on time.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[LocalAlarmManager] ✅ Notification permission granted');
            return true;
          } else {
            console.log('[LocalAlarmManager] ⚠️ Notification permission denied');
            Alert.alert(
              'Notification Permission Required',
              'To receive medication reminders, please enable notifications in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
            return false;
          }
        } catch (err) {
          console.error('[LocalAlarmManager] Permission request error:', err);
          return false;
        }
      } else {
        // Android 12 and below - permissions granted at install time
        console.log('[LocalAlarmManager] ✅ Notification permission granted (Android < 13)');
        return true;
      }
    } else if (Platform.OS === 'ios') {
      // iOS - PushNotification.configure handles this
      return new Promise((resolve) => {
        PushNotification.checkPermissions((permissions) => {
          console.log('[LocalAlarmManager] iOS permissions:', permissions);
          resolve(permissions.alert || permissions.badge || permissions.sound);
        });
      });
    }
    
    return true;
  }

  /**
   * Initialize the alarm manager with rich notification support
   */
  async init() {
    if (this.isInitialized) return;

    console.log('[LocalAlarmManager] Initializing comprehensive alarm system...');
    
    try {
      // Request notification permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[LocalAlarmManager] ⚠️ Continuing without notification permission - alarms may not work');
      }

      // Create notification channels (Android)
      PushNotification.createChannel(
        {
          channelId: "medication-reminders",
          channelName: "Medication Reminders",
          channelDescription: "Notifications for scheduled medication doses",
          soundName: "default",
          importance: 4, // HIGH
          vibrate: true,
        },
        (created) => console.log(`[LocalAlarmManager] Channel created: ${created}`)
      );

      // Create urgent channel for overdue medications
      PushNotification.createChannel(
        {
          channelId: "urgent-medication",
          channelName: "Urgent Medication",
          channelDescription: "Critical reminders for overdue medications",
          soundName: "default",
          importance: 5, // MAX
          vibrate: true,
          playSound: true,
        },
        (created) => console.log(`[LocalAlarmManager] Urgent channel created: ${created}`)
      );

      // Configure push notifications with enhanced handling
      // Check if already configured to avoid conflicts
      let isAlreadyConfigured = false;
      try {
        // Test if notifications are already working
        PushNotification.checkPermissions((permissions) => {
          console.log('[LocalAlarmManager] Current permissions:', permissions);
        });
        isAlreadyConfigured = true;
      } catch (error) {
        console.log('[LocalAlarmManager] PushNotification not yet configured');
      }

      if (!isAlreadyConfigured) {
        PushNotification.configure({
          // Handle notification when received (foreground/background)
          onNotification: this.handleNotification,
          
          // Handle notification actions (buttons pressed)
          onAction: this.handleNotificationAction,
          
          // Handle registration token (not used for local notifications)
          onRegister: function(token) {
            console.log('[LocalAlarmManager] Push token received:', token);
          },
          
          // Request permissions on iOS (Android handled separately above)
          requestPermissions: Platform.OS === 'ios',
          
          // Pop initial notification when app starts
          popInitialNotification: true,

          // Additional iOS configuration
          ...(Platform.OS === 'ios' && {
            permissions: {
              alert: true,
              badge: true,
              sound: true,
            }
          })
        });
        console.log('[LocalAlarmManager] PushNotification configured');
      } else {
        console.log('[LocalAlarmManager] Using existing PushNotification configuration');
      }

      // Listen for app state changes to handle missed dose detection
      AppState.addEventListener('change', this.handleAppStateChange);

      // Clean up old notifications and alarms
      await this.cleanup();
      
      this.isInitialized = true;
      console.log('[LocalAlarmManager] ✅ Enhanced alarm system initialized successfully');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Handle app state changes (detect when app comes to foreground)
   */
  async handleAppStateChange(nextAppState) {
    if (nextAppState === 'active') {
      console.log('[LocalAlarmManager] App became active, checking for missed alarms...');
      await this.checkAndMarkMissedAlarms();
      await this.refreshAlarmWindow();
    }
  }

  /**
   * Handle notification interactions (enhanced with in-app integration)
   */
  handleNotification(notification) {
    console.log('[LocalAlarmManager] Notification received:', notification);
    
    // Extract data from notification
    const { doseId, medicineId, alarmId, action, userInteraction } = notification.userInfo || {};
    
    if (alarmId) {
      // Mark alarm as fired only if user interacted with notification
      if (userInteraction) {
        this.alarmRepo.markAlarmAsFired(alarmId).catch(console.error);
      }
    }
    
    // If app is in foreground, show in-app popup instead
    if (AppState.currentState === 'active' && notification.userInfo) {
      console.log('[LocalAlarmManager] App in foreground, showing in-app notification');
      this.showInAppNotification(notification.userInfo);
      return;
    }
    
    // Handle different notification actions and user interaction
    if (userInteraction) {
      console.log('[LocalAlarmManager] User interacted with notification - opening app');
      
      if (action === 'take_medicine' && doseId) {
        // User tapped notification - open medication screen
        this.navigateToMedicationScreen(doseId);
      } else if (doseId) {
        // General notification tap - open today's medicine screen
        this.navigateToTodaysMedicine();
      }
    }
  }

  /**
   * Show in-app notification popup
   */
  async showInAppNotification(notificationData) {
    try {
      console.log('[LocalAlarmManager] Showing in-app notification for:', notificationData.medicineName);
      
      // Import notification manager dynamically to avoid circular dependency
      const { notificationManager } = require('./NotificationManager');
      
      // Determine if overdue
      const scheduledTime = new Date();
      scheduledTime.setHours(
        parseInt(notificationData.scheduledTime?.split(':')[0] || '0'),
        parseInt(notificationData.scheduledTime?.split(':')[1] || '0')
      );
      const isOverdue = scheduledTime < new Date();
      
      // Show medication reminder popup
      await notificationManager.showMedicationReminder({
        doseId: notificationData.doseId,
        medicineId: notificationData.medicineId,
        alarmId: notificationData.alarmId,
        medicineName: notificationData.medicineName,
        dosage: notificationData.dosage,
        scheduledTime: notificationData.scheduledTime,
        foodInstruction: notificationData.foodInstruction
      }, isOverdue);
      
    } catch (error) {
      console.error('[LocalAlarmManager] Failed to show in-app notification:', error);
    }
  }

  /**
   * Handle notification action button presses
   */
  handleNotificationAction(notification) {
    console.log('[LocalAlarmManager] Notification action:', notification);
    
    const { doseId, alarmId, action } = notification.userInfo || {};
    const actionId = notification.action;
    
    switch (actionId) {
      case 'TAKE_ACTION':
        console.log('[LocalAlarmManager] Quick Take action pressed');
        this.quickTakeMedicine(doseId, alarmId);
        break;
        
      case 'SNOOZE_ACTION':
        console.log('[LocalAlarmManager] Quick Snooze action pressed');
        this.quickSnoozeAlarm(alarmId);
        break;
        
      case 'SKIP_ACTION':
        console.log('[LocalAlarmManager] Quick Skip action pressed');
        this.quickSkipMedicine(doseId, alarmId);
        break;
        
      default:
        console.log('[LocalAlarmManager] Unknown action:', actionId);
    }
  }

  /**
   * Schedule a rich notification with action buttons
   */
  async scheduleAlarmForDose(doseData, alarmTime = null) {
    try {
      const scheduledTime = alarmTime || new Date(`${doseData.scheduled_date}T${doseData.scheduled_time}`);
      const notificationId = generateId('notification');
      const alarmId = generateId('alarm');
      
      console.log('[LocalAlarmManager] Scheduling rich notification for:', doseData.medicine_name, 'at', scheduledTime);
      
      // Determine if this is an urgent reminder (overdue)
      const isOverdue = scheduledTime < new Date();
      const channelId = isOverdue ? "urgent-medication" : "medication-reminders";
      
      // Create rich notification with action buttons
      PushNotification.localNotificationSchedule({
        id: notificationId,
        
        // Notification content
        title: `💊 ${isOverdue ? 'OVERDUE: ' : ''}Take your ${doseData.medicine_name}`,
        message: `${doseData.dose_value} ${doseData.dose_unit}${doseData.food_instruction ? ` • ${doseData.food_instruction}` : ''}`,
        subText: `Scheduled for ${doseData.scheduled_time}`,
        
        // Timing
        date: scheduledTime,
        
        // Channel and priority
        channelId: channelId,
        priority: isOverdue ? "max" : "high",
        importance: isOverdue ? 5 : 4,
        
        // Sound and vibration
        soundName: isOverdue ? "default" : "default",
        playSound: true,
        vibrate: true,
        vibration: isOverdue ? 1000 : 300,
        
        // Visual styling
        color: isOverdue ? "#FF4444" : "#14A098",
        largeIcon: "ic_launcher", // App icon
        smallIcon: "ic_notification", // Small notification icon
        
        // Action buttons
        actions: [
          {
            id: "TAKE_ACTION",
            title: "✅ Take",
            icon: "https://via.placeholder.com/1x1", // Placeholder - use actual icons
          },
          {
            id: "SNOOZE_ACTION", 
            title: "⏰ Snooze 15min",
            icon: "https://via.placeholder.com/1x1",
          },
          {
            id: "SKIP_ACTION",
            title: "❌ Skip",
            icon: "https://via.placeholder.com/1x1",
          }
        ],
        
        // Data payload
        userInfo: {
          doseId: doseData.dose_id,
          medicineId: doseData.medicine_id,
          alarmId: alarmId,
          action: 'take_medicine',
          patientId: doseData.patient_id,
          medicineName: doseData.medicine_name,
          dosage: `${doseData.dose_value} ${doseData.dose_unit}`,
          scheduledTime: doseData.scheduled_time
        },
        
        // Behavior
        ongoing: isOverdue, // Make overdue notifications persistent
        autoCancel: true, // Auto-dismiss when tapped
        invokeApp: true, // Open app when tapped
        
        // iOS specific
        ...(Platform.OS === 'ios' && {
          alertBody: `${doseData.dose_value} ${doseData.dose_unit}${doseData.food_instruction ? ` • ${doseData.food_instruction}` : ''}`,
          category: 'MEDICATION_REMINDER',
          subtitle: `Scheduled for ${doseData.scheduled_time}`,
        }),
        
        // Android specific
        ...(Platform.OS === 'android' && {
          bigText: `Time to take your ${doseData.medicine_name}.\n\n${doseData.dose_value} ${doseData.dose_unit}${doseData.food_instruction ? `\n${doseData.food_instruction}` : ''}`,
          bigPictureUrl: '', // Could add medicine image
          group: 'medication_reminders',
          groupSummary: false,
        })
      });

      // Store alarm record in database
      const alarmData = {
        alarmId: alarmId,
        doseId: doseData.dose_id,
        medicineId: doseData.medicine_id,
        patientId: doseData.patient_id,
        alarmTime: scheduledTime.toISOString(),
        notificationId: notificationId,
        status: 'scheduled'
      };
      
      await this.alarmRepo.createAlarm(alarmData);
      
      console.log('[LocalAlarmManager] ✅ Rich notification scheduled successfully:', alarmId);
      return alarmId;
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to schedule rich notification:', error);
      throw error;
    }
  }

  /**
   * Schedule upcoming alarms for a patient (rolling window)
   */
  async scheduleUpcomingAlarms(patientId, days = null) {
    const windowDays = days || this.rollingWindowDays;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    
    console.log('[LocalAlarmManager] Scheduling alarms for patient:', patientId, 'from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    
    try {
      // Get doses that need alarms scheduled
      const query = `
        SELECT 
          md.*,
          pm.medicine_name,
          pm.medicine_type,
          pm.food_instruction
        FROM medicine_doses md
        JOIN prescription_medicines pm ON md.medicine_id = pm.medicine_id
        LEFT JOIN medication_alarms ma ON md.dose_id = ma.dose_id
        WHERE md.patient_id = ?
          AND md.scheduled_date BETWEEN ? AND ?
          AND md.status = 'upcoming'
          AND ma.alarm_id IS NULL
        ORDER BY md.scheduled_date ASC, md.scheduled_time ASC
      `;
      
      let dosesToSchedule = await this.alarmRepo.query(query, [
        patientId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]);
      
      // Ensure dosesToSchedule is an array
      if (!Array.isArray(dosesToSchedule)) {
        console.log('[LocalAlarmManager] Query result is not an array, converting:', typeof dosesToSchedule);
        dosesToSchedule = [];
      }
      
      console.log('[LocalAlarmManager] Found', dosesToSchedule.length, 'doses to schedule');
      
      // Schedule alarms for each dose
      if (dosesToSchedule.length > 0) {
        for (const dose of dosesToSchedule) {
          try {
            await this.scheduleAlarmForDose(dose);
            
            // Small delay to avoid overwhelming the OS
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error('[LocalAlarmManager] Failed to schedule alarm for dose:', dose?.dose_id, error);
          }
        }
      }
      
      console.log('[LocalAlarmManager] ✅ Scheduled', dosesToSchedule.length, 'alarms successfully');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to schedule upcoming alarms:', error);
      throw error;
    }
  }

  /**
   * Snooze an alarm
   */
  async snoozeAlarm(alarmId, snoozeMinutes = null) {
    const minutes = snoozeMinutes || this.defaultSnoozeMinutes;
    
    try {
      const alarm = await this.alarmRepo.findById(alarmId);
      if (!alarm) {
        throw new Error('Alarm not found');
      }
      
      // Check snooze limit
      if (alarm.snooze_count >= this.maxSnoozeCount) {
        console.log('[LocalAlarmManager] Max snooze limit reached, marking as missed');
        await this.markDoseAsMissed(alarm.dose_id);
        return false;
      }
      
      // Cancel current notification
      PushNotification.cancelLocalNotifications({ id: alarm.notification_id });
      
      // Calculate new alarm time
      const newAlarmTime = new Date(alarm.alarm_time);
      newAlarmTime.setMinutes(newAlarmTime.getMinutes() + minutes);
      
      // Schedule new notification
      const newNotificationId = generateId('notification');
      
      // Get dose details for notification
      const doseQuery = `
        SELECT md.*, pm.medicine_name, pm.food_instruction
        FROM medicine_doses md
        JOIN prescription_medicines pm ON md.medicine_id = pm.medicine_id
        WHERE md.dose_id = ?
      `;
      const doseData = await this.alarmRepo.queryFirst(doseQuery, [alarm.dose_id]);
      
      PushNotification.localNotificationSchedule({
        id: newNotificationId,
        title: `💊 Reminder: ${doseData.medicine_name}`,
        message: `${doseData.dose_value} ${doseData.dose_unit} - Snoozed for ${minutes} minutes`,
        date: newAlarmTime,
        soundName: 'default',
        playSound: true,
        userInfo: {
          doseId: alarm.dose_id,
          medicineId: alarm.medicine_id,
          alarmId: alarmId,
          action: 'take_medicine'
        }
      });
      
      // Update alarm record
      await this.alarmRepo.update(alarmId, {
        alarm_time: newAlarmTime.toISOString(),
        notification_id: newNotificationId,
        status: 'snoozed',
        snooze_count: alarm.snooze_count + 1
      });
      
      console.log('[LocalAlarmManager] ✅ Alarm snoozed for', minutes, 'minutes');
      return true;
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to snooze alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel an alarm (when dose is taken or skipped)
   */
  async cancelAlarm(alarmId) {
    try {
      const alarm = await this.alarmRepo.findById(alarmId);
      if (!alarm) {
        console.log('[LocalAlarmManager] Alarm not found:', alarmId);
        return;
      }
      
      // Cancel OS notification
      PushNotification.cancelLocalNotifications({ id: alarm.notification_id });
      
      // Update alarm status
      await this.alarmRepo.updateAlarmStatus(alarmId, 'cancelled');
      
      console.log('[LocalAlarmManager] ✅ Alarm cancelled:', alarmId);
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to cancel alarm:', error);
    }
  }

  /**
   * Cancel all alarms for a specific dose
   */
  async cancelAlarmsForDose(doseId) {
    try {
      const alarms = await this.alarmRepo.findWhere('dose_id = ?', null, null, [doseId]);
      
      for (const alarm of alarms) {
        // Cancel OS notification
        PushNotification.cancelLocalNotifications({ id: alarm.notification_id });
      }
      
      // Mark alarms as cancelled in database
      await this.alarmRepo.executeQuery(
        'UPDATE medication_alarms SET status = ?, updated_at = ? WHERE dose_id = ?',
        ['cancelled', getCurrentTimestamp(), doseId]
      );
      
      console.log('[LocalAlarmManager] ✅ Cancelled', alarms.length, 'alarms for dose:', doseId);
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to cancel alarms for dose:', error);
    }
  }

  /**
   * Check for missed alarms and update their status
   */
  async checkAndMarkMissedAlarms() {
    const gracePeriodMinutes = 30;
    const cutoffTime = new Date(Date.now() - gracePeriodMinutes * 60 * 1000);
    
    try {
      const query = `
        SELECT ma.*, md.medicine_id, md.patient_id
        FROM medication_alarms ma
        JOIN medicine_doses md ON ma.dose_id = md.dose_id
        WHERE ma.status IN ('scheduled', 'snoozed')
          AND datetime(ma.alarm_time) < datetime(?)
      `;
      
      const overdueAlarms = await this.alarmRepo.query(query, [cutoffTime.toISOString()]);
      
      for (const alarm of overdueAlarms) {
        // Cancel OS notification
        PushNotification.cancelLocalNotifications({ id: alarm.notification_id });
        
        // Mark alarm as expired
        await this.alarmRepo.updateAlarmStatus(alarm.alarm_id, 'expired');
        
        // Mark corresponding dose as missed
        await this.markDoseAsMissed(alarm.dose_id);
      }
      
      if (overdueAlarms.length > 0) {
        console.log('[LocalAlarmManager] Marked', overdueAlarms.length, 'overdue alarms as missed');
      }
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to check for missed alarms:', error);
    }
  }

  /**
   * Mark a dose as missed (helper method)
   */
  async markDoseAsMissed(doseId) {
    try {
      // This would typically call the ScheduledDoseRepository
      // For now, we'll update directly
      const query = `
        UPDATE medicine_doses 
        SET status = 'missed', updated_at = ? 
        WHERE dose_id = ?
      `;
      await this.alarmRepo.execute(query, [getCurrentTimestamp(), doseId]);
      
      console.log('[LocalAlarmManager] Marked dose as missed:', doseId);
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to mark dose as missed:', error);
    }
  }

  /**
   * Refresh the alarm window (cleanup + reschedule)
   */
  async refreshAlarmWindow() {
    try {
      console.log('[LocalAlarmManager] Refreshing alarm window...');
      
      // Clean up old alarms
      await this.cleanup();
      
      // Get all active patients
      const patientsQuery = 'SELECT DISTINCT patient_id FROM prescription_medicines WHERE is_active = 1';
      const activePatients = await this.alarmRepo.query(patientsQuery);
      
      // Reschedule alarms for each active patient
      for (const patient of activePatients) {
        await this.scheduleUpcomingAlarms(patient.patient_id);
      }
      
      console.log('[LocalAlarmManager] ✅ Alarm window refreshed for', activePatients.length, 'patients');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to refresh alarm window:', error);
    }
  }

  /**
   * Clean up old/expired alarms and notifications
   */
  async cleanup() {
    try {
      console.log('[LocalAlarmManager] Cleaning up old alarms...');
      
      // Cancel all local notifications (fresh start)
      PushNotification.cancelAllLocalNotifications();
      
      // Delete expired alarms from database
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      await this.alarmRepo.deleteExpiredAlarms(cutoffDate);
      
      console.log('[LocalAlarmManager] ✅ Cleanup completed');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Cleanup failed:', error);
    }
  }

  /**
   * Navigate to medication screen (deep linking)
   */
  navigateToMedicationScreen(doseId) {
    console.log('[LocalAlarmManager] Deep linking to medication screen for dose:', doseId);
    
    if (this.navigationRef?.current) {
      try {
        this.navigationRef.current.navigate('TodaysMedicine', { 
          highlightDoseId: doseId,
          source: 'notification' 
        });
      } catch (error) {
        console.error('[LocalAlarmManager] Navigation failed:', error);
        // Fallback to general medicine screen
        this.navigateToTodaysMedicine();
      }
    } else {
      console.log('[LocalAlarmManager] Navigation ref not available, using deep link URL');
      // Fallback to URL scheme deep linking
      Linking.openURL(`smartcare://medicine/dose/${doseId}`).catch(console.error);
    }
  }

  /**
   * Navigate to today's medicine screen
   */
  navigateToTodaysMedicine() {
    console.log('[LocalAlarmManager] Deep linking to today\'s medicine screen');
    
    if (this.navigationRef?.current) {
      try {
        this.navigationRef.current.navigate('TodaysMedicine', {
          source: 'notification'
        });
      } catch (error) {
        console.error('[LocalAlarmManager] Navigation failed:', error);
      }
    } else {
      // Fallback to URL scheme
      Linking.openURL('smartcare://medicine/today').catch(console.error);
    }
  }

  /**
   * Quick take medicine from notification
   */
  async quickTakeMedicine(doseId, alarmId) {
    try {
      console.log('[LocalAlarmManager] Quick taking medicine:', doseId);
      
      // Import dynamically to avoid circular dependency
      const { sqliteDataService } = require('./SQLiteDataService');
      
      // Mark dose as taken
      await sqliteDataService.takeMedicine(doseId, 'Taken from notification');
      
      // Show success notification
      PushNotification.localNotification({
        title: "✅ Medicine Taken",
        message: "Successfully marked as taken",
        playSound: false,
        vibrate: false,
        priority: "low",
        autoCancel: true,
        ongoing: false,
      });
      
      console.log('[LocalAlarmManager] ✅ Quick take completed');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Quick take failed:', error);
      
      // Show error notification
      PushNotification.localNotification({
        title: "❌ Failed to take medicine",
        message: "Please open the app to complete this action",
        playSound: true,
        vibrate: true,
        priority: "high",
      });
    }
  }

  /**
   * Quick snooze alarm from notification  
   */
  async quickSnoozeAlarm(alarmId) {
    try {
      console.log('[LocalAlarmManager] Quick snoozing alarm:', alarmId);
      
      const success = await this.snoozeAlarm(alarmId, this.defaultSnoozeMinutes);
      
      if (success) {
        // Show snooze confirmation
        PushNotification.localNotification({
          title: "⏰ Alarm Snoozed",
          message: `Reminder set for ${this.defaultSnoozeMinutes} minutes`,
          playSound: false,
          vibrate: false,
          priority: "low",
          autoCancel: true,
        });
      } else {
        // Show snooze limit reached
        PushNotification.localNotification({
          title: "⚠️ Snooze Limit Reached",
          message: "Please take your medicine now",
          playSound: true,
          vibrate: true,
          priority: "high",
        });
      }
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Quick snooze failed:', error);
    }
  }

  /**
   * Quick skip medicine from notification
   */
  async quickSkipMedicine(doseId, alarmId) {
    try {
      console.log('[LocalAlarmManager] Quick skipping medicine:', doseId);
      
      // Import dynamically to avoid circular dependency
      const { sqliteDataService } = require('./SQLiteDataService');
      
      // Mark dose as skipped
      await sqliteDataService.skipMedicine(doseId, 'Skipped from notification');
      
      // Show confirmation notification
      PushNotification.localNotification({
        title: "⚠️ Medicine Skipped",
        message: "Dose marked as skipped",
        playSound: false,
        vibrate: false,
        priority: "low",
        autoCancel: true,
      });
      
      console.log('[LocalAlarmManager] ✅ Quick skip completed');
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Quick skip failed:', error);
      
      // Show error notification
      PushNotification.localNotification({
        title: "❌ Failed to skip medicine",
        message: "Please open the app to complete this action",
        playSound: true,
        vibrate: true,
        priority: "high",
      });
    }
  }

  /**
   * Get next scheduled medication alarm for testing/demo
   */
  async getNextScheduledAlarm() {
    console.log('[LocalAlarmManager] Getting next scheduled alarm...');
    
    try {
      const patientId = await this.getCurrentPatientId();
      if (!patientId) {
        console.log('[LocalAlarmManager] No patient ID found');
        return null;
      }

      // Get next upcoming alarm with medicine details
      const query = `
        SELECT 
          ma.alarm_id,
          ma.dose_id,
          ma.medicine_id,
          ma.alarm_time,
          ma.notification_id,
          md.dose_value,
          md.dose_unit,
          md.scheduled_date,
          md.scheduled_time,
          pm.medicine_name,
          pm.food_instruction
        FROM medication_alarms ma
        JOIN medicine_doses md ON ma.dose_id = md.dose_id
        JOIN prescription_medicines pm ON ma.medicine_id = pm.medicine_id
        WHERE ma.patient_id = ?
          AND ma.status IN ('scheduled', 'snoozed')
          AND datetime(ma.alarm_time) >= datetime('now')
        ORDER BY ma.alarm_time ASC
        LIMIT 1
      `;
      
      const result = await this.alarmRepo.queryFirst(query, [patientId]);
      
      if (result) {
        console.log('[LocalAlarmManager] Found next alarm:', result);
        return {
          alarmId: result.alarm_id,
          doseId: result.dose_id,
          medicineId: result.medicine_id,
          medicineName: result.medicine_name,
          doseValue: result.dose_value,
          doseUnit: result.dose_unit,
          scheduledTime: result.alarm_time,
          foodInstruction: result.food_instruction,
          notificationId: result.notification_id
        };
      }
      
      console.log('[LocalAlarmManager] No upcoming alarms found');
      return null;
      
    } catch (error) {
      console.error('[LocalAlarmManager] Error getting next alarm:', error);
      return null;
    }
  }

  /**
   * Get current patient ID from AsyncStorage
   */
  async getCurrentPatientId() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('patientId');
    } catch (error) {
      console.error('[LocalAlarmManager] Error getting patient ID:', error);
      return null;
    }
  }

  /**
   * Show custom medication alarm screen (SmartCare PHR UI)
   */
  async showCustomMedicationAlarm(medicationData) {
    console.log('[LocalAlarmManager] Showing custom medication alarm:', medicationData);
    
    try {
      if (this.navigationRef && this.navigationRef.current) {
        // Navigate to custom alarm screen with medication data
        this.navigationRef.current.navigate('MedicationAlarm', {
          doseId: medicationData.doseId,
          medicationId: medicationData.medicineId,
          alarmId: medicationData.alarmId,
          medicationName: medicationData.medicineName,
          dosage: `${medicationData.doseValue} ${medicationData.doseUnit}`,
          scheduledTime: medicationData.scheduledTime,
          foodInstruction: medicationData.foodInstruction
        });
        
        console.log('[LocalAlarmManager] ✅ Custom alarm screen triggered');
        return true;
      } else {
        console.warn('[LocalAlarmManager] Navigation ref not available, cannot show custom alarm');
        return false;
      }
    } catch (error) {
      console.error('[LocalAlarmManager] Failed to show custom alarm:', error);
      return false;
    }
  }

  /**
   * Schedule a test notification (for testing permissions and notifications)
   */
  async scheduleTestAlarm() {
    console.log('[LocalAlarmManager] Scheduling test alarm...');
    
    try {
      // Check if we have permission first
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Please allow notifications first to test alarms.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Allow', onPress: () => this.requestPermissions() }
            ]
          );
          return;
        }
      }

      // Schedule immediate test notification
      const testNotificationId = generateId('test_notification');
      
      PushNotification.localNotification({
        id: testNotificationId,
        channelId: "medication-reminders",
        title: "🧪 Test Notification",
        message: "If you can see this, notifications are working! 🎉",
        playSound: true,
        soundName: 'default',
        vibrate: true,
        priority: "high",
        visibility: "public",
        importance: "high",
        autoCancel: true,
        largeIcon: "ic_launcher",
        smallIcon: "ic_notification",
        userInfo: {
          isTest: true,
          timestamp: new Date().toISOString()
        }
      });
      
      // Also schedule one for 10 seconds from now to test timing
      const scheduledTestId = generateId('scheduled_test');
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 10);
      
      PushNotification.localNotificationSchedule({
        id: scheduledTestId,
        channelId: "medication-reminders",
        title: "⏰ Scheduled Test",
        message: "This notification was scheduled 10 seconds ago",
        date: testDate,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        priority: "high",
        userInfo: {
          isScheduledTest: true,
          timestamp: new Date().toISOString()
        }
      });

      Alert.alert(
        'Test Alarms Scheduled',
        'You should see:\n• An immediate test notification\n• Another notification in 10 seconds\n\nIf you don\'t see them, check your notification settings.',
        [{ text: 'OK' }]
      );

      console.log('[LocalAlarmManager] ✅ Test alarms scheduled successfully');
      return true;
      
    } catch (error) {
      console.error('[LocalAlarmManager] ❌ Failed to schedule test alarm:', error);
      
      Alert.alert(
        'Test Failed',
        'Could not schedule test notification. Please check your notification permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
  }

  /**
   * Get alarm statistics
   */
  async getAlarmStats(patientId) {
    return this.alarmRepo.getAlarmStats(patientId);
  }

  /**
   * Destroy the alarm manager (cleanup listeners)
   */
  destroy() {
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.isInitialized = false;
    console.log('[LocalAlarmManager] Alarm manager destroyed');
  }
}

// Export singleton instance
export const localAlarmManager = new LocalAlarmManager();
export default localAlarmManager;