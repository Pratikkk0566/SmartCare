import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { localAlarmManager } from '../../services/LocalAlarmManager';
const tones = [
  {
    id: 'alarm',
    name: 'Classic alarm',
    detail: 'A clear, repeating two-tone alert',
  },
  { id: 'gentle', name: 'Gentle chime', detail: 'A softer, rising reminder' },
  {
    id: 'system',
    name: 'Phone default',
    detail: 'Use your default notification sound',
  },
];
export default function AlarmRingtonePicker({ visible, onClose }) {
  const [selected, setSelected] = useState('alarm'),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible)
      localAlarmManager
        .getRingtone()
        .then(setSelected)
        .catch(e => Alert.alert('Unable to load ringtone', e.message));
  }, [visible]);
  const choose = async id => {
    if (busy) return;
    setBusy(true);
    try {
      await localAlarmManager.setRingtone(id);
      setSelected(id);
    } catch (e) {
      Alert.alert('Unable to save ringtone', e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Alarm ringtone</Text>
          <Text style={styles.description}>
            Choose the sound for your medication reminders.
          </Text>
          <ScrollView>
            {tones.map(t => (
              <TouchableOpacity
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected === t.id,
                  disabled: busy || (Platform.OS !== 'android' && t.id !== 'system'),
                }}
                disabled={
                  busy || (Platform.OS !== 'android' && t.id !== 'system')
                }
                onPress={() => choose(t.id)}
                style={[styles.row, selected === t.id && styles.selected]}
              >
                <View style={styles.copy}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.detail}>{t.detail}</Text>
                </View>
                <Text style={styles.check}>
                  {selected === t.id ? '\u25cf' : '\u25cb'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {Platform.OS === 'android' ? (
            <TouchableOpacity
              style={styles.system}
              onPress={() =>
                localAlarmManager
                  .openRingtoneSettings()
                  .catch(e =>
                    Alert.alert('Unable to open sound settings', e.message),
                  )
              }
            >
              <Text style={styles.link}>Choose another sound on Android</Text>
              <Text style={styles.detail}>
                Open this reminder channel, then tap Sound.
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.detail}>
              Custom tones are available on Android. iOS uses the system
              notification sound.
            </Text>
          )}
          <TouchableOpacity
            disabled={busy}
            onPress={onClose}
            style={styles.done}
          >
            <Text style={styles.doneText}>
              {busy ? 'Updating reminders...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,18,25,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  handle: {
    height: 4,
    width: 42,
    backgroundColor: '#D6E2E4',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 25, fontWeight: '700', color: '#12313B' },
  description: {
    fontSize: 14,
    color: '#647C83',
    marginTop: 8,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2EBED',
    borderRadius: 18,
    marginBottom: 10,
  },
  selected: { borderColor: '#14A098', backgroundColor: '#EFFBF8' },
  copy: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#12313B' },
  detail: { fontSize: 12, color: '#647C83', lineHeight: 19, marginTop: 4 },
  check: { fontSize: 24, color: '#138B84' },
  system: { paddingVertical: 14 },
  link: { fontSize: 14, fontWeight: '600', color: '#138B84' },
  done: {
    backgroundColor: '#138B84',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
