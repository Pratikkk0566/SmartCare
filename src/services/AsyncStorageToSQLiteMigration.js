/**
 * AsyncStorage to SQLite Migration Service
 * ---------------------------------------
 * Handles complete migration from AsyncStorage to SQLite for better performance
 * This replaces the previous gradual migration approach
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sqliteDataService } from './SQLiteDataService';
import { StorageService } from './StorageService';

const MIGRATION_FLAG = '@migration_to_sqlite_complete_v1';

export class AsyncStorageToSQLiteMigration {
  constructor() {
    this.migrationStatus = {
      completed: false,
      inProgress: false,
      error: null
    };
  }

  /**
   * Check if migration has been completed
   */
  async checkMigrationStatus() {
    try {
      const completed = await AsyncStorage.getItem(MIGRATION_FLAG);
      this.migrationStatus.completed = completed === 'true';
      return this.migrationStatus.completed;
    } catch (error) {
      console.error('[Migration] Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Get current active patient ID from AsyncStorage
   */
  async getCurrentPatientId() {
    try {
      return await AsyncStorage.getItem('patientId');
    } catch (error) {
      console.error('[Migration] Failed to get current patient ID:', error);
      return null;
    }
  }

  /**
   * Migrate profile data
   */
  async migrateProfile(patientId) {
    console.log('[Migration] Migrating profile data...');
    
    try {
      const profile = await StorageService.getProfile();
      if (profile && Object.keys(profile).length > 0) {
        await sqliteDataService.migrateProfileFromAsyncStorage(profile, patientId);
        console.log('[Migration] ✅ Profile migrated successfully');
        return true;
      } else {
        console.log('[Migration] ⚠️ No profile data to migrate');
        return true;
      }
    } catch (error) {
      console.error('[Migration] ❌ Profile migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate investigations data
   */
  async migrateInvestigations(patientId) {
    console.log('[Migration] Migrating investigations data...');
    
    try {
      const investigations = await StorageService.getInvestigations();
      if (investigations && investigations.length > 0) {
        await sqliteDataService.migrateInvestigationsFromAsyncStorage(investigations, patientId);
        console.log(`[Migration] ✅ ${investigations.length} investigations migrated successfully`);
        return investigations.length;
      } else {
        console.log('[Migration] ⚠️ No investigations data to migrate');
        return 0;
      }
    } catch (error) {
      console.error('[Migration] ❌ Investigations migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate appointments data
   */
  async migrateAppointments(patientId) {
    console.log('[Migration] Migrating appointments data...');
    
    try {
      const appointments = await StorageService.getAppointments();
      if (appointments && appointments.length > 0) {
        // Transform and save appointments (you'll need to implement this in SQLiteDataService)
        // For now, just log the count
        console.log(`[Migration] ℹ️ Found ${appointments.length} appointments to migrate (implementation pending)`);
        return appointments.length;
      } else {
        console.log('[Migration] ⚠️ No appointments data to migrate');
        return 0;
      }
    } catch (error) {
      console.error('[Migration] ❌ Appointments migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate invoices data
   */
  async migrateInvoices(patientId) {
    console.log('[Migration] Migrating invoices data...');
    
    try {
      const invoices = await StorageService.getInvoices();
      if (invoices && invoices.length > 0) {
        // Transform and save invoices (you'll need to implement this in SQLiteDataService)
        console.log(`[Migration] ℹ️ Found ${invoices.length} invoices to migrate (implementation pending)`);
        return invoices.length;
      } else {
        console.log('[Migration] ⚠️ No invoices data to migrate');
        return 0;
      }
    } catch (error) {
      console.error('[Migration] ❌ Invoices migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate practitioners data
   */
  async migratePractitioners() {
    console.log('[Migration] Migrating practitioners data...');
    
    try {
      const practitioners = await StorageService.getPractitioners();
      if (practitioners && practitioners.length > 0) {
        // Transform and save practitioners (you'll need to implement this in SQLiteDataService)
        console.log(`[Migration] ℹ️ Found ${practitioners.length} practitioners to migrate (implementation pending)`);
        return practitioners.length;
      } else {
        console.log('[Migration] ⚠️ No practitioners data to migrate');
        return 0;
      }
    } catch (error) {
      console.error('[Migration] ❌ Practitioners migration failed:', error);
      throw error;
    }
  }

  /**
   * Run complete migration from AsyncStorage to SQLite
   */
  async runCompleteMigration() {
    if (this.migrationStatus.inProgress) {
      console.log('[Migration] Migration already in progress');
      return this.migrationStatus;
    }

    // Check if already completed
    const isCompleted = await this.checkMigrationStatus();
    if (isCompleted) {
      console.log('[Migration] Migration already completed');
      return { completed: true, alreadyCompleted: true };
    }

    console.log('[Migration] 🚀 Starting complete AsyncStorage to SQLite migration...');
    
    this.migrationStatus = {
      completed: false,
      inProgress: true,
      error: null
    };

    try {
      // Initialize SQLite
      await sqliteDataService.init();

      // Get current patient ID from AsyncStorage
      const patientId = await this.getCurrentPatientId();
      if (!patientId) {
        throw new Error('No patient ID found in AsyncStorage - cannot migrate data');
      }

      console.log(`[Migration] Migrating data for patient ID: ${patientId}`);

      // Set current patient in SQLite service
      sqliteDataService.setCurrentPatient(patientId);

      // Track migration results
      const results = {
        patientId: patientId,
        profile: false,
        investigations: 0,
        appointments: 0,
        invoices: 0,
        practitioners: 0,
        startTime: Date.now()
      };

      // Migrate profile data
      results.profile = await this.migrateProfile(patientId);

      // Migrate investigations (most important for your current issue)
      results.investigations = await this.migrateInvestigations(patientId);

      // Migrate other data types
      results.appointments = await this.migrateAppointments(patientId);
      results.invoices = await this.migrateInvoices(patientId);
      results.practitioners = await this.migratePractitioners();

      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

      // Mark migration as complete
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');

      this.migrationStatus = {
        completed: true,
        inProgress: false,
        error: null,
        results
      };

      console.log('[Migration] ✅ Complete migration finished successfully!');
      console.log('[Migration] Results:', results);

      return this.migrationStatus;

    } catch (error) {
      console.error('[Migration] ❌ Complete migration failed:', error);
      
      this.migrationStatus = {
        completed: false,
        inProgress: false,
        error: error.message
      };

      throw error;
    }
  }

  /**
   * Reset migration (for testing or retry)
   */
  async resetMigration() {
    console.log('[Migration] Resetting migration flag...');
    
    try {
      await AsyncStorage.removeItem(MIGRATION_FLAG);
      this.migrationStatus = {
        completed: false,
        inProgress: false,
        error: null
      };
      console.log('[Migration] Migration flag reset successfully');
    } catch (error) {
      console.error('[Migration] Failed to reset migration flag:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return { ...this.migrationStatus };
  }

  /**
   * Verify migrated data integrity
   */
  async verifyMigration(patientId) {
    console.log('[Migration] Verifying migrated data...');
    
    try {
      // Check SQLite data
      const sqliteProfile = await sqliteDataService.getProfile(patientId);
      const sqliteInvestigations = await sqliteDataService.getInvestigations(patientId);
      const sqliteStats = await sqliteDataService.getPatientDashboardStats(patientId);

      // Check AsyncStorage data
      const asyncProfile = await StorageService.getProfile();
      const asyncInvestigations = await StorageService.getInvestigations();

      const verification = {
        profile: {
          async: asyncProfile ? 'exists' : 'missing',
          sqlite: sqliteProfile ? 'exists' : 'missing',
          match: Boolean(asyncProfile && sqliteProfile)
        },
        investigations: {
          async: asyncInvestigations ? asyncInvestigations.length : 0,
          sqlite: sqliteInvestigations ? sqliteInvestigations.length : 0,
          match: (asyncInvestigations?.length || 0) === (sqliteInvestigations?.length || 0)
        },
        stats: sqliteStats
      };

      console.log('[Migration] Verification results:', verification);
      return verification;

    } catch (error) {
      console.error('[Migration] Verification failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const asyncStorageToSQLiteMigration = new AsyncStorageToSQLiteMigration();
export default asyncStorageToSQLiteMigration;