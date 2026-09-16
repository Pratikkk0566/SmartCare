/**
 * Simple Notification Service - Fallback for when react-native-push-notification isn't working
 */

import { Alert, Platform, Linking } from 'react-native';

let PushNotification = null;

// Try to load the notification library
const initNotificationLibrary = () => {
  if (PushNotification) return true;
  
  try {
    const module = require('react-native-push-notification');
    PushNotification = module.default || module;
    
    if (!PushNotification) {
      console.log('[SimpleNotificationService] PushNotification module loaded but is undefined');
      return false;
    }
    
    // Configure if not already configured
    if (typeof PushNotification.configure === 'function') {
      PushNotification.configure({
        onNotification: function(notification) {
          console.log('[SimpleNotificationService] Notification:', notification);
        },
        requestPermissions: Platform.OS === 'ios',
        popInitialNotification: true,
      });
      
      // Create channel for Android
      if (Platform.OS === 'android' && typeof PushNotification.createChannel === 'function') {
        PushNotification.createChannel({
          channelId: 'test-channel',
          channelName: 'Test Notifications',
          soundName: 'default',
          importance: 4,
          vibrate: true,
        });
      }
      
      console.log('[SimpleNotificationService] PushNotification configured');
    }
    
    return true;
  } catch (error) {
    console.error('[SimpleNotificationService] Failed to load notification library:', error);
    return false;
  }
};

export const testNotification = async () => {
  console.log('[SimpleNotificationService] Testing notification...');
  
  // Method 1: Try using the notification library
  if (initNotificationLibrary() && PushNotification) {
    try {
      console.log('[SimpleNotificationService] Attempting PushNotification...');
      
      PushNotification.localNotification({
        title: '🧪 Test Notification',
        message: 'This is a test from SimpleNotificationService!',
        playSound: true,
        vibrate: true,
        channelId: 'test-channel',
      });
      
      return {
        success: true,
        method: 'PushNotification',
        message: 'Notification sent using react-native-push-notification'
      };
    } catch (error) {
      console.error('[SimpleNotificationService] PushNotification failed:', error);
    }
  }
  
  // Method 2: Fallback - just show an alert
  console.log('[SimpleNotificationService] Using fallback alert method');
  
  Alert.alert(
    '🔔 Notification Test',
    'This is a fallback notification test since push notifications are not working.',
    [
      { text: 'Check Settings', onPress: () => Linking.openSettings() },
      { text: 'OK' }
    ]
  );
  
  return {
    success: false,
    method: 'Alert',
    message: 'Fallback alert used - push notifications not working'
  };
};

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const { PermissionsAndroid } = require('react-native');
      
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'This app needs notification permission to send medication reminders.',
          buttonPositive: 'Allow',
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[SimpleNotificationService] Permission request failed:', error);
      return false;
    }
  }
  
  return true; // Assume granted for older Android versions and iOS
};

export const debugNotificationSystem = () => {
  const debug = {
    platform: Platform.OS,
    version: Platform.Version,
    libraryLoaded: false,
    methods: [],
    error: null
  };
  
  try {
    const module = require('react-native-push-notification');
    debug.libraryLoaded = true;
    
    const pushNotif = module.default || module;
    if (pushNotif) {
      debug.methods = Object.keys(pushNotif).filter(key => typeof pushNotif[key] === 'function');
    }
  } catch (error) {
    debug.error = error.message;
  }
  
  return debug;
};