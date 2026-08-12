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

// Hardcoded clinic ID for this deployment — used as Tenant + clinicid header
const CLINIC_ID = 'aureus';



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
  // Always use the hardcoded clinic ID — this server only runs one clinic
  const clinicId = CLINIC_ID;
  const tenant   = CLINIC_ID;

  const headers = {
    'Content-Type': 'application/json',
    zoneid        : 'Asia/Kolkata',
    Tenant        : tenant,
    'is-auth'     : '1',
    clinicid      : clinicId,
  };

  if (!preAuth) {
    const token    = await getItem('AUTHTOKEN');
    // Only send userid if it's a real HIS staff user ID (not the patient's own id)
    // Patient-portal JWT has sub = mobile number, no user ID in login response
    // We skip userid header to avoid billing server filtering by wrong user
    const branchId = await getItem('branch_id') || await getItem('branchId');

    headers.Authorization = `Bearer ${token}`;

    // userid intentionally omitted — billing server returns empty when wrong userid sent
    if (branchId) headers.branchId = branchId;
  }

  if (clientId) {
    headers.clientId = String(clientId);
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

  // Step 2 of login: verify the OTP the user typed
  // Website: POST to apiHost + Port + '/hisapi/login'
  verifyOTP: async (phoneNumber, otp) =>
    apiCall(
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
    ),

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
// AppointmentApi — all appointment operations
// Website: bookappoinment, fetchAppointmentHistory, cancelAppointment,
//          availSlots, appoinmentcharge, videoAppoinment
// ─────────────────────────────────────────────────────────────────────────────
export const AppointmentApi = {

  // Get available time slots for a doctor on a date
  // Website: GET ?date=YYYY-MM-DD&practionerId=ID  (query string, NOT POST body)
  getAvailableSlots: async (clientId, date, practitionerId) =>
    apiCall(
      HISAPI_BASE,
      `appointment/availableSlots?date=${date}&practionerId=${practitionerId}`,
      { method: 'GET' },
      clientId,
    ),

  // Get the charges/fees for an appointment type
  // NOTE: HIS server returns HTTP 405 on GET — must use POST even for reads.
  getAppointmentCharges: async (clientId, doctorId) =>
    apiCall(
      HISAPI_BASE,
      'appointment/appointmentTypeDetails',
      {
        method: 'POST',
        body  : JSON.stringify({ clientId, doctorId, practitionerId: doctorId }),
      },
      clientId,
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
  generateInvReportPDF: async (clientId, data) =>
    apiCall(
      SMARTCARE_BASE,
      'pdfinvreport/generateinvestigationreportpdf',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      clientId,
    ),
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
// ClinicalNotesApi — doctor's clinical notes for a patient
// Website: ClinicalNotesPrint
// Uses SMARTCARE_BASE (Port 9090 /smartcaremain/)
// ─────────────────────────────────────────────────────────────────────────────
export const ClinicalNotesApi = {

  // Fetch clinical notes as HTML list
  // Website: POST apiHost + Port1 + '/smartcaremain/clinicalnotes/fetch/htmllist'
  getAll: async (clientId, params) =>
    apiCall(
      SMARTCARE_BASE,
      'clinicalnotes/fetch/htmllist',
      {
        method: 'POST',
        body  : JSON.stringify(params),
      },
      clientId,
    ),
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

  const map = {
    AUTHTOKEN       : responseData.token      || responseData.Token      || '',
    SESSIONEXPIRTIME: responseData.expirytime || responseData.expiryTime || '',
    CLINICID        : CLINIC_ID,   // always aureus
    Tenant          : CLINIC_ID,   // always aureus
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
    '| clinicId:', CLINIC_ID,
    '| userId:', map.UserId || '(empty)',
    '| branchId:', map.branch_id || '(empty)');
};

// ─────────────────────────────────────────────────────────────────────────────
// PractitionerApi — list of doctors/practitioners at the clinic
// ─────────────────────────────────────────────────────────────────────────────
export const PractitionerApi = {

  // Get all practitioners for the current clinic
  // Website: GET hisapi/user/practitioner/all
  getAll: async () =>
    apiCall(
      HISAPI_BASE,
      'user/practitioner/all',
      { method: 'GET' },
    ),
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