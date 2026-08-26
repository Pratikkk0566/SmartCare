import React, {useRef, useCallback} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, BackHandler, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

const appLogo = require('../../assets/images/ic_launcher_foreground.png');

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
          onPress={() => navigation.navigate('PhoneLogin')}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
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
    alignItems: 'center', marginBottom: spacing.xl,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  terms: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: '600' },
});