import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {diagnosticCenters} from '../../data/mockData';
import {ArrowBackIcon, StarIcon, PinIcon, ClockIcon, HomeDeliveryIcon, CheckCircleIcon, HospitalBuildingIcon, BloodDropIcon, FlaskIcon, LungsIcon, HeartRateIcon, StarFilledIcon, SyringeIcon, CapsuleIcon, SunIcon, StethoscopeIcon, BeakerIcon, MicroscopeIcon, HospitalIcon} from '../../assets/icons/Icons';

// Maps iconKey strings from mockData to actual icon components
const ICON_MAP = {
  HospitalBuildingIcon, BloodDropIcon, FlaskIcon, LungsIcon,
  HeartRateIcon, StarFilledIcon, SyringeIcon, CapsuleIcon,
  SunIcon, StethoscopeIcon, BeakerIcon, MicroscopeIcon, HospitalIcon,
};
function TestIcon({iconKey, size, color}) {
  const Comp = ICON_MAP[iconKey] || FlaskIcon;
  return <Comp size={size} color={color} />;
}

function StepBar({current}) {
  const steps = ['Select Test', 'Hospital', 'Date & Time', 'Confirmed'];
  return (
    <View style={sb.row}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <View style={sb.stepWrap}>
              <View style={[sb.circle, active && sb.circleActive, done && sb.circleDone]}>
                <Text style={[sb.num, (active || done) && sb.numActive]}>{done ? '✓' : n}</Text>
              </View>
              <Text style={[sb.label, active && sb.labelActive]} numberOfLines={1}>{label}</Text>
            </View>
            {i < steps.length - 1 && <View style={[sb.line, done && sb.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  stepWrap: {alignItems: 'center', width: 56},
  circle: {width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 3},
  circleActive: {borderColor: colors.primary, backgroundColor: colors.primary},
  circleDone: {borderColor: colors.success, backgroundColor: colors.success},
  num: {fontSize: 10, fontWeight: '800', color: colors.textMuted},
  numActive: {color: '#fff'},
  label: {fontSize: 9, color: colors.textMuted, fontWeight: '500', textAlign: 'center'},
  labelActive: {color: colors.primary, fontWeight: '700'},
  line: {flex: 1, height: 2, backgroundColor: colors.border, marginTop: 11},
  lineDone: {backgroundColor: colors.success},
});

export default function SelectHospitalScreen({navigation, route}) {
  const {test} = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StepBar current={2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Hospital / Lab</Text>
      </View>

      {/* Selected Test Summary */}
      <View style={styles.testSummary}>
        <View style={[styles.testEmojiBg, {backgroundColor: test.bg}]}>
          <TestIcon iconKey={test.iconKey} size={22} color={test.color} />
        </View>
        <View style={styles.testSummaryInfo}>
          <Text style={styles.testSummaryName}>{test.name}</Text>
          <Text style={styles.testSummaryMeta}>{test.sampleType} · {test.reportTime}</Text>
        </View>
        <Text style={styles.testSummaryPrice}>₹{test.price}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>
          {diagnosticCenters.length} centres available near you
        </Text>

        {diagnosticCenters.map(centre => (
          <View key={centre.id} style={styles.centreCard}>
            {/* Centre Header */}
            <View style={styles.centreHeader}>
              <View style={styles.centreLogo}>
                <TestIcon iconKey={centre.logoKey} size={28} color={centre.logoColor || '#6C63FF'} />
              </View>
              <View style={styles.centreInfo}>
                <Text style={styles.centreName}>{centre.name}</Text>
                <View style={styles.ratingRow}>
                  <StarIcon size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{centre.rating} ({centre.reviews.toLocaleString('en-IN')} reviews)</Text>
                </View>
                <View style={styles.metaRow}>
                  <PinIcon size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{centre.distance}</Text>
                </View>
              </View>
              <Text style={styles.centrePrice}>₹{test.price}</Text>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <PinIcon size={13} color={colors.primary} />
              <Text style={styles.addressText}>{centre.address}</Text>
            </View>

            {/* Badges */}
            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <ClockIcon size={12} color={colors.info} />
                <Text style={styles.badgeText}>{centre.nextSlot}</Text>
              </View>
              <View style={styles.badge}>
                <ClockIcon size={12} color={colors.textMuted} />
                <Text style={styles.badgeText}>{centre.openHours}</Text>
              </View>
              {centre.homeCollection && (
                <View style={[styles.badge, styles.badgeGreen]}>
                  <HomeDeliveryIcon size={12} color={colors.success} />
                  <Text style={[styles.badgeText, {color: colors.success}]}>
                    Home Collection {centre.homeCollectionCharge > 0 ? `+₹${centre.homeCollectionCharge}` : '· Free'}
                  </Text>
                </View>
              )}
            </View>

            {/* Select Button */}
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => navigation.navigate('SelectDateTime', {test, centre})}
              activeOpacity={0.85}>
              <CheckCircleIcon size={16} color="#fff" />
              <Text style={styles.selectBtnText}>Select this Centre</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm},
  back: {padding: 4},
  headerTitle: {fontSize: 17, fontWeight: '700', color: colors.textPrimary},
  testSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  testEmojiBg: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  testSummaryInfo: {flex: 1},
  testSummaryName: {fontSize: 13, fontWeight: '700', color: colors.primary},
  testSummaryMeta: {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  testSummaryPrice: {fontSize: 16, fontWeight: '800', color: colors.primary},
  scroll: {padding: spacing.base, paddingBottom: 32},
  sectionLabel: {fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md},
  centreCard: {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.md, marginBottom: spacing.md},
  centreHeader: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md},
  centreLogo: {width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border},
  centreInfo: {flex: 1},
  centreName: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3},
  ratingRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3},
  ratingText: {fontSize: 12, color: colors.textSecondary, fontWeight: '500'},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  metaText: {fontSize: 12, color: colors.textSecondary},
  centrePrice: {fontSize: 18, fontWeight: '800', color: colors.primary},
  addressRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm},
  addressText: {fontSize: 12, color: colors.textPrimary, flex: 1, lineHeight: 17},
  badgesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md},
  badge: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full},
  badgeGreen: {backgroundColor: colors.successLight},
  badgeText: {fontSize: 11, color: colors.textSecondary, fontWeight: '500'},
  selectBtn: {backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.sm},
  selectBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
});