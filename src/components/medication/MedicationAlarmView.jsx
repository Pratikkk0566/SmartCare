import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import AlarmRingtonePicker from './AlarmRingtonePicker';
export default function MedicationAlarmView({
  medicationData = {},
  onTake,
  onSkip,
  onSnooze,
  onDismiss,
  isOverdue = false,
}) {
  const [ringtone, setRingtone] = useState(false),
    [delay, setDelay] = useState(5),
    [busy, setBusy] = useState(false);
  const processing = useRef(false);
  const act = async fn => {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    try {
      await fn?.();
    } catch (e) {
      Alert.alert('Unable to update dose', e.message);
    } finally {
      processing.current = false;
      setBusy(false);
    }
  };
  const raw = medicationData.scheduledTime || medicationData.scheduledAt || '';
  const time = /^\d{1,2}:\d{2}$/.test(raw)
    ? new Date('2000-01-01T' + raw.padStart(5, '0') + ':00')
    : new Date(raw);
  const displayTime =
    medicationData.displayTime ||
    (Number.isNaN(time.getTime())
      ? 'Dose due now'
      : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const dosage =
    Number(medicationData.dosage) === 0
      ? 'Your prescribed dose'
      : medicationData.dosage || 'Your prescribed dose';
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0B222A" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <View>
            <Text style={styles.brand}>SMARTCARE</Text>
            <Text style={styles.topLabel}>Medication reminder</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Close reminder"
            disabled={busy}
            onPress={() => act(onDismiss)}
            style={styles.close}
          >
            <Text style={styles.closeText}>{'\u00d7'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {isOverdue ? 'OVERDUE DOSE' : 'TIME TO TAKE CARE'}
          </Text>
          <Text style={styles.time}>{displayTime}</Text>
          <View style={styles.rings}>
            <View style={styles.innerRing}>
              <Text style={styles.pill}>{'\u271a'}</Text>
            </View>
          </View>
          <Text style={styles.heading}>Time for your medicine</Text>
          <Text style={styles.subtitle}>A small step for a healthier you.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SCHEDULED MEDICATION</Text>
          </View>
          <Text style={styles.medicine}>
            {medicationData.medicineName ||
              medicationData.medicationName ||
              'Medication'}
          </Text>
          <Text style={styles.dosage}>{dosage}</Text>
          <View style={styles.divider} />
          <Text style={styles.instruction}>
            {medicationData.foodInstruction ||
              medicationData.timingInstruction ||
              'Follow your prescription instructions.'}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mark dose as taken"
            disabled={busy}
            onPress={() => act(onTake)}
            style={[styles.take, busy && styles.disabled]}
          >
            <Text style={styles.takeText}>
              {busy ? 'Updating dose...' : 'Mark as taken'}
            </Text>
          </TouchableOpacity>
          <View style={styles.snoozeBox}>
            <View style={styles.snoozeHeader}>
              <Text style={styles.snoozeLabel}>Remind me later</Text>
              <Text style={styles.minutes}>minutes</Text>
            </View>
            <View style={styles.delays}>
              {[5, 10, 15, 30].map(m => (
                <TouchableOpacity
                  accessibilityLabel={'Snooze delay ' + m + ' minutes'}
                  accessibilityState={{ selected: delay === m }}
                  key={m}
                  disabled={busy}
                  onPress={() => setDelay(m)}
                  style={[styles.delay, delay === m && styles.delayActive]}
                >
                  <Text
                    style={[
                      styles.delayText,
                      delay === m && styles.delayActiveText,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              disabled={busy}
              accessibilityLabel="Snooze reminder"
              onPress={() => act(() => onSnooze?.(delay))}
              style={styles.snooze}
            >
              <Text style={styles.snoozeText}>Snooze for {delay} minutes</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Skip this dose?',
                'This will be recorded in your medication history.',
                [
                  { text: 'Keep reminder', style: 'cancel' },
                  {
                    text: 'Skip dose',
                    style: 'destructive',
                    onPress: () => act(onSkip),
                  },
                ],
              )
            }
            style={styles.skip}
          >
            <Text style={styles.skipText}>Skip this dose</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          disabled={busy}
          onPress={() => setRingtone(true)}
          style={styles.ringtone}
        >
          <Text style={styles.ringtoneText}>Change alarm ringtone</Text>
          <Text style={styles.chevron}>{'\u203a'}</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>
          Your routine. Your health. One dose at a time.
        </Text>
      </ScrollView>
      <AlarmRingtonePicker
        visible={ringtone}
        onClose={() => setRingtone(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B222A' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 12,
    color: '#65D9CA',
    fontWeight: '800',
    letterSpacing: 2,
  },
  topLabel: { fontSize: 12, color: '#96ADB4', marginTop: 6 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#19353D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 28, color: '#BED2D7' },
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 26 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8AA6AD',
  },
  time: {
    fontSize: 54,
    fontWeight: '300',
    color: '#F0FAF8',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  rings: {
    height: 96,
    width: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: '#285951',
    backgroundColor: '#102F34',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 22,
  },
  innerRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1C554E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { fontSize: 36, color: '#87EAD6' },
  heading: {
    color: '#F5FAF9',
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: { color: '#90AEB4', fontSize: 13, marginTop: 9 },
  card: {
    backgroundColor: '#16323A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#25434B',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#244D4B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1,
    color: '#91DAC9',
    fontWeight: '700',
  },
  medicine: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F2FAF7',
    marginTop: 15,
  },
  dosage: { fontSize: 15, color: '#B3C9CD', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#2C4951', marginVertical: 16 },
  instruction: { color: '#B3C9CD', fontSize: 13, lineHeight: 20 },
  actions: { marginTop: 24 },
  take: {
    backgroundColor: '#77DEC0',
    paddingVertical: 19,
    borderRadius: 18,
    alignItems: 'center',
  },
  takeText: { fontSize: 17, fontWeight: '800', color: '#0D3430' },
  disabled: { opacity: 0.6 },
  snoozeBox: {
    marginTop: 16,
    backgroundColor: '#122D35',
    borderRadius: 20,
    padding: 16,
  },
  snoozeHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  snoozeLabel: { fontSize: 13, fontWeight: '600', color: '#C8DBDE' },
  minutes: { fontSize: 11, color: '#6D939D' },
  delays: { flexDirection: 'row', gap: 10, marginTop: 14 },
  delay: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#1F3B44',
    borderWidth: 1,
    borderColor: '#304C55',
  },
  delayActive: { backgroundColor: '#2B6059', borderColor: '#66C4AF' },
  delayText: { fontSize: 17, color: '#AFC9CD', fontWeight: '600' },
  delayActiveText: { color: '#BDF7E5' },
  snooze: { paddingTop: 18, paddingBottom: 4, alignItems: 'center' },
  snoozeText: { color: '#CFDFE1', fontSize: 15, fontWeight: '600' },
  skip: { padding: 18, alignItems: 'center' },
  skipText: { color: '#D6A7A0', fontSize: 14 },
  ringtone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#233E46',
  },
  ringtoneText: { color: '#87ABA8', fontSize: 13 },
  chevron: { fontSize: 22, color: '#87ABA8' },
  footer: {
    color: '#597E88',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
});
