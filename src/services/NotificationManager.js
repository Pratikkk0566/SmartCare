/**
 * Notification Manager
 * -------------------
 * Coordinates between OS notifications and in-app popup notifications.
 * Handles foreground notifications, background notifications, and notification state.
 */

import { AppState } from 'react-native';
import { localAlarmManager } from './LocalAlarmManager';
import { sqliteDataService } from './SQLiteDataService';

class NotificationManager {
  constructor() {
    this.isInitialized = false;
    this.currentAppState = AppState.currentState;
    this.popupQueue = [];
    this.activePopup = null;
    
    // Callbacks for UI components
    this.onShowPopup = null;
    this.onHidePopup = null;
    
    // Bind methods
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  /**
   * Initialize the notification manager
   */
  async init() {
    if (this.isInitialized) return;

    console.log('[NotificationManager] Initializing notification coordination...');

    try {
      // Listen for app state changes
      AppState.addEventListener('change', this.handleAppStateChange);

      this.isInitialized = true;
      console.log('[NotificationManager] ✅ Notification manager initialized');

    } catch (error) {
      console.error('[NotificationManager] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Set popup callbacks for UI integration
   */
  setPopupCallbacks(onShowPopup, onHidePopup) {
    this.onShowPopup = onShowPopup;
    this.onHidePopup = onHidePopup;
    console.log('[NotificationManager] Popup callbacks registered');
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange(nextAppState) {
    const previousState = this.currentAppState;
    this.currentAppState = nextAppState;

    console.log('[NotificationManager] App state changed:', previousState, '→', nextAppState);

    if (nextAppState === 'active') {
      // App came to foreground - process any pending notifications
      this.processNotificationQueue();
    } else if (nextAppState === 'background') {
      // App went to background - hide any active popups
      this.hideActivePopup();
    }
  }

  /**
   * Show medication reminder (in-app popup when foreground)
   */
  async showMedicationReminder(medicationData, isOverdue = false) {
    console.log('[NotificationManager] Showing medication reminder:', medicationData);

    // If app is in foreground, show popup
    if (this.currentAppState === 'active') {
      this.queuePopup({
        type: 'medication_reminder',
        medicationData,
        isOverdue,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[NotificationManager] App in background, OS notification will handle');
    }
  }

  /**
   * Queue a popup notification
   */
  queuePopup(popupData) {
    console.log('[NotificationManager] Queueing popup:', popupData.type);
    
    this.popupQueue.push(popupData);
    
    // If no popup is currently active, show this one
    if (!this.activePopup) {
      this.showNextPopup();
    }
  }

  /**
   * Show the next popup in queue
   */
  showNextPopup() {
    if (this.popupQueue.length === 0 || this.currentAppState !== 'active') {
      return;
    }

    const popupData = this.popupQueue.shift();
    this.activePopup = popupData;

    console.log('[NotificationManager] Showing popup:', popupData.type);

    if (this.onShowPopup) {
      this.onShowPopup(popupData);
    }
  }

  /**
   * Hide active popup
   */
  hideActivePopup() {
    if (this.activePopup) {
      console.log('[NotificationManager] Hiding active popup');
      
      if (this.onHidePopup) {
        this.onHidePopup();
      }
      
      this.activePopup = null;
      
      // Show next popup if any
      setTimeout(() => {
        this.showNextPopup();
      }, 500);
    }
  }

  /**
   * Process notification queue when app becomes active
   */
  processNotificationQueue() {
    console.log('[NotificationManager] Processing notification queue, items:', this.popupQueue.length);
    
    if (this.popupQueue.length > 0 && !this.activePopup) {
      this.showNextPopup();
    }
  }

  /**
   * Handle medication actions from popup
   */
  async handleMedicationAction(action, medicationData, additionalData = null) {
    console.log('[NotificationManager] Handling medication action:', action);

    try {
      switch (action) {
        case 'take':
          await this.takeMedication(medicationData);
          break;
          
        case 'skip':
          await this.skipMedication(medicationData);
          break;
          
        case 'snooze':
          await this.snoozeMedication(medicationData, additionalData);
          break;
          
        default:
          console.log('[NotificationManager] Unknown action:', action);
      }
      
      // Hide the current popup after action
      this.hideActivePopup();
      
    } catch (error) {
      console.error('[NotificationManager] Failed to handle medication action:', error);
    }
  }

  /**
   * Take medication
   */
  async takeMedication(medicationData) {
    console.log('[NotificationManager] Taking medication:', medicationData.medicineName);
    
    if (medicationData.doseId) {
      await sqliteDataService.takeMedicine(medicationData.doseId, 'Taken via in-app notification');
    }
    
    // Show success feedback
    this.showSuccessNotification('✅ Medicine Taken', `${medicationData.medicineName} marked as taken`);
  }

  /**
   * Skip medication
   */
  async skipMedication(medicationData) {
    console.log('[NotificationManager] Skipping medication:', medicationData.medicineName);
    
    if (medicationData.doseId) {
      await sqliteDataService.skipMedicine(medicationData.doseId, 'Skipped via in-app notification');
    }
    
    // Show confirmation feedback
    this.showWarningNotification('⚠️ Medicine Skipped', `${medicationData.medicineName} marked as skipped`);
  }

  /**
   * Snooze medication
   */
  async snoozeMedication(medicationData, minutes) {
    console.log('[NotificationManager] Snoozing medication for', minutes, 'minutes');
    
    if (medicationData.alarmId) {
      const success = await sqliteDataService.snoozeMedicine(medicationData.alarmId, minutes);
      
      if (success) {
        this.showInfoNotification('⏰ Reminder Snoozed', `Reminder set for ${minutes} minutes`);
      } else {
        this.showWarningNotification('⚠️ Snooze Limit Reached', 'Please take your medicine now');
      }
    }
  }

  /**
   * Show success notification
   */
  showSuccessNotification(title, message) {
    this.queuePopup({
      type: 'success_notification',
      title,
      message,
      duration: 3000,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Show warning notification
   */
  showWarningNotification(title, message) {
    this.queuePopup({
      type: 'warning_notification',
      title,
      message,
      duration: 4000,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Show info notification
   */
  showInfoNotification(title, message) {
    this.queuePopup({
      type: 'info_notification',
      title,
      message,
      duration: 3000,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Simulate a medication reminder (for testing)
   */
  async simulateMedicationReminder() {
    console.log('[NotificationManager] Simulating medication reminder...');
    
    const testMedication = {
      doseId: 'test_dose_123',
      medicineId: 'test_med_123',
      alarmId: 'test_alarm_123',
      medicineName: 'Paracetamol',
      dosage: '500mg tablet',
      scheduledTime: '08:00 AM',
      foodInstruction: 'Take with food',
    };
    
    await this.showMedicationReminder(testMedication, false);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    console.log('[NotificationManager] Clearing all notifications');
    
    this.popupQueue = [];
    this.hideActivePopup();
  }

  /**
   * Destroy the notification manager
   */
  destroy() {
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.clearAll();
    this.isInitialized = false;
    console.log('[NotificationManager] Notification manager destroyed');
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
export default notificationManager;