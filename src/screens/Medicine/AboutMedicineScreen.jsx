import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {ArrowBackIcon, FlaskIcon, ShieldIcon, CalendarIcon, BellIcon, DocumentIcon, LockIcon, SunriseIcon, SunIcon, MoonIcon, CapsuleIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

export default function AboutMedicineScreen({navigation, route}) {
  const medicine = route.params?.medicine || {};

  const handleRestock = () => navigation.navigate('RestockMedicine');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Medicine</Text>
        </View>

        {/* Medicine Header Card */}
        <View style={styles.medCard}>
          <View style={[styles.medIcon, {backgroundColor: medicine.bgColor || colors.primaryLight}]}>
            <CapsuleIcon size={28} color={colors.primary} />
          </View>
          <View style={styles.medDetails}>
            <Text style={styles.medName}>{medicine.name}</Text>
            <Text style={styles.medType}>{medicine.type}</Text>
            <StatusChip status={medicine.stock === 'in' ? 'In Stock' : 'Out of Stock'} size="xs" />
          </View>
          <TouchableOpacity style={styles.restockBtn} onPress={handleRestock}>
            <BellIcon size={14} color={colors.primary} />
            <Text style={styles.restockBtnText}>Restock</Text>
          </TouchableOpacity>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <FlaskIcon size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Uses</Text>
            <Text style={styles.infoValue}>{medicine.uses}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <ShieldIcon size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Strength</Text>
            <Text style={styles.infoValue}>{medicine.strength}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <CalendarIcon size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{medicine.duration}</Text>
          </View>
        </View>

        {/* How to Take */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How to take</Text>
          <Text style={styles.howSub}>Take 1 {medicine.type?.toLowerCase()} 3 times a day after food</Text>
          <View style={styles.timelineRow}>
            {(medicine.schedule || []).map((s, i) => {
              const icons = {morning: SunriseIcon, afternoon: SunIcon, night: MoonIcon};
              const bgs = {morning: '#DBEAFE', afternoon: '#FEF3C7', night: '#EEE9FF'};
              const ics = {morning: '#3B82F6', afternoon: '#F59E0B', night: '#6C63FF'};
              const Icon = icons[s.period] || SunIcon;
              return (
                <View key={s.period} style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, {backgroundColor: bgs[s.period] || '#F3F4F6'}]}>
                    <Icon size={18} color={ics[s.period] || colors.primary} />
                  </View>
                  <Text style={styles.timelinePeriod}>{s.period.charAt(0).toUpperCase() + s.period.slice(1)}</Text>
                  <Text style={styles.timelineTime}>{s.time}</Text>
                  <Text style={styles.timelineNote}>{s.instruction}</Text>
                  <View style={[styles.greenChip]}>
                    <Text style={styles.greenChipText}>{s.dose}</Text>
                  </View>
                  {i < (medicine.schedule?.length || 1) - 1 && <View style={styles.connector} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Important Note */}
        {medicine.importantNote && (
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <DocumentIcon size={18} color={colors.primary} />
              <Text style={styles.noteTitle}>Important Note</Text>
            </View>
            <Text style={styles.noteBullet}>• {medicine.importantNote}</Text>
            <Text style={styles.noteBullet}>• Consult your doctor if side effects occur.</Text>
          </View>
        )}

        {/* Restock Banner */}
        <View style={styles.restockBanner}>
          <BellIcon size={32} color={colors.primary} />
          <Text style={styles.restockBannerTitle}>Medicine Out of Stock?</Text>
          <Text style={styles.restockBannerSub}>Get notified when {medicine.name} is available again.</Text>
          <TouchableOpacity style={styles.restockFillBtn} onPress={handleRestock}>
            <Text style={styles.restockFillText}>Restock Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LockIcon size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>Your health information is secure and private.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  medCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, ...shadows.md, marginBottom: spacing.base, gap: spacing.md},
  medIcon: {width: 56, height: 56, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medEmoji: {fontSize: 26},
  medDetails: {flex: 1, gap: 4},
  medName: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  medType: {fontSize: 13, color: colors.textSecondary},
  restockBtn: {flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6},
  restockBtnText: {fontSize: 12, color: colors.primary, fontWeight: '700'},
  infoGrid: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  infoItem: {flex: 1, alignItems: 'center', gap: 4},
  infoDivider: {width: 1, backgroundColor: colors.border},
  infoLabel: {fontSize: 11, fontWeight: '700', color: colors.primary},
  infoValue: {fontSize: 12, color: colors.textPrimary, textAlign: 'center'},
  howCard: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  howTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  howSub: {fontSize: 13, color: colors.textSecondary, marginBottom: spacing.base},
  timelineRow: {flexDirection: 'row', gap: spacing.sm},
  timelineItem: {flex: 1, alignItems: 'center', gap: 4, position: 'relative'},
  timelineIcon: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  timelinePeriod: {fontSize: 12, fontWeight: '700', color: colors.textPrimary},
  timelineTime: {fontSize: 11, color: colors.textSecondary},
  timelineNote: {fontSize: 10, color: colors.textMuted},
  greenChip: {backgroundColor: colors.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full},
  greenChipText: {fontSize: 10, color: colors.success, fontWeight: '600'},
  connector: {position: 'absolute', right: -spacing.sm / 2, top: 20, width: spacing.sm, height: 1, backgroundColor: colors.border},
  noteCard: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  noteHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm},
  noteTitle: {fontSize: 14, fontWeight: '700', color: colors.primary},
  noteBullet: {fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 4},
  restockBanner: {backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.base, gap: spacing.sm},
  restockBannerTitle: {fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  restockBannerSub: {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
  restockFillBtn: {backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm},
  restockFillText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  footer: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.sm},
  footerText: {fontSize: 12, color: colors.textMuted},
});
