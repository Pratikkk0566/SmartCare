/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import { localAlarmManager } from './src/services/LocalAlarmManager';
import App from './App';
import LockScreenMedicationAlarm from './src/screens/Medicine/LockScreenMedicationAlarm';

notifee.onBackgroundEvent(event => localAlarmManager.handleEvent(event));
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('SmartCareMedicationAlarm', () => LockScreenMedicationAlarm);
