import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon,
  CalendarIcon,
  SunriseIcon,
  SunIcon,
  MoonIcon,
  CapsuleIcon,
  HeartRateIcon,
  CheckCircleIcon,
} from '../../assets/icons/Icons';
import {ScheduledDoseDB, MedicineDB} from '../../services/MedicationDatabaseService';
import MedicationScheduleService from '../../services/MedicationScheduleService';

const PERIOD_ICONS = {morning: SunriseIcon, afternoon: SunIcon, evening: SunIcon, night: MoonIcon};
const PERIOD_COLORS = {
  morning: {icon: '#3B82F6', bg: '#DBEAFE'},
  afternoon: {icon: '#F59E0B', bg: '#FEF3C7'},
  evening: {icon: '#F97316', bg: '#FFEDD5'},
  night: {icon: '#6C63FF', bg: '#EEE9FF'},
};

export default function NewMedicineScheduleScreen({navigation}) {
  const [todayDoses, setTodayDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      weekday: 'long',
    });
  });

  useFocusEffect(
    useCallback(() => {
      loadTodaySchedule();
    }, [])
  );

  const loadTodaySchedule = async () => {
    try {
      // Update dose statuses first
      await MedicationScheduleService.updateDoseStatuses();

      // Get today's schedule with medicine details
      const schedule = await MedicationScheduleService.getTodayScheduleWithDetails();
      setTodayDoses(schedule);
    } catch (error) {
      console.error('[MedicineSchedule] Load error:', error);
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTodaySchedule();
  };

  const handleDosePress = async (dose) => {
    if (dose.status === 'taken') {
      Alert.alert('Already Taken', `${dose.medicine.name} has already been marked as taken.`);
      return;
    }

    Alert.alert(
      'Mark Medicine',
      `${dose.medicine.name} at ${dose.scheduledTime}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => markDoseSkipped(dose),
        },
        {
          text: 'Mark as Taken',
          onPress: () => markDoseTaken(dose),
        },
      ]
    );
  };

  const markDoseTaken = async (dose) => {
    try {
      await ScheduledDoseDB.markTaken(dose.id);
      Alert.alert('✓ Taken', `${dose.medicine.name} marked as taken`);
      loadTodaySchedule();
    } catch (error) {
      console.error('[MedicineSchedule] Mark taken error:', error);
      Alert.alert('Error', 'Failed to mark as taken');
    }
  };

  const markDoseSkipped = async (dose) => {
    try {
      await ScheduledDoseDB.markSkipped(dose.id);
      Alert.alert('Skipped', `${dose.medicine.name} marked as skipped`);
      loadTodaySchedule();
    } catch (error) {
      console.error('[MedicineSchedule] Mark skipped error:', error);
      Alert.alert('Error', 'Failed to mark as skipped');
    }
  };

  // Calculate adherence
  const totalDoses = todayDoses.length;
  const takenDoses = todayDoses.filter(d => d.status === 'taken').length;
  const missedDoses = todayDoses.filter(d => d.status === 'missed').length;
  const pct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  // Group doses by period
  const dosesByPeriod = todayDoses.reduce((acc, dose) => {
    const time = dose.scheduledTime;
    let period = 'morning';

    if (time.includes('AM')) {
      period = 'morning';
    } else if (time.includes('PM')) {
      const hour = parseInt(time.split(':')[0]);
      if (hour >= 12 && hour < 5) period = 'afternoon';
      else if (hour >= 5 && hour < 8) period = 'evening';
      else period = 'night';
    }

    if (!acc[period]) acc[period] = [];
    acc[period].push(dose);
    return acc;
  }, {});

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Today's Schedule</Text>
          <CalendarIcon size={22} color={colors.primary} />
        </View>
        <Text style={styles.subtitle}>Track and mark your medicines as you take them.</Text>

        {/* Adherence Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <Text style={styles.streakNum}>
              {takenDoses}/{totalDoses}
            </Text>
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
              <HeartRateIcon size={18} color={missedDoses > 0 ? colors.error : colors.success || colors.primary} />
              <Text style={[styles.streakNum, {color: missedDoses > 0 ? colors.error : colors.success || colors.primary}]}>
                {missedDoses}
              </Text>
            </View>
            <Text style={styles.streakLabel}>Missed</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.dateCard}>
          <CalendarIcon size={16} color={colors.primary} />
          <Text style={styles.dateText}>{date}</Text>
        </View>

        {/* Empty State */}
        {todayDoses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CapsuleIcon size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Medicines Today</Text>
            <Text style={styles.emptyText}>
              You don't have any scheduled medicines for today. Create a prescription to get started.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreatePrescription')}
              activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>Create Prescription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(dosesByPeriod).map(([period, doses]) => {
            const PeriodIcon = PERIOD_ICONS[period] || SunIcon;
            const pc = PERIOD_COLORS[period] || PERIOD_COLORS.morning;

            return (
              <View key={period} style={styles.periodSection}>
                <View style={styles.periodHeader}>
                  <View style={[styles.periodIcon, {backgroundColor: pc.bg}]}>
                    <PeriodIcon size={18} color={pc.icon} />
                  </View>
                  <Text style={styles.periodTitle}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                  <Text style={styles.periodCount}>
                    {doses.filter(d => d.status === 'taken').length}/{doses.length}
                  </Text>
                </View>

                {doses.map(dose => (
                  <TouchableOpacity
                    key={dose.id}
                    style={styles.doseCard}
                    onPress={() => handleDosePress(dose)}
                    activeOpacity={0.8}>
                    <View
                      style={[
                        styles.doseIcon,
                        {
                          backgroundColor:
                            dose.status === 'taken'
                              ? colors.successLight || colors.primaryLight
                              : colors.primaryLight,
                        },
                      ]}>
                      <CapsuleIcon
                        size={20}
                        color={dose.status === 'taken' ? colors.success || colors.primary : colors.primary}
                      />
                    </View>

                    <View style={styles.doseInfo}>
                      <Text style={styles.doseName}>{dose.medicine.name}</Text>
                      <Text style={styles.doseDetails}>
                        {dose.dose} • {dose.scheduledTime}
                        {dose.medicine.foodInstruction &&
                          ` • ${dose.medicine.foodInstruction.replace('_', ' ')}`}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            dose.status === 'taken'
                              ? colors.successLight || colors.primaryLight
                              : dose.status === 'missed'
                              ? '#FEE2E2'
                              : dose.status === 'skipped'
                              ? '#FEF3C7'
                              : colors.background,
                        },
                      ]}>
                      {dose.status === 'taken' && <CheckCircleIcon size={16} color={colors.success || colors.primary} />}
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              dose.status === 'taken'
                                ? colors.success || colors.primary
                                : dose.status === 'missed'
                                ? colors.error
                                : dose.status === 'skipped'
                                ? colors.warning || colors.textSecondary
                                : colors.textMuted,
                          },
                        ]}>
                        {dose.status.charAt(0).toUpperCase() + dose.status.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}

        {/* Info Card */}
        {todayDoses.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Tap any medicine to mark it as taken or skipped. All changes are saved locally and work
              offline.
            </Text>
          </View>
        )}
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

  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md},
  loadingText: {fontSize: 14, color: colors.textSecondary},

  streakCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  streakItem: {flex: 1, alignItems: 'center', gap: 4},
  streakNum: {fontSize: 20, fontWeight: '800', color: colors.primary},
  streakLabel: {fontSize: 11, color: colors.textMuted, textAlign: 'center'},
  streakDivider: {width: 1, height: 36, backgroundColor: colors.border},

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.base,
  },
  dateText: {flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary},

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs},
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  emptyBtnText: {fontSize: 15, fontWeight: '700', color: colors.white},

  periodSection: {marginBottom: spacing.base},
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  periodIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTitle: {flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  periodCount: {fontSize: 13, fontWeight: '600', color: colors.textMuted},

  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.xs,
  },
  doseIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseInfo: {flex: 1},
  doseName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  doseDetails: {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: {fontSize: 11, fontWeight: '700'},

  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.base,
    alignItems: 'flex-start',
  },
  infoIcon: {fontSize: 18},
  infoText: {flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18},
});
