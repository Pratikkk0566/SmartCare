/**
 * Settings Storage Module
 * Simple key-value storage for app settings and session data
 * Uses AsyncStorage for essential settings only
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SELECTED_PATIENT_ID: 'selectedPatientId',
  CLINIC_ID: 'clinicId',
  TENANT: 'tenant',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  MIGRATION_COMPLETED: 'migrationCompleted'
};

// Patient Selection
export async function setSelectedPatient(patientId) {
  await AsyncStorage.setItem(KEYS.SELECTED_PATIENT_ID, patientId);
  console.log('[SettingsStorage] Selected patient:', patientId);
}

export async function getSelectedPatient() {
  const patientId = await AsyncStorage.getItem(KEYS.SELECTED_PATIENT_ID);
  return patientId;
}

export async function clearSelectedPatient() {
  await AsyncStorage.removeItem(KEYS.SELECTED_PATIENT_ID);
  console.log('[SettingsStorage] Cleared selected patient');
}

// Clinic/Tenant Management
export async function setClinicId(clinicId) {
  await AsyncStorage.setItem(KEYS.CLINIC_ID, clinicId);
  await AsyncStorage.setItem(KEYS.TENANT, clinicId); // Keep both for compatibility
  console.log('[SettingsStorage] Set clinic:', clinicId);
}

export async function getClinicId() {
  const clinicId = await AsyncStorage.getItem(KEYS.CLINIC_ID);
  return clinicId || 'aureus'; // Default fallback
}

export async function getTenant() {
  return getClinicId(); // Same thing, different name for compatibility
}

// Language Settings
export async function setLanguage(language) {
  await AsyncStorage.setItem(KEYS.LANGUAGE, language);
  console.log('[SettingsStorage] Set language:', language);
}

export async function getLanguage() {
  const language = await AsyncStorage.getItem(KEYS.LANGUAGE);
  return language || 'en'; // Default to English
}

// Onboarding Status
export async function setOnboardingCompleted(completed = true) {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, String(completed));
  console.log('[SettingsStorage] Onboarding completed:', completed);
}

export async function isOnboardingCompleted() {
  const completed = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED);
  return completed === 'true';
}

// Migration Status
export async function setMigrationCompleted(completed = true) {
  await AsyncStorage.setItem(KEYS.MIGRATION_COMPLETED, String(completed));
  console.log('[SettingsStorage] Migration completed:', completed);
}

export async function isMigrationCompleted() {
  const completed = await AsyncStorage.getItem(KEYS.MIGRATION_COMPLETED);
  return completed === 'true';
}

// Utility Functions
export async function clearAllSettings() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  console.log('[SettingsStorage] Cleared all settings');
}

export async function getAllSettings() {
  const values = await AsyncStorage.multiGet(Object.values(KEYS));
  const settings = {};
  
  values.forEach(([key, value]) => {
    const settingKey = Object.keys(KEYS).find(k => KEYS[k] === key);
    if (settingKey) {
      settings[settingKey] = value;
    }
  });
  
  return settings;
}

// Helper function to get hospital name based on tenant
export function getHospitalName(clinicId) {
  if (clinicId?.toLowerCase() === 'aureus') {
    return 'Test Server';
  } else if (clinicId?.toLowerCase() === 'aureus2024') {
    return 'Aureus Hospital';
  } else {
    return 'SmartCare Hospital';
  }
}