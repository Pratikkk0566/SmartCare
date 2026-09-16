/**
 * SQLite Storage Service
 * ---------------------
 * Replaces AsyncStorage-based StorageService with SQLite-first approach
 * Maintains backward compatibility with same API surface
 * 
 * ARCHITECTURE: SQLite-First
 * - PHR data stored in SQLite (patients, prescriptions, investigations, invoices, appointments)
 * - Timestamps tracked in metadata
 * - Multi-patient support with patient_id isolation
 * - AsyncStorage only for non-PHR settings (kept minimal)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePatient,
  getPatient,
  savePrescriptions as savePrescriptionsToDb,
  getPrescriptions as getPrescriptionsFromDb,
  upsertPrescriptions as upsertPrescriptionsToDb,
  getActivePrescriptions as getActivePrescriptionsFromDb,
  saveInvestigations as saveInvestigationsToDb,
  getInvestigations as getInvestigationsFromDb,
  saveInvoices as saveInvoicesToDb,
  getInvoices as getInvoicesFromDb,
  saveAppointmentHistory as saveAppointmentsToDb,
  getAppointments as getAppointmentsFromDb,
} from '../database/index.js';
import { getPatientId } from '../storage/secureStorage.js';

/**
 * Get current patient ID
 * This is the key to multi-patient support
 */
async function getCurrentPatientId() {
  // Try secure storage first (from auth)
  let patientId = await getPatientId();
  
  // Fallback to direct AsyncStorage check
  if (!patientId) {
    patientId = await AsyncStorage.getItem('patientId');
  }
  
  return patientId;
}

/**
 * SQLite-First Storage Service
 * Same API as original StorageService but uses SQLite for PHR data
 */
