/**
 * Simple Migration Module
 * Handles data migration from AsyncStorage to SQLite
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, getSchemaVersion, setSchemaVersion } from './db.js';
import { savePatient } from './patientStorage.js';
import { savePrescriptions } from './prescriptionStorage.js';
import { saveInvestigations } from './investigationStorage.js';
import { getPatientId } from '../storage/secureStorage.js';
import { setMigrationCompleted, isMigrationCompleted } from '../storage/settingsStorage.js';
import { migrateMedicationData } from './medicationMigration.js';

export async function runMigrations() {
  const migrationCompleted = await isMigrationCompleted();
  
  if (migrationCompleted) {
    console.log('[Migration] Already completed, skipping');
    return { success: true, alreadyCompleted: true };
  }
  
  try {
    console.log('[Migration] Starting data migration...');
    
    // Initialize database first
    await getDatabase();
    
    const currentVersion = await getSchemaVersion();
    console.log('[Migration] Current schema version:', currentVersion);
    
    // Run version-specific migrations
    if (currentVersion < 1) {
      await migrateFromAsyncStorage();
      await setSchemaVersion(1);
    }
    
    // Mark migration as completed
    await setMigrationCompleted(true);
    
    console.log('[Migration] All migrations completed successfully');
    return { success: true, migratedData: true };
    
  } catch (error) {
    console.error('[Migration] Failed:', error);
    return { success: false, error: error.message };
  }
}

async function migrateFromAsyncStorage() {
  console.log('[Migration] Migrating from AsyncStorage...');
  
  const patientId = await getPatientId();
  if (!patientId) {
    console.log('[Migration] No patient ID found, skipping data migration');
    return;
  }
  
  try {
    // Migrate patient profile
    await migratePatientProfile(patientId);
    
    // Migrate prescriptions
    await migratePrescriptions(patientId);
    
    // Migrate investigations
    await migrateInvestigations(patientId);
    
    // Migrate invoices
    await migrateInvoices(patientId);
    
    // Migrate appointments
    await migrateAppointments(patientId);
    
    // Migrate medication scheduling data
    await migrateMedicationData();
    
    console.log('[Migration] AsyncStorage data migration completed');
    
  } catch (error) {
    console.error('[Migration] AsyncStorage migration failed:', error);
    throw error;
  }
}

async function migratePatientProfile(patientId) {
  try {
    // Check for various profile keys used historically
    const profileKeys = ['userProfile', 'profile', 'patientProfile'];
    let profileData = null;
    
    for (const key of profileKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        profileData = JSON.parse(data);
        break;
      }
    }
    
    if (profileData) {
      // Transform and save to SQLite
      const transformedProfile = {
        id: patientId,
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        mobile: profileData.mobile || profileData.mobileNo || '',
        email: profileData.email || '',
        dateOfBirth: profileData.dateOfBirth || profileData.dob || '',
        gender: profileData.gender || '',
        weight: profileData.weight || null,
        height: profileData.height || null,
        weightUnit: profileData.weightUnit || 'kg',
        heightUnit: profileData.heightUnit || 'cm',
        bp: profileData.bp || '',
        // Remove bloodGroup as per user request
        ...profileData // Keep any additional fields
      };
      
      await savePatient(patientId, transformedProfile);
      console.log('[Migration] Patient profile migrated successfully');
    } else {
      console.log('[Migration] No patient profile found in AsyncStorage');
    }
  } catch (error) {
    console.error('[Migration] Patient profile migration failed:', error);
  }
}

async function migratePrescriptions(patientId) {
  try {
    // Check for prescription data
    const prescriptionKeys = ['prescriptions', 'rxData', 'medications'];
    let prescriptionData = [];
    
    for (const key of prescriptionKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          prescriptionData = parsed;
          break;
        }
      }
    }
    
    if (prescriptionData.length > 0) {
      await savePrescriptions(patientId, prescriptionData);
      console.log(`[Migration] ${prescriptionData.length} prescriptions migrated successfully`);
    } else {
      console.log('[Migration] No prescriptions found in AsyncStorage');
    }
  } catch (error) {
    console.error('[Migration] Prescriptions migration failed:', error);
  }
}

async function migrateInvestigations(patientId) {
  try {
    // Check for investigation data
    const investigationKeys = ['investigations', 'reports', 'labResults'];
    let investigationData = [];
    
    for (const key of investigationKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          investigationData = parsed;
          break;
        }
      }
    }
    
    if (investigationData.length > 0) {
      await saveInvestigations(patientId, investigationData);
      console.log(`[Migration] ${investigationData.length} investigations migrated successfully`);
    } else {
      console.log('[Migration] No investigations found in AsyncStorage');
    }
  } catch (error) {
    console.error('[Migration] Investigations migration failed:', error);
  }
}

// Clean up old AsyncStorage keys after successful migration
export async function cleanupOldAsyncStorageData() {
  const keysToClean = [
    // Profile keys
    'userProfile', 'profile', 'patientProfile',
    
    // Prescription keys  
    'prescriptions', 'rxData', 'medications',
    
    // Investigation keys
    'investigations', 'reports', 'labResults',
    
    // Invoice keys
    'invoices', 'bills', 'billing',
    
    // Appointment keys
    'appointments', 'appointmentHistory', '@appointments_cache',
    
    // Cache keys (can be safely removed)
    '@rx_detail_', '@appointments_cache', '@investigations_cache'
  ];
  
  try {
    // Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Find keys that start with cache prefixes or match exact keys
    const keysToRemove = allKeys.filter(key => 
      keysToClean.some(cleanKey => 
        key === cleanKey || key.startsWith(cleanKey)
      )
    );
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`[Migration] Cleaned up ${keysToRemove.length} old AsyncStorage keys`);
    }
    
  } catch (error) {
    console.error('[Migration] Cleanup failed:', error);
  }
}


async function migrateInvoices(patientId) {
  try {
    // Check for invoice data in AsyncStorage
    const invoiceKeys = ['invoices', 'bills', 'billing'];
    let invoiceData = [];
    
    for (const key of invoiceKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          invoiceData = parsed;
          break;
        }
      }
    }
    
    if (invoiceData.length > 0) {
      const { saveInvoices } = await import('./invoiceStorage.js');
      await saveInvoices(patientId, invoiceData);
      console.log(`[Migration] ${invoiceData.length} invoices migrated successfully`);
    } else {
      console.log('[Migration] No invoices found in AsyncStorage');
    }
  } catch (error) {
    console.error('[Migration] Invoices migration failed:', error);
  }
}

async function migrateAppointments(patientId) {
  try {
    // Check for appointment data in AsyncStorage
    const appointmentKeys = ['appointments', 'appointmentHistory', '@appointments_cache'];
    let appointmentData = [];
    
    for (const key of appointmentKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          appointmentData = parsed;
          break;
        }
      }
    }
    
    if (appointmentData.length > 0) {
      const { saveAppointmentHistory } = await import('./appointmentStorage.js');
      await saveAppointmentHistory(patientId, appointmentData);
      console.log(`[Migration] ${appointmentData.length} appointments migrated successfully`);
    } else {
      console.log('[Migration] No appointments found in AsyncStorage');
    }
  } catch (error) {
    console.error('[Migration] Appointments migration failed:', error);
  }
}
