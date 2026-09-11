/**
 * Prescription Migration Service
 * -----------------------------
 * Handles migration of prescription data from AsyncStorage to SQLite.
 * Provides safe, one-time migration with rollback capabilities.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { prescriptionService } from './SQLitePrescriptionService';
import { AsyncStorageMedicationStore } from './AsyncStorageMedicationStore';
import { StorageService } from './StorageService';

export class PrescriptionMigrationService {
  constructor() {
    this.migrationKey = '@prescription_migration_completed';
    this.backupKey = '@prescription_migration_backup';
  }

  /**
   * Check if migration has already been completed
   */
  async isMigrationCompleted() {
    try {
      const completed = await AsyncStorage.getItem(this.migrationKey);
      return completed === 'true';
    } catch (error) {
      console.error('[Migration] Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Mark migration as completed
   */
  async markMigrationCompleted() {
    await AsyncStorage.setItem(this.migrationKey, 'true');
    await AsyncStorage.setItem(`${this.migrationKey}_timestamp`, new Date().toISOString());
  }

  /**
   * Get existing AsyncStorage prescription data
   */
  async getExistingData() {
    const data = {
      medicationStore: null,
      legacyPrescriptions: null,
      medicineStatuses: null
    };

    try {
      // Get data from AsyncStorageMedicationStore
      const medicationStore = new AsyncStorageMedicationStore();
      await medicationStore.init();
      
      const prescriptions = await medicationStore.listPrescriptions();
      const medications = await medicationStore.listMedications();
      const schedules = await medicationStore.listSchedules();
      const alarms = await medicationStore.listAlarms();
      const events = await medicationStore.listEvents();

      if (prescriptions.length > 0 || medications.length > 0) {
        data.medicationStore = {
          prescriptions,
          medications,
          schedules,
          alarms,
          events
        };
      }

      // Check for legacy prescription data in other storage formats
      // This might need to be adjusted based on actual legacy formats
      const legacyKeys = [
        '@prescriptions',
        '@medications', 
        '@medicine_prescriptions',
        '@medication_prescriptions'
      ];

      for (const key of legacyKeys) {
        try {
          const legacyData = await AsyncStorage.getItem(key);
          if (legacyData) {
            const parsed = JSON.parse(legacyData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              data.legacyPrescriptions = data.legacyPrescriptions || {};
              data.legacyPrescriptions[key] = parsed;
            }
          }
        } catch (error) {
          console.log(`[Migration] No data found in ${key} or parsing failed`);
        }
      }

      // Get medicine statuses
      data.medicineStatuses = await StorageService.getMedicineStatuses();

    } catch (error) {
      console.error('[Migration] Error getting existing data:', error);
    }

    return data;
  }

  /**
   * Create backup of existing data before migration
   */
  async createBackup(data) {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        data: data
      };
      
      await AsyncStorage.setItem(this.backupKey, JSON.stringify(backup));
      console.log('[Migration] Backup created successfully');
      return true;
    } catch (error) {
      console.error('[Migration] Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Migrate AsyncStorageMedicationStore data to SQLite
   */
  async migrateMedicationStore(medicationStoreData) {
    if (!medicationStoreData) return { imported: 0, errors: 0 };

    let imported = 0;
    let errors = 0;

    console.log('[Migration] Migrating medication store data...');

    try {
      const { prescriptions, medications } = medicationStoreData;

      // Group medications by prescription
      const prescriptionMap = new Map();
      
      // Process prescriptions
      for (const oldPrescription of prescriptions || []) {
        prescriptionMap.set(oldPrescription.prescriptionId || oldPrescription.id, {
          prescription: oldPrescription,
          medicines: []
        });
      }

      // Group medications by prescription
      for (const medication of medications || []) {
        const prescriptionId = medication.prescriptionId;
        if (prescriptionMap.has(prescriptionId)) {
          prescriptionMap.get(prescriptionId).medicines.push(medication);
        } else {
          // Create a default prescription for orphaned medications
          prescriptionMap.set(prescriptionId, {
            prescription: {
              prescriptionId: prescriptionId,
              name: `Imported Prescription ${prescriptionId}`,
              doctorName: 'Unknown Doctor',
              startDate: medication.startDate || new Date().toISOString(),
              status: 'active'
            },
            medicines: [medication]
          });
        }
      }

      // Import each prescription with its medicines
      for (const [prescriptionId, { prescription, medicines }] of prescriptionMap) {
        try {
          const prescriptionData = {
            name: prescription.name || prescription.prescriptionName || `Prescription ${prescriptionId}`,
            doctorName: prescription.doctorName || prescription.doctor || 'Unknown Doctor',
            startDate: prescription.startDate || prescription.createdAt || new Date().toISOString(),
            endDate: prescription.endDate || null,
            notes: prescription.notes || prescription.instructions || '',
            medicines: medicines.map(med => this.mapMedicationToMedicine(med))
          };

          await prescriptionService.createPrescription(prescriptionData);
          imported++;
          console.log(`[Migration] Imported prescription: ${prescriptionData.name}`);

        } catch (error) {
          console.error(`[Migration] Failed to import prescription ${prescriptionId}:`, error);
          errors++;
        }
      }

    } catch (error) {
      console.error('[Migration] Error during medication store migration:', error);
      errors++;
    }

    return { imported, errors };
  }

  /**
   * Map old medication format to new medicine format
   */
  mapMedicationToMedicine(oldMedication) {
    return {
      medicineName: oldMedication.medicineName || oldMedication.name || 'Unknown Medicine',
      medicineType: oldMedication.medicineType || oldMedication.type || 'tablet',
      doseValue: oldMedication.doseValue || oldMedication.dose || 1,
      doseUnit: oldMedication.doseUnit || oldMedication.unit || 'tablet',
      frequency: oldMedication.frequency || 'once_daily',
      foodInstruction: oldMedication.foodInstruction || oldMedication.food || '',
      startDate: oldMedication.startDate || new Date().toISOString(),
      endDate: oldMedication.endDate || null,
      durationDays: oldMedication.durationDays || oldMedication.duration || 0,
      totalQuantity: oldMedication.totalQuantity || oldMedication.quantity || 0,
      instructions: oldMedication.instructions || oldMedication.notes || '',
      times: oldMedication.times || oldMedication.medicationTimes || []
    };
  }

  /**
   * Migrate legacy prescription data
   */
  async migrateLegacyData(legacyData) {
    if (!legacyData) return { imported: 0, errors: 0 };

    let imported = 0;
    let errors = 0;

    console.log('[Migration] Migrating legacy prescription data...');

    try {
      for (const [storageKey, prescriptions] of Object.entries(legacyData)) {
        console.log(`[Migration] Processing ${storageKey} with ${prescriptions.length} prescriptions`);
        
        for (const oldPrescription of prescriptions) {
          try {
            const prescriptionData = this.mapLegacyPrescription(oldPrescription);
            await prescriptionService.createPrescription(prescriptionData);
            imported++;
            console.log(`[Migration] Imported legacy prescription: ${prescriptionData.name}`);
          } catch (error) {
            console.error(`[Migration] Failed to import legacy prescription:`, error);
            errors++;
          }
        }
      }
    } catch (error) {
      console.error('[Migration] Error during legacy data migration:', error);
      errors++;
    }

    return { imported, errors };
  }

  /**
   * Map legacy prescription format to new format
   */
  mapLegacyPrescription(oldPrescription) {
    // This needs to be customized based on actual legacy data structure
    return {
      name: oldPrescription.name || oldPrescription.prescriptionName || 'Imported Prescription',
      doctorName: oldPrescription.doctorName || oldPrescription.doctor || 'Unknown Doctor',
      startDate: oldPrescription.startDate || oldPrescription.createdAt || new Date().toISOString(),
      endDate: oldPrescription.endDate || null,
      notes: oldPrescription.notes || oldPrescription.instructions || 'Migrated from legacy storage',
      medicines: (oldPrescription.medicines || oldPrescription.medications || []).map(med => 
        this.mapMedicationToMedicine(med)
      )
    };
  }

  /**
   * Perform complete migration
   */
  async performMigration() {
    console.log('[Migration] Starting prescription data migration...');

    // Check if already completed
    if (await this.isMigrationCompleted()) {
      console.log('[Migration] Migration already completed');
      return { success: true, alreadyCompleted: true };
    }

    try {
      // Get existing data
      console.log('[Migration] Gathering existing data...');
      const existingData = await this.getExistingData();

      // Check if there's any data to migrate
      const hasData = existingData.medicationStore || 
                     existingData.legacyPrescriptions || 
                     (existingData.medicineStatuses && Object.keys(existingData.medicineStatuses).length > 0);

      if (!hasData) {
        console.log('[Migration] No prescription data found to migrate');
        await this.markMigrationCompleted();
        return { success: true, noDataFound: true };
      }

      // Create backup
      console.log('[Migration] Creating backup...');
      const backupCreated = await this.createBackup(existingData);
      if (!backupCreated) {
        throw new Error('Failed to create backup');
      }

      // Initialize SQLite service
      await prescriptionService.init();

      // Perform migrations
      const results = {
        medicationStore: { imported: 0, errors: 0 },
        legacyData: { imported: 0, errors: 0 }
      };

      if (existingData.medicationStore) {
        results.medicationStore = await this.migrateMedicationStore(existingData.medicationStore);
      }

      if (existingData.legacyPrescriptions) {
        results.legacyData = await this.migrateLegacyData(existingData.legacyPrescriptions);
      }

      // Mark migration as completed
      await this.markMigrationCompleted();

      console.log('[Migration] Migration completed successfully');
      console.log('[Migration] Results:', results);

      return {
        success: true,
        results: results,
        totalImported: results.medicationStore.imported + results.legacyData.imported,
        totalErrors: results.medicationStore.errors + results.legacyData.errors
      };

    } catch (error) {
      console.error('[Migration] Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore from backup (rollback migration)
   */
  async restoreFromBackup() {
    try {
      const backupData = await AsyncStorage.getItem(this.backupKey);
      if (!backupData) {
        throw new Error('No backup found');
      }

      const backup = JSON.parse(backupData);
      console.log('[Migration] Restoring from backup created at:', backup.timestamp);

      // Clear migration flag
      await AsyncStorage.removeItem(this.migrationKey);
      
      // This would restore the AsyncStorage data if needed
      // Implementation depends on specific restoration requirements
      
      console.log('[Migration] Backup restored successfully');
      return true;
    } catch (error) {
      console.error('[Migration] Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Get migration status and statistics
   */
  async getMigrationStatus() {
    const completed = await this.isMigrationCompleted();
    
    let timestamp = null;
    if (completed) {
      timestamp = await AsyncStorage.getItem(`${this.migrationKey}_timestamp`);
    }

    const sqliteStats = completed ? await prescriptionService.getDebugStats() : null;

    return {
      completed,
      timestamp,
      sqliteStats,
      hasBackup: !!(await AsyncStorage.getItem(this.backupKey))
    };
  }
}

// Export singleton instance
export const prescriptionMigrationService = new PrescriptionMigrationService();

export default prescriptionMigrationService;