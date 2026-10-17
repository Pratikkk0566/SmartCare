import React, { useCallback, useEffect } from 'react';
import { NativeModules, View, Text, Button, StyleSheet } from 'react-native';
import MedicationAlarmScreen from './MedicationAlarmScreen';
import { localAlarmManager } from '../../services/LocalAlarmManager';
/** Receives Notifee notification.data as native launch props; no home/login navigation. */
export default function LockScreenMedicationAlarm({ alarmData }) {
  useEffect(() => {
    localAlarmManager.lockScreenAlarmActive = true;
    return () => {
      localAlarmManager.lockScreenAlarmActive = false;
    };
  }, []);
  const close = useCallback(async () => {
    try {
      if (alarmData?.scheduleId)
        await localAlarmManager.silenceDoseAlarm(alarmData.scheduleId);
    } finally {
      await NativeModules.MedicationAlarmNative?.finishAlarm();
    }
  }, [alarmData?.scheduleId]);
  if (!alarmData?.scheduleId)
    return (
      <View style={styles.error}>
        <Text style={styles.text}>This alarm is no longer available.</Text>
        <Button title="Close" onPress={close} />
      </View>
    );
  return (
    <MedicationAlarmScreen
      route={{ params: alarmData }}
      navigation={{ goBack: close }}
    />
  );
}
const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0B222A',
  },
  text: { color: '#fff', marginBottom: 20 },
});
