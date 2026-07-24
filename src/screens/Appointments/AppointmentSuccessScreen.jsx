import React, {useEffect, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {doctors} from '../../data/mockData';

const VISIT_META = {
  clinic: {label: 'In-Clinic Visit', emoji: '🏥'},
  video:  {label: 'Video Consult',   emoji: '📹'},
  audio:  {label: 'Audio Call',      emoji: '📞'},
};

export default function AppointmentSuccessScreen({navigation, route}) {
  const {doctorId, date, time, visitType, fee} = route.params;
  const d  = doctors.find(doc => doc.id === doctorId);
  const vm = VISIT_META[visitType] || VISIT_META.clinic;

  // ── Animations ──────────────────────────────────────────────────────────────
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0, duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  if (!d) return null;

  const initials = d.name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = (d.name.charCodeAt(4) * 37) % 360;

  // Prevent back navigation (booking is done)
  const handleGoHome = () => {
    navigation.reset({index: 0, routes: [{name: 'MainTabs'}]});
  };

  const handleViewAppointments = () => {
    navigation.reset({index: 1, routes: [{name: 'MainTabs'}, {name: 'Appointments'}]});
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Success icon ── */}
        <View style={s.heroSection}>
          <Animated.View style={[s.checkCircle, {transform: [{scale: scaleAnim}]}]}>
            <Text style={s.checkEmoji}>✓</Text>
          </Animated.View>

          <Animated.View style={{opacity: opacityAnim, transform: [{translateY: slideAnim}]}}>
            <Text style={s.heroTitle}>Appointment Confirmed!</Text>
            <Text style={s.heroSub}>
              Your booking is confirmed. You'll receive a reminder before your appointment.
            </Text>
          </Animated.View>
        </View>

        {/* ── Booking reference ── */}
        <Animated.View style={[s.refCard, {opacity: opacityAnim, transform: [{translateY: slideAnim}]}]}>
          <Text style={s.refLabel}>Booking Reference</Text>
          <Text style={s.refCode}>SMC-{Date.now().toString().slice(-6).toUpperCase()}</Text>
        </Animated.View>

        {/* ── Doctor info ── */}
        <Animated.View style={[s.docCard, {opacity: opacityAnim, transform: [{translateY: slideAnim}]}]}>
          <View style={[s.docAvatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
            <Text style={[s.docAvatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
          </View>
          <View style={s.docInfo}>
            <Text style={s.docName}>{d.name}</Text>
            <Text style={s.docSpec}>{d.specialty}</Text>
            <Text style={s.docClinic}>📍 {visitType === 'clinic' ? d.clinic : 'Online'}</Text>
          </View>
        </Animated.View>

        {/* ── Appointment summary ── */}
        <Animated.View style={[s.summaryCard, {opacity: opacityAnim, transform: [{translateY: slideAnim}]}]}>
          <Text style={s.summaryTitle}>Appointment Summary</Text>

          <SummaryRow emoji="📅" label="Date"        value={date} />
          <SummaryDivider />
          <SummaryRow emoji="🕐" label="Time"        value={time} />
          <SummaryDivider />
          <SummaryRow emoji={vm.emoji} label="Visit Type" value={vm.label} />
          <SummaryDivider />
          <SummaryRow emoji="💳" label="Amount Paid" value={`₹${fee}`} highlight />
        </Animated.View>

        {/* ── What's next ── */}
        <Animated.View style={[s.nextCard, {opacity: opacityAnim, transform: [{translateY: slideAnim}]}]}>
          <Text style={s.nextTitle}>What happens next?</Text>
          <NextStep number="1" text="You'll receive a confirmation message on your registered number." />
          <NextStep number="2" text={`Arrive at ${d.clinic} 10 minutes before your appointment time.`} />
          <NextStep number="3" text="Bring your SmartCare health card or show the booking reference." />
        </Animated.View>

        {/* ── Actions ── */}
        <Animated.View style={[s.actions, {opacity: opacityAnim}]}>
          <TouchableOpacity style={s.primaryBtn} onPress={handleViewAppointments} activeOpacity={0.88}>
            <Text style={s.primaryBtnText}>View My Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={handleGoHome} activeOpacity={0.8}>
            <Text style={s.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({emoji, label, value, highlight}) {
  return (
    <View style={sr.row}>
      <Text style={sr.emoji}>{emoji}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={[sr.value, highlight && {color: colors.primary, fontSize: 15}]}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row:   {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, gap: spacing.sm},
  emoji: {fontSize: 16, width: 24},
  label: {flex: 1, fontSize: 13, color: colors.textSecondary},
  value: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
});

function SummaryDivider() {
  return <View style={{height: 1, backgroundColor: colors.border}} />;
}

function NextStep({number, text}) {
  return (
    <View style={ns.row}>
      <View style={ns.numberBadge}>
        <Text style={ns.number}>{number}</Text>
      </View>
      <Text style={ns.text}>{text}</Text>
    </View>
  );
}
const ns = StyleSheet.create({
  row:         {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.md},
  numberBadge: {width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2},
  number:      {fontSize: 12, fontWeight: '800', color: colors.primary},
  text:        {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20},
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl']},

  heroSection: {alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.lg},
  checkCircle: {width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.lg},
  checkEmoji:  {fontSize: 42, color: '#fff'},
  heroTitle:   {fontSize: 24, fontWeight: '900', color: colors.textPrimary, textAlign: 'center'},
  heroSub:     {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: spacing.sm, paddingHorizontal: spacing.base},

  refCard:  {backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.base, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.primary + '30'},
  refLabel: {fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6},
  refCode:  {fontSize: 22, fontWeight: '900', color: colors.primary, letterSpacing: 2},

  docCard:       {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, marginBottom: spacing.md, gap: spacing.md},
  docAvatar:     {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  docAvatarText: {fontSize: 18, fontWeight: '900'},
  docInfo:       {flex: 1, gap: 3},
  docName:       {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  docSpec:       {fontSize: 12, color: colors.textSecondary},
  docClinic:     {fontSize: 11, color: colors.textMuted},

  summaryCard:  {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, marginBottom: spacing.md},
  summaryTitle: {fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm},

  nextCard:  {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, marginBottom: spacing.md},
  nextTitle: {fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.md},

  actions:          {gap: spacing.sm, marginTop: spacing.sm},
  primaryBtn:       {backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.base + 2, alignItems: 'center'},
  primaryBtnText:   {color: '#fff', fontSize: 15, fontWeight: '800'},
  secondaryBtn:     {borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.base, alignItems: 'center'},
  secondaryBtnText: {color: colors.primary, fontSize: 15, fontWeight: '700'},
});
