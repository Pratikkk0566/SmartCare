import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Alert, StyleSheet, Button } from 'react-native';
import MedAlarm from '../../components/MedAlarm';
import { medicationEngineService } from '../../services/MedicationEngineService';

export default function MedicationAlarmScreen({ route, navigation }) {
  const id = route.params?.scheduleId || route.params?.doseId;
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    let mounted = true;
    medicationEngineService
      .init()
      .then(() => medicationEngineService.store.getSchedule(id))
      .then(s => {
        if (!mounted) return;
        if (!s) setError('This medication dose is no longer available.');
        else setSchedule(s);
      })
      .catch(e => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, [id]);
  const perform = useCallback(
    async (action, minutes) => {
      if (busy.current) return;
      busy.current = true;
      try {
        if (action === 'take') await medicationEngineService.markTaken(id);
        if (action === 'skip')
          await medicationEngineService.markSkipped(
            id,
            'Skipped from alarm screen',
          );
        if (action === 'snooze')
          await medicationEngineService.snooze(id, minutes);
        await navigation.goBack();
      } catch (e) {
        Alert.alert('Unable to update dose', e.message);
      } finally {
        busy.current = false;
      }
    },
    [id, navigation],
  );
  if (!schedule)
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{error || 'Loading medication...'}</Text>
        {error ? (
          <Button title="Close" onPress={() => navigation.goBack()} />
        ) : null}
      </View>
    );
  if (!['SCHEDULED', 'SNOOZED'].includes(schedule.status))
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Dose already {schedule.status.toLowerCase()}.
        </Text>
        <Button title="Close" onPress={() => navigation.goBack()} />
      </View>
    );
  return (
    <View style={styles.container}>
      <MedAlarm
        medicationName={schedule.medicineName}
        dosage={schedule.dosage}
        time={new Date(
          schedule.snoozedUntil || schedule.scheduledAt,
        ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        foodInstruction={schedule.timingInstruction}
        onTaken={() => perform('take')}
        onSnooze={minutes => perform('snooze', minutes)}
        onSkip={() =>
          Alert.alert('Skip dose?', schedule.medicineName, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Skip', onPress: () => perform('skip') },
          ])
        }
        onClose={() => navigation.goBack()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A211E' },
  message: { color: '#fff', padding: 24 },
});
