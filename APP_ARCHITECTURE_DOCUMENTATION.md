# SmartCare Medicare App - Complete Architecture Documentation

## Table of Contents
1. [App Overview](#app-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [App Flow & Navigation](#app-flow--navigation)
5. [API Architecture](#api-architecture)
6. [Module Breakdown](#module-breakdown)
7. [Database & Storage](#database--storage)
8. [Services & Business Logic](#services--business-logic)
9. [State Management](#state-management)

---

## 1. App Overview

**SmartCare Medicare** is a comprehensive React Native healthcare mobile application that connects patients with the SmartCare HIS (Hospital Information System). It enables patients to:
- Manage medical appointments
- Track prescriptions and medication schedules
- View medical invoices and bills
- Access investigation/lab reports
- Schedule medicine reminders with smart alarms
- Book investigations/tests
- Manage health profile and clinical notes

**Backend System**: SmartCare HIS (https://saas.smartcarehis.com:8443)

---

## 2. Technology Stack

### Core Framework
- **React Native** (Latest version with New Architecture/Fabric support)
- **React Navigation** (v6) - Navigation system
- **React Context API** - Global state management

### Key Libraries
- **@react-native-async-storage/async-storage** - Local storage
- **@react-native-community/netinfo** - Network status monitoring
- **react-native-nitro-sqlite** - SQLite database (Nitro-boosted)
- **react-native-push-notification** - Local notifications
- **react-native-svg** - Vector graphics and icons
- **date-fns** - Date manipulation

### Development Tools
- **Metro** - React Native bundler
- **Gradle 9.3.1** - Android build system
- **ESLint & Prettier** - Code quality and formatting

---

## 3. Project Structure

```
Sus/
├── android/                    # Android native code
├── ios/                        # iOS native code (if present)
├── src/
│   ├── API/                   # API integration layer
│   │   └── Api.js             # Centralized API endpoints
│   ├── assets/                # Images, icons, fonts
│   │   └── icons/             # Custom SVG icons
│   ├── components/            # Reusable UI components
│   ├── constants/             # App-wide constants
│   ├── context/               # React Context providers
│   │   └── AppContext.jsx     # Global app state
│   ├── data/                  # Static data and mocks
│   ├── database/              # SQLite database layer
│   │   ├── repositories/      # Data access layer
│   │   │   ├── InvestigationRepository.js
│   │   │   ├── MedicationAlarmRepository.js
│   │   │   └── ScheduledDoseRepository.js
│   │   └── schema.js          # Database schema definitions
│   ├── hooks/                 # Custom React hooks
│   ├── navigation/            # Navigation configuration
│   │   └── AppNavigator.jsx   # Main navigation setup
│   ├── screens/               # All app screens
│   │   ├── Onboarding/        # Login & registration flows
│   │   ├── Home/              # Dashboard
│   │   ├── Appointments/      # Appointment booking & management
│   │   ├── Medicine/          # Medication & prescriptions
│   │   ├── Invoices/          # Billing & invoices
│   │   ├── Investigations/    # Lab reports & tests
│   │   ├── Profile/           # User profile & settings
│   │   ├── Assistant/         # AI assistant (chat interface)
│   │   ├── ClinicalNotes/     # Doctor's notes
│   │   ├── Notifications/     # Notification center
│   │   └── Security/          # App lock & PIN
│   ├── services/              # Business logic services
│   │   ├── MedicationSchedulingEngine.js
│   │   ├── MedicationEngineService.js
│   │   ├── AsyncStorageMedicationStore.js
│   │   ├── LocalAlarmManager.js
│   │   ├── NotificationService.js
│   │   ├── StorageService.js
│   │   └── SQLiteDataService.js
│   ├── theme/                 # Design system
│   │   ├── colors.js
│   │   ├── shadows.js
│   │   └── typography.js
│   └── utils/                 # Utility functions
│       └── invoiceHtmlGenerator.js
├── index.js                   # App entry point
├── package.json
├── metro.config.js
└── android/app/src/main/AndroidManifest.xml
```

---

## 4. App Flow & Navigation

### 4.1 Onboarding Flow

```
SplashScreen
    ↓
WelcomeScreen (first launch only)
    ↓
LanguageSelectScreen
    ↓
PhoneLoginScreen
    ↓
PhoneNumberEntry
    ↓
OTPVerificationScreen
    ↓
AccountCreatedScreen
    ↓
MainTabs (Home)
```

**Screens:**
1. **SplashScreen** - App logo, checks login status, navigates to Welcome or MainTabs
2. **WelcomeScreen** - Feature highlights and benefits
3. **LanguageSelectScreen** - Choose app language (English/Hindi/etc.)
4. **PhoneLoginScreen** - Landing page with "Continue with Mobile"
5. **PhoneNumberEntry** - Enter 10-digit phone number
6. **OTPVerificationScreen** - 6-digit OTP verification
7. **AccountCreatedScreen** - Success message, navigate to app

**API Calls:**
- `OTPApi.sendOTP(phoneNumber)` - Request OTP
- `OTPApi.verifyOTP(phoneNumber, otp)` - Verify and login
- `PatientApi.getByMobile(phoneNumber)` - Fetch user profile after login

### 4.2 Main Navigation (Bottom Tab Bar)

```
┌──────────────────────────────────────────────────┐
│  [Home]  [Invoices]  [FAB]  [Investigation]  [Profile]  │
└──────────────────────────────────────────────────┘
```

**Tabs:**
1. **Home** - Dashboard with upcoming appointments, medicines due today, recent activity
2. **Invoices** - List of all bills and payment history
3. **FAB (Floating Action Button)** - Quick access to book appointments
4. **Investigations** - Lab reports and test results
5. **Profile** - User profile, settings, logout

### 4.3 Feature Modules

#### A. Appointments Module
```
AppointmentsScreen (List of appointments)
    ↓
DoctorSearchScreen (Search/filter doctors)
    ↓
DoctorProfileScreen (Doctor details, ratings, fees)
    ↓
BookingSlotScreen (Select date & available time slots)
    ↓
BookingConfirmScreen (Review and confirm booking)
    ↓
AppointmentSuccessScreen (Confirmation with booking ID)
```

**API Flow:**
1. `PractitionerApi.getList()` - Get all doctors
2. `AppointmentApi.getAvailableSlots(date, practitionerId)` - Get time slots
3. `AppointmentApi.getAppointmentCharges(patientId, doctorId)` - Get consultation fees
4. `AppointmentApi.book(clientId, appointmentData)` - Book appointment
5. `AppointmentApi.getHistory(clientId)` - Get appointment history

#### B. Medicine & Prescription Module
```
MedicineScheduleScreen (Calendar view of medication schedule)
    ↓
TodaysMedicineScreen (Today's doses with mark taken/skip)
    ↓
PrescriptionsScreen (List of all prescriptions)
    ↓
PrescriptionDetailScreen (Medicines in a prescription)
    ↓
AboutMedicineScreen (Medicine info, dosage, instructions)
    ↓
RestockMedicineScreen (Low stock alerts and reorder)
```

**Additional Screens:**
- **MedicationAlarmsScreen** - Manage alarm times (Morning/Afternoon/Evening/Night)
- **CreatePrescriptionScreen** - Manual prescription entry
- **AddMedicinesScreen** - Add medicines to prescription
- **ReviewPrescriptionScreen** - Review before saving

**API Flow:**
1. `PrescriptionRepeatApi.getListByDoctor(practid, clientid)` - Get prescription list for a doctor
2. `PrescriptionRepeatApi.getById(prescriptionId)` - Get medicine details for prescription
3. `PrescriptionRepeatApi.getAllForPatient(practids, patientId)` - Get all prescriptions for all visited doctors
4. `medicationEngineService.syncPrescriptions(data)` - Process and schedule medications

**Medication Engine Flow:**
```
API Prescription Data
    ↓
MedicationEngineService.syncPrescriptions()
    ↓
MedicationSchedulingEngine (business logic)
    ↓
AsyncStorageMedicationStore (persistence)
    ↓
LocalAlarmManager (schedule native alarms)
    ↓
NotificationService (trigger notifications at alarm time)
```

#### C. Invoices Module
```
InvoicesScreen (List of all invoices)
    ↓
InvoiceDetailScreen (Invoice breakdown, line items)
    ↓
[Generate PDF] → Save to device
    ↓
[Share Invoice] → Share via WhatsApp/Email
```

**API Flow:**
1. `InvoiceApi.getAll(clientId, fromDate, toDate)` - Get all invoices
2. `InvoiceApi.getPrintDetails(clientId, invoiceId)` - Get invoice detail for PDF
3. `InvoiceApi.saveInvoiceForm(clientId, htmlContent)` - Save invoice as HTML on server
4. `InvoiceApi.downloadDocuments(clientId, fileName)` - Download PDF from server

**PDF Generation:**
- `invoiceHtmlGenerator.js` generates HTML from invoice data
- Server converts HTML to PDF
- App downloads and displays PDF

#### D. Investigations Module
```
InvestigationsScreen (List of all reports)
    ↓
InvestigationReportScreen (View report details/PDF)
    ↓
InvestigationRequestScreen (Book new test)
    ↓
SelectHospitalScreen (Choose diagnostic center)
    ↓
SelectDateTimeScreen (Pick date & time)
    ↓
BookingConfirmedScreen (Booking confirmation)
```

**API Flow:**
1. `InvestigationApi.getAll(clientId, fromDate, toDate)` - Get all reports
2. `InvestigationApi.generateInvReportPDF(clientId, reportData)` - Generate PDF report
3. Store locally in SQLite via `InvestigationRepository`

#### E. Profile & Settings Module
```
ProfileScreen
    ↓
PersonalInformationScreen (Edit name, DOB, address, etc.)
    ↓
SettingsScreen (App preferences, notifications, language)
    ↓
AppLockSetupScreen (Enable/disable PIN/Biometric)
    ↓
PINSetupScreen (Set 4-digit PIN)
    ↓
AppLockScreen (PIN entry on app launch if locked)
```

**API Flow:**
1. `PatientApi.getByMobile(mobileNo)` - Get profile data
2. `PatientApi.editProfile(clientId, data)` - Update profile
3. `PatientApi.createProfile(userData, clientId)` - Save new profile

#### F. Clinical Notes Module
```
ClinicalNotesScreen (List of doctor's notes)
    ↓
ClinicalNoteDetailScreen (Full note with diagnosis, prescriptions, recommendations)
```

**API Flow:**
1. `ClinicalNotesApi.getAll(patientId, fromDate, toDate)` - Get all notes
2. `ClinicalNotesApi.getById(noteId)` - Get individual note detail

#### G. AI Assistant Module
```
AIAssistantScreen
    ↓
[Chat interface with medical assistant]
    ↓
Ask health questions, get medication reminders, appointment info
```

---

## 5. API Architecture

### 5.1 Base URLs

```javascript
HISAPI_BASE     = 'https://saas.smartcarehis.com:8443/hisapi_test/'
BILLING_BASE    = 'https://saas.smartcarehis.com:8443/billing/'
SMARTCARE_BASE  = 'https://saas.smartcarehis.com:8443/smartcaremain/'
IPD_BASE        = 'https://saas.smartcarehis.com:8443/ipd/'
ROOT_BASE       = 'https://saas.smartcarehis.com:8443/'
```

### 5.2 Authentication & Headers

**Authentication Flow:**
1. User enters phone number → `OTPApi.sendOTP(phone)`
2. User enters OTP → `OTPApi.verifyOTP(phone, otp)`
3. Server returns JWT token → Store in AsyncStorage as `AUTHTOKEN`
4. All subsequent requests include `Authorization: Bearer <token>`

**Standard Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'zoneid': 'Asia/Kolkata',
  'Tenant': '<clinicId>',         // From AsyncStorage: CLINICID
  'is-auth': '1',
  'clinicid': '<clinicId>',
  'userid': '<clinicId>',
  'patientid': '<patientId>',     // 0 if not patient-specific
  'Authorization': 'Bearer <token>',
  'branchid': '<branchId | null>'
}
```

### 5.3 API Modules

#### OTPApi (Pre-Auth)
```javascript
// Login Flow
OTPApi.sendOTP(phoneNumber)          // POST /patient/generateOTP
OTPApi.verifyOTP(phoneNumber, otp)   // POST /login
OTPApi.resendOTP(phoneNumber)        // POST /patient/generateOTP
```

#### PatientApi
```javascript
PatientApi.getByMobile(mobileNo)              // GET /patient/byMobileNo?mobileNo=xxx
PatientApi.register(patientData)              // POST /patient/register
PatientApi.editProfile(clientId, data)        // POST /patient/editPatient
PatientApi.createProfile(userData, clientId)  // POST /user/profile
```

#### AppointmentApi
```javascript
AppointmentApi.getAvailableSlots(clientId, date, practitionerId)  // GET /appointment/availableSlots?date=xxx&practionerId=xxx
AppointmentApi.getAppointmentCharges(patientId, doctorId)         // GET /appointment/appointmentTypeDetails?patientId=xxx&doctorId=xxx
AppointmentApi.book(clientId, appointmentData)                    // POST /appointment/book
AppointmentApi.getHistory(clientId)                               // GET /appointment/fetchAppointment/history/{clientId}
AppointmentApi.cancel(clientId, appointmentId)                    // POST /appointment/cancelAppointment
AppointmentApi.bookVideo(clientId, data)                          // POST /opd/appointment/capture/video (SMARTCARE_BASE)
```

#### PractitionerApi
```javascript
PractitionerApi.getList(isActive, page, size)  // GET /practitioner/practitionerlist?isactive={isActive}&page={page}&size={size}
```

#### InvoiceApi
```javascript
InvoiceApi.getAll(clientId, fromDate, toDate)                     // POST /invoice/fetchinvoiceData
InvoiceApi.getPrintDetails(clientId, invoiceId)                   // POST /invoice/printdetails
InvoiceApi.saveInvoiceForm(clientId, {formTitle, patientId, htmlContent})  // POST /master/patient/form/invoice/save/{clinicId}
InvoiceApi.downloadDocuments(clientId, fileName)                  // POST /patient/downloadDocuments (SMARTCARE_BASE)
InvoiceApi.capturePayment(clientId, paymentData)                  // POST /payment/capture-payment
InvoiceApi.payAgainstOPD(clientId, paymentData)                   // POST /payment/againstopd
```

#### InvestigationApi
```javascript
InvestigationApi.getAll(clientId, fromDate, toDate)                // POST /investigation/approved/reports
InvestigationApi.generatePDF(clientId, reportData)                 // POST /investigation/generatepdfreport (SMARTCARE_BASE)
InvestigationApi.print(clientId, reportData)                       // POST /investigation/print (SMARTCARE_BASE)
InvestigationApi.generateInvReportPDF(clientId, data)              // POST /pdfinvreport/generateinvestigationreportpdf (SMARTCARE_BASE)
```

#### PrescriptionRepeatApi
```javascript
PrescriptionRepeatApi.getListByDoctor(practid, clientid)           // POST /priscription/repeatpriscriptionList
PrescriptionRepeatApi.getById(prescriptionId, {forceRefresh})      // GET /priscription/fetchrepeatpriscrition/{prescriptionId}
PrescriptionRepeatApi.getAllForPatient(practids, patientId, opts)  // Aggregates prescriptions from all doctors
```

#### ClinicalNotesApi
```javascript
ClinicalNotesApi.getAll(patientId, fromDate, toDate)   // POST /clinicalnotes/notes/list
ClinicalNotesApi.getById(noteId)                       // GET /clinicalnotes/clinical/notes/{noteId}
```

### 5.4 Error Handling

All API calls return a consistent response format:
```javascript
{
  success: true/false,
  data: {...} | [...],
  error: 'error message' // only present if success = false
}
```

**Network Error Handling:**
- Connection timeout → Retry with exponential backoff
- HTTP 401 Unauthorized → Clear token, redirect to login
- HTTP 5xx Server Error → Show user-friendly error message
- Offline mode → Use cached data, show "Offline" badge

---

## 6. Module Breakdown

### 6.1 Onboarding Module

**Purpose:** User registration and authentication

**Screens:**
- SplashScreen
- WelcomeScreen
- LanguageSelectScreen
- PhoneLoginScreen
- PhoneNumberEntry
- OTPVerificationScreen
- AccountCreatedScreen

**Key Features:**
- Phone number validation (10 digits)
- OTP verification (6 digits)
- JWT token storage
- Multi-language support
- First-time onboarding detection

**AsyncStorage Keys:**
- `@isOnboarded` - Boolean
- `@isLoggedIn` - Boolean
- `@selectedLanguage` - String (en, hi, etc.)
- `AUTHTOKEN` - JWT token
- `mobileNumber` - User's phone
- `patientId` - Numeric patient ID
- `patientName` - Full name
- `CLINICID` - Clinic identifier
- `Tenant` - Tenant identifier

### 6.2 Home Dashboard Module

**Purpose:** Central hub showing overview of all features

**Screen:** HomeScreen

**Widgets:**
1. **Today's Medicines** - Next 3 doses due today
2. **Upcoming Appointments** - Next 2 appointments
3. **Recent Invoices** - Last 3 invoices
4. **Pending Reports** - Unread investigation reports
5. **Quick Actions** - Book appointment, View prescriptions, AI assistant

**Data Sources:**
- AppContext state (cached + API)
- SQLiteDataService (local medication schedules)
- LocalAlarmManager (upcoming alarms)

### 6.3 Appointments Module

**Purpose:** Book, manage, and track medical appointments

**Screens:**
1. **AppointmentsScreen** - List of all appointments (upcoming & history tabs)
2. **DoctorSearchScreen** - Search doctors by name, specialty, location
3. **DoctorProfileScreen** - Doctor's profile, qualifications, experience, fees
4. **BookingSlotScreen** - Calendar + available time slots
5. **BookingConfirmScreen** - Review appointment details before booking
6. **AppointmentSuccessScreen** - Confirmation screen with booking ID

**Key Features:**
- **Search & Filter:**
  - By specialty (Cardiology, Dermatology, etc.)
  - By doctor name
  - By location/clinic
  - By availability (Today, Tomorrow, This Week)
  
- **Slot Selection:**
  - Fetches available slots from server for selected date and doctor
  - Shows slot duration (e.g., 15 min, 30 min)
  - Handles slot booking conflicts
  
- **Appointment Types:**
  - In-Clinic Consultation
  - Video Consultation
  - Audio Consultation
  
- **Payment:**
  - Shows consultation fee
  - Online payment (future feature)
  - Pay at clinic option

**Database:**
- Appointments cached in AsyncStorage via StorageService
- Synced from API on app launch and when coming online

**State Management:**
```javascript
// AppContext state
appointments: [...],           // Upcoming appointments
appointmentHistory: [...],     // Past appointments
practitioners: [...],          // All doctors
```

### 6.4 Medicine & Prescription Module

**Purpose:** Manage medications, track intake, set reminders

**Screens:**
1. **MedicineScheduleScreen** - Weekly calendar view with all scheduled doses
2. **TodaysMedicineScreen** - Today's doses (Upcoming, Taken, Skipped)
3. **PrescriptionsScreen** - List of all prescriptions from all doctors
4. **PrescriptionDetailScreen** - Medicines in a single prescription
5. **AboutMedicineScreen** - Medicine info (name, dose, instructions, side effects)
6. **RestockMedicineScreen** - Low stock alerts and pharmacy reorder
7. **MedicationAlarmsScreen** - Configure alarm times (Morning/Afternoon/Evening/Night)
8. **CreatePrescriptionScreen** - Manually add prescription
9. **AddMedicinesScreen** - Add medicines to prescription
10. **ReviewPrescriptionScreen** - Review before saving

**Medication Scheduling Engine Architecture:**

```
┌─────────────────────────────────────────────────┐
│         PrescriptionRepeatApi                   │
│  (Fetch prescriptions from SmartCare HIS)       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│      MedicationEngineService (Orchestrator)     │
│  • Sync prescriptions from API                  │
│  • Coordinate scheduling engine & storage       │
│  • Manage timing configuration                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│    MedicationSchedulingEngine (Business Logic)  │
│  • Parse frequency (1-0-1, BD, TDS, QID, etc.)  │
│  • Calculate quantity & duration                │
│  • Generate daily schedules                     │
│  • Handle taken/skip/snooze actions             │
│  • Calculate adherence statistics               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│   AsyncStorageMedicationStore (Persistence)     │
│  • Save prescriptions, medications, schedules   │
│  • Store alarms & timing config                 │
│  • Event logging                                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  LocalAlarmManager (Native Alarm Scheduling)    │
│  • Schedule Android AlarmManager alarms         │
│  • Trigger at exact times (even if app closed)  │
│  • Handle snooze & reschedule                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│     NotificationService (Push Notifications)    │
│  • Show medication reminder notifications       │
│  • Actions: Mark Taken, Skip, Snooze           │
│  • Update badge count                           │
└─────────────────────────────────────────────────┘
```

**Key Concepts:**

1. **Frequency Parsing:**
   - Numeric pattern: "1-0-1" → Morning 1, Afternoon 0, Evening 1
   - Medical abbreviations: "BD" (twice daily), "TDS" (thrice daily), "QID" (four times)
   - Natural language: "Morning & Night", "After lunch", etc.

2. **Timing Configuration:**
   ```javascript
   {
     MORNING: "08:00",
     AFTERNOON: "14:00",
     EVENING: "20:00",
     NIGHT: "22:00"
   }
   ```
   - User can customize these times
   - Priority: Doctor timing > Medicine timing > Patient timing > Default

3. **Medication Status:**
   - UPCOMING - Start date is in future
   - ACTIVE - Currently taking
   - COMPLETED - All doses taken
   - EXPIRED - End date passed
   - CANCELLED - Stopped by doctor/user

4. **Schedule Status:**
   - SCHEDULED - Upcoming dose
   - TAKEN - Marked as taken
   - SKIPPED - User skipped this dose
   - SNOOZED - Delayed by X minutes
   - CANCELLED - Medication cancelled

5. **Alarm Flow:**
   ```
   Alarm Time Reached
       ↓
   LocalAlarmManager.triggerAlarm()
       ↓
   NotificationService.showNotification()
       ↓
   User Action (Take / Skip / Snooze)
       ↓
   MedicationEngineService.markTaken/markSkipped/snooze()
       ↓
   Update schedule status
       ↓
   Reschedule next alarm (if snoozed)
   ```

**Database:**
- **AsyncStorageMedicationStore** (AsyncStorage-based)
  - `@medication_prescriptions` - All prescriptions
  - `@medications` - Active medications
  - `@medication_schedules` - All scheduled doses
  - `@medication_alarms` - Scheduled alarms
  - `@medication_timing_config` - User's alarm times
  - `@medication_events` - Event log (last 1000 events)

- **SQLiteDataService** (SQLite-based backup/alternative)
  - `scheduled_doses` table
  - `medication_alarms` table
  - Used by LocalAlarmManager for reliable alarm scheduling

**State Management:**
```javascript
// AppContext
engineSchedules: [],      // All scheduled doses
engineActiveMeds: [],     // Currently active medications
engineAlarms: [],         // Upcoming alarms
engineStats: {            // Adherence statistics
  total: 0,
  taken: 0,
  skipped: 0,
  pending: 0,
  rate: 0  // Percentage
},
engineTimingConfig: {...} // Alarm times
```

### 6.5 Invoices Module

**Purpose:** View and manage medical bills and payments

**Screens:**
1. **InvoicesScreen** - List of all invoices (sorted by date)
2. **InvoiceDetailScreen** - Line-by-line breakdown of charges

**Key Features:**
- **Invoice Details:**
  - Invoice number & date
  - Service description (Consultation, Lab Test, etc.)
  - Doctor name & specialty
  - Itemized charges
  - Tax breakdown
  - Total amount
  - Payment status (Paid, Pending, Overdue)

- **Actions:**
  - View PDF
  - Download PDF
  - Share via WhatsApp/Email
  - Print (future feature)
  - Pay online (future feature)

- **PDF Generation:**
  1. Fetch invoice detail via `InvoiceApi.getPrintDetails()`
  2. Generate HTML using `invoiceHtmlGenerator.js`
  3. Save HTML to server via `InvoiceApi.saveInvoiceForm()`
  4. Server converts HTML → PDF
  5. Download PDF via `InvoiceApi.downloadDocuments()`
  6. Display PDF in app or share

**Database:**
- Cached in AsyncStorage via StorageService
- `@invoices_cache` key

**State Management:**
```javascript
// AppContext
invoices: [],             // All invoices
invoicesLastUpdated: null // Last sync timestamp
```

### 6.6 Investigations Module

**Purpose:** View lab reports and book diagnostic tests

**Screens:**
1. **InvestigationsScreen** - List of all reports (Blood Test, X-Ray, MRI, etc.)
2. **InvestigationReportScreen** - View report PDF or images
3. **InvestigationRequestScreen** - Book new test
4. **SelectHospitalScreen** - Choose diagnostic center
5. **SelectDateTimeScreen** - Pick appointment slot
6. **BookingConfirmedScreen** - Booking confirmation

**Key Features:**
- **Report Types:**
  - Blood tests (CBC, LFT, KFT, Lipid Profile, HbA1c, etc.)
  - Radiology (X-Ray, CT Scan, MRI, Ultrasound)
  - Pathology
  - Microbiology
  - Cardiology (ECG, Echo, TMT)

- **Report Viewing:**
  - PDF viewer for documents
  - Image viewer for scans
  - Download to device
  - Share with doctor

- **Test Booking:**
  - Browse available tests
  - Select diagnostic center
  - Choose date & time slot
  - Home collection option
  - Online payment (future)

**Database:**
- Stored in SQLite via InvestigationRepository
- Table: `investigations`
  ```sql
  CREATE TABLE investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT UNIQUE,
    patient_id TEXT,
    test_name TEXT,
    date TEXT,
    status TEXT,
    result TEXT,
    pdf_path TEXT,
    created_at TEXT
  )
  ```

**State Management:**
```javascript
// AppContext
investigations: [],            // All reports
investigationsLastUpdated: null
```

### 6.7 Profile & Settings Module

**Purpose:** Manage user profile and app preferences

**Screens:**
1. **ProfileScreen** - Profile overview with quick links
2. **PersonalInformationScreen** - Edit name, DOB, gender, address, etc.
3. **SettingsScreen** - App preferences
4. **AppLockSetupScreen** - Enable PIN/Biometric lock
5. **PINSetupScreen** - Set 4-digit PIN
6. **AppLockScreen** - PIN entry on app launch

**Profile Fields:**
- Personal Info:
  - First Name, Middle Name, Last Name
  - Gender (Male/Female/Other)
  - Date of Birth
  - Blood Group
  - Mobile Number
  - Email Address
  
- Address:
  - Street Address
  - City
  - State
  - PIN Code
  
- Health Info:
  - Height (cm/ft)
  - Weight (kg/lbs)
  - Blood Pressure
  - Allergies (list)
  - Chronic Conditions

- System Info:
  - UHID (Hospital Patient ID)
  - Patient ID (internal)

**Settings:**
- Notification preferences
- Language selection
- App lock (PIN/Biometric)
- Theme (Light/Dark - future)
- Data sync settings
- Clear cache
- Logout

**Database:**
- Profile stored in AsyncStorage via StorageService
- Key: `@user_profile`

### 6.8 Clinical Notes Module

**Purpose:** View doctor's clinical notes and diagnoses

**Screens:**
1. **ClinicalNotesScreen** - List of all notes from doctors
2. **ClinicalNoteDetailScreen** - Full note with diagnosis, prescriptions, recommendations

**Note Contents:**
- Date & time of consultation
- Doctor name & specialty
- Chief complaint
- History of present illness
- Physical examination findings
- Diagnosis
- Investigations ordered
- Prescriptions
- Advice & follow-up instructions

**Database:**
- Cached in AsyncStorage
- Refreshed from API periodically

### 6.9 AI Assistant Module

**Purpose:** Conversational AI for health queries

**Screen:** AIAssistantScreen

**Features:**
- Chat interface (WhatsApp-like)
- Ask health questions
- Get medication reminders
- Check appointment schedule
- Find nearest pharmacies
- Emergency contacts
- Symptom checker (future)

**Implementation:**
- Chat UI with message bubbles
- User messages (right-aligned, blue)
- Bot responses (left-aligned, gray)
- Typing indicator
- Quick reply buttons

### 6.10 Notifications Module

**Purpose:** Central notification inbox

**Screen:** NotificationsScreen

**Notification Types:**
1. **Medicine Reminders** - Time to take medication
2. **Appointment Reminders** - Upcoming appointment (1 day before, 1 hour before)
3. **Report Ready** - Lab report available
4. **Invoice Generated** - New bill
5. **Prescription Refill** - Medication running low
6. **System Messages** - App updates, promotions

**Features:**
- Unread badge count
- Mark as read
- Delete notification
- Grouped by date (Today, Yesterday, Earlier)
- Deep links to relevant screen

**Database:**
- Stored in AppContext state
- Persisted in AsyncStorage

### 6.11 Security Module

**Purpose:** App-level security with PIN/Biometric lock

**Screens:**
1. **AppLockSetupScreen** - Enable/disable lock, choose method
2. **PINSetupScreen** - Set 4-digit PIN
3. **AppLockScreen** - PIN entry when app is locked

**Features:**
- 4-digit PIN lock
- Biometric authentication (Fingerprint/Face ID)
- Auto-lock after X minutes of inactivity
- Lock immediately on app background
- Failed attempts limit (3 attempts → logout)

**Storage:**
- PIN stored encrypted in AsyncStorage
- Key: `@app_pin_encrypted`

---

## 7. Database & Storage

### 7.1 AsyncStorage (Key-Value Store)

**Purpose:** Simple key-value storage for settings and cached data

**Keys Used:**
```javascript
// Authentication & Session
'AUTHTOKEN'           // JWT token
'mobileNumber'        // User's phone
'patientId'           // Numeric patient ID
'patientName'         // Full name
'CLINICID'            // Clinic identifier
'Tenant'              // Tenant identifier
'branch_id'           // Branch ID (if applicable)

// Onboarding & Settings
'@isOnboarded'        // Boolean
'@isLoggedIn'         // Boolean
'@selectedLanguage'   // String (en, hi)
'@app_pin_encrypted'  // Encrypted PIN

// Cached Data
'@user_profile'                // User profile object
'@appointments_cache'          // Appointments array
'@practitioners_cache'         // Doctors list
'@invoices_cache'              // Invoices array
'@investigations_cache'        // Reports array

// Medication Engine
'@medication_prescriptions'    // Prescriptions
'@medications'                 // Active medications
'@medication_schedules'        // Scheduled doses
'@medication_alarms'           // Scheduled alarms
'@medication_timing_config'    // Alarm times
'@medication_events'           // Event log

// Prescription API Cache
'@rx_detail_{prescriptionId}'  // Individual prescription medicine list
```

**Services:**
- **StorageService** - Abstraction layer over AsyncStorage with typed methods

### 7.2 SQLite Database (Nitro-boosted)

**Purpose:** Relational database for complex queries and reliable alarm storage

**Database File:** `smartcare.db`

**Schema:**

```sql
-- Scheduled Doses (Medication Engine)
CREATE TABLE scheduled_doses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  prescription_id TEXT NOT NULL,
  medicine_prescription_id TEXT NOT NULL,
  medicine_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  dose_quantity REAL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,  -- ISO timestamp
  slot TEXT,  -- MORNING, AFTERNOON, EVENING, NIGHT
  status TEXT NOT NULL,  -- SCHEDULED, TAKEN, SKIPPED, SNOOZED, CANCELLED
  taken_at TEXT,
  skipped_at TEXT,
  snoozed_until TEXT,
  notes TEXT,
  timing_instruction TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  INDEX idx_patient (patient_id),
  INDEX idx_date (scheduled_date),
  INDEX idx_status (status),
  INDEX idx_scheduled_at (scheduled_at)
);

-- Medication Alarms (Native Alarm Manager)
CREATE TABLE medication_alarms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alarm_id TEXT UNIQUE NOT NULL,
  schedule_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  scheduled_at TEXT NOT NULL,  -- ISO timestamp
  status TEXT NOT NULL,  -- SCHEDULED, FIRED, CANCELLED
  notification_id INTEGER,  -- Android notification ID
  created_at TEXT NOT NULL,
  fired_at TEXT,
  cancelled_at TEXT,
  INDEX idx_scheduled_at (scheduled_at),
  INDEX idx_status (status),
  INDEX idx_patient (patient_id)
);

-- Investigation Reports
CREATE TABLE investigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  test_category TEXT,
  report_date TEXT NOT NULL,
  status TEXT NOT NULL,  -- Pending, Completed, Cancelled
  result TEXT,
  doctor_name TEXT,
  pdf_path TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  INDEX idx_patient (patient_id),
  INDEX idx_date (report_date),
  INDEX idx_status (status)
);
```

**Repositories (Data Access Layer):**

1. **ScheduledDoseRepository**
   - `insertDose(dose)` - Add new scheduled dose
   - `updateDose(scheduleId, updates)` - Update dose status
   - `getDoseById(scheduleId)` - Get single dose
   - `getDosesByPatient(patientId, fromDate, toDate)` - Get doses for date range
   - `getDosesForToday(patientId)` - Today's doses
   - `markTaken(scheduleId)` - Mark dose as taken
   - `markSkipped(scheduleId, reason)` - Mark dose as skipped
   - `deleteDose(scheduleId)` - Delete dose

2. **MedicationAlarmRepository**
   - `insertAlarm(alarm)` - Schedule new alarm
   - `updateAlarm(alarmId, updates)` - Update alarm
   - `getAlarmById(alarmId)` - Get single alarm
   - `getUpcomingAlarms(patientId)` - Get future alarms
   - `markFired(alarmId)` - Mark alarm as triggered
   - `cancelAlarm(alarmId)` - Cancel alarm
   - `deleteExpiredAlarms(beforeDate)` - Cleanup old alarms
   - `getAlarmByScheduleId(scheduleId)` - Find alarm for a dose

3. **InvestigationRepository**
   - `insertInvestigation(report)` - Add report
   - `updateInvestigation(reportId, updates)` - Update report
   - `getInvestigationById(reportId)` - Get single report
   - `getAllInvestigations(patientId)` - Get all reports
   - `deleteInvestigation(reportId)` - Delete report

**Services:**

1. **SQLiteDataService**
   - Manages database connection
   - Runs migrations
   - Provides repositories
   - Handles transactions

2. **LocalAlarmManager**
   - Schedules native Android alarms via AlarmManager
   - Uses SQLite to persist alarms (survives app restart)
   - Handles alarm triggers and notifications
   - Reschedules alarms after device reboot

**Database Migrations:**
- Version 1 (Initial schema) - Creates all tables and indexes
- Version 2 (Future) - Add new fields/tables as needed

**Migration Flow:**
```javascript
// On app launch
await sqliteDataService.init()
  ↓
Check database version
  ↓
If version < target version:
  - Run migration scripts sequentially
  - Update version number
  - Log migration success
```

---

## 8. Services & Business Logic

### 8.1 MedicationSchedulingEngine

**Purpose:** Pure business logic for medication scheduling (no dependencies)

**Key Functions:**

1. **Frequency Parsing:**
   ```javascript
   parseFrequency("1-0-1")
   // Returns: [
   //   { slot: 'MORNING', dose: 1 },
   //   { slot: 'AFTERNOON', dose: 0 },
   //   { slot: 'NIGHT', dose: 1 }
   // ]
   ```

2. **Quantity Calculation:**
   ```javascript
   calculateQuantityPlan(quantity: 30, frequency: "1-0-1", durationDays: null)
   // Returns: {
   //   prescribedQuantity: 30,
   //   dailyQuantity: 2,
   //   fullDays: 15,
   //   remainder: 0,
   //   totalDays: 15
   // }
   ```

3. **Schedule Generation:**
   ```javascript
   generateSchedules(medicine, { timingProfile, slotNames, now })
   // Returns array of schedule objects:
   // [
   //   {
   //     id: "schedule:PAT-1:RX-1:MED-1:2026-09-15:MORNING",
   //     scheduleId: "...",
   //     medicineId: "MED-1",
   //     medicineName: "Paracetamol 500mg",
   //     dosage: "1 tablet",
   //     doseQuantity: 1,
   //     scheduledDate: "2026-09-15",
   //     scheduledTime: "08:00",
   //     scheduledAt: "2026-09-15T08:00:00+05:30",
   //     slot: "MORNING",
   //     status: "SCHEDULED",
   //     ...
   //   },
   //   ...
   // ]
   ```

4. **Medication Status:**
   ```javascript
   getMedicationStatus({ startDate, endDate, prescribedQuantity, consumedQuantity, cancelled, now })
   // Returns: UPCOMING | ACTIVE | COMPLETED | EXPIRED | CANCELLED
   ```

5. **User Actions:**
   ```javascript
   markTaken(scheduleId)
   markSkipped(scheduleId, { reason: "Felt better" })
   snooze(scheduleId, 15)  // Snooze for 15 minutes
   ```

6. **Selectors:**
   ```javascript
   getTodaysMedicationTimeline({ patientId, date })
   getActiveMedicines({ patientId, now })
   ```

7. **Adherence Stats:**
   ```javascript
   calculateAdherenceStats(days: 7)
   // Returns: {
   //   total: 42,    // Total doses in period
   //   taken: 38,    // Doses taken
   //   skipped: 3,   // Doses skipped
   //   pending: 1,   // Doses not yet due
   //   rate: 90      // Adherence percentage
   // }
   ```

**API Mapping:**
```javascript
mapApiPrescription(rawPrescription)
// Converts SmartCare HIS prescription format to internal format
// Handles field variations: drug/medicineName, dose/dosage, frequencyNote/frequency, etc.
```

### 8.2 MedicationEngineService

**Purpose:** High-level orchestration of medication engine

**Responsibilities:**
- Initialize AsyncStorageMedicationStore
- Coordinate with NotificationManager
- Sync prescriptions from API
- Delegate business logic to MedicationSchedulingEngine
- Provide simplified API for UI

**Key Methods:**
```javascript
await medicationEngineService.init()
await medicationEngineService.syncPrescriptions(prescriptionsList, { patientId })
await medicationEngineService.syncFromHisApi({ practids, patientId, forceRefresh })
await medicationEngineService.markTaken(scheduleId)
await medicationEngineService.markSkipped(scheduleId, reason)
await medicationEngineService.snooze(scheduleId, minutes)
await medicationEngineService.getTodaysTimeline(date)
await medicationEngineService.getActiveMedications(patientId)
await medicationEngineService.getTimingConfig()
await medicationEngineService.updateTimingConfig(configUpdates)
await medicationEngineService.calculateAdherenceStats(days)
```

### 8.3 AsyncStorageMedicationStore

**Purpose:** Persist medication data in AsyncStorage

**Methods:**
- `init()` - Initialize store
- `savePrescription(prescription)`, `getPrescription(id)`, `listPrescriptions()`
- `saveMedication(medication)`, `getMedication(id)`, `listMedications()`
- `saveSchedule(schedule)`, `getSchedule(id)`, `listSchedules()`, `getSchedulesForMedication(medication)`
- `saveAlarm(alarm)`, `getAlarm(id)`, `listAlarms()`
- `saveTimingConfig(config)`, `getTimingConfig()`
- `appendEvent(event)`, `listEvents(options)`
- `clearAll()`, `exportData()`, `importData(data)`

**Data Structure:**
```javascript
{
  prescriptions: [
    {
      prescriptionId: "RX-12345",
      patientId: "PAT-885",
      doctorId: "1849",
      prescribedAt: "2026-09-10T10:30:00+05:30",
      medicines: [...]
    }
  ],
  medications: [
    {
      id: "medication:PAT-885:RX-12345:MED-1",
      prescriptionId: "RX-12345",
      medicineName: "Paracetamol 500mg",
      prescribedQuantity: 30,
      consumedQuantity: 10,
      remainingQuantity: 20,
      frequency: "1-0-1",
      startDate: "2026-09-10",
      endDate: "2026-09-25",
      status: "ACTIVE",
      ...
    }
  ],
  schedules: [...],
  alarms: [...],
  timingConfig: {
    MORNING: "08:00",
    AFTERNOON: "14:00",
    EVENING: "20:00",
    NIGHT: "22:00"
  },
  events: [
    {
      type: "DOSE_TAKEN",
      scheduleId: "schedule:...",
      timestamp: "2026-09-15T08:05:00+05:30"
    }
  ]
}
```

### 8.4 LocalAlarmManager

**Purpose:** Schedule reliable native Android alarms

**Features:**
- Uses Android AlarmManager for exact timing
- Persists alarms in SQLite (survives app restart/reboot)
- Supports snooze functionality
- Handles alarm rescheduling after device reboot
- Cleanup expired alarms

**Key Methods:**
```javascript
await localAlarmManager.init()
await localAlarmManager.scheduleUpcomingAlarms(patientId, fromDate, toDate)
await localAlarmManager.scheduleAlarm(alarm)
await localAlarmManager.cancelAlarm(alarmId)
await localAlarmManager.snoozeAlarm(alarmId, minutes)
await localAlarmManager.handleAlarmTrigger(alarmId)
await localAlarmManager.cleanupExpiredAlarms()
```

**Alarm Trigger Flow:**
```
Android AlarmManager fires at scheduled time
    ↓
LocalAlarmManager.handleAlarmTrigger(alarmId)
    ↓
NotificationService.showMedicationReminder(alarm)
    ↓
User taps notification action (Take / Skip / Snooze)
    ↓
MedicationEngineService.markTaken/markSkipped/snooze(scheduleId)
    ↓
Update schedule status in AsyncStorageMedicationStore
    ↓
If snoozed: LocalAlarmManager.snoozeAlarm(alarmId, minutes)
```

### 8.5 NotificationService

**Purpose:** Manage push notifications and badge count

**Features:**
- Local push notifications (react-native-push-notification)
- Notification channels (Android 8+)
- Action buttons (Take, Skip, Snooze)
- Badge count on app icon
- Sound and vibration

**Key Methods:**
```javascript
configurePushNotifications()
scheduleAllMedicineReminders(medicines)
showMedicationReminder(alarm)
cancelNotification(notificationId)
setBadgeCount(count)
```

**Notification Payload:**
```javascript
{
  id: "12345",
  channelId: "medication_reminders",
  title: "Medicine Reminder",
  message: "Time to take Paracetamol 500mg — 1 tablet",
  playSound: true,
  vibrate: true,
  importance: "high",
  actions: ["Take", "Skip", "Snooze"],
  data: {
    scheduleId: "schedule:...",
    type: "medication",
  }
}
```

### 8.6 StorageService

**Purpose:** Abstraction layer over AsyncStorage with typed methods

**Methods:**
```javascript
// Generic
await StorageService.set(key, value)
await StorageService.get(key)
await StorageService.remove(key)
await StorageService.clear()

// Profile
await StorageService.saveProfile(profile)
await StorageService.getProfile()

// Appointments
await StorageService.saveAppointments(appointments)
await StorageService.getAppointments()

// Practitioners
await StorageService.savePractitioners(practitioners)
await StorageService.getPractitioners()

// Invoices
await StorageService.saveInvoices(invoices)
await StorageService.getInvoices()

// Investigations
await StorageService.saveInvestigations(investigations)
await StorageService.getInvestigations()
```

### 8.7 SQLiteDataService

**Purpose:** Manage SQLite database connection and repositories

**Methods:**
```javascript
await sqliteDataService.init()
await sqliteDataService.runMigrations()
sqliteDataService.scheduledDoseRepository
sqliteDataService.medicationAlarmRepository
sqliteDataService.investigationRepository
await sqliteDataService.close()
```

**Migration System:**
```javascript
const MIGRATIONS = [
  {
    version: 1,
    up: async (db) => {
      await db.execute(`CREATE TABLE scheduled_doses (...)`);
      await db.execute(`CREATE TABLE medication_alarms (...)`);
      await db.execute(`CREATE INDEX idx_patient ON scheduled_doses(patient_id)`);
    }
  },
  // Version 2, 3, etc.
];
```

---

## 9. State Management

### 9.1 AppContext (Global State)

**Purpose:** Central state management using React Context API

**State Variables:**

```javascript
{
  // User & Auth
  userProfile: {
    firstName, lastName, email, phone, gender, dob,
    address, city, state, uhid, patientId, bloodGroup,
    height, weight, bp, allergies
  },
  isOnboarded: false,
  isLoggedIn: false,
  isLanguageSelected: false,
  selectedLanguage: 'en',
  appReady: false,

  // Medical Data
  appointments: [],          // Upcoming appointments
  appointmentHistory: [],    // Past appointments
  practitioners: [],         // All doctors
  medicines: [],             // Deprecated (use engineActiveMeds)
  invoices: [],              // All invoices
  investigations: [],        // All lab reports
  testRequests: [],          // Pending test bookings
  notifications: [],         // Notification inbox

  // Medication Engine State
  engineSchedules: [],       // All scheduled doses
  engineActiveMeds: [],      // Currently active medications
  engineAlarms: [],          // Upcoming alarms
  engineStats: {             // Adherence statistics
    total: 0,
    taken: 0,
    skipped: 0,
    pending: 0,
    rate: 0
  },
  engineTimingConfig: {      // Alarm times
    MORNING: '08:00',
    AFTERNOON: '14:00',
    EVENING: '20:00',
    NIGHT: '22:00'
  },

  // Sync Status
  isOnline: true,
  profileLastUpdated: null,
  appointmentsLastUpdated: null,
  practitionersLastUpdated: null,
  invoicesLastUpdated: null,
  investigationsLastUpdated: null,

  // Computed
  unreadCount: 3             // Unread notifications count
}
```

**Key Functions:**

```javascript
const {
  // State
  userProfile,
  appointments,
  practitioners,
  invoices,
  investigations,
  engineSchedules,
  engineActiveMeds,
  engineStats,
  engineTimingConfig,
  isOnline,
  unreadCount,

  // Actions
  refreshAllData,
  refreshEngineData,
  setUserProfile,
  setAppointments,
  setPractitioners,
  setInvoices,
  setInvestigations,
  setNotifications,
  setSelectedLanguage,
  setIsOnboarded,
  setIsLoggedIn,
  updateEngineTimingConfig,

  // Helpers
  markNotificationRead,
  clearNotifications,
  logout,
} = useApp();
```

**Data Flow:**

```
App Launch
    ↓
AppContext.loadData()
    ↓
1. Load from AsyncStorage (cached data) → Update state immediately
    ↓
2. Check if logged in
    ↓
3. If online: refreshAllData()
    ↓
    ├─ PatientApi.getByMobile() → userProfile
    ├─ AppointmentApi.getHistory() → appointments
    ├─ PractitionerApi.getList() → practitioners
    ├─ InvoiceApi.getAll() → invoices
    ├─ InvestigationApi.getAll() → investigations
    └─ PrescriptionRepeatApi.getAllForPatient() → medicationEngineService.syncPrescriptions()
    ↓
4. Save updated data to AsyncStorage (cache for next launch)
    ↓
5. Update state with fresh data
```

**Network Monitoring:**
```
NetInfo.addEventListener()
    ↓
Connection state changes
    ↓
If goes from offline → online:
    refreshAllData()
```

**App State Monitoring:**
```
AppState.addEventListener()
    ↓
App moves to foreground
    ↓
If online:
    refreshAllData()
```

### 9.2 Local Component State

**Usage:** Screen-specific state that doesn't need global access

**Examples:**

```javascript
// Form State
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// UI State
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [selectedDate, setSelectedDate] = useState(new Date());

// Modal State
const [showModal, setShowModal] = useState(false);
```

### 9.3 Navigation State

**Managed by:** React Navigation

**Stack Navigator:**
```javascript
navigation.navigate('ScreenName', { param1: value1 })
navigation.goBack()
navigation.replace('ScreenName')
navigation.push('ScreenName')
```

**Tab Navigator:**
```javascript
navigation.navigate('Home')
navigation.navigate('Invoices')
```

**Params:**
```javascript
// Passing params
navigation.navigate('DoctorProfile', { doctorId: '1849' })

// Receiving params
const { doctorId } = route.params;
```

---

## 10. Key Workflows

### 10.1 User Registration & Login

```
1. User opens app
2. SplashScreen checks if logged in
   - If yes → Navigate to MainTabs
   - If no → Continue to WelcomeScreen
3. WelcomeScreen → LanguageSelectScreen
4. Select language → PhoneLoginScreen
5. Enter phone number → PhoneNumberEntry
6. Tap "Send OTP" → OTPApi.sendOTP()
7. Enter OTP → OTPVerificationScreen
8. Tap "Verify" → OTPApi.verifyOTP()
9. Server returns JWT token
10. Store token in AsyncStorage ('AUTHTOKEN')
11. Fetch user profile → PatientApi.getByMobile()
12. Store profile in AsyncStorage
13. Update AppContext state
14. Navigate to AccountCreatedScreen
15. Navigate to MainTabs (Home)
```

### 10.2 Book Appointment

```
1. User taps "Book Appointment" on Home or taps FAB
2. Navigate to AppointmentsScreen
3. Tap "Book New Appointment"
4. Navigate to DoctorSearchScreen
5. Fetch doctors → PractitionerApi.getList()
6. User searches/filters doctors
7. Tap doctor card → Navigate to DoctorProfileScreen
8. View doctor details, ratings, fees
9. Tap "Book Appointment" → Navigate to BookingSlotScreen
10. Select date
11. Fetch available slots → AppointmentApi.getAvailableSlots(date, doctorId)
12. Display time slots
13. User selects slot
14. Tap "Continue" → Navigate to BookingConfirmScreen
15. Review details, enter notes
16. Tap "Confirm Booking" → AppointmentApi.book()
17. Server returns booking confirmation
18. Navigate to AppointmentSuccessScreen
19. Show booking ID and details
20. Tap "Done" → Navigate back to Home
21. Refresh appointments → AppContext.refreshAllData()
```

### 10.3 View Prescription & Schedule Medication

```
1. User taps "Medicines" on Home
2. Navigate to MedicineScheduleScreen
3. Fetch prescriptions from API:
   - Get visited doctors from appointments/practitioners
   - For each doctor, call PrescriptionRepeatApi.getListByDoctor()
   - For each prescription ID, call PrescriptionRepeatApi.getById()
   - Aggregate all prescriptions
4. Pass prescriptions to MedicationEngineService.syncPrescriptions()
5. MedicationEngineService:
   - Parse each prescription via MedicationSchedulingEngine.mapApiPrescription()
   - For each medicine:
     * Calculate quantity plan
     * Generate daily schedules
     * Create medication domain record
   - Save to AsyncStorageMedicationStore
6. LocalAlarmManager:
   - Read schedules from store
   - For each future schedule, create alarm
   - Save alarms to SQLite
   - Schedule native Android alarms
7. Display medication schedule in calendar view
8. User taps a dose → Navigate to TodaysMedicineScreen
9. User marks dose as "Taken" → MedicationEngineService.markTaken()
10. Update schedule status to TAKEN
11. Update medication consumed quantity
12. Cancel alarm for this dose
13. Refresh UI
```

### 10.4 Medication Alarm Trigger

```
1. Android AlarmManager fires at scheduled time (e.g., 08:00 for morning dose)
2. LocalAlarmManager.handleAlarmTrigger(alarmId)
3. Fetch alarm from SQLite
4. NotificationService.showMedicationReminder(alarm)
5. Display notification:
   Title: "Medicine Reminder"
   Message: "Time to take Paracetamol 500mg — 1 tablet"
   Actions: [Take] [Skip] [Snooze]
6. User taps notification action:

   A. If "Take":
      - MedicationEngineService.markTaken(scheduleId)
      - Update schedule status to TAKEN
      - Dismiss notification
      - Show toast: "Marked as taken"

   B. If "Skip":
      - MedicationEngineService.markSkipped(scheduleId, reason)
      - Update schedule status to SKIPPED
      - Dismiss notification
      - Show toast: "Dose skipped"

   C. If "Snooze":
      - MedicationEngineService.snooze(scheduleId, 15)
      - Update schedule status to SNOOZED
      - LocalAlarmManager.snoozeAlarm(alarmId, 15)
      - Reschedule alarm for 15 minutes later
      - Dismiss notification
      - Show toast: "Snoozed for 15 minutes"

7. Update badge count
8. Refresh medication timeline
```

### 10.5 View Invoice & Generate PDF

```
1. User taps "Invoices" tab
2. Navigate to InvoicesScreen
3. Fetch invoices → InvoiceApi.getAll(patientId)
4. Display invoice list
5. User taps an invoice → Navigate to InvoiceDetailScreen
6. Fetch invoice details → InvoiceApi.getPrintDetails(invoiceId)
7. Display line items, charges, total
8. User taps "Download PDF":
   a. Generate HTML → invoiceHtmlGenerator.generateInvoiceHTML(invoice)
   b. Save HTML to server → InvoiceApi.saveInvoiceForm(clientId, html)
   c. Server converts HTML to PDF and stores at:
      https://saas.smartcarehis.com:8443/HISDATA/liveData/{clinicId}/documents/{formTitle}.pdf
   d. Download PDF → InvoiceApi.downloadDocuments(clientId, fileName)
   e. Server returns PDF as Base64-encoded byte stream
   f. Decode Base64 to binary
   g. Save to device or display in PDF viewer
9. User can share PDF via WhatsApp/Email
```

### 10.6 View Investigation Report

```
1. User taps "Investigation" tab
2. Navigate to InvestigationsScreen
3. Fetch reports → InvestigationApi.getAll(patientId)
4. Display report list
5. User taps a report → Navigate to InvestigationReportScreen
6. Fetch report details → InvestigationApi.getAll() (cached)
7. If report has PDF URL:
   - Download PDF → InvestigationApi.generateInvReportPDF()
   - Display in PDF viewer
8. If report has image URL:
   - Download image
   - Display in image viewer
9. User can share report or download to device
```

### 10.7 Logout

```
1. User taps "Logout" in ProfileScreen
2. Show confirmation dialog
3. User confirms
4. Clear AsyncStorage:
   - Remove AUTHTOKEN
   - Remove patientId
   - Remove cached data
   - Keep language preference
5. Clear AppContext state
6. Cancel all scheduled alarms → LocalAlarmManager.clearAllAlarms()
7. Clear notification badge
8. Navigate to PhoneLoginScreen
```

---

## 11. Error Handling & Edge Cases

### 11.1 Network Errors

**Scenario:** API call fails due to network issue

**Handling:**
1. Display error message: "Network error. Please check your connection."
2. Show retry button
3. Cache last known data and display with "Offline" badge
4. When connection restored, auto-refresh data

### 11.2 Authentication Errors

**Scenario:** JWT token expired (HTTP 401)

**Handling:**
1. Clear token from AsyncStorage
2. Show toast: "Session expired. Please login again."
3. Navigate to PhoneLoginScreen
4. Preserve user's work in progress (e.g., half-filled form)

### 11.3 Server Errors

**Scenario:** Server returns HTTP 500

**Handling:**
1. Display error message: "Server error. Please try again later."
2. Log error to console (future: send to error tracking service)
3. Don't crash the app
4. Allow user to continue with cached data

### 11.4 Empty State

**Scenario:** User has no appointments/invoices/reports

**Handling:**
1. Display empty state illustration
2. Show helpful message: "No appointments yet. Book your first appointment now!"
3. Show CTA button: "Book Appointment"

### 11.5 Data Sync Conflicts

**Scenario:** Local data differs from server data

**Handling:**
1. Server data always wins (source of truth)
2. Merge local changes with server data where possible
3. For medications: Use timestamp to determine latest action

### 11.6 Alarm Reliability

**Scenario:** Android kills app or user clears app data

**Handling:**
1. Alarms stored in SQLite (separate from AsyncStorage)
2. Android AlarmManager persists across app restarts
3. On app launch: LocalAlarmManager.init() reschedules any missed alarms
4. On device reboot: Use BroadcastReceiver to reschedule all alarms

### 11.7 Offline Mode

**Features:**
- All cached data (profile, appointments, invoices, reports) accessible offline
- Medication schedules and alarms work offline
- Actions (mark taken/skip) are queued and synced when online
- Clear "Offline" indicator in UI
- Auto-sync when connection restored

---

## 12. Performance Optimization

### 12.1 Data Caching Strategy

1. **Eager Loading:**
   - On app launch, load all cached data immediately from AsyncStorage
   - Display cached data instantly (no loading spinner)
   - Fetch fresh data in background and update UI

2. **Cache Invalidation:**
   - Profile: Cache for 1 hour, refresh on app foreground
   - Appointments: Cache for 30 minutes, refresh on foreground
   - Invoices: Cache for 1 day
   - Reports: Cache for 1 day
   - Prescriptions: Cache individual prescription details indefinitely (they don't change)

3. **Partial Updates:**
   - Only fetch data that might have changed
   - Use timestamps to check if data needs refresh

### 12.2 Image Optimization

1. Use SVG icons (lightweight, scalable)
2. Compress profile images before upload
3. Lazy load report images
4. Cache images on device

### 12.3 List Optimization

1. Use FlatList with `getItemLayout` for constant-height rows
2. Implement pagination for long lists
3. Virtualization for medication schedule calendar

### 12.4 Database Query Optimization

1. Indexes on frequently queried columns (patient_id, scheduled_date)
2. Batch inserts for schedules (insert 30 days at once)
3. Cleanup old data (delete schedules older than 90 days)

### 12.5 Bundle Size Optimization

1. Use Hermes JavaScript engine (faster startup)
2. Enable ProGuard for Android (minify/obfuscate)
3. Remove unused dependencies
4. Use dynamic imports for rarely-used features

---

## 13. Future Enhancements

### 13.1 Telemedicine
- Video consultation integration
- In-app audio/video calls with doctors
- Screen sharing for report review
- Prescription upload via camera

### 13.2 Health Tracking
- Manual health metrics input (BP, sugar, weight)
- Chart visualization of trends
- Integration with wearables (Fitbit, Apple Watch)
- Medication adherence reports for doctor

### 13.3 Pharmacy Integration
- Order medicines online
- Home delivery from partner pharmacies
- Prescription auto-refill reminders
- Medicine search and compare prices

### 13.4 Insurance & Claims
- Store insurance policy details
- Upload claim documents
- Track claim status
- Cashless treatment support

### 13.5 Family Accounts
- Add family members under one account
- Separate profiles for each member
- Manage appointments/medications for family
- Emergency contacts

### 13.6 AI Enhancements
- Symptom checker with AI diagnosis suggestions
- Drug interaction warnings
- Personalized health tips
- Voice commands for medication reminders

### 13.7 Multi-language Support
- Full app translation (Hindi, Marathi, Telugu, Tamil, etc.)
- Regional language support for notifications
- Voice output in local languages

---

## Appendix A: Key Constants & Configuration

### Clinic Options
```javascript
[
  { displayName: 'Aureus (222Test)', clinicId: 'aureus' },
  { displayName: 'Aureus', clinicId: 'aureus2024' },
  { displayName: 'Borneo Waluj', clinicId: 'borneowaluj' },
  { displayName: 'Borneo NEO Thane', clinicId: 'bornneothane' },
  { displayName: 'Borneo Nashik', clinicId: 'Borneonashik' },
  { displayName: 'BorneoCare Raipur', clinicId: 'borneocare' },
]
```

### Default Medication Timings
```javascript
{
  MORNING: '08:00',
  AFTERNOON: '14:00',
  EVENING: '20:00',
  NIGHT: '22:00'
}
```

### Time Zone
```javascript
DEFAULT_TIMEZONE_OFFSET = '+05:30'  // Asia/Kolkata (IST)
```

---

## Appendix B: Common Issues & Solutions

### Issue 1: OTP not received
**Solution:**
- Verify phone number is correct
- Check SMS inbox and spam folder
- Wait 2-3 minutes before requesting resend
- Ensure network connection is stable

### Issue 2: Alarms not firing
**Solution:**
- Grant notification permission
- Disable battery optimization for the app
- Check if "Do Not Disturb" is enabled
- Verify alarm times are correct in settings

### Issue 3: Appointments not showing
**Solution:**
- Pull to refresh on AppointmentsScreen
- Check network connection
- Verify patientId is stored correctly
- Clear app cache and re-login

### Issue 4: PDF not downloading
**Solution:**
- Grant storage permission
- Check available disk space
- Verify PDF URL from server
- Try again with stable network

### Issue 5: App crashes on launch
**Solution:**
- Clear app data
- Reinstall app
- Check Android version compatibility (min SDK 21)
- Review crash logs in Logcat

---

## End of Documentation

This comprehensive documentation covers the entire SmartCare Medicare app architecture, including:
- Complete navigation flow
- All API endpoints with parameters
- Database schema and repositories
- Business logic services
- State management patterns
- Key workflows from start to finish
- Error handling strategies
- Performance optimizations
- Future roadmap

For any questions or clarifications, refer to the source code or contact the development team.
