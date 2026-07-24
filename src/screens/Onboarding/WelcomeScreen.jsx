import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { PhoneIcon, PersonIcon } from '../../assets/icons/Icons';

// Hero illustration — heart with medical cross + clipboard + shield + pill
function HeroIllustration() {
  return (
    <Svg width={200} height={180} viewBox="0 0 200 180" fill="none">
      {/* Background circle */}
      <Circle cx="100" cy="70" r="55" fill={colors.primaryLight} />
      {/* Heart */}
      <Path
        d="M100 105 C100 105 65 82 65 62 C65 50 73 44 82 44 C90 44 96 50 100 55 C104 50 110 44 118 44 C127 44 135 50 135 62 C135 82 100 105 100 105Z"
        fill={colors.primary} opacity={0.9} />
      {/* Medical cross */}
      <Rect x="95" y="58" width="10" height="28" rx="3" fill="white" />
      <Rect x="87" y="66" width="26" height="10" rx="3" fill="white" />
      {/* Clipboard left */}
      <Rect x="28" y="60" width="32" height="42" rx="4" fill="white" opacity={0.85} />
      <Rect x="36" y="54" width="16" height="8" rx="2" fill={colors.primaryLight} />
      <Rect x="34" y="72" width="20" height="2.5" rx="1.2" fill={colors.border} />
      <Rect x="34" y="79" width="16" height="2.5" rx="1.2" fill={colors.border} />
      <Rect x="34" y="86" width="18" height="2.5" rx="1.2" fill={colors.border} />
      {/* Shield right */}
      <Path d="M142 58 L168 58 L168 80 C168 92 155 100 155 100 C155 100 142 92 142 80 Z"
        fill="white" opacity={0.9} />
      <Path d="M148 75 L153 80 L163 68" stroke={colors.success} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Pill bottom */}
      <Ellipse cx="50" cy="118" rx="18" ry="8" fill={colors.primary} opacity={0.6} />
      <Path d="M32 118 L68 118" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// Aadhaar fingerprint icon (used inside the option row)
function AadhaarRowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 60 60" fill="none">
      <Path d="M30 50 C17 50 8 41 8 30 C8 19 17 10 30 10 C43 10 52 19 52 30"
        stroke={colors.warning} strokeWidth={4} strokeLinecap="round" />
      <Path d="M30 43 C21 43 15 37 15 30 C15 23 21 17 30 17 C39 17 45 23 45 30"
        stroke={colors.warning} strokeWidth={4} strokeLinecap="round" />
      <Path d="M30 36 C25.5 36 22 33 22 30 C22 27 25.5 24 30 24 C34.5 24 38 27 38 30"
        stroke={colors.warning} strokeWidth={4} strokeLinecap="round" />
      <Circle cx="30" cy="30" r="3.5" fill={colors.warning} />
    </Svg>
  );
}

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.root}>

        {/* Brand */}
        <Text style={styles.brandName}>SmartCare PHR</Text>
        <Text style={styles.brandTagline}>Your Health, Our Priority</Text>

        {/* Hero */}
        <View style={styles.illustrationWrap}>
          <HeroIllustration />
        </View>

        {/* Welcome text */}
        <Text style={styles.title}>Your Trusted{'\n'}Health Companion</Text>
        <Text style={styles.subtitle}>
          Manage medicines, appointments, investigations{'\n'}and health records — all in one place.
        </Text>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('LanguageSelect')}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        {/* Aadhaar option — secondary, for ABDM integration later */}
        <TouchableOpacity
          style={styles.aadhaarRow}
          onPress={() => navigation.navigate('AadhaarLogin')}
          activeOpacity={0.75}>
          <AadhaarRowIcon />
          <Text style={styles.aadhaarText}>Continue with Aadhaar</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our{'\n'}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  root: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brandName: { fontSize: 26, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  brandTagline: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  illustrationWrap: { marginVertical: spacing.base },
  title: {
    fontSize: 26, fontWeight: '800', color: colors.textPrimary,
    textAlign: 'center', lineHeight: 34, marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl,
  },
  primaryBtn: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 16,
    alignItems: 'center', marginBottom: spacing.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  aadhaarRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, marginBottom: spacing.xl,
  },
  aadhaarText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  terms: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: '600' },
});