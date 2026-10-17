import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationContainer from './src/components/notifications/NotificationContainer';

export default function App() {
  // Initialize notifications early
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const { localAlarmManager } = await import(
          './src/services/LocalAlarmManager'
        );
        await localAlarmManager.init();
        await localAlarmManager.requestPermissions();
        await localAlarmManager.rescheduleUpcomingAlarms();
        console.log('[App] Notifications initialized');
      } catch (error) {
        console.error('[App] Failed to initialize notifications:', error);
      }
    };

    initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <AppProvider>
        <AppNavigator />
        <NotificationContainer />
      </AppProvider>
    </SafeAreaProvider>
  );
}
