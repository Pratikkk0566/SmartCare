import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Alert} from 'react-native';
import {colors} from '../../theme/colors';
import {typography} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {StorageService} from '../../services/StorageService';

export default function PINSetupScreen({navigation}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState(1);

  async function handleNext() {
    if (step === 1) {
      if (pin.length < 4) { Alert.alert('PIN must be at least 4 digits'); return; }
      setStep(2);
    } else {
      if (pin !== confirm) { Alert.alert('PINs do not match'); setConfirm(''); return; }
      await StorageService.saveLockSettings(true, 'pin', pin);
      Alert.alert('Success', 'PIN set successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step === 1 ? 'Create PIN' : 'Confirm PIN'}</Text>
      <Text style={styles.subtitle}>{step === 1 ? 'Enter a 4–6 digit PIN' : 'Re-enter your PIN to confirm'}</Text>
      <TextInput
        style={styles.input}
        value={step === 1 ? pin : confirm}
        onChangeText={step === 1 ? setPin : setConfirm}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••"
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>{step === 1 ? 'Next' : 'Confirm'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  title: {...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center'},
  subtitle: {...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, fontSize: 24, letterSpacing: 8, width: 180, textAlign: 'center', marginBottom: spacing.xl, color: colors.textPrimary},
  button: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40},
  buttonText: {...typography.label, color: '#fff'},
});