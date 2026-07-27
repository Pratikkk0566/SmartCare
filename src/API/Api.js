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
// patientId       → pass when the endpoint needs a specific patient
// ─────────────────────────────────────────────────────────────────────────────
export const buildHeaders = async (patientId = 0, preAuth = false) => {
  const clinicId = await getItem('CLINICID');
  // 👆 Now dynamic — reads whichever clinic the user logged into
  //    Website uses: localStorage.getItem('CLINICID')
  //    App uses:     AsyncStorage.getItem('CLINICID')

  const headers = {
    'Content-Type': 'application/json',
    zoneid        : 'Asia/Kolkata',
    Tenant        : clinicId || 'aureus', // dynamic clinic, fallback to 'aureus'
    'is-auth'     : '1',                  // website sends this on all requests
  };

  if (!preAuth) {
    const token   = await getItem('AUTHTOKEN');
    const userId  = await getItem('UserId');
    const branchId = await getItem('branch_id');

    headers.Authorization = `Bearer ${token}`;

    // Only add these headers if they actually have a value
    // Sending empty strings causes 400 Bad Request on some endpoints
    if (clinicId) headers.clinicid = clinicId;
    if (userId)   headers.userid   = userId;
    if (branchId) headers.branchId = branchId;
  }

  if (patientId) {
    headers.patientid = patientId;
    // Some endpoints need the patient ID in the header, not just the URL
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
// patientId: the patient's ID (0 = not needed)
// preAuth  : true only for login/OTP (before user is logged in)
// ─────────────────────────────────────────────────────────────────────────────
async function apiCall(baseUrl, endpoint, options = {}, patientId = 0, preAuth = false) {
  const url     = `${baseUrl}${endpoint}`;
  const headers = await buildHeaders(patientId, preAuth);

  try {
    const response = await fetch(url, { ...options, headers });
    const data     = await response.json();

    console.log('[API]', url, '→ status:', response.status);

    if (!response.ok) {
      const msg = data?.message || data?.error || data?.errorMessage || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return { success: true, data };
    // ✅ Caller checks result.success === true, then uses result.data

  } catch (error) {
    console.log('[API ERROR]', url, error.message);
    return { success: false, error: error.message };
    // ❌ Caller checks result.success === false, then shows result.error
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
  editProfile: async (patientId, data) =>
    apiCall(
      HISAPI_BASE,
      'patient/editPatient',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      patientId,
    ),

  // Save/update profile (existing endpoint already in app)
  // Website: POST user/profile
  createProfile: async (userData, patientId = 0) =>
    apiCall(
      HISAPI_BASE,
      'user/profile',
      {
        method: 'POST',
        body  : JSON.stringify(userData),
      },
      patientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// AppointmentApi — all appointment operations
// Website: bookappoinment, fetchAppointmentHistory, cancelAppointment,
//          availSlots, appoinmentcharge, videoAppoinment
// ─────────────────────────────────────────────────────────────────────────────
export const AppointmentApi = {

  // Get available time slots for a doctor on a date
  // Website: GET apiHost + Port + '/hisapi/appointment/availableSlots'
  getAvailableSlots: async (patientId, params) =>
    apiCall(
      HISAPI_BASE,
      `appointment/availableSlots?${params}`,
      // params = 'doctorId=123&date=2026-07-24' — build this string in the screen
      { method: 'GET' },
      patientId,
    ),

  // Get the charges/fees for an appointment type
  // Website: GET apiHost + Port + '/hisapi/appointment/appointmentTypeDetails?'
  getAppointmentCharges: async (patientId, params) =>
    apiCall(
      HISAPI_BASE,
      `appointment/appointmentTypeDetails?${params}`,
      { method: 'GET' },
      patientId,
    ),

  // Book a new appointment
  // Website: POST apiHost + Port + '/hisapi/appointment/book'
  book: async (patientId, appointmentData) =>
    apiCall(
      HISAPI_BASE,
      'appointment/book',
      {
        method: 'POST',
        body  : JSON.stringify(appointmentData),
      },
      patientId,
    ),

  // Fetch appointment history for a patient
  // Website: GET apiHost + Port + '/hisapi/appointment/fetchAppointment/history/{patientId}'
  getHistory: async (patientId) =>
    apiCall(
      HISAPI_BASE,
      `appointment/fetchAppointment/history/${patientId}`,
      { method: 'GET' },
      patientId,
    ),

  // Cancel an appointment
  // Website: POST apiHost + Port + '/hisapi/appointment/cancelAppointment'
  cancel: async (patientId, appointmentId) =>
    apiCall(
      HISAPI_BASE,
      'appointment/cancelAppointment',
      {
        method: 'POST',
        body  : JSON.stringify({ appointmentId }),
      },
      patientId,
    ),

  // Book a video appointment
  // Website: POST apiHost + Port2 + '/smartcaremain/opd/appointment/capture/video'
  // Note: this one uses SMARTCARE_BASE, not HISAPI_BASE
  bookVideo: async (patientId, data) =>
    apiCall(
      SMARTCARE_BASE,
      'opd/appointment/capture/video',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      patientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// InvestigationApi — lab reports & investigation results
// Website: InvestigationReport, DownloadInvestigationReport,
//          printInvestigationReport, GeneratePDFReport
// ─────────────────────────────────────────────────────────────────────────────
export const InvestigationApi = {

  // Get list of approved investigation reports for a patient
  // Website: GET apiHost + Port + '/hisapi/investigation/approved/reports'
  getAll: async (patientId) =>
    apiCall(
      HISAPI_BASE,
      'investigation/approved/reports',
      { method: 'GET' },
      patientId,
    ),

  // Generate and download a report PDF
  // Website: POST apiHost + Port2 + '/smartcaremain/investigation/generatepdfreport'
  generatePDF: async (patientId, reportData) =>
    apiCall(
      SMARTCARE_BASE,
      'investigation/generatepdfreport',
      {
        method: 'POST',
        body  : JSON.stringify(reportData),
      },
      patientId,
    ),

  // Print investigation report
  // Website: POST apiHost + Port2 + '/smartcaremain/investigation/print'
  print: async (patientId, reportData) =>
    apiCall(
      SMARTCARE_BASE,
      'investigation/print',
      {
        method: 'POST',
        body  : JSON.stringify(reportData),
      },
      patientId,
    ),

  // Generate PDF using the PDFInvReport service
  // Website: POST apiHost + Port2 + '/smartcaremain/pdfinvreport/generateinvestigationreportpdf'
  generateInvReportPDF: async (patientId, data) =>
    apiCall(
      SMARTCARE_BASE,
      'pdfinvreport/generateinvestigationreportpdf',
      {
        method: 'POST',
        body  : JSON.stringify(data),
      },
      patientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceApi — billing & invoices
// Website: InvoiceAndBills, invoicePrintDetails, CAPTUREPAYMENT, againstopd
// All use BILLING_BASE (Port 9090 /billing/)
// ─────────────────────────────────────────────────────────────────────────────
export const InvoiceApi = {

  // Fetch all invoices for a patient
  // Website: POST apiHost + Port2 + '/billing/invoice/fetchinvoiceData'
  getAll: async (patientId, params) =>
    apiCall(
      BILLING_BASE,
      'invoice/fetchinvoiceData',
      {
        method: 'POST',
        body  : JSON.stringify(params),
        // params = { patientId, fromDate, toDate } — check what your website sends
      },
      patientId,
    ),

  // Get invoice print details (for PDF/print view)
  // Website: GET apiHost + Port1 + '/billing/invoice/printdetails'
  getPrintDetails: async (patientId, invoiceId) =>
    apiCall(
      BILLING_BASE,
      `invoice/printdetails?invoiceId=${invoiceId}`,
      { method: 'GET' },
      patientId,
    ),

  // Capture payment for an invoice
  // Website: POST apiHost + Port1 + '/billing/payment/capture-payment'
  capturePayment: async (patientId, paymentData) =>
    apiCall(
      BILLING_BASE,
      'payment/capture-payment',
      {
        method: 'POST',
        body  : JSON.stringify(paymentData),
      },
      patientId,
    ),

  // Payment against OPD
  // Website: POST apiHost + Port1 + '/billing/payment/againstopd'
  payAgainstOPD: async (patientId, paymentData) =>
    apiCall(
      BILLING_BASE,
      'payment/againstopd',
      {
        method: 'POST',
        body  : JSON.stringify(paymentData),
      },
      patientId,
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
  getAll: async (patientId, params) =>
    apiCall(
      SMARTCARE_BASE,
      'clinicalnotes/fetch/htmllist',
      {
        method: 'POST',
        body  : JSON.stringify(params),
      },
      patientId,
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
  getQuestions: async (patientId) =>
    apiCall(
      IPD_BASE,
      'feedback/questionsList',
      { method: 'GET' },
      patientId,
    ),

  // Submit feedback answers
  // Website: POST apiHost + Port1 + '/ipd/feedback/submitFeedback'
  submit: async (patientId, feedbackData) =>
    apiCall(
      IPD_BASE,
      'feedback/submitFeedback',
      {
        method: 'POST',
        body  : JSON.stringify(feedbackData),
      },
      patientId,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// saveSession — call this immediately after verifyOTP succeeds
// Saves everything the server returns to AsyncStorage so buildHeaders()
// can automatically attach it to every future request.
// ─────────────────────────────────────────────────────────────────────────────
export const saveSession = async (responseData, mobile = '', clinicId = '') => {
  // Server login response only returns: token + expirytime
  // patientId is fetched separately after login using the mobile number
  const map = {
    AUTHTOKEN       : responseData.token       || '',
    SESSIONEXPIRTIME: responseData.expirytime  || '',
    CLINICID        : clinicId                 || '',
    mobileNumber    : mobile                   || '',
  };

  await Promise.all(
    Object.entries(map).map(([key, value]) =>
      AsyncStorage.setItem(key, String(value)),
    ),
  );
};

export default apiCall;