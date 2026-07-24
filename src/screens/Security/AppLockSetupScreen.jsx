import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors} from '../../theme/colors';
import {typography} from '../../theme/typography';
import {spacing} from '../../theme/spacing';

export default function AppLockSetupScreen({navigation}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Lock Setup</Text>
      <Text style={styles.subtitle}>Secure your health data with a PIN or biometric lock.</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('PINSetup')}>
        <Text style={styles.buttonText}>Set up PIN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={() => navigation.goBack()}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  title: {...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center'},
  subtitle: {...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl},
  button: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginBottom: spacing.md},
  buttonText: {...typography.label, color: '#fff'},
  skip: {padding: spacing.sm},
  skipText: {...typography.body, color: colors.textMuted},
});
