import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Path, Polyline } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { ArrowBackIcon } from '../../assets/icons/Icons';
import { StorageService } from '../../services/StorageService';
import { useApp } from '../../context/AppContext';
import { OTPApi, PatientApi, saveSession } from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OTP_LENGTH = 4; // API generates 4-digit OTPs
const RESEND_SECONDS = 30;

// Phone + green checkmark badge
function OTPIllustration() {
  return (
    <View style={styles.illustrationCircle}>
      <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="1" width="14" height="22" rx="3"
          stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="18" r="1" fill="white" />
        <Path d="M9 5 L15 5" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
      <View style={styles.checkBadge}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="12" fill={colors.success} />
          <Polyline points="6,12 10,16 18,8" stroke="white" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

export default function OTPVerificationScreen({ navigation, route }) {
  const { mode, phone, displayPhone, userData } = route.params || {};
  const { setIsLoggedIn, updateProfile, setIsOnboarded } = useApp();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (timer === 0) { setCanResend(true); return; }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const handleResend = async () => {
    setTimer(RESEND_SECONDS);
    setCanResend(false);
    setOtp('');
    setError('');
    const result = await OTPApi.resendOTP(phone);
    if (!result.success) {
      setError(result.error || 'Failed to resend OTP.');
    }
  };

  const handleOTPChange = v => {
    const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setError('');
    if (digits.length === OTP_LENGTH) Keyboard.dismiss();
  };

  const handleVerify = useCallback(async () => {
    if (otp.length < OTP_LENGTH || loading) return;
    setLoading(true);
    setError('');
    try {
      // ── MOCK BYPASS (remove when SSL is fixed) ──────────────────────────
      const MOCK_OTP = '1234';
      if (otp === MOCK_OTP) {
        await StorageService.set('@isLoggedIn', true);
        setIsLoggedIn(true);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      // Call real verify OTP API
      const result = await OTPApi.verifyOTP(phone, otp);

      if (!result?.success) {
        setError(result?.error || 'Invalid OTP. Please try again.');
        return;
      }

      // Log the full login response so we can see what fields are available
      console.log('[LOGIN RESPONSE]', JSON.stringify(result.data));

      // Save token + session data
      await saveSession(result.data, phone);

      // Now fetch the patient record using mobile number
      // Strip country code — server expects exactly 10 digits, no +91 prefix
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const patientResult = await PatientApi.getByMobile(cleanPhone);

      if (patientResult.success) {
        // Server may return array or single object
        const raw     = patientResult.data;
        const patient = Array.isArray(raw) ? raw[0] : (raw?.patient || raw);

        if (patient && (patient.id || patient.patientId)) {
          const pid = String(patient.id || patient.patientId || '');
          await AsyncStorage.setItem('patientId',  pid);
          await AsyncStorage.setItem('@patientId', pid);
          await AsyncStorage.setItem('patientName', `${patient.firstname || ''} ${patient.surname || ''}`.trim());
          await AsyncStorage.setItem('uhid',        patient.uhid || '');
          await AsyncStorage.setItem('SELCETEDPATIENTDETAILS', JSON.stringify(patient));
          await AsyncStorage.setItem('IsRegister', 'true');
          console.log('[OTP] Saved patientId:', pid);
        } else {
          await AsyncStorage.setItem('IsRegister', 'false');
        }
      }
      // If getByMobile fails, don't block login — proceed anyway

      if (mode === 'register' && userData) {
        await StorageService.set('@isOnboarded', 'true');
        await StorageService.set('@isLoggedIn', true);
        await updateProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: phone || '',
          bloodGroup: userData.bloodGroup || '',
        });
        setIsOnboarded(true);
        setIsLoggedIn(true);
        navigation.replace('AccountCreated', { userData });
      } else {
        await StorageService.set('@isLoggedIn', true);
        setIsLoggedIn(true);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, loading, mode, phone, userData, navigation, setIsLoggedIn, updateProfile, setIsOnboarded]);

  // Auto-verify when all 4 digits entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH) handleVerify();
  }, [otp]); // eslint-disable-line

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowBackIcon size={22} color={colors.textPrimary} />
      </TouchableOpacity>

            <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={styles.body}>
        <OTPIllustration />

        <Text style={styles.title}>Verify Your Number</Text>
        <Text style={styles.subtitle}>We have sent a 4-digit OTP to</Text>
        <Text style={styles.phoneHighlight}>{displayPhone || phone}</Text>

        {/* 4 OTP boxes backed by single hidden TextInput */}
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View key={i} style={[
              styles.otpBox,
              otp[i] && styles.otpBoxFilled,
              otp.length === i && styles.otpBoxFocused,
            ]}>
              <Text style={styles.otpChar}>{otp[i] || ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleOTPChange}
          keyboardType="phone-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          caretHidden
        />

        {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>
              Resend OTP in <Text style={styles.resendBold}>00:{String(timer).padStart(2, '0')}</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.btn, (otp.length < OTP_LENGTH || loading) && styles.btnDisabled]}
          onPress={handleVerify} disabled={otp.length < OTP_LENGTH || loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
        </TouchableOpacity>

        <Text style={styles.terms}>
          {'By continuing, you agree to our '}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {' and '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
     </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  back: { padding: spacing.base, paddingBottom: 0, alignSelf: 'flex-start' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  illustrationCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  checkBadge: { position: 'absolute', bottom: 8, right: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  phoneHighlight: { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: 3, marginBottom: spacing.xl },
  otpRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  otpBox: {
    width: 46, height: 54, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxFocused: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.surface },
  otpChar: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  errorText: { fontSize: 13, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
  resendRow: { marginBottom: spacing.xl },
  resendTimer: { fontSize: 13, color: colors.textSecondary },
  resendBold: { fontWeight: '700', color: colors.primary },
  resendLink: { fontSize: 14, fontWeight: '700', color: colors.primary, textDecorationLine: 'underline' },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  terms: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: spacing.xl },
  termsLink: { color: colors.primary, fontWeight: '600' },
});