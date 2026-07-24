import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Config ────────────────────────────────────────────────────────────────
const API_BASE_URL = 'https://saas.smartcarehis.com:8443/hisapi_test/';

// ─── Storage helper (AsyncStorage instead of localStorage) ─────────────────
const getItem = async (key) => {
  try {
    return (await AsyncStorage.getItem(key)) || '';
  } catch {
    return '';
  }
};

// ─── Build headers ─────────────────────────────────────────────────────────
// preAuth = true  → skip Authorization (used for login/OTP endpoints)
// preAuth = false → include Bearer token (all authenticated endpoints)
export const buildHeaders = async (patientId = 0, preAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
    zoneid        : 'Asia/Kolkata',
    Tenant        : 'aureus'
  };

  if (!preAuth) {
    const token = await getItem('AUTHTOKEN');
    headers.Authorization = `Bearer ${token}`;
    headers.clinicid      = await getItem('ClinicId');
    headers.userid        = await getItem('UserId');
    headers.branchId      = await getItem('branch_id');
  }

  if (patientId) {
    headers.patientid = patientId;
  }

  return headers;
};

// ─── Core fetch wrapper ────────────────────────────────────────────────────
async function apiCall(endpoint, options = {}, patientId = 0, preAuth = false) {
  const url     = `${API_BASE_URL}${endpoint}`;
  const headers = await buildHeaders(patientId, preAuth);

  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data     = await response.json();

    console.log('[API]', endpoint, '→ status:', response.status, '| body:', JSON.stringify(data));

    if (!response.ok) {
      const msg = data?.message || data?.error || data?.errorMessage || JSON.stringify(data);
      console.log('[API FAIL]', endpoint, 'status:', response.status, 'body:', JSON.stringify(data));
      throw new Error(msg || `HTTP ${response.status}`);
    }

    return {success: true, data};
  } catch (error) {
    console.log('[API ERROR]', endpoint, error.message);
    return {success: false, error: error.message};
  }
}

// ─── OTP endpoints ─────────────────────────────────────────────────────────
export const OTPApi = {
  // preAuth=true — no Authorization header needed before login
  sendOTP: async (phoneNumber) =>
    apiCall('patient/generateOTP', {
      method: 'POST',
      body  : JSON.stringify({mobno: phoneNumber.replace(/\D/g, '').slice(-10)}),
    }, 0, true),

  verifyOTP: async (phoneNumber, otp) =>
    apiCall('login', {
      method: 'POST',
      body  : JSON.stringify({
        mobno: phoneNumber.replace(/\D/g, '').slice(-10),
        otp  : String(otp),
      }),
    }, 0, true),

  resendOTP: async (phoneNumber) =>
    apiCall('patient/generateOTP', {
      method: 'POST',
      body  : JSON.stringify({mobno: phoneNumber.replace(/\D/g, '').slice(-10)}),
    }, 0, true),
};

// ─── User / Profile endpoints ───────────────────────────────────────────────
export const UserApi = {
  /**
   * Save / update patient profile (authenticated)
   * POST user/profile
   */
  createProfile: async (userData, patientId = 0) =>
    apiCall('user/profile', {
      method: 'POST',
      body  : JSON.stringify(userData),
    }, patientId),
};

// ─── Save login response to storage ────────────────────────────────────────
/**
 * Call this after a successful verifyOTP to persist the session tokens
 * so that buildHeaders() picks them up for all subsequent API calls.
 */
export const saveSession = async (responseData) => {
  const map = {
    AUTHTOKEN : responseData.token     || responseData.AUTHTOKEN     || '',
    ClinicId  : responseData.clinicId  || responseData.ClinicId      || '',
    ZONEID    : responseData.zoneId    || responseData.ZONEID         || '',
    UserId    : responseData.userId    || responseData.UserId         || '',
    branch_id : responseData.branchId  || responseData.branch_id     || '',
  };

  await Promise.all(
    Object.entries(map).map(([key, value]) =>
      AsyncStorage.setItem(key, String(value)),
    ),
  );
};

export default apiCall;
