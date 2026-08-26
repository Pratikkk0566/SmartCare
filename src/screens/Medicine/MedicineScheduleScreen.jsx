import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon,
  CalendarIcon,
  ChevronDownIcon,
  SunriseIcon,
  SunIcon,
  MoonIcon,
  InfoIcon,
  SearchIcon,
  CapsuleIcon,
  PillIcon,
  HeartRateIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  AlertCircleIcon,
  XIcon,
  RefreshIcon,
  SettingsGearIcon,
  CheckIcon,
  LockIcon,
} from '../../assets/icons/Icons';
import {todayInUtc, formatTime12h, addDays} from '../../services/MedicationSchedulingEngine';

const SLOT_CONFIG = {
  MORNING: {
    label: 'Morning Dose',
    sublabel: 'Breakfast routine',
    icon: SunriseIcon,
    color: '#0284C7',
    bg: '#E0F2FE',
    border: '#BAE6FD',
  },
  AFTERNOON: {
    label: 'Afternoon Dose',
    sublabel: 'Lunch routine',
    icon: SunIcon,
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  EVENING: {
    label: 'Evening Dose',
    sublabel: 'Sunset / snack routine',
    icon: SunIcon,
    color: '#EA580C',
    bg: '#FFEDD5',
    border: '#FED7AA',
  },
  NIGHT: {
    label: 'Night Dose',
    sublabel: 'Dinner / bedtime',
    icon: MoonIcon,
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#DDD6FE',
  },
};

const SNOOZE_OPTIONS = [
  {label: '10 Minutes', value: 10},
  {label: '15 Minutes', value: 15},
  {label: '30 Minutes', value: 30},
  {label: '1 Hour', value: 60},
];

const SKIP_REASONS = [
  'Doctor advised to pause',
  'Felt better / dose not required',
  'Experiencing side effects',
  'Away from home / forgot medication',
  'Medicine out of stock',
  'Fasting / empty stomach required',
  'Other reason',
];

export default function MedicineScheduleScreen({navigation}) {
  const {
    engineSchedules,
    engineActiveMeds,
    engineAlarms,
    engineStats,
    engineTimingConfig,
    refreshEngineData,
    markEngineDoseTaken,
    markEngineDoseSkipped,
    snoozeEngineDose,
    updateEngineTimingConfig,
    syncPrescriptionsToEngine,
    userProfile,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(() => todayInUtc());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlarmsListModal, setShowAlarmsListModal] = useState(false);
  const [skipReason, setSkipReason] = useState(SKIP_REASONS[0]);
  const [customSkipReason, setCustomSkipReason] = useState('');

  // Editable Timing Settings
  const [timingSettings, setTimingSettings] = useState({
    MORNING: engineTimingConfig?.MORNING || '08:00',
    AFTERNOON: engineTimingConfig?.AFTERNOON || '14:00',
    EVENING: engineTimingConfig?.EVENING || '20:00',
    NIGHT: engineTimingConfig?.NIGHT || '22:00',
  });

  useEffect(() => {
    if (engineTimingConfig) {
      setTimingSettings(engineTimingConfig);
    }
  }, [engineTimingConfig]);

  useFocusEffect(
    useCallback(() => {
      loadData(selectedDate);
    }, [selectedDate])
  );

  const loadData = async (date = selectedDate) => {
    try {
      setLoading(true);
      await refreshEngineData(date);
    } catch (error) {
      console.error('[MedicineScheduleScreen] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedDate);
  };

  // Generate 7-day strip (3 days before, today, 3 days after)
  const dateStrip = useMemo(() => {
    const today = todayInUtc();
    const days = [];
    for (let offset = -3; offset <= 3; offset++) {
      const dStr = addDays(today, offset);
      const dObj = new Date(`${dStr}T00:00:00Z`);
      const dayName = dObj.toLocaleDateString('en-US', {weekday: 'short'});
      const dayNum = dObj.getUTCDate();
      days.push({
        dateStr: dStr,
        dayName,
        dayNum,
        isToday: dStr === today,
        isSelected: dStr === selectedDate,
      });
    }
    return days;
  }, [selectedDate]);

  // Filtered schedules for selected date
  const filteredSchedules = useMemo(() => {
    const list = Array.isArray(engineSchedules) ? engineSchedules : [];
    return list.filter((s) => {
      if (s.scheduledDate !== selectedDate) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        s.medicineName?.toLowerCase().includes(q) ||
        s.dosage?.toLowerCase().includes(q) ||
        s.slot?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
      );
    });
  }, [engineSchedules, selectedDate, query]);

  // Group schedules by slot (MORNING, AFTERNOON, EVENING, NIGHT)
  const groupedSlots = useMemo(() => {
    const groups = {
      MORNING: [],
      AFTERNOON: [],
      EVENING: [],
      NIGHT: [],
    };

    filteredSchedules.forEach((item) => {
      let slotKey = String(item.slot || '').toUpperCase().trim();
      
      // If slot is ambiguous or generic, infer from time or slot name
      if (!groups[slotKey]) {
        if (slotKey.includes('AFTERNOON') || slotKey.includes('LUNCH') || slotKey.includes('NOON') || slotKey === 'SLOT_2') {
          slotKey = 'AFTERNOON';
        } else if (slotKey.includes('NIGHT') || slotKey.includes('BEDTIME') || slotKey.includes('DINNER') || slotKey === 'SLOT_3') {
          slotKey = 'NIGHT';
        } else if (slotKey.includes('EVENING') || slotKey.includes('SUNSET') || slotKey === 'SLOT_4') {
          slotKey = 'EVENING';
        } else if (item.scheduledTime) {
          const hour = parseInt(item.scheduledTime.split(':')[0], 10);
          if (hour >= 12 && hour < 17) slotKey = 'AFTERNOON';
          else if (hour >= 17 && hour < 21) slotKey = 'EVENING';
          else if (hour >= 21 || hour < 6) slotKey = 'NIGHT';
          else slotKey = 'MORNING';
        } else {
          slotKey = 'MORNING';
        }
      }

      if (groups[slotKey]) {
        groups[slotKey].push(item);
      } else {
        groups.MORNING.push(item);
      }
    });

    return groups;
  }, [filteredSchedules]);

  // Daily statistics for selected date
  const dayStats = useMemo(() => {
    const total = filteredSchedules.length;
    const taken = filteredSchedules.filter((s) => s.status === 'TAKEN').length;
    const skipped = filteredSchedules.filter((s) => s.status === 'SKIPPED').length;
    const snoozed = filteredSchedules.filter((s) => s.status === 'SNOOZED').length;
    const pending = total - taken - skipped;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;
    return {total, taken, skipped, snoozed, pending, rate};
  }, [filteredSchedules]);

  // Next upcoming dose
  const nextUpcomingDose = useMemo(() => {
    const nowIso = new Date().toISOString();
    return (
      filteredSchedules
        .filter((s) => s.status === 'SCHEDULED' || s.status === 'SNOOZED')
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] || null
    );
  }, [filteredSchedules]);

  // Action handlers
  const handleMarkTaken = async (schedule) => {
    try {
      await markEngineDoseTaken(schedule.id);
      Alert.alert('✓ Dose Recorded', `${schedule.medicineName} (${schedule.doseQuantity} dose) marked as TAKEN.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not mark dose as taken.');
    }
  };

  const handleOpenSnooze = (schedule) => {
    setSelectedSchedule(schedule);
    setShowSnoozeModal(true);
  };

  const handleApplySnooze = async (minutes) => {
    if (!selectedSchedule) return;
    try {
      await snoozeEngineDose(selectedSchedule.id, minutes);
      setShowSnoozeModal(false);
      Alert.alert('⏰ Alarm Snoozed', `Reminder set for ${minutes} minutes from now.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not snooze alarm.');
    }
  };

  const handleOpenSkip = (schedule) => {
    setSelectedSchedule(schedule);
    setSkipReason(SKIP_REASONS[0]);
    setCustomSkipReason('');
    setShowSkipModal(true);
  };

  const handleConfirmSkip = async () => {
    if (!selectedSchedule) return;
    const finalReason = skipReason === 'Other reason' && customSkipReason ? customSkipReason : skipReason;
    try {
      await markEngineDoseSkipped(selectedSchedule.id, finalReason);
      setShowSkipModal(false);
      Alert.alert('Dose Skipped', `${selectedSchedule.medicineName} marked as skipped.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not skip dose.');
    }
  };

  const handleSaveTimingSettings = async () => {
    try {
      await updateEngineTimingConfig(timingSettings);
      setShowSettingsModal(false);
      Alert.alert('✓ Settings Saved', 'Your personal medication routine has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update timing profile.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Medication Schedule</Text>
          <Text style={styles.headerSubtitle}>Deterministic Alarms & Doses</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowAlarmsListModal(true)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <BellIcon size={20} color={colors.primary} />
            {engineAlarms.length > 0 && <View style={styles.alarmBadgeDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowSettingsModal(true)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SettingsGearIcon size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>
        {/* Horizontal Calendar Date Strip */}
        <View style={styles.calendarStrip}>
          {dateStrip.map((item) => (
            <TouchableOpacity
              key={item.dateStr}
              style={[
                styles.datePill,
                item.isSelected && styles.datePillSelected,
                item.isToday && !item.isSelected && styles.datePillToday,
              ]}
              onPress={() => setSelectedDate(item.dateStr)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.datePillDayName,
                  item.isSelected && styles.datePillTextSelected,
                ]}>
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.datePillDayNum,
                  item.isSelected && styles.datePillTextSelected,
                ]}>
                {item.dayNum}
              </Text>
              {item.isToday && (
                <View
                  style={[
                    styles.todayDot,
                    item.isSelected && {backgroundColor: '#fff'},
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero Live Status & Adherence Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroStatsCol}>
              <Text style={styles.heroGreeting}>Daily Adherence</Text>
              <Text style={styles.heroMetric}>
                {dayStats.taken}/{dayStats.total} Doses Taken
              </Text>
              <Text style={styles.heroSubmetric}>
                {dayStats.pending > 0
                  ? `${dayStats.pending} remaining today`
                  : 'All doses completed for this date!'}
              </Text>
            </View>
            <View style={styles.progressRingWrap}>
              <View style={styles.progressRingOuter}>
                <Text style={styles.progressRingText}>{dayStats.rate}%</Text>
              </View>
            </View>
          </View>

          {/* Next Alarm Banner */}
          {nextUpcomingDose && (
            <View style={styles.nextAlarmBanner}>
              <BellIcon size={16} color="#0284C7" />
              <View style={{flex: 1}}>
                <Text style={styles.nextAlarmLabel}>
                  Next Alarm: {nextUpcomingDose.medicineName} ({nextUpcomingDose.scheduledTime12h || nextUpcomingDose.scheduledTime})
                </Text>
                <Text style={styles.nextAlarmTiming}>
                  {nextUpcomingDose.timingInstruction || 'Take on time with water'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.quickTakeBtn}
                onPress={() => handleMarkTaken(nextUpcomingDose)}>
                <Text style={styles.quickTakeText}>Take Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <SearchIcon size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine, slot, or notes..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <XIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline Slot Cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Synchronizing medication schedule...</Text>
          </View>
        ) : filteredSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <PillIcon size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Doses Scheduled for {selectedDate}</Text>
            <Text style={styles.emptySubtitle}>
              Active prescription courses automatically generate daily alarms here.
            </Text>
            <TouchableOpacity
              style={styles.syncPrescriptionsBtn}
              onPress={() => navigation.navigate('Prescriptions')}>
              <Text style={styles.syncPrescriptionsText}>View Prescriptions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(groupedSlots).map(([slotKey, slotDoses]) => {
            if (slotDoses.length === 0) return null;
            const slotMeta = SLOT_CONFIG[slotKey] || SLOT_CONFIG.MORNING;
            const SlotIcon = slotMeta.icon;
            const slotTime = engineTimingConfig?.[slotKey] || '08:00';

            return (
              <View key={slotKey} style={styles.slotGroup}>
                {/* Slot Header */}
                <View style={styles.slotHeader}>
                  <View style={[styles.slotIconWrap, {backgroundColor: slotMeta.bg, borderColor: slotMeta.border}]}>
                    <SlotIcon size={18} color={slotMeta.color} />
                  </View>
                  <View style={{flex: 1}}>
                    <View style={styles.slotTitleRow}>
                      <Text style={styles.slotTitle}>{slotMeta.label}</Text>
                      <Text style={styles.slotTimeText}>{formatTime12h(slotTime)}</Text>
                    </View>
                    <Text style={styles.slotSubtitle}>{slotMeta.sublabel}</Text>
                  </View>
                  <View style={styles.slotCountBadge}>
                    <Text style={styles.slotCountText}>{slotDoses.length} {slotDoses.length === 1 ? 'Med' : 'Meds'}</Text>
                  </View>
                </View>

                {/* Dose Cards */}
                {slotDoses.map((dose) => {
                  const isTaken = dose.status === 'TAKEN';
                  const isSkipped = dose.status === 'SKIPPED';
                  const isSnoozed = dose.status === 'SNOOZED';
                  const isPending = dose.status === 'SCHEDULED' || isSnoozed;
                  const isLocked = isPending && dose.scheduledAt && new Date(dose.scheduledAt).getTime() > Date.now();

                  return (
                    <View
                      key={dose.id}
                      style={[
                        styles.doseCard,
                        isTaken && styles.doseCardTaken,
                        isSkipped && styles.doseCardSkipped,
                        isLocked && styles.doseCardLocked,
                      ]}>
                      <View style={styles.doseCardTop}>
                        <View style={styles.doseMedInfo}>
                          <View style={styles.doseTitleRow}>
                            <Text style={[styles.doseMedName, isTaken && styles.textStrikethrough]}>
                              {dose.medicineName}
                            </Text>
                          </View>
                          <Text style={styles.doseInstruction}>
                            💊 {dose.doseQuantity} dose • {dose.timingInstruction || 'After Food'}
                          </Text>
                          {dose.notes ? (
                            <Text style={styles.doseNotes}>Note: {dose.notes}</Text>
                          ) : null}
                        </View>

                        {/* Status Chip */}
                        <View
                          style={[
                            styles.statusChip,
                            isTaken && styles.statusChipTaken,
                            isSkipped && styles.statusChipSkipped,
                            isSnoozed && styles.statusChipSnoozed,
                            isLocked && styles.statusChipLocked,
                            dose.status === 'SCHEDULED' && !isLocked && styles.statusChipScheduled,
                          ]}>
                          {isLocked && <LockIcon size={10} color="#64748B" style={{marginRight: 3}} />}
                          <Text
                            style={[
                              styles.statusChipText,
                              isTaken && styles.statusChipTextTaken,
                              isSkipped && styles.statusChipTextSkipped,
                              isSnoozed && styles.statusChipTextSnoozed,
                              isLocked && styles.statusChipTextLocked,
                              dose.status === 'SCHEDULED' && !isLocked && styles.statusChipTextScheduled,
                            ]}>
                            {isTaken
                              ? '✓ TAKEN'
                              : isSkipped
                              ? '✕ SKIPPED'
                              : isSnoozed
                              ? '⏰ SNOOZED'
                              : isLocked
                              ? 'LOCKED'
                              : 'DUE'}
                          </Text>
                        </View>
                      </View>

                      {/* Action Row */}
                      {isPending ? (
                        isLocked ? (
                          <View style={styles.doseActionsRow}>
                            <TouchableOpacity
                              style={styles.lockedDoseBtn}
                              onPress={() => {
                                Alert.alert(
                                  '🔒 Dose Locked',
                                  `${dose.medicineName} is scheduled for ${dose.scheduledTime12h || dose.scheduledTime}.\n\nYou can mark this dose as taken once the scheduled time arrives.`,
                                  [{text: 'OK'}]
                                );
                              }}
                              activeOpacity={0.7}>
                              <LockIcon size={14} color="#64748B" />
                              <Text style={styles.lockedDoseText}>Available at {dose.scheduledTime12h || dose.scheduledTime}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.doseActionsRow}>
                            <TouchableOpacity
                              style={styles.takeDoseBtn}
                              onPress={() => handleMarkTaken(dose)}
                              activeOpacity={0.8}>
                              <CheckIcon size={16} color="#fff" />
                              <Text style={styles.takeDoseText}>Mark Taken</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.snoozeDoseBtn}
                              onPress={() => handleOpenSnooze(dose)}
                              activeOpacity={0.8}>
                              <ClockIcon size={15} color="#6366F1" />
                              <Text style={styles.snoozeDoseText}>Snooze</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.skipDoseBtn}
                              onPress={() => handleOpenSkip(dose)}
                              activeOpacity={0.8}>
                              <XIcon size={15} color="#EF4444" />
                              <Text style={styles.skipDoseText}>Skip</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      ) : (
                        <View style={styles.completedMetaRow}>
                          <Text style={styles.completedMetaText}>
                            {isTaken
                              ? `Logged taken at ${new Date(dose.takenAt || dose.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
                              : `Skipped: ${dose.skipReason || 'Reason recorded'}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* ── Snooze Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showSnoozeModal} transparent animationType="fade" onRequestClose={() => setShowSnoozeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <ClockIcon size={24} color="#6366F1" />
              </View>
              <Text style={styles.modalTitle}>Snooze Alarm</Text>
              <Text style={styles.modalSubtitle}>
                {selectedSchedule?.medicineName}
              </Text>
            </View>

            <View style={styles.snoozeOptionsContainer}>
              {SNOOZE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.snoozeOptionBtn}
                  onPress={() => handleApplySnooze(opt.value)}>
                  <ClockIcon size={18} color={colors.primary} />
                  <Text style={styles.snoozeOptionText}>Snooze for {opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSnoozeModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Skip Dose Modal ──────────────────────────────────────────────── */}
      <Modal visible={showSkipModal} transparent animationType="fade" onRequestClose={() => setShowSkipModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, {backgroundColor: '#FEE2E2'}]}>
                <XIcon size={24} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Skip Dose</Text>
              <Text style={styles.modalSubtitle}>
                Select why you are skipping {selectedSchedule?.medicineName}
              </Text>
            </View>

            <ScrollView style={{maxHeight: 220}}>
              {SKIP_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.skipReasonItem, skipReason === r && styles.skipReasonItemSelected]}
                  onPress={() => setSkipReason(r)}>
                  <View style={[styles.radioCircle, skipReason === r && styles.radioCircleSelected]}>
                    {skipReason === r && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.skipReasonText, skipReason === r && styles.skipReasonTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {skipReason === 'Other reason' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Enter specific reason..."
                placeholderTextColor={colors.textMuted}
                value={customSkipReason}
                onChangeText={setCustomSkipReason}
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowSkipModal(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDangerBtn} onPress={handleConfirmSkip}>
                <Text style={styles.modalDangerText}>Confirm Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Alarm & Timing Settings Modal ─────────────────────────────────── */}
      <Modal visible={showSettingsModal} transparent animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {maxHeight: '85%'}]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, {backgroundColor: '#E0E7FF'}]}>
                <SettingsGearIcon size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Medication Routine Times</Text>
              <Text style={styles.modalSubtitle}>
                Adjust your daily schedule slots so alarms ring at your routine times.
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.keys(timingSettings).map((slotKey) => {
                const meta = SLOT_CONFIG[slotKey] || SLOT_CONFIG.MORNING;
                return (
                  <View key={slotKey} style={styles.timingSettingRow}>
                    <View style={{flex: 1}}>
                      <Text style={styles.timingSlotLabel}>{meta.label}</Text>
                      <Text style={styles.timingSlotSub}>{meta.sublabel}</Text>
                    </View>
                    <TextInput
                      style={styles.timeInputBox}
                      value={timingSettings[slotKey]}
                      onChangeText={(val) => setTimingSettings((prev) => ({...prev, [slotKey]: val}))}
                      placeholder="HH:mm"
                      placeholderTextColor={colors.textMuted}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveTimingSettings}>
                <Text style={styles.modalPrimaryText}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Active Alarms List Modal ───────────────────────────────────────── */}
      <Modal visible={showAlarmsListModal} transparent animationType="slide" onRequestClose={() => setShowAlarmsListModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {maxHeight: '80%'}]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, {backgroundColor: '#DBEAFE'}]}>
                <BellIcon size={24} color="#0284C7" />
              </View>
              <Text style={styles.modalTitle}>Active System Alarms</Text>
              <Text style={styles.modalSubtitle}>
                {engineAlarms.length} upcoming alarms registered with device notification service
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 300}}>
              {engineAlarms.length === 0 ? (
                <View style={{padding: 20, alignItems: 'center'}}>
                  <Text style={{color: colors.textMuted, textAlign: 'center'}}>No pending future alarms registered.</Text>
                </View>
              ) : (
                engineAlarms.slice(0, 15).map((alarm, idx) => (
                  <View key={alarm.id || idx} style={styles.alarmItemRow}>
                    <BellIcon size={16} color={colors.primary} />
                    <View style={{flex: 1}}>
                      <Text style={styles.alarmItemTitle}>{alarm.medicineName || 'Medicine Dose'}</Text>
                      <Text style={styles.alarmItemTime}>
                        {new Date(alarm.scheduledAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.activeAlarmPill}>
                      <Text style={styles.activeAlarmPillText}>Active</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAlarmsListModal(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...shadows.sm,
  },
  headerBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  alarmBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Calendar Strip
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePill: {
    width: 44,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  datePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  datePillDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  datePillDayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  datePillTextSelected: {
    color: '#fff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatsCol: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroMetric: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  heroSubmetric: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  progressRingWrap: {
    marginLeft: 16,
  },
  progressRingOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  nextAlarmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: radius.md,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  nextAlarmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  nextAlarmTiming: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  quickTakeBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  quickTakeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },

  // Slot Groups
  slotGroup: {
    marginBottom: 20,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  slotIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  slotSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  slotCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slotCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Dose Card
  doseCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  doseCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  doseCardSkipped: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.8,
  },
  doseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doseMedInfo: {
    flex: 1,
    marginRight: 10,
  },
  doseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  doseMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  dosageBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dosageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  doseInstruction: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  doseNotes: {
    fontSize: 11,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusChipScheduled: {
    backgroundColor: '#EFF6FF',
  },
  statusChipTextScheduled: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusChipTaken: {
    backgroundColor: '#DCFCE7',
  },
  statusChipTextTaken: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  statusChipSkipped: {
    backgroundColor: '#F1F5F9',
  },
  statusChipTextSkipped: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChipLocked: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChipTextLocked: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  statusChipSnoozed: {
    backgroundColor: '#EDE9FE',
  },
  statusChipTextSnoozed: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Actions
  doseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doseCardLocked: {
    opacity: 0.88,
    borderColor: '#E2E8F0',
  },
  lockedDoseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: radius.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedDoseText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  takeDoseBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
  },
  takeDoseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  snoozeDoseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 4,
  },
  snoozeDoseText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  skipDoseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 4,
  },
  skipDoseText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  completedMetaRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  completedMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Empty & Loading
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  syncPrescriptionsBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  syncPrescriptionsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  snoozeOptionsContainer: {
    gap: 10,
    marginVertical: 10,
  },
  snoozeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  snoozeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Skip Modal
  skipReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  skipReasonItemSelected: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  skipReasonText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  skipReasonTextSelected: {
    fontWeight: '700',
    color: '#EF4444',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 13,
    marginTop: 10,
    color: colors.textPrimary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Timing Settings
  timingSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timingSlotLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timingSlotSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  timeInputBox: {
    width: 80,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
  },

  // Alarms List
  alarmItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  alarmItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alarmItemTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeAlarmPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeAlarmPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
});
