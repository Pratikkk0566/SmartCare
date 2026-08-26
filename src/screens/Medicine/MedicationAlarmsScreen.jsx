import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon,
  BellIcon,
  ClockIcon,
  SunriseIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  SettingsGearIcon,
  AlertCircleIcon,
  PillIcon,
  BoltIcon,
} from '../../assets/icons/Icons';
import {formatTime12h} from '../../services/MedicationSchedulingEngine';
import {medicationEngineService} from '../../services/MedicationEngineService';

const ROUTINE_SLOTS = [
  {
    key: 'MORNING',
    label: 'Morning Slot',
    desc: 'Breakfast & morning medicine timing',
    icon: SunriseIcon,
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    key: 'AFTERNOON',
    label: 'Afternoon Slot',
    desc: 'Lunch & mid-day medicine timing',
    icon: SunIcon,
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    key: 'EVENING',
    label: 'Evening Slot',
    desc: 'Dinner & sunset medicine timing',
    icon: SunIcon,
    color: '#EA580C',
    bg: '#FFEDD5',
  },
  {
    key: 'NIGHT',
    label: 'Night Slot',
    desc: 'Bedtime & night medicine timing',
    icon: MoonIcon,
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
];

export default function MedicationAlarmsScreen({navigation}) {
  const {
    engineAlarms,
    engineTimingConfig,
    updateEngineTimingConfig,
    refreshEngineData,
    engineActiveMeds,
  } = useApp();

  const [timings, setTimings] = useState({
    MORNING: engineTimingConfig?.MORNING || '08:00',
    AFTERNOON: engineTimingConfig?.AFTERNOON || '14:00',
    EVENING: engineTimingConfig?.EVENING || '20:00',
    NIGHT: engineTimingConfig?.NIGHT || '22:00',
  });
  const [saving, setSaving] = useState(false);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (engineTimingConfig) {
      setTimings(engineTimingConfig);
    }
  }, [engineTimingConfig]);

  const handleSaveTimings = async () => {
    try {
      setSaving(true);
      await updateEngineTimingConfig(timings);
      Alert.alert('✓ Alarms Updated', 'Medication routine and upcoming alarms synchronized successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save timing settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTestAlarm = async () => {
    try {
      await medicationEngineService.notificationManager.triggerImmediateTest({
        title: '💊 Medication Alarm Test',
        message: 'Your high-priority medicine notification and alarms are working properly!',
      });
      Alert.alert('✓ Test Triggered', 'Immediate test notification sent to your device notification tray.');
    } catch (err) {
      Alert.alert('Error', 'Failed to trigger test notification.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Medication Alarms</Text>
          <Text style={styles.headerSubtitle}>Personal Routine & Smart Reminders</Text>
        </View>
        <TouchableOpacity style={styles.testBtn} onPress={handleTriggerTestAlarm}>
          <BoltIcon size={18} color="#F59E0B" />
          <Text style={styles.testBtnText}>Test</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrap}>
            <BellIcon size={24} color="#0284C7" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.bannerTitle}>Deterministic Alarm Engine</Text>
            <Text style={styles.bannerSubtitle}>
              {engineAlarms.length} upcoming alarms active across {engineActiveMeds.length} active prescriptions.
            </Text>
          </View>
        </View>

        {/* Routine Timings Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ClockIcon size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Daily Routine Slot Timings</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Prescriptions mapped to (Morning / Afternoon / Evening / Night) will schedule alarms using these patient-specific times.
          </Text>

          <View style={styles.slotsContainer}>
            {ROUTINE_SLOTS.map((slot) => {
              const IconComp = slot.icon;
              return (
                <View key={slot.key} style={styles.slotRow}>
                  <View style={[styles.slotIconWrap, {backgroundColor: slot.bg}]}>
                    <IconComp size={20} color={slot.color} />
                  </View>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotDesc}>{slot.desc}</Text>
                  </View>
                  <TextInput
                    style={styles.timeInput}
                    value={timings[slot.key]}
                    onChangeText={(v) => setTimings((prev) => ({...prev, [slot.key]: v}))}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.textMuted}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTimings} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Routine & Recalculate Alarms</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <SettingsGearIcon size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Alarm Preferences</Text>
          </View>

          <View style={styles.prefRow}>
            <View style={{flex: 1}}>
              <Text style={styles.prefTitle}>Sound & Chime</Text>
              <Text style={styles.prefDesc}>Play sound on scheduled medicine dose</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{false: '#CBD5E1', true: '#93C5FD'}}
              thumbColor={soundEnabled ? colors.primary : '#F1F5F9'}
            />
          </View>

          <View style={[styles.prefRow, {borderBottomWidth: 0}]}>
            <View style={{flex: 1}}>
              <Text style={styles.prefTitle}>Vibration Pulse</Text>
              <Text style={styles.prefDesc}>High priority vibration alert</Text>
            </View>
            <Switch
              value={vibrateEnabled}
              onValueChange={setVibrateEnabled}
              trackColor={{false: '#CBD5E1', true: '#93C5FD'}}
              thumbColor={vibrateEnabled ? colors.primary : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Upcoming Native Alarms List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <BellIcon size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Registered Alarms Queue</Text>
          </View>

          {engineAlarms.length === 0 ? (
            <View style={styles.emptyAlarms}>
              <CheckCircleIcon size={32} color={colors.primary} />
              <Text style={styles.emptyAlarmsText}>No pending alarms in the queue.</Text>
              <Text style={styles.emptyAlarmsSub}>All today's doses are either taken or prescriptions completed.</Text>
            </View>
          ) : (
            engineAlarms.slice(0, 10).map((alarm, idx) => (
              <View key={alarm.id || idx} style={styles.alarmQueueItem}>
                <View style={styles.alarmQueueIconWrap}>
                  <BellIcon size={16} color="#0284C7" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.alarmQueueMedName}>{alarm.medicineName}</Text>
                  <Text style={styles.alarmQueueTime}>
                    {new Date(alarm.scheduledAt).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.alarmActiveTag}>
                  <Text style={styles.alarmActiveTagText}>Scheduled</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{height: 30}} />
      </ScrollView>
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
  backBtn: {
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
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  scroll: {
    padding: 16,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369A1',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  slotsContainer: {
    gap: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  slotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInfo: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  slotDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  timeInput: {
    width: 76,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  prefDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyAlarms: {
    padding: 20,
    alignItems: 'center',
  },
  emptyAlarmsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptyAlarmsSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  alarmQueueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  alarmQueueIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmQueueMedName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alarmQueueTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  alarmActiveTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  alarmActiveTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
});
