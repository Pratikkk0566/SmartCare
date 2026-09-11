/**
 * Medication Store Migration Service
 * ---------------------------------
 * Handles the progressive migration from AsyncStorage to SQLite
 * Provides a unified interface that routes to appropriate storage backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageMedicationStore } from './AsyncStorageMedicationStore';
import { SQLitePrescriptionService } from './SQLitePrescriptionService';

const MIGRATION_FLAGS = {
  PRESCRIPTIONS_MIGRATED: '@migration_prescriptions_complete_v1',
  SCHEDULES_MIGRATED: '@migration_schedules_complete_v1',
};

export class MedicationStoreMigrationService {
  constructor() {
    this.asyncStore = new AsyncStorageMedicationStore();
    this.sqliteService = new SQLitePrescriptionService();
    this.migrationStatus = {
      prescriptions: false,
      schedules: false
    };
  }

  async init() {
    await Promise.all([
      this.asyncStore.init(),
      this.sqliteService.init()
    ]);
    
    await this.checkMigrationStatus();
  }

  /**
   * Check which data has already been migrated
   */
  async checkMigrationStatus() {
    try {
      const [prescriptionsMigrated, schedulesMigrated] = await Promise.all([
        AsyncStorage.getItem(MIGRATION_FLAGS.PRESCRIPTIONS_MIGRATED),
        AsyncStorage.getItem(MIGRATION_FLAGS.SCHEDULES_MIGRATED)
      ]);

      this.migrationStatus = {
        prescriptions: prescriptionsMigrated === 'true',
        schedules: schedulesMigrated === 'true'
      };

      console.log('[Migration] Status:', this.migrationStatus);
    } catch (error) {
      console.error('[Migration] Failed to check status:', error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UNIFIED PRESCRIPTION INTERFACE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Create prescription - routes to appropriate storage
   */
  async createPrescription(prescriptionData) {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.createPrescription(prescriptionData);
    } else {
      return this.asyncStore.createPrescription(prescriptionData);
    }
  }

  /**
   * Get prescription - checks both stores if needed
   */
  async getPrescription(prescriptionId) {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.getPrescription(prescriptionId);
    } else {
      return this.asyncStore.getPrescription(prescriptionId);
    }
  }

  /**
   * Update prescription - routes to appropriate storage
   */
  async updatePrescription(prescriptionId, updates) {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.updatePrescription(prescriptionId, updates);
    } else {
      return this.asyncStore.updatePrescription(prescriptionId, updates);
    }
  }

  /**
   * Delete prescription - routes to appropriate storage
   */
  async deletePrescription(prescriptionId) {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.deletePrescription(prescriptionId);
    } else {
      return this.asyncStore.deletePrescription(prescriptionId);
    }
  }

  /**
   * List all prescriptions - routes to appropriate storage
   */
  async getAllPrescriptions() {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.getAllPrescriptions();
    } else {
      return this.asyncStore.getAllPrescriptions();
    }
  }

  /**
   * Activate prescription - routes to appropriate storage
   */
  async activatePrescription(prescriptionId) {
    if (this.migrationStatus.prescriptions) {
      return this.sqliteService.activatePrescription(prescriptionId);
    } else {
      return this.asyncStore.activatePrescription(prescriptionId);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCHEDULE INTERFACE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get today's medication schedule
   */
  async getTodaysSchedule() {
    if (this.migrationStatus.schedules) {
      return this.sqliteService.getTodaysSchedule();
    } else {
      return this.asyncStore.getTodaysSchedule();
    }
  }

  /**
   * Mark dose as taken
   */
  async markDoseAsTaken(doseId, actualTime = null, notes = '') {
    if (this.migrationStatus.schedules) {
      return this.sqliteService.markDoseAsTaken(doseId, actualTime, notes);
    } else {
      return this.asyncStore.markDoseAsTaken(doseId, actualTime, notes);
    }
  }

  /**
   * Get adherence statistics
   */
  async getAdherenceStats(days = 7) {
    if (this.migrationStatus.schedules) {
      return this.sqliteService.getAdherenceStats(days);
    } else {
      return this.asyncStore.getAdherenceStats(days);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MIGRATION OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Migrate prescriptions from AsyncStorage to SQLite
   */
  async migratePrescriptions() {
    if (this.migrationStatus.prescriptions) {
      console.log('[Migration] Prescriptions already migrated');
      return { success: true, migrated: 0, skipped: 0 };
    }

    console.log('[Migration] Starting prescription migration...');
    
    try {
      // Get all prescriptions from AsyncStorage
      const asyncPrescriptions = await this.asyncStore.getAllPrescriptions();
      
      let migrated = 0;
      let skipped = 0;

      for (const asyncPrescription of asyncPrescriptions) {
        try {
          // Check if already exists in SQLite
          const existing = await this.sqliteService.getPrescription(asyncPrescription.id);
          if (existing) {
            skipped++;
            continue;
          }

          // Transform data format if needed
          const sqlitePrescription = this.transformPrescriptionData(asyncPrescription);
          
          // Create in SQLite
          await this.sqliteService.createPrescription(sqlitePrescription);
          migrated++;

          console.log(`[Migration] Migrated prescription: ${asyncPrescription.id}`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate prescription ${asyncPrescription.id}:`, error);
        }
      }

      // Mark migration as complete
      await AsyncStorage.setItem(MIGRATION_FLAGS.PRESCRIPTIONS_MIGRATED, 'true');
      this.migrationStatus.prescriptions = true;

      console.log(`[Migration] Prescription migration complete: ${migrated} migrated, ${skipped} skipped`);
      
      return { success: true, migrated, skipped };
    } catch (error) {
      console.error('[Migration] Prescription migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Migrate medication schedules from AsyncStorage to SQLite
   */
  async migrateSchedules() {
    if (this.migrationStatus.schedules) {
      console.log('[Migration] Schedules already migrated');
      return { success: true, migrated: 0, skipped: 0 };
    }

    console.log('[Migration] Starting schedule migration...');
    
    try {
      // Get all schedules from AsyncStorage
      const asyncSchedules = await this.asyncStore.getAllSchedules();
      
      let migrated = 0;
      let skipped = 0;

      for (const schedule of asyncSchedules) {
        try {
          // Transform and create in SQLite
          const sqliteSchedule = this.transformScheduleData(schedule);
          await this.sqliteService.createScheduledDose(sqliteSchedule);
          migrated++;

          console.log(`[Migration] Migrated schedule: ${schedule.id}`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate schedule ${schedule.id}:`, error);
        }
      }

      // Mark migration as complete
      await AsyncStorage.setItem(MIGRATION_FLAGS.SCHEDULES_MIGRATED, 'true');
      this.migrationStatus.schedules = true;

      console.log(`[Migration] Schedule migration complete: ${migrated} migrated, ${skipped} skipped`);
      
      return { success: true, migrated, skipped };
    } catch (error) {
      console.error('[Migration] Schedule migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all migrations
   */
  async migrateAll() {
    console.log('[Migration] Starting full migration...');
    
    const results = {
      prescriptions: await this.migratePrescriptions(),
      schedules: await this.migrateSchedules()
    };

    console.log('[Migration] Full migration results:', results);
    return results;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DATA TRANSFORMATION
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Transform AsyncStorage prescription data to SQLite format
   */
  transformPrescriptionData(asyncPrescription) {
    return {
      id: asyncPrescription.id,
      name: asyncPrescription.name || asyncPrescription.prescriptionName,
      doctorName: asyncPrescription.doctorName,
      startDate: asyncPrescription.startDate,
      endDate: asyncPrescription.endDate,
      notes: asyncPrescription.notes,
      status: asyncPrescription.status || 'active',
      medicines: (asyncPrescription.medications || asyncPrescription.medicines || []).map(med => ({
        id: med.id,
        medicineName: med.name || med.medicineName,
        medicineType: med.type || med.medicineType || 'tablet',
        doseValue: med.dose || med.doseValue || 1,
        doseUnit: med.unit || med.doseUnit || 'tablet',
        frequency: med.frequency,
        foodInstruction: med.foodInstruction,
        startDate: med.startDate || asyncPrescription.startDate,
        endDate: med.endDate || asyncPrescription.endDate,
        durationDays: med.durationDays,
        instructions: med.instructions,
        times: med.times || []
      }))
    };
  }

  /**
   * Transform AsyncStorage schedule data to SQLite format
   */
  transformScheduleData(asyncSchedule) {
    return {
      id: asyncSchedule.id,
      medicineId: asyncSchedule.medicineId || asyncSchedule.medicationId,
      scheduledDate: asyncSchedule.date || asyncSchedule.scheduledDate,
      scheduledTime: asyncSchedule.time || asyncSchedule.scheduledTime,
      doseValue: asyncSchedule.dose || asyncSchedule.doseValue || 1,
      doseUnit: asyncSchedule.unit || asyncSchedule.doseUnit || 'tablet',
      status: asyncSchedule.status || 'upcoming',
      takenTime: asyncSchedule.takenTime,
      notes: asyncSchedule.notes
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return { ...this.migrationStatus };
  }

  /**
   * Force re-check migration status
   */
  async refreshMigrationStatus() {
    await this.checkMigrationStatus();
    return this.getMigrationStatus();
  }

  /**
   * Reset migration flags (for testing)
   */
  async resetMigrationFlags() {
    await Promise.all([
      AsyncStorage.removeItem(MIGRATION_FLAGS.PRESCRIPTIONS_MIGRATED),
      AsyncStorage.removeItem(MIGRATION_FLAGS.SCHEDULES_MIGRATED)
    ]);
    
    this.migrationStatus = {
      prescriptions: false,
      schedules: false
    };
    
    console.log('[Migration] Migration flags reset');
  }
}

// Export singleton instance
export const medicationStoreMigration = new MedicationStoreMigrationService();
export default medicationStoreMigration;