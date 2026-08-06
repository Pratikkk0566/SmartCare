import React, {useRef, useCallback} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, BackHandler, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

const appLogo = require('../../assets/images/ic_launcher_foreground.png');

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
  const backPressedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (backPressedOnce.current) {
          BackHandler.exitApp();
          return true;
        }
        backPressedOnce.current = true;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        setTimeout(() => { backPressedOnce.current = false; }, 2000);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.root}>

        {/* Logo */}
        <Image source={appLogo} style={styles.logoImg} />
        <Text style={styles.brandName}>SmartCare PHR</Text>
        <Text style={styles.brandTagline}>Your Health, Our Priority</Text>

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
  logoImg: { width: 260, height: 260, marginBottom: -20 },
  brandName: { fontSize: 26, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  brandTagline: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
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