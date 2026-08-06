import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {PhoneIcon, PersonIcon} from '../../assets/icons/Icons';

const appLogo = require('../../assets/images/ic_launcher_foreground.png');

function AadhaarOptionIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 60 60" fill="none">
      <Path
        d="M30 50 C17 50 8 41 8 30 C8 19 17 10 30 10 C43 10 52 19 52 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M30 43 C21 43 15 37 15 30 C15 23 21 17 30 17 C39 17 45 23 45 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M30 36 C25.5 36 22 33 22 30 C22 27 25.5 24 30 24 C34.5 24 38 27 38 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Circle cx="30" cy="30" r="3.5" fill="#D97706" />
    </Svg>
  );
}

const OPTIONS = [
  {
    key: 'phone',
    label: 'Login with Phone Number',
    sub: 'Login using your mobile number',
    iconBg: colors.primaryLight,
    render: () => <PhoneIcon size={20} color={colors.primary} />,
    route: 'PhoneNumberEntry',
  },
  {
    key: 'aadhaar',
    label: 'Login with Aadhaar',
    sub: 'Login using your Aadhaar number',
    iconBg: '#FEF3C7',
    render: () => <AadhaarOptionIcon />,
    route: 'AadhaarLogin',
  },
  {
    key: 'register',
    label: 'Create Account',
    sub: 'Sign up by creating a new account',
    iconBg: colors.primaryLight,
    render: () => <PersonIcon size={20} color={colors.primary} />,
    route: 'Register',
  },
];

export default function PhoneLoginScreen({navigation}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primaryLight} />

      <View style={styles.root}>

        {/* SmartCare Logo */}
        <View style={styles.logoRow}>
          <Image source={appLogo} style={styles.logoImg} />
          <Text style={styles.appName}>SmartCare PHR</Text>
          <Text style={styles.appTagline}>Your Health, Our Priority</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome!</Text>
        <Text style={styles.subheading}>Please choose how you want to{'\n'}continue</Text>

        {/* Option Cards */}
        <View style={styles.options}>
          {OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={styles.card}
              onPress={() => navigation.navigate(opt.route)}
              activeOpacity={0.75}>
              <View style={[styles.iconCircle, {backgroundColor: opt.iconBg}]}>
                {opt.render()}
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{opt.label}</Text>
                <Text style={styles.cardSub}>{opt.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          {'By continuing, you agree to our\n'}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {'  and  '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  // Logo
  logoRow: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImg: {width: 260, height: 260, marginBottom: -20},
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  appTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Headings
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },

  // Options
  options: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    ...shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {flex: 1},
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  // Terms
  terms: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});