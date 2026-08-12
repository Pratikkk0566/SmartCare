import React, {useState, useCallback, useMemo} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Rect, Circle, Polyline} from 'react-native-svg';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {
  PersonIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon,
  ArrowBackIcon, CalendarIcon, BloodDropIcon, ChevronDownIcon, PhoneIcon,
} from '../../assets/icons/Icons';
import {OTPApi} from '../../API/Api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Heart + ECG icon for the header
function HeaderIcon() {
  return (
    <View style={styles.headerIconWrap}>
      <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
        {/* Heart */}
        <Path
          d="M22 36 C22 36 6 26 6 16 C6 10 10.5 7 15 7 C18 7 20.5 9 22 11 C23.5 9 26 7 29 7 C33.5 7 38 10 38 16 C38 26 22 36 22 36Z"
          fill={colors.primary}
          opacity={0.9}
        />
        {/* ECG line on heart */}
        <Path
          d="M12 22 L16 22 L18 17 L20 27 L22 20 L24 22 L28 22 L30 20 L32 22"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function RegisterScreen({navigation}) {
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
  const [touched,     setTouched]     = useState({});
  const [loading,     setLoading]     = useState(false);

  // Per-field blur errors
  const blurErrors = useMemo(() => ({
    phone:   touched.phone   && phone.replace(/\D/g, '').length !== 10 ? 'Enter a valid 10-digit number' : '',
    name:    touched.name    && fullName.trim().length < 2              ? 'Name must be at least 2 characters' : '',
    email:   touched.email   && !email.trim().includes('@')             ? 'Enter a valid email address' : '',
    age:     touched.age     && (age.trim() === '' || Number(age) < 1 || Number(age) > 120) ? 'Enter a valid age (1–120)' : '',
    pass:    touched.pass    && !allPwValid                             ? 'Password does not meet requirements' : '',
    confirm: touched.confirm && confirmPass.length > 0 && password !== confirmPass ? "Passwords don't match" : '',
  }), [touched, phone, fullName, email, age, allPwValid, confirmPass, password]);

  const handleBlur = field => {
    setFocused(null);
    setTouched(prev => ({...prev, [field]: true}));
  };
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
    setError('');
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      const otpResult = await OTPApi.sendOTP(cleanPhone);
      if (!otpResult.success) {
        setError(otpResult.error || 'Failed to send OTP. Please try again.');
        return;
      }
      const nameParts = fullName.trim().split(' ');
      const userDataReal = {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || '',
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        bloodGroup,
        age,
        password,
      };
      navigation.navigate('OTPVerification', {
        mode: 'register',
        phone: cleanPhone,
        displayPhone: `+91 ${phone}`,
        userData: userDataReal,
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isValid, loading, fullName, phone, email, age, bloodGroup, password, navigation]);

  const rowStyle = field => [
    styles.inputRow,
    focused === field && styles.inputRowFocused,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <HeaderIcon />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Fill in the details below to create{'\n'}your account</Text>
          </View>

          {/* Phone Number */}
          <View style={rowStyle('phone')}>
            <PhoneIcon size={17} color={focused === 'phone' ? colors.primary : blurErrors.phone ? colors.error : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              onFocus={() => setFocused('phone')}
              onBlur={() => handleBlur('phone')}
            />
            <View style={styles.countryBadge}>
              <Text style={styles.countryText}>+91</Text>
              <ChevronDownIcon size={13} color={colors.textSecondary} />
            </View>
          </View>
          {blurErrors.phone ? <Text style={styles.fieldError}>{blurErrors.phone}</Text> : null}

          {/* Full Name */}
          <View style={rowStyle('name')}>
            <PersonIcon size={17} color={focused === 'name' ? colors.primary : blurErrors.name ? colors.error : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocused('name')}
              onBlur={() => handleBlur('name')}
            />
          </View>
          {blurErrors.name ? <Text style={styles.fieldError}>{blurErrors.name}</Text> : null}

          {/* Email */}
          <View style={[rowStyle('email'), blurErrors.email && styles.inputRowError]}>
            <MailIcon size={17} color={focused === 'email' ? colors.primary : blurErrors.email ? colors.error : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={v => {setEmail(v); setError('');}}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused('email')}
              onBlur={() => handleBlur('email')}
            />
          </View>
          {blurErrors.email ? <Text style={styles.fieldError}>{blurErrors.email}</Text> : null}

          {/* Age */}
          <View style={[rowStyle('age'), blurErrors.age && styles.inputRowError]}>
            <CalendarIcon size={17} color={focused === 'age' ? colors.primary : blurErrors.age ? colors.error : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor={colors.textMuted}
              value={age}
              onChangeText={v => setAge(v.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              onFocus={() => setFocused('age')}
              onBlur={() => handleBlur('age')}
            />
          </View>
          {blurErrors.age ? <Text style={styles.fieldError}>{blurErrors.age}</Text> : null}

          {/* Blood Group */}
          <TouchableOpacity
            style={rowStyle('blood')}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}>
            <BloodDropIcon size={17} color={bloodGroup ? colors.primary : colors.textMuted} />
            <Text style={[styles.input, styles.pickerText, !bloodGroup && styles.pickerPlaceholder]}>
              {bloodGroup || 'Blood Group'}
            </Text>
            <ChevronDownIcon size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Password */}
          <View style={[rowStyle('pass'), blurErrors.pass && styles.inputRowError]}>
            <LockIcon size={17} color={focused === 'pass' ? colors.primary : blurErrors.pass ? colors.error : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              onFocus={() => setFocused('pass')}
              onBlur={() => handleBlur('pass')}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              {showPass
                ? <EyeOffIcon size={17} color={colors.textMuted} />
                : <EyeIcon    size={17} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>

          {/* Password strength pills */}
          {password.length > 0 && (
            <View style={styles.pillRow}>
              {[
                {label: '8+ chars', ok: pwChecks.length},
                {label: 'A–Z',      ok: pwChecks.upper},
                {label: '0–9',      ok: pwChecks.number},
                {label: '!@#',      ok: pwChecks.special},
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
          <View style={rowStyle('confirm')}>
            <LockIcon size={17} color={focused === 'confirm' ? colors.primary : colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textMuted}
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              {showConfirm
                ? <EyeOffIcon size={17} color={colors.textMuted} />
                : <EyeIcon    size={17} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>

          {confirmPass.length > 0 && password !== confirmPass && (
            <Text style={styles.fieldError}>Passwords don't match</Text>
          )}

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.checkRow} onPress={() => setTerms(t => !t)} activeOpacity={0.7}>
            <View style={[styles.checkbox, terms && styles.checkboxOn]}>
              {terms && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkText}>
              I agree to the <Text style={styles.link}>Terms and Conditions</Text>
            </Text>
          </TouchableOpacity>

          {error.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Create Account button */}
          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!isValid || loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* Sign in link */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PhoneLogin')}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>



        </ScrollView>
      </KeyboardAvoidingView>

      {/* Blood Group Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Blood Group</Text>
            <View style={styles.bloodGrid}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodOption, bloodGroup === bg && styles.bloodOptionOn]}
                  onPress={() => {setBloodGroup(bg); setShowPicker(false);}}>
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
  safe: {flex: 1, backgroundColor: colors.surface},
  flex: {flex: 1},
  back: {padding: spacing.base, paddingBottom: 0, alignSelf: 'flex-start'},
  scroll: {paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 40},

  // Header
  header: {alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.sm},
  headerIconWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 6},
  subtitle: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21},

  // Input rows
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  inputRowFocused: {borderColor: colors.primary},
  inputRowError: {borderColor: colors.error},
  input: {flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0},
  pickerText: {paddingVertical: 1},
  pickerPlaceholder: {color: colors.textMuted},

  // Country badge (+91)
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  countryText: {fontSize: 14, fontWeight: '600', color: colors.textSecondary},

  // Password pills
  pillRow: {flexDirection: 'row', gap: spacing.xs, marginTop: 2, marginBottom: spacing.sm, flexWrap: 'wrap'},
  pill: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#F3F4F6'},
  pillOk: {backgroundColor: colors.successLight},
  pillText: {fontSize: 11, color: colors.textMuted, fontWeight: '500'},
  pillTextOk: {color: colors.success},

  fieldError: {fontSize: 12, color: colors.error, marginTop: -4, marginBottom: spacing.sm},

  // Terms checkbox
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkMark: {color: '#fff', fontSize: 12, fontWeight: '700'},
  checkText: {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20},
  link: {color: colors.primary, fontWeight: '600'},

  // Error box
  errorBox: {backgroundColor: colors.errorLight, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md},
  errorText: {fontSize: 13, color: colors.error, textAlign: 'center'},

  // Button
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  btnDisabled: {opacity: 0.5},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3},

  // OR divider
  orRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  orLine: {flex: 1, height: 1, backgroundColor: colors.border},
  orText: {fontSize: 12, color: colors.textMuted, fontWeight: '600', letterSpacing: 1},

  // Sign in
  signinRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg},
  signinText: {fontSize: 14, color: colors.textSecondary},
  signinLink: {fontSize: 14, color: colors.primary, fontWeight: '700'},

  // Privacy footer
  privacyNote: {fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 20},
  privacyLink: {color: colors.primary, fontWeight: '600'},

  // Blood group modal
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHandle: {width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.base},
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.base},
  bloodGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center'},
  bloodOption: {width: 72, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.background},
  bloodOptionOn: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  bloodText: {fontSize: 16, fontWeight: '700', color: colors.textSecondary},
  bloodTextOn: {color: colors.primary},
});
