import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, CalendarIcon, ChevronDownIcon, SunriseIcon, SunIcon, MoonIcon, InfoIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

const PERIOD_ICONS = {morning: SunriseIcon, afternoon: SunIcon, night: MoonIcon};
const PERIOD_COLORS = {morning: {icon: '#3B82F6', bg: '#DBEAFE'}, afternoon: {icon: '#F59E0B', bg: '#FEF3C7'}, night: {icon: '#6C63FF', bg: '#EEE9FF'}};

export default function MedicineScheduleScreen({navigation}) {
  const {medicines, updateMedicineStatus} = useApp();
  const [date] = useState(() => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
});

  const handleTimingPress = (medicine, schedItem) => {
    if (schedItem.status === 'taken') {
      Alert.alert('Already Taken', `${medicine.name} has already been marked as taken.`);
      return;
    }
    Alert.alert('Mark Medicine', `${medicine.name} at ${schedItem.time}`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Mark as Taken', onPress: () => updateMedicineStatus(medicine.id, schedItem.period, 'taken')},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Today's Medicine Schedule</Text>
          <CalendarIcon size={22} color={colors.primary} />
        </View>
        <Text style={styles.subtitle}>Track and mark your medicines as you take them.</Text>

        <TouchableOpacity style={styles.dateSelector} onPress={() => Alert.alert('Date Picker', 'Date picker coming soon')}>
          <CalendarIcon size={16} color={colors.primary} />
          <Text style={styles.dateText}>{date}</Text>
          <ChevronDownIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {medicines.map(med => (
          <View key={med.id} style={styles.medCard}>
            <View style={styles.medHeader}>
              <View style={[styles.medIcon, {backgroundColor: med.bgColor}]}>
                <Text style={[styles.medIconText, {color: med.color}]}>💊</Text>
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medCat}>{med.category}</Text>
              </View>
              <View style={[styles.qtyChip, {backgroundColor: colors.primaryLight}]}>
                <Text style={[styles.qtyText, {color: colors.primary}]}>1 {med.type}</Text>
              </View>
              <TouchableOpacity style={styles.detailBtn} onPress={() => navigation.navigate('AboutMedicine', {medicine: med})}>
                <Text style={styles.detailBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
            {med.schedule.map(s => {
              const PeriodIcon = PERIOD_ICONS[s.period] || SunIcon;
              const pc = PERIOD_COLORS[s.period] || PERIOD_COLORS.morning;
              return (
                <TouchableOpacity key={s.period} style={styles.timingRow} onPress={() => handleTimingPress(med, s)} activeOpacity={0.8}>
                  <View style={[styles.periodIcon, {backgroundColor: pc.bg}]}>
                    <PeriodIcon size={16} color={pc.icon} />
                  </View>
                  <View style={styles.timingInfo}>
                    <Text style={styles.timingTime}>{s.time}</Text>
                    <Text style={styles.timingNote}>{s.instruction}</Text>
                  </View>
                  <StatusChip status={s.status} size="xs" />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.noteCard}>
          <InfoIcon size={16} color={colors.primary} />
          <Text style={styles.noteText}>How it works: If a medicine is not marked as taken within 30 minutes of the scheduled time, it will be marked as pending.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4},
  back: {padding: 4},
  headerTitle: {flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  subtitle: {fontSize: 13, color: colors.textSecondary, marginBottom: spacing.base},
  dateSelector: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  dateText: {flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  medCard: {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  medHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap'},
  medIcon: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medIconText: {fontSize: 20},
  medInfo: {flex: 1},
  medName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  medCat: {fontSize: 12, color: colors.textSecondary},
  qtyChip: {paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full},
  qtyText: {fontSize: 11, fontWeight: '700'},
  detailBtn: {borderWidth: 1, borderColor: colors.primary, borderRadius: radius.xs, paddingHorizontal: spacing.sm, paddingVertical: 4},
  detailBtnText: {fontSize: 11, color: colors.primary, fontWeight: '600'},
  timingRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border},
  periodIcon: {width: 32, height: 32, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center'},
  timingInfo: {flex: 1},
  timingTime: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  timingNote: {fontSize: 11, color: colors.textMuted},
  noteCard: {flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base, alignItems: 'flex-start'},
  noteText: {flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18},
});
