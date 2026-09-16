/**
 * Notification Container
 * ---------------------
 * Main container for all in-app notifications and popups.
 * Integrates with NotificationManager to show medication reminders and other notifications.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MedicationNotificationPopup from './MedicationNotificationPopup';
import SimpleNotificationPopup from './SimpleNotificationPopup';
import { notificationManager } from '../../services/NotificationManager';

export default function NotificationContainer() {
  const [activePopup, setActivePopup] = useState(null);

  useEffect(() => {
    // Register popup callbacks with notification manager
    notificationManager.setPopupCallbacks(
      showPopup,
      hidePopup
    );

    // Initialize notification manager
    notificationManager.init().catch(console.error);

    return () => {
      // Cleanup if needed
    };
  }, []);

  /**
   * Show popup callback
   */
  const showPopup = (popupData) => {
    console.log('[NotificationContainer] Showing popup:', popupData.type);
    setActivePopup(popupData);
  };

  /**
   * Hide popup callback
   */
  const hidePopup = () => {
    console.log('[NotificationContainer] Hiding popup');
    setActivePopup(null);
  };

  /**
   * Handle medication actions
   */
  const handleMedicationAction = async (action, medicationData, additionalData) => {
    await notificationManager.handleMedicationAction(action, medicationData, additionalData);
  };

  /**
   * Render appropriate popup based on type
   */
  const renderPopup = () => {
    if (!activePopup) return null;

    switch (activePopup.type) {
      case 'medication_reminder':
        return (
          <MedicationNotificationPopup
            visible={true}
            medicationData={activePopup.medicationData}
            isOverdue={activePopup.isOverdue}
            onTake={(data) => handleMedicationAction('take', data)}
            onSkip={(data) => handleMedicationAction('skip', data)}
            onSnooze={(data, minutes) => handleMedicationAction('snooze', data, minutes)}
            onDismiss={hidePopup}
          />
        );

      case 'success_notification':
      case 'warning_notification':
      case 'info_notification':
        return (
          <SimpleNotificationPopup
            visible={true}
            type={activePopup.type}
            title={activePopup.title}
            message={activePopup.message}
            duration={activePopup.duration}
            onDismiss={hidePopup}
          />
        );

      default:
        console.log('[NotificationContainer] Unknown popup type:', activePopup.type);
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderPopup()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allow touches to pass through when no popup
    zIndex: 9999, // Ensure it appears above everything
  },
});