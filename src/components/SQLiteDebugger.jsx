/**
 * SQLite Debugger Component
 * -------------------------
 * Development component for testing SQLite functionality and viewing debug information.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { DatabaseTest } from '../database/DatabaseTest';
import { prescriptionService } from '../services/SQLitePrescriptionService';
import { prescriptionMigrationService } from '../services/PrescriptionMigrationService';

export function SQLiteDebugger({ onClose }) {
  const [stats, setStats] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadMigrationStatus();
  }, []);

  const loadStats = async () => {
    try {
      const dbStats = await prescriptionService.getDebugStats();
      const prescriptionStats = await prescriptionService.getPrescriptionStats();
      const adherenceStats = await prescriptionService.getAdherenceStats();
      
      setStats({
        database: dbStats,
        prescriptions: prescriptionStats,
        adherence: adherenceStats
      });
    } catch (error) {
      console.error('[SQLiteDebugger] Error loading stats:', error);
    }
  };

  const loadMigrationStatus = async () => {
    try {
      const status = await prescriptionMigrationService.getMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('[SQLiteDebugger] Error loading migration status:', error);
    }
  };

  const runTests = async () => {
    setLoading(true);
    try {
      const results = await DatabaseTest.runAllTests();
      setTestResults(results);
      await loadStats(); // Refresh stats after tests
    } catch (error) {
      Alert.alert('Test Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setLoading(true);
    try {
      const result = await prescriptionMigrationService.performMigration();
      await loadMigrationStatus();
      await loadStats();
      
      Alert.alert(
        'Migration Result',
        `Success: ${result.success}\n` +
        `Imported: ${result.totalImported || 0}\n` +
        `Errors: ${result.totalErrors || 0}`
      );
    } catch (error) {
      Alert.alert('Migration Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setLoading(true);
    try {
      const samplePrescription = {
        name: 'Sample Prescription',
        doctorName: 'Dr. Sample',
        startDate: new Date().toISOString(),
        notes: 'This is a sample prescription for testing',
        medicines: [
          {
            medicineName: 'Sample Medicine A',
            medicineType: 'tablet',
            doseValue: 1,
            doseUnit: 'tablet',
            frequency: 'twice_daily',
            foodInstruction: 'after_food',
            durationDays: 7,
            times: ['08:00', '20:00']
          },
          {
            medicineName: 'Sample Medicine B',
            medicineType: 'syrup',
            doseValue: 5,
            doseUnit: 'ml',
            frequency: 'three_times_daily',
            foodInstruction: 'before_food',
            durationDays: 5,
            times: ['08:00', '14:00', '20:00']
          }
        ]
      };

      const created = await prescriptionService.createPrescription(samplePrescription);
      await prescriptionService.activatePrescription(created.id);
      await loadStats();
      
      Alert.alert('Sample Data', 'Sample prescription created and activated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>SQLite Debugger</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.button} onPress={runTests} disabled={loading}>
            <Text style={styles.buttonText}>Run Tests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={createSampleData} disabled={loading}>
            <Text style={styles.buttonText}>Create Sample Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={runMigration} disabled={loading}>
            <Text style={styles.buttonText}>Run Migration</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={() => { loadStats(); loadMigrationStatus(); }} disabled={loading}>
            <Text style={styles.buttonText}>Refresh Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Results */}
      {testResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Passed</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{testResults.passed}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={[styles.statValue, { color: colors.error }]}>{testResults.failed}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{testResults.total}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Migration Status */}
      {migrationStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Migration Status</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Completed:</Text>
              <Text style={[styles.infoValue, { color: migrationStatus.completed ? colors.success : colors.warning }]}>
                {migrationStatus.completed ? 'Yes' : 'No'}
              </Text>
            </View>
            {migrationStatus.timestamp && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{new Date(migrationStatus.timestamp).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Has Backup:</Text>
              <Text style={styles.infoValue}>{migrationStatus.hasBackup ? 'Yes' : 'No'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Database Stats */}
      {stats && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Tables</Text>
            <View style={styles.statsGrid}>
              {Object.entries(stats.database).map(([table, count]) => (
                <View key={table} style={styles.statItem}>
                  <Text style={styles.statLabel}>{table}</Text>
                  <Text style={styles.statValue}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{stats.prescriptions.total}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Active</Text>
                <Text style={styles.statValue}>{stats.prescriptions.active}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Draft</Text>
                <Text style={styles.statValue}>{stats.prescriptions.draft}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Medicines</Text>
                <Text style={styles.statValue}>{stats.prescriptions.totalMedicines}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adherence Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Taken</Text>
                <Text style={styles.statValue}>{stats.adherence.taken}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Missed</Text>
                <Text style={styles.statValue}>{stats.adherence.missed}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Adherence Rate</Text>
                <Text style={styles.statValue}>{Math.round(stats.adherence.adherenceRate)}%</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  closeText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minWidth: '45%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statItem: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    minWidth: '30%',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default SQLiteDebugger;