import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// BASE URLs
// Production server — port 8443 handles all services on saas.smartcarehis.com
// The ports 9081/9090 are only for local development (192.168.1.143)
// ─────────────────────────────────────────────────────────────────────────────

const HISAPI_BASE     = 'https://saas.smartcarehis.com:8443/hisapi_test/';
const BILLING_BASE    = 'https://saas.smartcarehis.com:8443/billing/';
const SMARTCARE_BASE  = 'https://saas.smartcarehis.com:8443/smartcaremain/';
const IPD_BASE        = 'https://saas.smartcarehis.com:8443/ipd/';

// Centralized Clinic Configuration
export const CLINIC_OPTIONS = [
  { displayName: 'Aureus (222Test)', clinicId: 'aureus' },
  { displayName: 'Aureus', clinicId: 'aureus2024' },
  { displayName: 'Borneo Waluj', clinicId: 'borneowaluj' },
  { displayName: 'Borneo NEO Thane', clinicId: 'bornneothane' },
  { displayName: 'Borneo Nashik', clinicId: 'Borneonashik' },
  { displayName: 'BorneoCare Raipur', clinicId: 'borneocare' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage helper
// React Native doesn't have localStorage, so we use AsyncStorage instead.
// This is a simple wrapper that returns '' instead of throwing on missing keys.
// ─────────────────────────────────────────────────────────────────────────────
const getItem = async (key) => {
  try {
    return (await AsyncStorage.getItem(key)) || '';
  } catch {
    return '';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// buildHeaders
// Builds the HTTP headers for every request.
// preAuth = true  → user NOT logged in yet (login/OTP screens) — skip token
// preAuth = false → user IS logged in — include token + clinic info
// clientId       → pass when the endpoint needs a specific patient
// ─────────────────────────────────────────────────────────────────────────────
export const buildHeaders = async (clientId = 0, preAuth = false) => {
  const clinicId = await getItem('CLINICID') || 'aureus';
  const tenant   = await getItem('Tenant') || clinicId;

  const headers = {
    'Content-Type': 'application/json',
    zoneid        : 'Asia/Kolkata',
    Tenant        : tenant,
    'is-auth'     : '1',
    clinicid      : clinicId,
    userid        : clinicId, // Web app sends userid as clinic ID
    patientid     : '0',      // default "0"
  };

  if (!preAuth) {
    const token    = await getItem('AUTHTOKEN');
    const branchId = await getItem('branch_id') || await getItem('branchId');

    headers.Authorization = `Bearer ${token}`;

    // Web app sends branchid as "null" string when no branch
    if (branchId && branchId !== 'null' && branchId !== '') {
      headers.branchid = branchId;
    } else {
      headers.branchid = 'null';
    }
  }

  if (clientId) {
    headers.clientId = String(clientId);
    headers.patientid = String(clientId); // Web app also sends patientid
  }

  return headers;
};

// ─────────────────────────────────────────────────────────────────────────────
// apiCall — the core fetch function
// ALL API calls go through this. Never call fetch() directly in screens.
//
// baseUrl  : which service to hit (HISAPI_BASE, BILLING_BASE, etc.)
// endpoint : the path after the base URL
// options  : HTTP method + body for POST/PUT
// clientId: the patient's ID (0 = not needed)
// preAuth  : true only for login/OTP (before user is logged in)
// ─────────────────────────────────────────────────────────────────────────────
async function apiCall(baseUrl, endpoint, options = {}, clientId = 0, preAuth = false) {
  const url     = `${baseUrl}${endpoint}`;
  const headers = await buildHeaders(clientId, preAuth);

  // Log all headers for every request (remove in production)
  console.log('[API HEADERS]', url, JSON.stringify(headers));

  try {
    const response = await fetch(url, { ...options, headers });

    // Safely parse JSON — server can return HTML error pages on 5xx
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Try parsing anyway in case content-type header is wrong
      try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
    }

    console.log('[API]', url, '→ status:', response.status);

    if (!response.ok) {
      const msg = data?.message || data?.error || data?.errorMessage || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return { success: true, data };

  } catch (error) {
    console.log('[API ERROR]', url, error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTPApi — login flow (preAuth = true, no token needed)
// Matches website: genrateOPT and login endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const OTPApi = {

  // Step 1 of login: send OTP to the mobile number
  // Website: POST to apiHost + Port + '/hisapi/patient/generateOTP'
  sendOTP: async (phoneNumber) =>
    apiCall(
      HISAPI_BASE,
      'patient/generateOTP',
      {
        method: 'POST',
        body  : JSON.stringify({ mobno: phoneNumber.replace(/\D/g, '').slice(-10) }),
      },
      0,
      true, // preAuth = true → no Authorization header
    ),

  verifyOTP: async (phoneNumber, otp) => {
    return apiCall(
      HISAPI_BASE,
      'login',
      {
        method: 'POST',
        body  : JSON.stringify({
          mobno: phoneNumber.replace(/\D/g, '').slice(-10),
          otp  : String(otp),
        }),
      },
      0,
      true, // preAuth = true → this IS the login call, no token yet
    );
  },

  // Resend OTP — same endpoint as sendOTP
  resendOTP: async (phoneNumber) =>
    apiCall(
      HISAPI_BASE,
      'patient/generateOTP',
      {
        method: 'POST',
        body  : JSON.stringify({ mobno: phoneNumber.replace(/\D/g, '').slice(-10) }),
      },
      0,
      true,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// PatientApi — patient profile & registration
// Website: editPatient, newPatientRegister, getPatient, user/profile
// ─────────────────────────────────────────────────────────────────────────────
export const PatientApi = {

  // Get patient details by mobile number (used after login to load profile)
  // Website: GET apiHost + Port + '/hisapi/patient/byMobileNo?mobileNo='
  getByMobile: async (mobileNo) =>
    apiCall(
      HISAPI_BASE,
      `patient/byMobileNo?mobileNo=${mobileNo}`,
      { method: 'GET' },
      0,
      false,
    ),

  // Register a new patient
  // Website: POST apiHost + Port + '/hisapi/patient/register'
  register: async (patientData) =>
    apiCall(
      HISAPI_BASE,
      'patient/register',
      {
        method: 'POST',
        body  : JSON.stringify(patientData),
      },
      0,
      true, // preAuth = true — registering before login
    ),

  // Edit/update existing patient profile
  // Website: POST apiHost + Port + '/hisapi/patient/editPatient'
  editProfile: async (clientId, data) =>
    apiCall(
      HISAPI_BASE,
      'patient/editPatient',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      clientId,
    ),

  // Save/update profile (existing endpoint already in app)
  // Website: POST user/profile
  createProfile: async (userData, clientId = 0) =>
    apiCall(
      HISAPI_BASE,
      'user/profile',
      {
        method: 'POST',
        body  : JSON.stringify(userData),
      }, 
      clientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// AppointmentApi — every appointment operations
// Website: bookappoinment, fetchAppointmentHistory, cancelAppointment,
//          availSlots, appoinmentcharge, videoAppoinment
// ─────────────────────────────────────────────────────────────────────────────
export const AppointmentApi = {

  // Get available time slots for a doctor on a date
  // Website: GET ?date=YYYY-MM-DD&practionerId=ID  (query string, NOT POST body)
  getAvailableSlots: async (clientId, date, practitionerId) => {
    const result = await apiCall(
      HISAPI_BASE,
      `appointment/availableSlots?date=${date}&practionerId=${practitionerId}`,
      { method: 'GET' },
      clientId,
    );
    
    // LOG THE ACTUAL RESPONSE HERE
    console.log('🔵🔵🔵 [SLOTS API RESULT] success:', result.success);
    console.log('🔵🔵🔵 [SLOTS API RESULT] data type:', typeof result.data);
    console.log('🔵🔵🔵 [SLOTS API RESULT] data:', JSON.stringify(result.data, null, 2));
    if (result.data && result.data.availableSlotList) {
      console.log('🔵🔵🔵 [SLOTS API RESULT] availableSlotList length:', result.data.availableSlotList.length);
      console.log('🔵🔵🔵 [SLOTS API RESULT] first 5 slots:', result.data.availableSlotList.slice(0, 5));
    }
    
    return result;
  },

  // Get appointment type details (charges/fees)
  // URL format: appointment/appointmentTypeDetails?patientId=885&doctorId=1849
  getAppointmentCharges: async (patientId, doctorId) =>
    apiCall(
      HISAPI_BASE,
      `appointment/appointmentTypeDetails?patientId=${patientId}&doctorId=${doctorId}`,
      { method: 'GET' },
      patientId,
    ),

  // Book a new appointment
  // Website: POST hisapi/appointment/book
  book: async (clientId, appointmentData) =>
    apiCall(
      HISAPI_BASE,
      'appointment/book',
      {
        method: 'POST',
        body  : JSON.stringify(appointmentData),
      },
      clientId,
    ),

  // Fetch appointment history for a patient
  // Website: GET apiHost + Port + '/hisapi/appointment/fetchAppointment/history/{clientId}'
  getHistory: async (clientId) =>
    apiCall(
      HISAPI_BASE,
      `appointment/fetchAppointment/history/${clientId}`,
      { method: 'GET' },
      clientId,
    ),

  // Cancel an appointment
  // Website: POST apiHost + Port + '/hisapi/appointment/cancelAppointment'
  cancel: async (clientId, appointmentId) =>
    apiCall(
      HISAPI_BASE,
      'appointment/cancelAppointment',
      {
        method: 'POST',
        body  : JSON.stringify({ appointmentId }),
      },
      clientId,
    ),

  // Book a video appointment
  // Website: POST apiHost + Port2 + '/smartcaremain/opd/appointment/capture/video'
  // Note: this one uses SMARTCARE_BASE, not HISAPI_BASE
  bookVideo: async (clientId, data) =>
    apiCall(
      SMARTCARE_BASE,
      'opd/appointment/capture/video',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      clientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// InvestigationApi — lab reports & investigation results
// Website: InvestigationReport, DownloadInvestigationReport,
//          printInvestigationReport, GeneratePDFReport
// ─────────────────────────────────────────────────────────────────────────────
export const InvestigationApi = {

  // Get list of approved investigation reports for a patient
  // Website: POST hisapi/investigation/approved/reports  (body: clientId, fromDate, toDate)
  // NOTE: HIS server returns HTTP 405 on GET — must use POST even for reads
  getAll: async (clientId, fromDate = '', toDate = '') =>
    apiCall(
      HISAPI_BASE,
      'investigation/approved/reports',
      {
        method: 'POST',
        body  : JSON.stringify({ clientId, fromDate, toDate }),
      },
      clientId,
    ),

  // Generate and download a report PDF
  // Website: POST apiHost + Port2 + '/smartcaremain/investigation/generatepdfreport'
  generatePDF: async (clientId, reportData) =>
    apiCall(
      SMARTCARE_BASE,
      'investigation/generatepdfreport',
      {
        method: 'POST',
        body  : JSON.stringify(reportData),
      },
      clientId,
    ),

  // Print investigation report
  // Website: POST apiHost + Port2 + '/smartcaremain/investigation/print'
  print: async (clientId, reportData) =>
    apiCall(
      SMARTCARE_BASE,
      'investigation/print',
      {
        method: 'POST',
        body  : JSON.stringify(reportData),
      },
      clientId,
    ),

  // Generate PDF using the PDFInvReport service
  // Website: POST apiHost + Port2 + '/smartcaremain/pdfinvreport/generateinvestigationreportpdf'
  // NOTE: This endpoint requires exact header matching with web app
  generateInvReportPDF: async (clientId, data) => {
    const token = await getItem('AUTHTOKEN');
    const branchId = await getItem('branch_id') || await getItem('branchId');
    const clinicId = await getItem('CLINICID') || 'aureus';
    
    // Replicate exact headers from web app
    const headers = {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.7',
      'Authorization': `Bearer ${token}`,
      'branchid': branchId && branchId !== 'null' ? branchId : 'null',
      'clinicid': clinicId,
      'Content-Type': 'application/json; charset=utf-8',
      'patientid': clientId ? String(clientId) : '0',
      'userid': clinicId,
      'zoneid': 'Asia/Kolkata',
    };
    
    const url = `${SMARTCARE_BASE}pdfinvreport/generateinvestigationreportpdf`;
    
    console.log('[InvestigationApi] generateInvReportPDF URL:', url);
    console.log('[InvestigationApi] generateInvReportPDF headers:', JSON.stringify(headers, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });

      let responseData = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try { responseData = JSON.parse(text); } catch { responseData = { message: text?.slice(0, 200) }; }
      }

      console.log('[InvestigationApi] generateInvReportPDF response status:', response.status);
      console.log('[InvestigationApi] generateInvReportPDF response data:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        const msg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return { success: true, data: responseData };

    } catch (error) {
      console.log('[InvestigationApi] generateInvReportPDF ERROR:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceApi — billing & invoices
// Website: InvoiceAndBills, invoicePrintDetails, CAPTUREPAYMENT, againstopd
// All use BILLING_BASE (Port 9090 /billing/)
// ─────────────────────────────────────────────────────────────────────────────
export const InvoiceApi = {

  // Fetch all invoices for a patient
  // Body: {clientId: number, fromDate: string, toDate: string}
  // clientId also sent as header via buildHeaders 4th param
  getAll: async (clientId, fromDate = '', toDate = '') => {
    const pid = Number(clientId);
    return apiCall(
      BILLING_BASE,
      'invoice/fetchinvoiceData',
      {
        method: 'POST',
        body  : JSON.stringify({
          clientId: pid,
          fromDate: fromDate || '2000-01-01',
          toDate:   toDate   || new Date().toISOString().split('T')[0],
        }),
      },
      pid,
    );
  },

  // Get invoice print details (for PDF/print view)
  // Website: GET apiHost + Port1 + '/billing/invoice/printdetails'
  getPrintDetails: async (clientId, invoiceId) =>
    apiCall(
      BILLING_BASE,
      `invoice/printdetails?invoiceId=${invoiceId}`,
      { method: 'GET' },
      clientId,
    ),

  // Capture payment for an invoice
  // Website: POST apiHost + Port1 + '/billing/payment/capture-payment'
  capturePayment: async (clientId, paymentData) =>
    apiCall(
      BILLING_BASE,
      'payment/capture-payment',
      {
        method: 'POST',
        body  : JSON.stringify(paymentData),
      },
      clientId,
    ),

  // Payment against OPD
  // Website: POST apiHost + Port1 + '/billing/payment/againstopd'
  payAgainstOPD: async (clientId, paymentData) =>
    apiCall(
      BILLING_BASE,
      'payment/againstopd',
      {
        method: 'POST',
        body  : JSON.stringify(paymentData),
      },
      clientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ClinicalNotesApi — doctor's clinical notes for a patient
// List Endpoint: POST https://saas.smartcarehis.com:8443/smartcaremain/clinicalnotes/notes/list
// Detail Endpoint: GET https://saas.smartcarehis.com:8443/smartcaremain/clinicalnotes/clinical/notes/{id}
// ─────────────────────────────────────────────────────────────────────────────
export const ClinicalNotesApi = {

  // Fetch all clinical notes for a patient
  getAll: async (patientId, fromDate = '', toDate = '') => {
    const headers = await buildHeaders(0, false);

    const fromdate = fromDate || '2025-01-01';
    const todate   = toDate   || new Date().toISOString().split('T')[0];
    const pid      = Number(patientId);

    try {
      const url = `${SMARTCARE_BASE}clinicalnotes/notes/list`;
      console.log('[ClinicalNotes API] Fetching list:', url, { patientid: pid, fromdate, todate });

      const response = await fetch(url, {
        method : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ patientid: pid, fromdate, todate }),
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[ClinicalNotes API] List response status:', response.status, '| records:', Array.isArray(data) ? data.length : typeof data);

      if (!response.ok) {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return { success: true, data };

    } catch (error) {
      console.log('[ClinicalNotes API ERROR]', error.message);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Fetch individual clinical note details by ID
  getById: async (noteId) => {
    const headers = await buildHeaders(0, false);

    try {
      const url = `${SMARTCARE_BASE}clinicalnotes/clinical/notes/${noteId}`;
      console.log('[ClinicalNotes API] Fetching detail:', url);

      const response = await fetch(url, {
        method : 'GET',
        headers: headers,
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[ClinicalNotes API] Detail response status:', response.status);

      if (!response.ok) {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return { success: true, data };

    } catch (error) {
      console.log('[ClinicalNotes API Detail ERROR]', error.message);
      return { success: false, error: error.message, data: null };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PrescriptionRepeatApi — fetch repeat prescription list + per-prescription details
//
// TWO-STEP flow (matches SmartCare HIS):
//   1) LIST endpoint — returns prescription IDs + lastmodified only
//      POST smartcaremain/priscription/repeatpriscriptionList
//      body: { practid: <doctor diaryuserid>, clientid: <patientId> }
//      resp: { repeatPriscriptionListByClientid: [ {id, lastmodified, is_visible}, ... ] }
//
//   2) DETAIL endpoint — returns the actual medicine array for one prescription
//      GET  smartcaremain/priscription/fetchrepeatpriscrition/{prescriptionId}
//      resp: [ { id, drug, dose, frequencyNote, duration, priscdurationtype,
//                routes, medicineid, qty, genericname, remark, ... }, ... ]
//
// Note: `practid` in the LIST payload is the doctor's diaryuserid (NOT practitionerId)
// ─────────────────────────────────────────────────────────────────────────────

// Cache & In-flight promise tracker for getAllForPatient
let _inFlightGetAllForPatient = null;
let _cachedGetAllForPatient = { time: 0, patientId: null, data: null };

export const PrescriptionRepeatApi = {

  // ── Step 1: fetch prescription summary list for 1 doctor ────────────────
  getListByDoctor: async (practid, clientid) => {
    const headers = await buildHeaders(0, false);

    const pid = Number(clientid);
    const did = Number(practid);

    try {
      const url = `${SMARTCARE_BASE}priscription/repeatpriscriptionList`;
      console.log('[PrescriptionRepeat API] Step1 LIST:', url, { practid: did, clientid: pid });

      const response = await fetch(url, {
        method : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ practid: did, clientid: pid }),
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[PrescriptionRepeat API] Step1 LIST status:', response.status,
        '| keys:', data && typeof data === 'object' ? Object.keys(data).join(',') : typeof data);

      if (!response.ok) {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      // Unwrap the array from the (typo'd) wrapper key
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        const candidate =
          data.repeatPriscriptionListByClientid   // exact server key (typo: Priscription)
          || data.repeatPrescriptionListByClientid
          || data.repeatpriscriptionlist
          || data.repeatPriscriptionList
          || data.repeatPrescriptionList
          || data.prescriptions
          || data.data
          || data.list
          || Object.values(data).find(v => Array.isArray(v))
          || [];
        list = Array.isArray(candidate) ? candidate : [];
      }

      // Attach doctor source so we know which practid produced the id
      const stamped = list.map(item => ({ ...item, _doctorPractid: did }));
      return { success: true, data: stamped };

    } catch (error) {
      console.log('[PrescriptionRepeat API Step1 ERROR]', error.message);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ── Step 2: fetch medicine details for a single prescription id (with AsyncStorage cache) ─
  getById: async (prescriptionId, { forceRefresh = false } = {}) => {
    const rid = String(prescriptionId).trim();
    const cacheKey = `@rx_detail_${rid}`;

    // 1) Check AsyncStorage cache first to avoid repeating network requests for static prescriptions
    if (!forceRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Cache Hit: return stored medicines without calling the remote backend
            return { success: true, data: parsed, fromCache: true };
          }
        }
      } catch (e) {
        // Cache read failure is non-fatal — seamlessly fall back to network fetch
      }
    }

    const headers = await buildHeaders(0, false);

    try {
      const url = `${SMARTCARE_BASE}priscription/fetchrepeatpriscrition/${rid}`;
      console.log('[PrescriptionRepeat API] Step2 DETAIL (Network Fetch):', url);

      const response = await fetch(url, {
        method : 'GET',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[PrescriptionRepeat API] Step2 DETAIL status:', response.status,
        '| items:', Array.isArray(data) ? data.length : (typeof data));

      if (!response.ok) {
        const msg = (typeof data === 'object' && (data?.message || data?.error)) || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      // Unwrap array
      let meds = [];
      if (Array.isArray(data)) meds = data;
      else if (data && typeof data === 'object') {
        const candidate =
          data.medicines
          || data.medicineList
          || data.items
          || data.itemlist
          || data.data
          || data.list
          || data.drugs
          || Object.values(data).find(v => Array.isArray(v))
          || [];
        meds = Array.isArray(candidate) ? candidate : [];
      }

      // Save medicines array into AsyncStorage for instant retrieval on next visit
      if (meds.length > 0) {
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(meds));
        } catch (e) {
          // Cache write error non-critical
        }
      }

      return { success: true, data: meds };

    } catch (error) {
      console.log(`[PrescriptionRepeat API Step2 ERROR id=${rid}]`, error.message);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ── Full pipeline: for a patient, get ALL repeat prescriptions across
  //    visited doctors, fetch/cache all medicine details, sort newest first.
  getAllForPatient: async (practids, clientid, { concurrency = 6, forceRefresh = false } = {}) => {
    const ids = Array.isArray(practids) ? [...new Set(practids.map(Number).filter(Boolean))] : [];
    const pid = Number(clientid);

    if (!pid) {
      return { success: false, error: 'Missing clientid (patientId)', data: [] };
    }
    if (ids.length === 0) {
      return { success: true, data: [], skipped: true, reason: 'No visited doctor practids provided' };
    }

    // Cache hit within 60 seconds unless explicitly forced
    if (!forceRefresh && _cachedGetAllForPatient.patientId === pid && (Date.now() - _cachedGetAllForPatient.time < 60000) && _cachedGetAllForPatient.data) {
      console.log(`[PrescriptionRepeat API] getAllForPatient CACHE HIT for client ${pid} (${_cachedGetAllForPatient.data.length} records)`);
      return { success: true, data: _cachedGetAllForPatient.data, fromCache: true };
    }

    // Deduplicate in-flight requests
    if (_inFlightGetAllForPatient) {
      console.log(`[PrescriptionRepeat API] getAllForPatient already in flight for client ${pid}, sharing promise`);
      return _inFlightGetAllForPatient;
    }

    _inFlightGetAllForPatient = (async () => {
      try {
        console.log(`[PrescriptionRepeat API] getAllForPatient → ${ids.length} visited doctor(s) for client ${pid}`);

        // ── PHASE A: gather summary IDs from visited doctors in parallel ─────────
        const listResults = await Promise.all(
          ids.map(did => PrescriptionRepeatApi.getListByDoctor(did, pid))
        );
        const seenSummary = new Map(); // prescriptionId -> summary
        for (const res of listResults) {
          if (!res.success) continue;
          for (const s of res.data) {
            const key = String(s.id);
            if (!key) continue;
            // Keep the first (or most recent) — overwriting with latest later
            if (!seenSummary.has(key)) {
              seenSummary.set(key, s);
            } else if (s.lastmodified) {
              // Merge doctor practids so we know which doctors produced it
              const prev = seenSummary.get(key);
              seenSummary.set(key, { ...prev, lastmodified: s.lastmodified || prev.lastmodified });
            }
          }
        }

        const summaries = [...seenSummary.values()];
        console.log(`[PrescriptionRepeat API] Phase A: ${summaries.length} unique prescription IDs`);
        if (summaries.length === 0) {
          _cachedGetAllForPatient = { time: Date.now(), patientId: pid, data: [] };
          return { success: true, data: [] };
        }

        // Sort summaries by lastmodified DESC (newest first) BEFORE detail fetch —
        // this makes the earliest responses also the newest ones (faster UI).
        summaries.sort((a, b) => {
          const ta = a.lastmodified ? Date.parse(a.lastmodified.replace(/-/g, '/')) : 0;
          const tb = b.lastmodified ? Date.parse(b.lastmodified.replace(/-/g, '/')) : 0;
          return tb - ta;
        });

        // ── PHASE B: fetch medicine details for every prescription id (checks cache first) ──
        // Uses AsyncStorage cache; only cache-misses will trigger HTTP calls.
        const detailResults = new Map(); // prescriptionId -> medicine array
        let cacheHits = 0;
        let cacheMisses = 0;

        const queue = summaries.map(s => s.id);
        const worker = async () => {
          while (queue.length > 0) {
            const id = queue.shift();
            const r = await PrescriptionRepeatApi.getById(id, { forceRefresh });
            if (r.fromCache) cacheHits++;
            else cacheMisses++;
            detailResults.set(String(id), r.success ? r.data : []);
          }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));

        console.log(`[PrescriptionRepeat API] Phase B details done: ${cacheHits} cached, ${cacheMisses} fetched from server`);

        // ── PHASE C: merge summary + medicines, sort newest first ─────────────
        const merged = summaries.map(s => {
          const key = String(s.id);
          const meds = detailResults.get(key) || [];
          return {
            id: key,
            lastmodified: s.lastmodified || '',
            is_visible: s.is_visible,
            _doctorPractid: s._doctorPractid,
            medicines: meds,
            medicineCount: meds.length,
          };
        });

        // Final sort (same order as summaries, but re-assert in case)
        merged.sort((a, b) => {
          const ta = a.lastmodified ? Date.parse(a.lastmodified.replace(/-/g, '/')) : 0;
          const tb = b.lastmodified ? Date.parse(b.lastmodified.replace(/-/g, '/')) : 0;
          return tb - ta;
        });

        _cachedGetAllForPatient = { time: Date.now(), patientId: pid, data: merged };
        console.log(`[PrescriptionRepeat API] getAllForPatient DONE → ${merged.length} prescriptions (newest first)`);
        return { success: true, data: merged };
      } finally {
        _inFlightGetAllForPatient = null;
      }
    })();

    return _inFlightGetAllForPatient;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PrescriptionRelevance — compute per-medicine expiry & per-prescription relevance
//
// Combines two signals:
//   A) Medicine duration  — when the drug was prescribed to run until
//      (lastmodified + duration converted to days).
//   B) Recency / age     — how long since the prescription was last touched
//      (pure fallback when no duration info is available).
//
// Output levels (ordered most-relevant first):
//   'active'    — at least one medicine still within duration window
//   'expiring'  — no active meds left, but at least one within expiry grace (≤7 days past)
//   'expired'   — all medicines finished >7 days ago, or prescription >90 days old
//                 with no parseable duration info
//   'unknown'   — insufficient data to classify (no lastmodified + no duration on any med)
// ─────────────────────────────────────────────────────────────────────────────

// Parse "duration + priscdurationtype" (e.g. 5 + Days / 2 + Weeks / 1 + Months)
// into a total number of days. Returns 0 on failure (unknown duration → active).
export function durationToDays(durationVal, durTypeVal) {
  const raw = String(durationVal || '').trim();
  if (!raw) return 0;
  const n = parseFloat(raw);
  if (!isFinite(n) || n <= 0) return 0;

  const t = String(durTypeVal || 'Days').trim().toLowerCase();
  if (t.startsWith('day'))    return n;
  if (t.startsWith('week'))   return n * 7;
  if (t.startsWith('month'))  return n * 30;   // approximate, stable
  if (t.startsWith('year'))   return n * 365;
  // Fallback: if unit missing, assume days (common server default)
  return n;
}

// For a single medicine row + its prescription's lastmodified timestamp,
// compute days-remaining (can be negative for expired).
// Returns { days, status: 'active'|'expiring'|'expired'|'unknown', expiryDate }
export function computeMedicineRelevance(med = {}, prescriptionLastmodified = '') {
  const durDays = durationToDays(med.duration, med.priscdurationtype);
  const startTs = prescriptionLastmodified
    ? Date.parse(String(prescriptionLastmodified).replace(/-/g, '/'))
    : 0;

  if (!startTs) {
    return { days: Infinity, status: 'unknown', expiryDate: '' };
  }

  let expiryTs;
  if (durDays > 0) {
    expiryTs = startTs + durDays * 24 * 60 * 60 * 1000;
  } else {
    // No duration → treat as a "lifetime" prescription (e.g. maintenance drugs).
    // We still don't want to mark it expired purely by time.
    return { days: Infinity, status: 'active', expiryDate: '' };
  }

  const now = Date.now();
  const daysLeft = Math.floor((expiryTs - now) / (1000 * 60 * 60 * 24));
  let status;
  if (daysLeft >= 0)       status = 'active';
  else if (daysLeft >= -7) status = 'expiring';
  else                     status = 'expired';

  const d = new Date(expiryTs);
  const pad = (n) => String(n).padStart(2, '0');
  const expiryDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return { days: daysLeft, status, expiryDate };
}

// For a full prescription object [{medicines:[], lastmodified:''}],
// roll up the per-medicine statuses into a single prescription-level level.
// Returns:
//   { level, activeCount, expiringCount, expiredCount, unknownCount,
//     daysSinceModified, medicinesRelevance: [...] }
export function computePrescriptionRelevance(prescription = {}) {
  const meds = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  const lastmod = prescription.lastmodified || prescription.date || '';

  const perMed = meds.map(m => computeMedicineRelevance(m, lastmod));

  const counts = { active: 0, expiring: 0, expired: 0, unknown: 0 };
  perMed.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });

  let level;
  if (counts.active > 0)       level = 'active';
  else if (counts.expiring > 0) level = 'expiring';
  else if (counts.expired > 0)  level = 'expired';
  else                          level = 'unknown';

  // Fallback for unknown: use pure recency when no duration data existed
  let daysSinceModified = Infinity;
  if (lastmod) {
    const t = Date.parse(String(lastmod).replace(/-/g, '/'));
    if (t) daysSinceModified = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  }
  if (level === 'unknown' && isFinite(daysSinceModified)) {
    if (daysSinceModified <= 90) level = 'active';
    else                         level = 'expired';
  }

  return {
    level,
    activeCount: counts.active,
    expiringCount: counts.expiring,
    expiredCount: counts.expired,
    unknownCount: counts.unknown,
    daysSinceModified,
    medicinesRelevance: perMed,
  };
}

// Map relevance level → UI styling (colour chip + card accent).
export function relevanceStyle(level, daysSince = 0) {
  switch (level) {
    case 'active':
      return {
        cardClass: 'prescCardServerNewest',
        chipBg:    '#D1FAE5',
        chipFg:    '#047857',
        chipLabel: 'Active',
      };
    case 'expiring':
      return {
        cardClass: 'prescCardServerRecent',
        chipBg:    '#FEF3C7',
        chipFg:    '#B45309',
        chipLabel: 'Expiring',
      };
    case 'expired':
      return {
        cardClass: 'prescCardServerOld',
        chipBg:    '#F3F4F6',
        chipFg:    '#6B7280',
        chipLabel: 'Expired',
      };
    default:
      return {
        cardClass: null,
        chipBg:    '#EEF2FF',
        chipFg:    '#4F46E5',
        chipLabel: 'Clinic',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PrescriptionMasterApi — search medicines from prescription master
// Endpoint: POST http://saas.smartcarehis.com:8443/smartcaremain/priscriptionmaster/medicinelist
// ─────────────────────────────────────────────────────────────────────────────
export const PrescriptionMasterApi = {

  // Search medicine list from prescription master
  searchMedicines: async (searchText) => {
    const headers = await buildHeaders(0, false);

    try {
      const url = `${SMARTCARE_BASE}priscriptionmaster/medicinelist`;
      console.log('[PrescriptionMaster API] Searching medicines:', url, { text: searchText });

      const response = await fetch(url, {
        method : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ 
          text: searchText,
          flag: false,
          fromNewInventory: true
        }),
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[PrescriptionMaster API] Response status:', response.status, '| results:', Array.isArray(data) ? data.length : typeof data);

      if (!response.ok) {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return { success: true, data };

    } catch (error) {
      console.log('[PrescriptionMaster API ERROR]', error.message);
      return { success: false, error: error.message, data: [] };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HospitalApi — hospital/clinic details and lists
// Website: hospitaldetails, HospitalList, ClinicDetails, LetterHead
// ─────────────────────────────────────────────────────────────────────────────
export const HospitalApi = {

  // Get details of the currently selected hospital/clinic
  // Website: GET apiHost + Port + '/hisapi/hospital/details'
  // Note: website sends 'is-auth: 1' and 'tenant: clinicId' — buildHeaders handles this
  getDetails: async () =>
    apiCall(
      HISAPI_BASE,
      'hospital/details',
      { method: 'GET' },
    ),

  // Get list of all hospitals (for hospital selection screen)
  // Website: GET apiHost + Port + '/hisapi/hospital/list'
  getList: async () =>
    apiCall(
      HISAPI_BASE,
      'hospital/list',
      { method: 'GET' },
    ),

  // Get clinic details by clinic ID
  // Website: GET apiHost + Port2 + '/smartcaremain/clinic/details/clinicid/{clinicId}'
  getClinicDetails: async (clinicId) =>
    apiCall(
      SMARTCARE_BASE,
      `clinic/details/clinicid/${clinicId}`,
      { method: 'GET' },
    ),

  // Get letter head for a clinic (used in PDF printing)
  // Website: GET apiHost + Port2 + '/smartcaremain/clinic/getletterhead/{clinicId}'
  getLetterHead: async (clinicId) =>
    apiCall(
      SMARTCARE_BASE,
      `clinic/getletterhead/${clinicId}`,
      { method: 'GET' },
    ),

  // Get list of states, cities, countries (for address forms)
  // Website: GET apiHost + Port1 + '/smartcaremain/clinic/cityStateCountryList'
  getCityStateList: async () =>
    apiCall(
      SMARTCARE_BASE,
      'clinic/cityStateCountryList',
      { method: 'GET' },
    ),

  // Get list of doctors/practitioners at a clinic
  // Website: GET apiHost + Port + '/hisapi/user/practitioner/all'
  getDoctors: async () =>
    apiCall(
      HISAPI_BASE,
      'user/practitioner/all',
      { method: 'GET' },
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackApi — patient feedback submission
// Website: feedbackQueList, feedbackSubmit
// Uses IPD_BASE (Port 9090 /ipd/)
// ─────────────────────────────────────────────────────────────────────────────
export const FeedbackApi = {

  // Get list of feedback questions
  // Website: GET apiHost + Port1 + '/ipd/feedback/questionsList'
  getQuestions: async (clientId) =>
    apiCall(
      IPD_BASE,
      'feedback/questionsList',
      { method: 'GET' },
      clientId,
    ),

  // Submit feedback answers
  // Website: POST apiHost + Port1 + '/ipd/feedback/submitFeedback'
  submit: async (clientId, feedbackData) =>
    apiCall(
      IPD_BASE,
      'feedback/submitFeedback',
      {
        method: 'POST',
        body  : JSON.stringify(feedbackData),
      },
      clientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// saveSession — call this immediately after verifyOTP succeeds
// Saves everything the server returns to AsyncStorage so buildHeaders()
// can automatically attach it to every future request.
// ─────────────────────────────────────────────────────────────────────────────
export const saveSession = async (responseData, mobile = '') => {
  console.log('[saveSession] full login response:', JSON.stringify(responseData));

  const userId   = responseData.userId   || responseData.userid   ||
                   responseData.user_id  || responseData.id        || '';
  const branchId = responseData.branchId || responseData.branch_id ||
                   responseData.branchid || responseData.branch    || '';

  const clinicId = await AsyncStorage.getItem('CLINICID') || 'aureus';

  const map = {
    AUTHTOKEN       : responseData.token      || responseData.Token      || '',
    SESSIONEXPIRTIME: responseData.expirytime || responseData.expiryTime || '',
    CLINICID        : clinicId,
    Tenant          : clinicId,
    mobileNumber    : (mobile || '').replace(/\D/g, '').slice(-10),  // always store as plain 10-digit
    UserId          : String(userId),
    userid          : String(userId),
    branch_id       : String(branchId),
    branchId        : String(branchId),
  };

  await Promise.all(
    Object.entries(map).map(([key, value]) =>
      AsyncStorage.setItem(key, String(value)),
    ),
  );

  console.log('[saveSession] saved → token:', map.AUTHTOKEN ? '✓' : '✗',
    '| clinicId:', clinicId,
    '| userId:', map.UserId || '(empty)',
    '| branchId:', map.branch_id || '(empty)');
};

// ─────────────────────────────────────────────────────────────────────────────
// PractitionerApi — list of doctors/practitioners at the clinic
// New endpoint: POST http://103.159.239.222/smartcaremain/practitionerlist
// Body: {branchid: "1", specializationid: 0, isVisitingConsultant: 0}
// ─────────────────────────────────────────────────────────────────────────────
export const PractitionerApi = {

  // Get all practitioners (old endpoint - keep for backward compatibility)
  // Website: GET hisapi/user/practitioner/all
  getAll: async () =>
    apiCall(
      HISAPI_BASE,
      'user/practitioner/all',
      { method: 'GET' },
    ),

  // Get practitioner list with filters (NEW - primary endpoint)
  // POST http://103.159.239.222/smartcaremain/practitionerlist
  // Body: {branchid: "1", specializationid: 0, isVisitingConsultant: 0}
  getList: async (branchid = "1", specializationid = 0, isVisitingConsultant = 0) => {
    // Use the new base URL for this specific endpoint
    const NEW_BASE = 'http://103.159.239.222/smartcaremain/';
    const headers = await buildHeaders(0, false);

    try {
      const url = `${NEW_BASE}practitionerlist`;
      console.log('[PractitionerApi] Fetching list:', url, { branchid, specializationid, isVisitingConsultant });

      const response = await fetch(url, {
        method : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ 
          branchid: String(branchid),
          specializationid: Number(specializationid),
          isVisitingConsultant: Number(isVisitingConsultant)
        }),
      });

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text?.slice(0, 200) }; }
      }

      console.log('[PractitionerApi] List response status:', response.status, '| practitioners:', Array.isArray(data) ? data.length : typeof data);

      if (!response.ok) {
        const msg = data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return { success: true, data };

    } catch (error) {
      console.log('[PractitionerApi ERROR]', error.message);
      return { success: false, error: error.message, data: [] };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MedicineApi — local medicine search (same WiFi network)
// Endpoint: POST http://192.168.1.32:8080/api/medicines/search
// Body: { "name": "<query>" }
// Called only after the user types 3+ characters in the medicine name field.
// ─────────────────────────────────────────────────────────────────────────────
const MEDICINE_SEARCH_BASE = 'http://192.168.1.32:8080/api/medicines/';

export const MedicineApi = {

  // Search medicines by name — sends query as JSON body
  search: async (name) => {
    const url = `${MEDICINE_SEARCH_BASE}search`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = []; }
      }
      if (!response.ok) return { success: false, error: `HTTP ${response.status}`, data: [] };
      return { success: true, data: Array.isArray(data) ? data : (data?.data ?? []) };
    } catch (error) {
      console.log('[MedicineApi] search error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  },
};

export default apiCall;