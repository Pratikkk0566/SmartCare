import React, {useState, useRef} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {ArrowBackIcon} from '../../assets/icons/Icons';
import AppIcon from '../../assets/illustrations/AppIcon';
import {OTPApi} from '../../API/Api';

export default function PhoneNumberEntry({navigation}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const isValid = phone.replace(/\D/g, '').length === 10;

  const handleContinue = async () => {
    if (!isValid || loading) return;
    setError('');
    setLoading(true);

    const formattedPhone = `+91${phone}`;

    try {
      const result = await OTPApi.sendOTP(formattedPhone);

      if (result.success) {
        navigation.navigate('OTPVerification', {
          mode: 'phoneLogin',
          phone: formattedPhone,   // pass exactly what was sent to the API
          displayPhone: `+91 ${phone}`, // for display only
        });
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.body}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <AppIcon size={44} />
            <Text style={styles.appName}>SmartCare</Text>
          </View>

          <Text style={styles.title}>Enter your{'\n'}mobile number</Text>
          <Text style={styles.subtitle}>We'll send you a 6-digit OTP to verify</Text>

          <Text style={styles.label}>Mobile Number</Text>
          <TouchableOpacity
            style={[styles.inputRow, error ? styles.inputRowError : null]}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Enter 10-digit number"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={v => {
                setError('');
                setPhone(v.replace(/\D/g, '').slice(0, 10));
              }}
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              autoFocus
            />
          </TouchableOpacity>

          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send OTP</Text>}
          </TouchableOpacity>

          <Text style={styles.note}>OTP will be sent to this number for verification</Text>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.surface},
  flex: {flex: 1},
  back: {padding: spacing.base, paddingBottom: 0, alignSelf: 'flex-start'},
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 36,
  },
  appName: {fontSize: 20, fontWeight: '800', color: colors.primary},
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  inputRowError: {borderColor: colors.error},
  prefix: {
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    backgroundColor: colors.background,
  },
  prefixText: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  divider: {width: 1, alignSelf: 'stretch', backgroundColor: colors.border},
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    letterSpacing: 1,
  },
  errorText: {
    alignSelf: 'flex-start',
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  btnDisabled: {opacity: 0.5},
  btnText: {fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3},
  note: {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
});