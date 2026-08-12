import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
} from '../../assets/icons/Icons';
import {PrescriptionDB} from '../../services/MedicationDatabaseService';

export default function CreatePrescriptionScreen({navigation}) {
  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a prescription name');
      return;
    }

    setIsCreating(true);

    try {
      const prescription = await PrescriptionDB.create({
        name: name.trim(),
        doctorName: doctorName.trim(),
        startDate: new Date(startDate).toISOString(),
        notes: notes.trim(),
      });

      console.log('[CreatePrescription] Created:', prescription.id);

      // Navigate to add medicines
      navigation.replace('AddMedicines', {
        prescriptionId: prescription.id,
        prescriptionName: prescription.name,
      });
    } catch (error) {
      console.error('[CreatePrescription] Error:', error);
      Alert.alert('Error', 'Failed to create prescription. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Prescription</Text>
        </View>

        <Text style={styles.subtitle}>
          Create a prescription to organize your medicines
        </Text>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            Prescription Name <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputRow}>
            <FileTextIcon size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Post Surgery, Diabetes, etc."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Doctor Name</Text>
          <View style={styles.inputRow}>
            <UserIcon size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Dr. John Smith"
              placeholderTextColor={colors.textMuted}
              value={doctorName}
              onChangeText={setDoctorName}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => {
              Alert.alert(
                'Date Picker',
                'Date picker integration coming soon. Using today as default.'
              );
            }}>
            <CalendarIcon size={18} color={colors.textMuted} />
            <Text style={styles.dateText}>
              {new Date(startDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional notes about this prescription..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Offline First</Text>
            <Text style={styles.infoText}>
              Your prescription is stored locally on your device and works
              without internet connection.
            </Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, isCreating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isCreating}
          activeOpacity={0.8}>
          <PlusIcon size={20} color={colors.white} />
          <Text style={styles.createBtnText}>
            {isCreating ? 'Creating...' : 'Create & Add Medicines'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={isCreating}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {
    padding: spacing.base,
    paddingTop: spacing['4xl'],
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  back: {padding: 4},
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  formSection: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },

  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.lg,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    ...shadows.md,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
