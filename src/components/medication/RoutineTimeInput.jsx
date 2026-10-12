import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
/** Separate digit fields make the colon non-editable, including on select-all/delete. */
export default function RoutineTimeInput({ value, onChange, disabled, label }) {
  const [time = '', period = 'AM'] = value.split(' '),
    [hours = '', minutes = ''] = time.split(':');
  const update = (part, text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    onChange(
      (part === 'hours' ? digits : hours) +
        ':' +
        (part === 'minutes' ? digits : minutes) +
        ' ' +
        period,
    );
  };
  return (
    <View style={styles.row}>
      <View style={styles.clock}>
        <TextInput
          accessibilityLabel={label + ' hours'}
          style={styles.input}
          value={hours}
          placeholder="hh"
          maxLength={2}
          keyboardType="number-pad"
          editable={!disabled}
          selectTextOnFocus
          onChangeText={text => update('hours', text)}
          onBlur={() => {
            if (hours.length === 1) update('hours', hours.padStart(2, '0'));
          }}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          accessibilityLabel={label + ' minutes'}
          style={styles.input}
          value={minutes}
          placeholder="mm"
          maxLength={2}
          keyboardType="number-pad"
          editable={!disabled}
          selectTextOnFocus
          onChangeText={text => update('minutes', text)}
          onBlur={() => {
            if (minutes.length === 1)
              update('minutes', minutes.padStart(2, '0'));
          }}
        />
      </View>
      <View style={styles.periods}>
        {['AM', 'PM'].map(p => (
          <TouchableOpacity
            key={p}
            accessibilityRole="radio"
            accessibilityLabel={label + ' ' + p}
            accessibilityState={{ checked: p === period, disabled }}
            disabled={disabled}
            onPress={() => onChange(hours + ':' + minutes + ' ' + p)}
            style={[styles.period, p === period && styles.active]}
          >
            <Text style={[styles.text, p === period && styles.selected]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D6E3E5',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  input: {
    width: 34,
    minHeight: 44,
    paddingHorizontal: 2,
    color: '#12313B',
    fontSize: 16,
    textAlign: 'center',
  },
  colon: { fontSize: 18, fontWeight: '700', color: '#12313B' },
  periods: { borderRadius: 10, backgroundColor: '#EDF5F4', overflow: 'hidden' },
  period: { paddingHorizontal: 10, paddingVertical: 8 },
  active: { backgroundColor: '#138B84' },
  text: { fontSize: 12, fontWeight: '700', color: '#667E82' },
  selected: { color: '#fff' },
});
