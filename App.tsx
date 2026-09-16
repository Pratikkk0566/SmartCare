import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppProvider} from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationContainer from './src/components/notifications/NotificationContainer';

export default function App() {
  
  // Initialize notifications early
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Import and configure notifications
        const { configurePushNotifications } = await import('./src/services/NotificationService');
        
        configurePushNotifications((notification) => {
          console.log('[App] Notification received:', notification);
        });
        
        console.log('[App] Notifications initialized');
      } catch (error) {
        console.error('[App] Failed to initialize notifications:', error);
      }
    };
    
    initNotifications();
  }, []);
  
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AppProvider>
        <AppNavigator />
        <NotificationContainer />
      </AppProvider>
    </SafeAreaProvider>
  );
}