export const SqliteStorageService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC KEY-VALUE (kept for non-PHR settings)
  // ═══════════════════════════════════════════════════════════════════════════
  
  set: async (key, value) => {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  
  get: async key => {
    const val = await AsyncStorage.getItem(key);
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },
  
  remove: async key => AsyncStorage.removeItem(key),
  
  clear: async () => {
    // WARNING: This clears ALL AsyncStorage
    // Use with extreme caution
    await AsyncStorage.clear();
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENT PROFILE (SQLite-First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  saveProfile: async (profile, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID available, cannot save profile');
      return;
    }
    
    try {
      // Save to SQLite
      await savePatient(patientId, profile);
      
      // Update timestamp in AsyncStorage for quick access
      await AsyncStorage.setItem('@profileLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Profile saved to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to save profile:', error);
      throw error;
    }
  },
  
  getProfile: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID available, cannot load profile');
      return null;
    }
    
    try {
      const profile = await getPatient(patientId);
      console.log('[SqliteStorageService] Profile loaded from SQLite for patient:', patientId);
      return profile;
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load profile:', error);
      return null;
    }
  },
  
  getProfileLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@profileLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPOINTMENTS (SQLite-First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  saveAppointments: async (appointments, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot save appointments');
      return;
    }
    
    try {
      // Save to SQLite
      await saveAppointmentsToDb(patientId, appointments);
      
      // Update timestamp
      await AsyncStorage.setItem('@appointmentsLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Appointments saved to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to save appointments:', error);
      throw error;
    }
  },
  
  getAppointments: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot load appointments');
      return [];
    }
    
    try {
      const appointments = await getAppointmentsFromDb(patientId);
      console.log('[SqliteStorageService] Appointments loaded from SQLite for patient:', patientId);
      return appointments || [];
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load appointments:', error);
      return [];
    }
  },
  
  getAppointmentsLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@appointmentsLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS (SQLite-First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  savePrescriptions: async (prescriptions, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot save prescriptions');
      return;
    }
    
    try {
      // Save to SQLite (replaces all)
      await savePrescriptionsToDb(patientId, prescriptions);
      
      // Update timestamp
      await AsyncStorage.setItem('@prescriptionsLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Prescriptions saved to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to save prescriptions:', error);
      throw error;
    }
  },
  
  upsertPrescriptions: async (prescriptions, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot upsert prescriptions');
      return;
    }
    
    try {
      // Upsert to SQLite (add or update)
      await upsertPrescriptionsToDb(patientId, prescriptions);
      
      // Update timestamp
      await AsyncStorage.setItem('@prescriptionsLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Prescriptions upserted to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to upsert prescriptions:', error);
      throw error;
    }
  },
  
  getPrescriptions: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot load prescriptions');
      return [];
    }
    
    try {
      const prescriptions = await getPrescriptionsFromDb(patientId);
      console.log('[SqliteStorageService] Prescriptions loaded from SQLite for patient:', patientId);
      return prescriptions || [];
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load prescriptions:', error);
      return [];
    }
  },
  
  getActivePrescriptions: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot load active prescriptions');
      return [];
    }
    
    try {
      const activePrescriptions = await getActivePrescriptionsFromDb(patientId);
      console.log('[SqliteStorageService] Active prescriptions loaded from SQLite for patient:', patientId);
      return activePrescriptions || [];
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load active prescriptions:', error);
      return [];
    }
  },
  
  getPrescriptionsLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@prescriptionsLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRACTITIONERS (Keep in AsyncStorage - not patient-specific)
  // ═══════════════════════════════════════════════════════════════════════════
  
  savePractitioners: async practitioners => {
    await AsyncStorage.setItem('@practitioners', JSON.stringify(practitioners));
    await AsyncStorage.setItem('@practitionersLastUpdated', String(Date.now()));
  },
  
  getPractitioners: async () => {
    const data = await AsyncStorage.getItem('@practitioners');
    return data ? JSON.parse(data) : [];
  },
  
  getPractitionersLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@practitionersLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES (SQLite-First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  saveInvoices: async (invoices, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot save invoices');
      return;
    }
    
    try {
      // Save to SQLite
      await saveInvoicesToDb(patientId, invoices);
      
      // Update timestamp
      await AsyncStorage.setItem('@invoicesLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Invoices saved to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to save invoices:', error);
      throw error;
    }
  },
  
  getInvoices: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot load invoices');
      return [];
    }
    
    try {
      const invoices = await getInvoicesFromDb(patientId);
      console.log('[SqliteStorageService] Invoices loaded from SQLite for patient:', patientId);
      return invoices || [];
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load invoices:', error);
      return [];
    }
  },
  
  getInvoicesLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@invoicesLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INVESTIGATIONS (SQLite-First)
  // ═══════════════════════════════════════════════════════════════════════════
  
  saveInvestigations: async (investigations, patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot save investigations');
      return;
    }
    
    try {
      // Save to SQLite
      await saveInvestigationsToDb(patientId, investigations);
      
      // Update timestamp
      await AsyncStorage.setItem('@investigationsLastUpdated', String(Date.now()));
      
      console.log('[SqliteStorageService] Investigations saved to SQLite for patient:', patientId);
    } catch (error) {
      console.error('[SqliteStorageService] Failed to save investigations:', error);
      throw error;
    }
  },
  
  getInvestigations: async (patientIdOverride = null) => {
    const patientId = patientIdOverride || await getCurrentPatientId();
    
    if (!patientId) {
      console.warn('[SqliteStorageService] No patient ID, cannot load investigations');
      return [];
    }
    
    try {
      const investigations = await getInvestigationsFromDb(patientId);
      console.log('[SqliteStorageService] Investigations loaded from SQLite for patient:', patientId);
      return investigations || [];
    } catch (error) {
      console.error('[SqliteStorageService] Failed to load investigations:', error);
      return [];
    }
  },
  
  getInvestigationsLastUpdated: async () => {
    const ts = await AsyncStorage.getItem('@investigationsLastUpdated');
    return ts ? Number(ts) : null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APP SETTINGS (Keep in AsyncStorage - not patient-specific)
  // ═══════════════════════════════════════════════════════════════════════════
  
  saveLockSettings: async (enabled, type, pin) => {
    await AsyncStorage.setItem('@appLockEnabled', String(enabled));
    await AsyncStorage.setItem('@appLockType', type);
    if (pin) await AsyncStorage.setItem('@appPIN', pin);
  },
  
  getLockSettings: async () => ({
    enabled: (await AsyncStorage.getItem('@appLockEnabled')) === 'true',
    type: await AsyncStorage.getItem('@appLockType'),
    pin: await AsyncStorage.getItem('@appPIN'),
  }),
  
  saveMedicineStatus: async (medicineId, period, status) => {
    const key = '@medicineStatuses';
    const existing = await SqliteStorageService.get(key) || {};
    existing[`${medicineId}_${period}`] = status;
    await SqliteStorageService.set(key, existing);
  },
  
  getMedicineStatuses: async () => {
    return await SqliteStorageService.get('@medicineStatuses') || {};
  },
  
  updateLastActive: async () => {
    await AsyncStorage.setItem('@lastActiveTime', String(Date.now()));
  },
  
  getLastActive: async () => {
    const ts = await AsyncStorage.getItem('@lastActiveTime');
    return ts ? Number(ts) : 0;
  },
  
  saveCredentials: async (email, password) => {
    await AsyncStorage.setItem('@authEmail', email.toLowerCase().trim());
    await AsyncStorage.setItem('@authPassword', password);
  },
  
  getCredentials: async () => ({
    email: await AsyncStorage.getItem('@authEmail'),
    password: await AsyncStorage.getItem('@authPassword'),
  }),
};

// Export as default for easy migration from StorageService
export default SqliteStorageService;
