import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon,
  CheckIcon,
  CapsuleIcon,
  CalendarIcon,
  ClockIcon,
} from '../../assets/icons/Icons';
import {
  PrescriptionDB,
  MedicineDB,
} from '../../services/MedicationDatabaseService';
import MedicationScheduleService from '../../services/MedicationScheduleService';
import {scheduleAllMedicineReminders} from '../../services/NotificationService';

export default function ReviewPrescriptionScreen({navigation, route}) {
  const {prescriptionId, prescriptionName} = route.params;

  const [prescription, setPrescription] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const presc = await PrescriptionDB.getById(prescriptionId);
      const meds = await MedicineDB.getByPrescriptionId(prescriptionId);

      setPrescription(presc);
      setMedicines(meds);
    } catch (error) {
      console.error('[ReviewPrescription] Load error:', error);
      Alert.alert('Error', 'Failed to load prescription data');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    Alert.alert(
      'Activate Prescription',
      'This will generate your medication schedule and set up reminders. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Activate', onPress: activatePrescription},
      ]
    );
  };

  const activatePrescription = async () => {
    setActivating(true);

    try {
      // 1. Generate schedule for all medicines
      console.log('[ReviewPrescription] Generating schedule...');
      const scheduledDoses = await MedicationScheduleService.generateScheduleForPrescription(
        prescriptionId
      );

      console.log(`[ReviewPrescription] Generated ${scheduledDoses.length} doses`);

      // 2. Activate prescription
      await PrescriptionDB.activate(prescriptionId);

      // 3. Schedule notifications
      console.log('[ReviewPrescription] Scheduling notifications...');
      const notificationCount = await scheduleAllMedicineReminders(
        scheduledDoses,
        medicines
      );

      console.log(`[ReviewPrescription] Scheduled ${notificationCount} notifications`);

      // Success!
      Alert.alert(
        'Prescription Activated! 🎉',
        `Your medication schedule is ready with ${scheduledDoses.length} doses. You'll receive ${notificationCount} reminders.`,
        [
          {
            text: 'View Schedule',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  {name: 'Main'},
                  {name: 'MedicineSchedule'},
                ],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ReviewPrescription] Activation error:', error);
      Alert.alert(
        'Activation Failed',
        'Failed to activate prescription. Please try again.'
      );
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading prescription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!prescription) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prescription not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate total doses
  const totalDoses = medicines.reduce((sum, med) => {
    const freq = MedicationScheduleService.getDefaultTimes(med.frequency);
    const days = med.durationDays || 7;
    return sum + freq.length * days;
  }, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Prescription</Text>
        </View>

        {/* Prescription Info */}
        <View style={styles.infoCard}>
          <Text style={styles.prescriptionName}>{prescription.name}</Text>
          {prescription.doctorName && (
            <Text style={styles.doctorName}>Dr. {prescription.doctorName}</Text>
          )}
          <View style={styles.metaRow}>
            <CalendarIcon size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>
              Starting {new Date(prescription.startDate).toLocaleDateString()}
            </Text>
          </View>
          {prescription.notes && (
            <Text style={styles.notes}>{prescription.notes}</Text>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Schedule Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{medicines.length}</Text>
              <Text style={styles.summaryLabel}>Medicines</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalDoses}</Text>
              <Text style={styles.summaryLabel}>Total Doses</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.max(...medicines.map(m => m.durationDays || 7))}
              </Text>
              <Text style={styles.summaryLabel}>Days</Text>
            </View>
          </View>
        </View>

        {/* Medicines List */}
        <Text style={styles.sectionTitle}>Medicines</Text>
        {medicines.map((med, idx) => {
          const times = MedicationScheduleService.getDefaultTimes(med.frequency);
          return (
            <View key={med.id} style={styles.medicineCard}>
              <View style={styles.medicineHeader}>
                <View style={styles.medicineIcon}>
                  <CapsuleIcon size={20} color={colors.primary} />
                </View>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{med.name}</Text>
                  <Text style={styles.medicineType}>
                    {med.type.charAt(0).toUpperCase() + med.type.slice(1)} •{' '}
                    {med.dose} {med.unit}
                  </Text>
                </View>
              </View>

              <View style={styles.medicineDetails}>
                <View style={styles.detailRow}>
                  <ClockIcon size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>
                    {times.length}x daily ({times.join(', ')})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Food:</Text>
                  <Text style={styles.detailText}>
                    {med.foodInstruction.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailText}>{med.durationDays} days</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>✅</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Ready to Activate</Text>
            <Text style={styles.infoText}>
              When you activate, we'll create your medication schedule and set
              up {totalDoses} reminders. All work offline!
            </Text>
          </View>
        </View>

        {/* Activate Button */}
        <TouchableOpacity
          style={[styles.activateBtn, activating && styles.activateBtnDisabled]}
          onPress={handleActivate}
          disabled={activating}
          activeOpacity={0.8}>
          {activating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <CheckIcon size={20} color={colors.white} />
          )}
          <Text style={styles.activateBtnText}>
            {activating ? 'Activating...' : 'Activate Prescription'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={activating}>
          <Text style={styles.cancelBtnText}>Back to Edit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary},

  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md},
  loadingText: {fontSize: 14, color: colors.textSecondary},

  errorContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.base},
  errorText: {fontSize: 16, color: colors.textSecondary, marginBottom: spacing.base},
  backBtn: {paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md},
  backBtnText: {fontSize: 14, fontWeight: '600', color: colors.white},

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.base,
  },
  prescriptionName: {fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: 4},
  doctorName: {fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs},
  metaText: {fontSize: 12, color: colors.textMuted},
  notes: {fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18},

  summaryCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  summaryTitle: {fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm},
  summaryRow: {flexDirection: 'row', alignItems: 'center'},
  summaryItem: {flex: 1, alignItems: 'center'},
  summaryValue: {fontSize: 24, fontWeight: '800', color: colors.primary},
  summaryLabel: {fontSize: 11, color: colors.textMuted, marginTop: 2},
  summaryDivider: {width: 1, height: 36, backgroundColor: colors.border},

  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},

  medicineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  medicineHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm},
  medicineIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {flex: 1},
  medicineName: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  medicineType: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  medicineDetails: {gap: spacing.xs, paddingLeft: 48},
  detailRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  detailLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  detailText: {fontSize: 12, color: colors.textMuted},

  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.successLight || colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.lg,
  },
  infoIcon: {fontSize: 20},
  infoContent: {flex: 1},
  infoTitle: {fontSize: 13, fontWeight: '600', color: colors.success || colors.primary, marginBottom: 2},
  infoText: {fontSize: 12, color: colors.textSecondary, lineHeight: 18},

  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    ...shadows.md,
  },
  activateBtnDisabled: {opacity: 0.6},
  activateBtnText: {fontSize: 15, fontWeight: '700', color: colors.white},

  cancelBtn: {alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm},
  cancelBtnText: {fontSize: 14, fontWeight: '600', color: colors.textMuted},
});
