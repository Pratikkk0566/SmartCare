/**
 * Today's Medicine Screen
 * ----------------------
 * Displays today's medication schedule with offline-first alarm functionality.
 * Shows scheduled doses, alarms, and allows take/skip/snooze actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { radius } from '../../theme/radius';
import { useApp } from '../../context/AppContext';
import { sqliteDataService } from '../../services/SQLiteDataService';
import { localAlarmManager } from '../../services/LocalAlarmManager';
import { notificationManager } from '../../services/NotificationManager';

// Icons
import { 
  ArrowBackIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  PillIcon,
  HistoryIcon,
  InfoIcon,
  AlertTriangleIcon
} from '../../assets/icons/Icons';

export default function TodaysMedicineScreen({ navigation }) {
  const { user } = useApp();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adherenceStats, setAdherenceStats] = useState(null);

  // Load today's schedule when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadTodaysSchedule();
    }, [user])
  );

  /**
   * Load today's medication schedule
   */
  const loadTodaysSchedule = async () => {
    try {
      setLoading(true);
      
      const patientId = user?.patientId || user?.patient_id || user?.uhid;
      if (!patientId) {
        console.log('[TodaysMedicine] No patient ID available');
        return;
      }

      console.log('[TodaysMedicine] Loading schedule for patient:', patientId);

      // Get today's schedule with alarm information
      const todaysSchedule = await sqliteDataService.getTodaysScheduleWithAlarms(patientId);
      
      // Get adherence statistics
      const stats = await sqliteDataService.getMedicationAdherence(patientId);
      
      setSchedule(todaysSchedule || []);
      setAdherenceStats(stats);
      
      console.log('[TodaysMedicine] Loaded', todaysSchedule?.length || 0, 'scheduled doses');
      
    } catch (error) {
      console.error('[TodaysMedicine] Failed to load schedule:', error);
      Alert.alert('Error', 'Failed to load medication schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle taking medicine
   */
  const handleTakeMedicine = async (dose) => {
    try {
      console.log('[TodaysMedicine] Taking medicine:', dose.medicine_name);
      
      await sqliteDataService.takeMedicine(dose.dose_id, 'Taken via app');
      
      // Reload schedule to reflect changes
      await loadTodaysSchedule();
      
      Alert.alert(
        'Medicine Taken ✅',
        `${dose.medicine_name} marked as taken`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[TodaysMedicine] Failed to take medicine:', error);
      Alert.alert('Error', 'Failed to mark medicine as taken');
    }
  };

  /**
   * Handle skipping medicine
   */
  const handleSkipMedicine = (dose) => {
    Alert.alert(
      'Skip Medicine?',
      `Are you sure you want to skip ${dose.medicine_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[TodaysMedicine] Skipping medicine:', dose.medicine_name);
              
              await sqliteDataService.skipMedicine(dose.dose_id, 'Skipped via app');
              
              // Reload schedule
              await loadTodaysSchedule();
              
              Alert.alert('Medicine Skipped', `${dose.medicine_name} marked as skipped`);
              
            } catch (error) {
              console.error('[TodaysMedicine] Failed to skip medicine:', error);
              Alert.alert('Error', 'Failed to mark medicine as skipped');
            }
          }
        }
      ]
    );
  };

  /**
   * Handle snoozing alarm
   */
  const handleSnoozeAlarm = (dose) => {
    if (!dose.alarm || !dose.hasAlarm) {
      Alert.alert('No Alarm', 'This medicine does not have an active alarm');
      return;
    }

    Alert.alert(
      'Snooze Alarm',
      'How long would you like to snooze?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '15 minutes', 
          onPress: () => snoozeAlarm(dose.alarm.alarm_id, 15) 
        },
        { 
          text: '30 minutes', 
          onPress: () => snoozeAlarm(dose.alarm.alarm_id, 30) 
        }
      ]
    );
  };

  /**
   * Snooze alarm helper
   */
  const snoozeAlarm = async (alarmId, minutes) => {
    try {
      console.log('[TodaysMedicine] Snoozing alarm:', alarmId, 'for', minutes, 'minutes');
      
      const success = await sqliteDataService.snoozeMedicine(alarmId, minutes);
      
      if (success) {
        await loadTodaysSchedule();
        Alert.alert('Alarm Snoozed', `Reminder set for ${minutes} minutes`);
      } else {
        Alert.alert('Snooze Limit', 'Maximum snooze limit reached. Please take your medicine.');
      }
      
    } catch (error) {
      console.error('[TodaysMedicine] Failed to snooze alarm:', error);
      Alert.alert('Error', 'Failed to snooze alarm');
    }
  };

  /**
   * Get status color for dose
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return colors.success;
      case 'skipped': return colors.warning;
      case 'missed': return colors.error;
      default: return colors.primary;
    }
  };

  /**
   * Get status icon for dose
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken': return <CheckCircleIcon size={20} color={colors.success} />;
      case 'skipped': return <XCircleIcon size={20} color={colors.warning} />;
      case 'missed': return <XCircleIcon size={20} color={colors.error} />;
      default: return <ClockIcon size={20} color={colors.primary} />;
    }
  };

  /**
   * Render individual dose card
   */
  const renderDoseCard = (dose) => {
    const isCompleted = ['taken', 'skipped', 'missed'].includes(dose.status);
    const hasAlarm = dose.hasAlarm && dose.alarm;
    
    return (
      <View key={dose.dose_id} style={[styles.doseCard, isCompleted && styles.completedCard]}>
        <View style={styles.doseHeader}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{dose.medicine_name}</Text>
            <Text style={styles.dosageInfo}>
              {dose.dose_value} {dose.dose_unit} • {dose.scheduled_time}
            </Text>
            {dose.food_instruction && (
              <Text style={styles.foodInstruction}>{dose.food_instruction}</Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            {getStatusIcon(dose.status)}
            {hasAlarm && (
              <BellIcon 
                size={16} 
                color={dose.alarmStatus === 'snoozed' ? colors.warning : colors.primary} 
                style={styles.alarmIcon}
              />
            )}
          </View>
        </View>

        {dose.status === 'upcoming' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.takeButton]}
              onPress={() => handleTakeMedicine(dose)}
            >
              <CheckCircleIcon size={16} color={colors.white} />
              <Text style={styles.takeButtonText}>Take</Text>
            </TouchableOpacity>

            {hasAlarm && (
              <TouchableOpacity
                style={[styles.actionButton, styles.snoozeButton]}
                onPress={() => handleSnoozeAlarm(dose)}
              >
                <ClockIcon size={16} color={colors.primary} />
                <Text style={styles.snoozeButtonText}>Snooze</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => handleSkipMedicine(dose)}
            >
              <XCircleIcon size={16} color={colors.error} />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {dose.notes && (
          <Text style={styles.doseNotes}>{dose.notes}</Text>
        )}
      </View>
    );
  };

  /**
   * Render adherence summary
   */
  const renderAdherenceSummary = () => {
    if (!adherenceStats) return null;

    const { totalDoses, taken, missed, skipped, adherenceRate } = adherenceStats;
    
    return (
      <View style={styles.adherenceCard}>
        <Text style={styles.adherenceTitle}>Today's Progress</Text>
        <View style={styles.adherenceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{taken || 0}</Text>
            <Text style={styles.statLabel}>Taken</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{skipped || 0}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>{missed || 0}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {Math.round(adherenceRate || 0)}%
            </Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowBackIcon size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Today's Medicines</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading medication schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Today's Medicines</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MedicationHistory')}>
          <HistoryIcon size={24} color={colors.primary} />
        </TouchableOpacity>
        
        {/* Test notification button - remove in production */}
        <TouchableOpacity 
          onPress={() => notificationManager.simulateMedicationReminder()}
          style={styles.testButton}
        >
          <BellIcon size={20} color={colors.warning} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTodaysSchedule} />
        }
      >
        {renderAdherenceSummary()}

        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>
            📅 Today's Schedule ({schedule.length} {schedule.length === 1 ? 'dose' : 'doses'})
          </Text>

          {schedule.length === 0 ? (
            <View style={styles.emptyState}>
              <PillIcon size={48} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>No medicines scheduled</Text>
              <Text style={styles.emptySubtitle}>
                You have no medications scheduled for today
              </Text>
            </View>
          ) : (
            schedule.map(renderDoseCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  adherenceCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  scheduleSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  doseCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  completedCard: {
    opacity: 0.7,
  },
  doseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  foodInstruction: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmIcon: {
    marginLeft: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  takeButton: {
    backgroundColor: colors.success,
    flex: 1,
  },
  takeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  snoozeButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  snoozeButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.error,
  },
  skipButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  doseNotes: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  testButton: {
    padding: spacing.xs,
    backgroundColor: colors.warning + '20',
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
});