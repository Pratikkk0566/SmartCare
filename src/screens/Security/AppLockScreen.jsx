import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Alert} from 'react-native';
import {colors} from '../../theme/colors';
import {typography} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {StorageService} from '../../services/StorageService';

export default function AppLockScreen({navigation}) {
  const [pin, setPin] = useState('');

  async function handleUnlock() {
    if (pin.length < 4) { Alert.alert('Enter your PIN'); return; }
    const settings = await StorageService.getLockSettings();
    if (pin !== settings.pin) {
      Alert.alert('Incorrect PIN', 'Please try again.');
      setPin('');
      return;
    }
    navigation.replace('MainTabs');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Locked</Text>
      <Text style={styles.subtitle}>Enter your PIN to continue</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••"
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity style={styles.button} onPress={handleUnlock}>
        <Text style={styles.buttonText}>Unlock</Text>
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