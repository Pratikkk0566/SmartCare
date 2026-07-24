import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { ArrowBackIcon, EyeIcon, EyeOffIcon, LockIcon } from '../../assets/icons/Icons';

// Fingerprint-style Aadhaar illustration
function AadhaarIllustration() {
  return (
    <View style={styles.illustrationCircle}>
      <Svg width={70} height={70} viewBox="0 0 60 60" fill="none">
        <Path d="M30 50 C17 50 8 41 8 30 C8 19 17 10 30 10 C43 10 52 19 52 30"
          stroke="white" strokeWidth={3} strokeLinecap="round" />
        <Path d="M30 43 C21 43 15 37 15 30 C15 23 21 17 30 17 C39 17 45 23 45 30"
          stroke="white" strokeWidth={3} strokeLinecap="round" />
        <Path d="M30 36 C25.5 36 22 33 22 30 C22 27 25.5 24 30 24 C34.5 24 38 27 38 30"
          stroke="white" strokeWidth={3} strokeLinecap="round" />
        <Circle cx="30" cy="30" r="3" fill="white" />
        {/* Coloured dots — Aadhaar brand colours */}
        <Circle cx="10" cy="52" r="4" fill="#FF6B6B" opacity={0.9} />
        <Circle cx="20" cy="55" r="3" fill="#4ECDC4" opacity={0.9} />
        <Circle cx="31" cy="56" r="4" fill="#45B7D1" opacity={0.9} />
        <Circle cx="41" cy="54" r="3" fill="#FFA07A" opacity={0.9} />
        <Circle cx="50" cy="50" r="3.5" fill="#98D8C8" opacity={0.9} />
      </Svg>
    </View>
  );
}

export default function AadhaarLoginScreen({ navigation }) {
  const [aadhaar, setAadhaar] = useState('');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const digits = aadhaar.replace(/\s/g, '');
  const isValid = digits.length === 12;

  // Format input as XXXX XXXX XXXX
  const formatAadhaar = raw => {
    const d = raw.replace(/\D/g, '').slice(0, 12);
    return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const handleContinue = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      navigation.navigate('OTPVerification', {
        mode: 'aadhaarLogin',
        phone: `Aadhaar ••••${digits.slice(-4)}`,
      });
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
          <AadhaarIllustration />

          <Text style={styles.title}>Login with{'\n'}Aadhaar</Text>
          <Text style={styles.subtitle}>Enter your Aadhaar number to continue</Text>

          <Text style={styles.label}>Aadhaar Number</Text>
          <TouchableOpacity style={[styles.inputRow, error && styles.inputRowError]}
            onPress={() => inputRef.current?.focus()} activeOpacity={1}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Enter 12-digit Aadhaar number"
              placeholderTextColor={colors.textMuted}
              value={aadhaar}
              onChangeText={v => { setError(''); setAadhaar(formatAadhaar(v)); }}
              keyboardType="phone-pad"
              maxLength={14}
              secureTextEntry={!showAadhaar}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            <TouchableOpacity style={styles.eyeBtn}
              onPress={() => setShowAadhaar(p => !p)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showAadhaar
                ? <EyeIcon size={18} color={colors.textMuted} />
                : <EyeOffIcon size={18} color={colors.textMuted} />}
            </TouchableOpacity>
          </TouchableOpacity>

          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleContinue} disabled={!isValid || loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <LockIcon size={14} color={colors.textMuted} />
            <Text style={styles.securityText}>Your Aadhaar details are secure{'\n'}and encrypted</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  back: { padding: spacing.base, paddingBottom: 0, alignSelf: 'flex-start' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  illustrationCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', lineHeight: 34, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  label: { alignSelf: 'flex-start', fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, marginBottom: spacing.md,
    paddingHorizontal: spacing.base,
  },
  inputRowError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary, paddingVertical: 14, letterSpacing: 1 },
  eyeBtn: { padding: spacing.xs },
  errorText: { alignSelf: 'flex-start', fontSize: 12, color: colors.error, marginBottom: spacing.sm, marginTop: -spacing.sm },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md,
    padding: spacing.base, width: '100%',
  },
  securityText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, flex: 1 },
});