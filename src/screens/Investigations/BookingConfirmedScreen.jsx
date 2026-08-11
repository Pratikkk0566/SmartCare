import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  CheckCircleIcon, CalendarIcon, ClockIcon,
  PinIcon, HomeDeliveryIcon, FlaskIcon, InfoIcon, HomeIcon,
  LungsIcon, HeartRateIcon, BloodDropIcon, StarFilledIcon,
  SyringeIcon, CapsuleIcon, SunIcon, StethoscopeIcon,
  BeakerIcon, HospitalBuildingIcon,
} from '../../assets/icons/Icons';

// Maps iconKey strings stored in booking data to actual icon components
const ICON_MAP = {
  HospitalBuildingIcon, BloodDropIcon, FlaskIcon, LungsIcon,
  HeartRateIcon, StarFilledIcon, SyringeIcon, CapsuleIcon,
  SunIcon, StethoscopeIcon, BeakerIcon,
};
function TestIcon({iconKey, size, color}) {
  const Comp = ICON_MAP[iconKey] || FlaskIcon;
  return <Comp size={size} color={color} />;
}

// ─── Step Bar (all done) ──────────────────────────────────────────────────────
function StepBar() {
  const steps = ['Select Test', 'Hospital', 'Date & Time', 'Confirmed'];
  return (
    <View style={sb.row}>
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <View style={sb.stepWrap}>
            <View style={sb.circleDone}>
              <Text style={sb.tick}>✓</Text>
            </View>
            <Text style={sb.label} numberOfLines={1}>{label}</Text>
          </View>
          {i < steps.length - 1 && <View style={sb.line} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stepWrap: {alignItems: 'center', width: 56},
  circleDone: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 3,
  },
  tick:  {color: '#fff', fontSize: 10, fontWeight: '800'},
  label: {fontSize: 9, color: colors.success, fontWeight: '700', textAlign: 'center'},
  line:  {flex: 1, height: 2, backgroundColor: colors.success, marginTop: 11},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingConfirmedScreen({navigation, route}) {
  const {booking} = route.params;
  const isHome = booking.collectionType === 'home';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StepBar />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Success Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <CheckCircleIcon size={64} color={colors.success} />
          </View>
          <Text style={styles.heroTitle}>Booking Confirmed!</Text>
          <Text style={styles.heroSub}>
            Your test has been booked and automatically approved.
          </Text>
          <View style={styles.approvedBadge}>
            <CheckCircleIcon size={14} color={colors.success} />
            <Text style={styles.approvedText}>Auto-Approved</Text>
          </View>
          <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
        </View>

        {/* ── Booking Details ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>

          {/* Test row */}
          <View style={styles.detailRow}>
            <View style={[styles.detailEmojiBg, {backgroundColor: booking.testBg || colors.primaryLight}]}>
              <TestIcon iconKey={booking.testIconKey} size={24} color={booking.testColor || colors.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Test</Text>
              <Text style={styles.detailValue}>{booking.testName}</Text>
            </View>
            <Text style={styles.detailPrice}>₹{booking.testPrice}</Text>
          </View>

          <View style={styles.divider} />

          {/* Date */}
          <View style={styles.detailItem}>
            <CalendarIcon size={16} color={colors.primary} />
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{booking.date}</Text>
            </View>
          </View>

          {/* Time */}
          <View style={styles.detailItem}>
            <ClockIcon size={16} color={colors.primary} />
            <View>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{booking.time}</Text>
            </View>
          </View>

          {/* Hospital */}
          <View style={styles.detailItem}>
            <PinIcon size={16} color={colors.primary} />
            <View style={styles.detailItemFlex}>
              <Text style={styles.detailLabel}>Hospital / Lab</Text>
              <Text style={styles.detailValue}>{booking.hospitalName}</Text>
              <Text style={styles.detailAddr}>{booking.hospitalAddress}</Text>
            </View>
          </View>

          {/* Collection method */}
          <View style={styles.detailItem}>
            {isHome
              ? <HomeDeliveryIcon size={16} color={colors.primary} />
              : <PinIcon size={16} color={colors.primary} />}
            <View>
              <Text style={styles.detailLabel}>Collection Method</Text>
              <Text style={styles.detailValue}>
                {isHome ? 'Home Collection' : 'Visit Hospital'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Sample to be Collected ── */}
        <View style={[styles.card, styles.sampleCard]}>
          <View style={styles.cardHeader}>
            <FlaskIcon size={20} color={colors.info} />
            <Text style={styles.cardTitle}>Sample to be Collected</Text>
          </View>

          <View style={styles.sampleTypeRow}>
            <Text style={styles.sampleTypeLabel}>Sample Type</Text>
            <View style={styles.sampleTypeBadge}>
              <Text style={styles.sampleTypeBadgeText}>{booking.sampleType}</Text>
            </View>
          </View>

          <Text style={styles.sampleInstructions}>{booking.sampleInstructions}</Text>

          {/* Visit hospital address box */}
          {isHome ? (
            <View style={styles.infoBox}>
              <HomeDeliveryIcon size={16} color={colors.info} />
              <Text style={styles.infoBoxText}>
                Our trained technician will visit your registered address at your selected time.
                Keep your address and contact details updated in your profile.
              </Text>
            </View>
          ) : (
            <View style={styles.infoBox}>
              <PinIcon size={16} color={colors.primary} />
              <View style={styles.infoBoxInner}>
                <Text style={styles.infoBoxTitle}>Where to Collect Sample</Text>
                <Text style={styles.infoBoxValue}>{booking.hospitalName}</Text>
                <Text style={styles.infoBoxAddr}>{booking.hospitalAddress}</Text>
                <Text style={styles.infoBoxTime}>
                  Arrive by {booking.time} on {booking.date}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Preparation Instructions ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <InfoIcon size={18} color={colors.warning} />
            <Text style={styles.cardTitle}>Preparation Instructions</Text>
          </View>
          <Text style={styles.prepText}>{booking.preparation}</Text>
          <View style={styles.reportTimeRow}>
            <ClockIcon size={14} color={colors.textMuted} />
            <Text style={styles.reportTimeText}>
              Report expected: {booking.reportTime}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Investigations')}
          activeOpacity={0.85}>
          <FlaskIcon size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>View My Test Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.reset({index: 0, routes: [{name: 'MainTabs'}]})}
          activeOpacity={0.8}>
          <HomeIcon size={18} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>Go to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingBottom: 40},

  // Hero
  hero: {alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.base},
  heroIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base, ...shadows.md,
  },
  heroTitle: {fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8},
  heroSub: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  approvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, marginBottom: spacing.sm,
  },
  approvedText: {fontSize: 13, fontWeight: '700', color: colors.success},
  bookingId: {fontSize: 12, color: colors.textMuted},

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.base, ...shadows.sm, marginBottom: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.md,
  },
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  divider:   {height: 1, backgroundColor: colors.border, marginVertical: spacing.md},

  sampleCard: {borderWidth: 1.5, borderColor: colors.info + '50'},

  // Detail rows
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  detailEmojiBg: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  detailInfo:  {flex: 1},
  detailPrice: {fontSize: 18, fontWeight: '800', color: colors.primary},

  detailItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, marginTop: spacing.md,
  },
  detailItemFlex: {flex: 1},
  detailLabel: {
    fontSize: 10, color: colors.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  detailValue: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  detailAddr:  {fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17},

  // Sample section
  sampleTypeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  sampleTypeLabel: {fontSize: 13, color: colors.textSecondary, fontWeight: '600'},
  sampleTypeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full,
  },
  sampleTypeBadgeText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  sampleInstructions: {
    fontSize: 13, color: colors.textPrimary, lineHeight: 20, marginBottom: spacing.md,
  },

  // Info box (address / home collection)
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md,
    padding: spacing.md,
  },
  infoBoxInner:  {flex: 1},
  infoBoxText:   {fontSize: 12, color: colors.textSecondary, lineHeight: 18, flex: 1},
  infoBoxTitle:  {fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 2},
  infoBoxValue:  {fontSize: 13, fontWeight: '600', color: colors.textPrimary},
  infoBoxAddr:   {fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2},
  infoBoxTime:   {fontSize: 12, fontWeight: '600', color: colors.primary, marginTop: 4},

  // Prep
  prepText: {fontSize: 13, color: colors.textPrimary, lineHeight: 20, marginBottom: spacing.sm},
  reportTimeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  reportTimeText: {fontSize: 12, color: colors.textMuted},

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, ...shadows.md, marginBottom: spacing.sm,
  },
  primaryBtnText: {color: '#fff', fontWeight: '800', fontSize: 15},

  secondaryBtn: {
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryBtnText: {color: colors.primary, fontWeight: '700', fontSize: 15},
});