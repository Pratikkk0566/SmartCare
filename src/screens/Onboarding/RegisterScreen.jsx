import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import {
  PersonIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon,
  ArrowBackIcon, CalendarIcon, BloodDropIcon, ChevronDownIcon,
} from '../../assets/icons/Icons';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function PersonAddIllustration() {
  return (
    <View style={styles.illustrationCircle}>
      <Svg width={68} height={68} viewBox="0 0 24 24" fill="none">
        <Circle cx="10" cy="8" r="4" stroke="white" strokeWidth={1.8} />
        <Path d="M2 21 C2 17.5 5.5 15 10 15" stroke="white" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 13 L17 21" stroke="white" strokeWidth={2} strokeLinecap="round" />
        <Path d="M13 17 L21 17" stroke="white" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const [fullName,    setFullName]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [age,         setAge]         = useState('');
  const [bloodGroup,  setBloodGroup]  = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms,       setTerms]       = useState(false);
  const [focused,     setFocused]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showPicker,  setShowPicker]  = useState(false);

  const pwChecks = useMemo(() => ({
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  }), [password]);

  const allPwValid = Object.values(pwChecks).every(Boolean);

  const isValid = useMemo(() =>
    fullName.trim().length >= 2 &&
    phone.replace(/\D/g, '').length === 10 &&
    email.trim().includes('@') &&
    age.trim().length > 0 &&
    bloodGroup.length > 0 &&
    allPwValid &&
    password === confirmPass &&
    terms,
  [fullName, phone, email, age, bloodGroup, allPwValid, password, confirmPass, terms]);

  const handleCreate = useCallback(async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const parts = fullName.trim().split(' ');
      const userData = {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || '',
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        bloodGroup,
        age,
        password,
      };
      navigation.navigate('OTPVerification', {
        mode: 'register',
        phone: `+91 ${phone}`,
        userData,
      });
    } finally {
      setLoading(false);
    }
  }, [isValid, loading, fullName, phone, email, age, bloodGroup, password, navigation]);

  const inp = field => ({
    onFocus: () => setFocused(field),
    onBlur:  () => setFocused(null),
    style:   [styles.inputRow, focused === field && styles.inputFocused],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={{ alignItems: 'center', marginBottom: spacing.base }}>
            <PersonAddIllustration />
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Fill in your details to create{'\n'}your account</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View {...inp('name')}>
            <PersonIcon size={17} color={focused === 'name' ? colors.primary : colors.textMuted} />
            <TextInput style={styles.input} placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName}
              onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
          </View>

          {/* Mobile Number */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={[styles.inputRow, focused === 'phone' && styles.inputFocused, { padding: 0, overflow: 'hidden' }]}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <View style={styles.prefixDivider} />
            <TextInput
              style={[styles.input, { paddingHorizontal: spacing.md }]}
              placeholder="Enter mobile number"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View {...inp('email')}>
            <MailIcon size={17} color={focused === 'email' ? colors.primary : colors.textMuted} />
            <TextInput style={styles.input} placeholder="Enter your email address"
              placeholderTextColor={colors.textMuted} value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
              keyboardType="email-address" autoCapitalize="none"
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
          </View>

          {/* Age */}
          <Text style={styles.label}>Age</Text>
          <View {...inp('age')}>
            <CalendarIcon size={17} color={focused === 'age' ? colors.primary : colors.textMuted} />
            <TextInput style={styles.input} placeholder="Enter your age"
              placeholderTextColor={colors.textMuted} value={age}
              onChangeText={v => setAge(v.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              onFocus={() => setFocused('age')} onBlur={() => setFocused(null)} />
          </View>

          {/* Blood Group */}
          <Text style={styles.label}>Blood Group</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <BloodDropIcon size={17} color={bloodGroup ? colors.primary : colors.textMuted} />
            <Text style={[styles.input, !bloodGroup && { color: colors.textMuted }]}>
              {bloodGroup || 'Select your blood group'}
            </Text>
            <ChevronDownIcon size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View {...inp('pass')}>
            <LockIcon size={17} color={focused === 'pass' ? colors.primary : colors.textMuted} />
            <TextInput style={styles.input} placeholder="Create a password"
              placeholderTextColor={colors.textMuted} value={password}
              onChangeText={setPassword} secureTextEntry={!showPass} autoCapitalize="none"
              onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)} />
            <TouchableOpacity onPress={() => setShowPass(p => !p)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showPass
                ? <EyeOffIcon size={17} color={colors.textMuted} />
                : <EyeIcon   size={17} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.pillRow}>
              {[
                { label: '8+ chars', ok: pwChecks.length },
                { label: 'A–Z',      ok: pwChecks.upper  },
                { label: '0–9',      ok: pwChecks.number },
                { label: '!@#',      ok: pwChecks.special },
              ].map(p => (
                <View key={p.label} style={[styles.pill, p.ok && styles.pillOk]}>
                  <Text style={[styles.pillText, p.ok && styles.pillTextOk]}>
                    {p.ok ? '✓ ' : ''}{p.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View {...inp('confirm')}>
            <LockIcon size={17} color={focused === 'confirm' ? colors.primary : colors.textMuted} />
            <TextInput style={styles.input} placeholder="Confirm your password"
              placeholderTextColor={colors.textMuted} value={confirmPass}
              onChangeText={setConfirmPass} secureTextEntry={!showConfirm} autoCapitalize="none"
              onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)} />
            <TouchableOpacity onPress={() => setShowConfirm(p => !p)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showConfirm
                ? <EyeOffIcon size={17} color={colors.textMuted} />
                : <EyeIcon   size={17} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>
          {confirmPass.length > 0 && password !== confirmPass && (
            <Text style={styles.fieldError}>Passwords don't match</Text>
          )}

          {/* Terms */}
          <TouchableOpacity style={styles.checkRow} onPress={() => setTerms(t => !t)} activeOpacity={0.7}>
            <View style={[styles.checkbox, terms && styles.checkboxOn]}>
              {terms && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkText}>
              I agree to the <Text style={styles.link}>Terms & Conditions</Text>{' '}and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleCreate} disabled={!isValid || loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Blood Group Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide"
        onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Blood Group</Text>
            <View style={styles.bloodGrid}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity key={bg}
                  style={[styles.bloodOption, bloodGroup === bg && styles.bloodOptionOn]}
                  onPress={() => { setBloodGroup(bg); setShowPicker(false); }}>
                  <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextOn]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  back: { padding: spacing.base, paddingBottom: 0, alignSelf: 'flex-start' },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.base, paddingBottom: 40 },
  illustrationCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: spacing.sm },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    gap: spacing.sm, backgroundColor: colors.surface, marginBottom: 4,
  },
  inputFocused: { borderColor: colors.primary },
  prefixBox: { paddingRight: spacing.sm, paddingVertical: Platform.OS === 'ios' ? 13 : 10, paddingLeft: spacing.md },
  prefixText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  prefixDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  pillRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 6, marginBottom: 4, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#F3F4F6' },
  pillOk: { backgroundColor: colors.successLight },
  pillText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  pillTextOk: { color: colors.success },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 3, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginVertical: spacing.base },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  checkText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  errorText: { fontSize: 13, color: colors.error, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.base },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.base },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  bloodOption: { width: 72, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.background },
  bloodOptionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bloodText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  bloodTextOn: { color: colors.primary },
});