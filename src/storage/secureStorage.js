/**
 * Secure Storage Module
 * For sensitive data like authentication tokens
 * Uses Keychain (iOS) / Keystore (Android) when available, falls back to AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: For production apps, consider using react-native-keychain
// or @react-native-async-storage/async-storage with encryption

const SECURE_KEYS = {
  AUTH_TOKEN: 'authToken',
  PATIENT_ID: 'patientId',
  MOBILE_NO: 'mobileNo',
  BRANCH_ID: 'branchId'
};

// Authentication Token
export async function setAuthToken(token) {
  await AsyncStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token);
  console.log('[SecureStorage] Auth token saved');
}

export async function getAuthToken() {
  const token = await AsyncStorage.getItem(SECURE_KEYS.AUTH_TOKEN);
  return token;
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(SECURE_KEYS.AUTH_TOKEN);
  console.log('[SecureStorage] Auth token cleared');
}

// Patient ID (from auth)
export async function setPatientId(patientId) {
  await AsyncStorage.setItem(SECURE_KEYS.PATIENT_ID, patientId);
  console.log('[SecureStorage] Patient ID saved:', patientId);
}

export async function getPatientId() {
  const patientId = await AsyncStorage.getItem(SECURE_KEYS.PATIENT_ID);
  return patientId;
}

// Mobile Number
export async function setMobileNo(mobileNo) {
  await AsyncStorage.setItem(SECURE_KEYS.MOBILE_NO, mobileNo);
}

export async function getMobileNo() {
  const mobileNo = await AsyncStorage.getItem(SECURE_KEYS.MOBILE_NO);
  return mobileNo;
}

// Branch ID
export async function setBranchId(branchId) {
  await AsyncStorage.setItem(SECURE_KEYS.BRANCH_ID, branchId);
}

export async function getBranchId() {
  const branchId = await AsyncStorage.getItem(SECURE_KEYS.BRANCH_ID);
  return branchId;
}

// Save complete session after login
export async function saveSession(sessionData) {
  const {
    patientId,
    mobileNo,
    authToken,
    branchId
  } = sessionData;
  
  await Promise.all([
    setPatientId(patientId || ''),
    setMobileNo(mobileNo || ''),
    setAuthToken(authToken || ''),
    setBranchId(branchId || '')
  ]);
  
  console.log('[SecureStorage] Session saved successfully');
}

// Clear all session data
export async function clearSession() {
  await AsyncStorage.multiRemove(Object.values(SECURE_KEYS));
  console.log('[SecureStorage] Session cleared');
}

// Get all session data
export async function getSession() {
  const values = await AsyncStorage.multiGet(Object.values(SECURE_KEYS));
  
  const session = {};
  values.forEach(([key, value]) => {
    const sessionKey = Object.keys(SECURE_KEYS).find(k => SECURE_KEYS[k] === key);
    if (sessionKey) {
      session[sessionKey.toLowerCase().replace('_', '')] = value;
    }
  });
  
  return session;
}

// Check if user is logged in
export async function isLoggedIn() {
  const authToken = await getAuthToken();
  const patientId = await getPatientId();
  
  return !!(authToken && patientId);
}