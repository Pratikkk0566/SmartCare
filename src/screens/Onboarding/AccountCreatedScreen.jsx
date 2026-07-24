import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { PersonIcon, PhoneIcon, MailIcon, BloodDropIcon } from '../../assets/icons/Icons';
import { useApp } from '../../context/AppContext';

// Static confetti dots scattered around screen
const CONFETTI = [
  { x: '8%',  y: '6%',  size: 10, color: '#FF6B6B' },
  { x: '18%', y: '12%', size: 7,  color: '#4ECDC4' },
  { x: '75%', y: '5%',  size: 9,  color: '#FFE66D' },
  { x: '88%', y: '14%', size: 6,  color: '#A8E6CF' },
  { x: '92%', y: '8%',  size: 8,  color: '#6C63FF' },
  { x: '5%',  y: '20%', size: 6,  color: '#FF8B94' },
  { x: '80%', y: '22%', size: 7,  color: '#45B7D1' },
  { x: '12%', y: '32%', size: 5,  color: '#FFD93D' },
  { x: '85%', y: '35%', size: 6,  color: '#6BCB77' },
  { x: '3%',  y: '45%', size: 8,  color: '#4D96FF' },
  { x: '93%', y: '50%', size: 5,  color: '#FF6B6B' },
  { x: '88%', y: '60%', size: 7,  color: '#FFE66D' },
];

function DetailRow({ Icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function AccountCreatedScreen({ navigation, route }) {
  const { userData } = route.params || {};
  const { userProfile } = useApp();
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
  }, [scale]);

  const name  = userData ? `${userData.firstName} ${userData.lastName}`.trim() : `${userProfile.firstName} ${userProfile.lastName}`.trim();
  const phone = userData?.phone ? `+91 ${userData.phone}` : userProfile.phone || '—';
  const email = userData?.email || userProfile.email || '—';
  const blood = userData?.bloodGroup || userProfile.bloodGroup || '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {CONFETTI.map((dot, i) => (
        <View key={i} style={[styles.dot, {
          left: dot.x, top: dot.y,
          width: dot.size, height: dot.size,
          borderRadius: dot.size / 2,
          backgroundColor: dot.color,
        }]} />
      ))}

      <View style={styles.body}>
        {/* Animated green checkmark */}
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <Svg width={50} height={50} viewBox="0 0 24 24" fill="none">
            <Polyline points="5,12 10,17 19,7" stroke="white" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>

        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Your account has been created{'\n'}successfully.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Details</Text>
          <DetailRow Icon={PersonIcon}    label="Name"         value={name}  />
          <View style={styles.sep} />
          <DetailRow Icon={PhoneIcon}     label="Mobile"       value={phone} />
          <View style={styles.sep} />
          <DetailRow Icon={MailIcon}      label="Email"        value={email} />
          <View style={styles.sep} />
          <DetailRow Icon={BloodDropIcon} label="Blood Group"  value={blood} />
        </View>

        <TouchableOpacity style={styles.btn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          activeOpacity={0.85}>
          <Text style={styles.btnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  dot: { position: 'absolute' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, justifyContent: 'center', paddingBottom: spacing.xl },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
    shadowColor: colors.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.xl },
  card: {
    width: '100%', backgroundColor: colors.background,
    borderRadius: radius.xl, padding: spacing.base, marginBottom: spacing.xl,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.base },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  detailIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 1 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 34 + spacing.md },
  btn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});