import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, CalendarIcon, ChevronDownIcon, SunriseIcon, SunIcon, MoonIcon, InfoIcon, SearchIcon, CapsuleIcon, HeartRateIcon, TrashIcon} from '../../assets/icons/Icons';
import {MedicineDB} from '../../services/MedicationDatabaseService';
import StatusChip from '../../components/common/StatusChip';

const PERIOD_ICONS  = {morning: SunriseIcon, afternoon: SunIcon, night: MoonIcon};
const PERIOD_COLORS = {
  morning:   {icon: '#3B82F6', bg: '#DBEAFE'},
  afternoon: {icon: '#F59E0B', bg: '#FEF3C7'},
  night:     {icon: '#6C63FF', bg: '#EEE9FF'},
};

// Calculate adherence streak — consecutive days where all scheduled medicines were taken
// Uses today's statuses from the medicines array as a proxy
function calcAdherenceStreak(medicines) {
  // For each medicine, count taken / total for today
  let takenCount = 0;
  let totalCount = 0;
  medicines.forEach(med => {
    med.schedule.forEach(s => {
      totalCount++;
      if (s.status === 'taken') takenCount++;
    });
  });
  if (totalCount === 0) return 0;
  // Mock streak: we count today as complete if >50% taken, then add stored streak
  const todayComplete = takenCount / totalCount >= 0.5;
  return todayComplete ? takenCount : 0;
}

export default function MedicineScheduleScreen({navigation}) {
  const {medicines, updateMedicineStatus} = useApp();
  const [query, setQuery] = useState('');
  const [date] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', weekday: 'long'});
  });

  const filtered = useMemo(() =>
    medicines.filter(m =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase())
    ),
  [medicines, query]);

  // Adherence numbers
  const totalDoses  = medicines.reduce((acc, m) => acc + m.schedule.length, 0);
  const takenDoses  = medicines.reduce((acc, m) => acc + m.schedule.filter(s => s.status === 'taken').length, 0);
  const streak      = calcAdherenceStreak(medicines);
  const pct         = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

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

  const handleDeleteMedicine = (medicine) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to remove "${medicine.name}" from your schedule? This will delete all scheduled doses.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MedicineDB.delete(medicine.id);
              Alert.alert('✓ Deleted', `${medicine.name} has been removed from your schedule.`);
              // Reload medicines via context if available, otherwise navigate back
              if (navigation.canGoBack()) navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medicine. Please try again.');
              console.error('[MedicineSchedule] Delete error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Today's Medicine Schedule</Text>
          <CalendarIcon size={22} color={colors.primary} />
        </View>
        <Text style={styles.subtitle}>Track and mark your medicines as you take them.</Text>

        {/* Adherence Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <Text style={styles.streakNum}>{takenDoses}/{totalDoses}</Text>
            <Text style={styles.streakLabel}>Taken Today</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakNum}>{pct}%</Text>
            <Text style={styles.streakLabel}>Adherence</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <HeartRateIcon size={18} color={colors.warning} />
              <Text style={[styles.streakNum, {color: colors.warning}]}>{streak}</Text>
            </View>
            <Text style={styles.streakLabel}>Doses Streak</Text>
          </View>
        </View>

        {/* Date Selector */}
        <TouchableOpacity style={styles.dateSelector} onPress={() => Alert.alert('Date Picker', 'Date picker coming soon')}>
          <CalendarIcon size={16} color={colors.primary} />
          <Text style={styles.dateText}>{date}</Text>
          <ChevronDownIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchRow}>
          <SearchIcon size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Medicine Cards */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No medicines match "{query}"</Text>
          </View>
        ) : (
          filtered.map(med => (
            <View key={med.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={[styles.medIcon, {backgroundColor: med.bgColor}]}>
                  <CapsuleIcon size={22} color={colors.primary} />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medCat}>{med.category}</Text>
                </View>
                <View style={[styles.qtyChip, {backgroundColor: colors.primaryLight}]}>
                  <Text style={[styles.qtyText, {color: colors.primary}]}>1 {med.type}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMedicine(med)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <TrashIcon size={18} color={colors.error} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.detailBtn} onPress={() => navigation.navigate('AboutMedicine', {medicine: med})}>
                  <Text style={styles.detailBtnText}>Details</Text>
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
          ))
        )}

        <View style={styles.noteCard}>
          <InfoIcon size={16} color={colors.primary} />
          <Text style={styles.noteText}>Tap any timing row to mark a medicine as taken. Staying consistent improves your streak!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     {flex: 1, backgroundColor: colors.background},
  scroll:   {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header:   {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4},
  back:     {padding: 4},
  headerTitle: {flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  subtitle: {fontSize: 13, color: colors.textSecondary, marginBottom: spacing.base},

  // Streak card
  streakCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  streakItem:    {flex: 1, alignItems: 'center', gap: 4},
  streakNum:     {fontSize: 20, fontWeight: '800', color: colors.primary},
  streakNumText: {fontSize: 20, fontWeight: '800'},
  streakLabel:   {fontSize: 11, color: colors.textMuted, textAlign: 'center'},
  streakDivider: {width: 1, height: 36, backgroundColor: colors.border},

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.base, ...shadows.sm,
  },
  searchInput: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  clearBtn:    {fontSize: 13, color: colors.textMuted, fontWeight: '700'},

  empty:     {alignItems: 'center', paddingVertical: spacing['3xl']},
  emptyText: {fontSize: 14, color: colors.textMuted},

  dateSelector: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  dateText:     {flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary},

  medCard:    {backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base},
  medHeader:  {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap'},
  medIcon:    {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medIconText:{fontSize: 20},
  medInfo:    {flex: 1},
  medName:    {fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: 0.1},
  medCat:     {fontSize: 12, color: colors.textSecondary},
  qtyChip:    {paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full},
  qtyText:    {fontSize: 11, fontWeight: '700'},
  deleteBtn:  {padding: 6, borderRadius: radius.xs, backgroundColor: colors.error + '15'},
  detailBtn:  {borderWidth: 1, borderColor: colors.primary, borderRadius: radius.xs, paddingHorizontal: spacing.sm, paddingVertical: 4},
  detailBtnText: {fontSize: 11, color: colors.primary, fontWeight: '600'},

  timingRow:  {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border},
  periodIcon: {width: 32, height: 32, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center'},
  timingInfo: {flex: 1},
  timingTime: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  timingNote: {fontSize: 11, color: colors.textMuted},

  noteCard:   {flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base, alignItems: 'flex-start'},
  noteText:   {flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18},
});
