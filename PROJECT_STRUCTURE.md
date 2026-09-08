# Sus Medicare - Project Structure

## 📱 React Native Healthcare Application

---

## Root Structure

```
Sus/
├── android/                    # Android native code & config
├── ios/                        # iOS native code & config (if exists)
├── src/                        # Main application source code
├── node_modules/               # Dependencies
├── package.json                # Project dependencies & scripts
├── App.jsx                     # Root component
├── index.js                    # Entry point
└── metro.config.js             # Metro bundler configuration
```

---

## Source Code Structure (`src/`)

### 📂 **API Layer** (`src/API/`)
**Purpose:** Backend communication & API endpoint definitions

- `Api.js` - Central API module with all endpoints
  - Authentication (OTP, Login)
  - Patient Management
  - Appointments (Book, Slots, History, Cancel)
  - Practitioners List
  - Investigations (Reports, PDF generation)
  - Invoices & Billing
  - Clinical Notes
  - Hospital/Clinic Details
  - Feedback
  - Medicine Search

**Key Features:**
- Centralized header management (`buildHeaders`)
- AsyncStorage for session tokens
- Hardcoded clinic ID: `aureus`
- Multiple base URLs (HISAPI, BILLING, SMARTCARE, IPD)

---

### 📂 **Context** (`src/context/`)
**Purpose:** Global state management

- `AppContext.jsx` - App-wide state provider
  - User authentication state
  - Appointments list
  - Practitioners (doctors) cache
  - Patient data
  - App settings (theme, language, PIN)

---

### 📂 **Navigation** (`src/navigation/`)
**Purpose:** Screen routing & navigation structure

- `AppNavigator.jsx` - Navigation container
  - **Auth Stack:** Phone Login → OTP → Register
  - **Main Tabs:** Home, Appointments, Medicines, Profile
  - **Nested Stacks:** 
    - Appointment flow (Book → Select Doctor → Slots → Confirm)
    - Investigation flow (Request → Hospital → DateTime → Confirm)
    - Medicine management
    - Profile settings

---

### 📂 **Screens** (`src/screens/`)

#### **Onboarding** (`screens/Onboarding/`)
User authentication & first-time setup
- `SplashScreen.jsx` - App launch screen
- `LanguageSelectScreen.jsx` - Language preference
- `PhoneLoginScreen.jsx` - Mobile number entry
- `PhoneNumberEntry.jsx` - Alternative phone input
- `OTPVerificationScreen.jsx` - OTP validation
- `RegisterScreen.jsx` - New patient registration

#### **Home** (`screens/Home/`)
Main dashboard
- `HomeScreen.jsx` - Dashboard with quick actions
  - Today's appointments summary
  - Quick access cards (Appointments, Investigations, Medicines)
  - Health tips & reminders

#### **Appointments** (`screens/Appointments/`)
Doctor appointment booking & management
- `AppointmentBookingScreen.jsx` - **Main booking wizard (6 steps)**
  - Step 1: Select Specialty
  - Step 2: Choose Doctor
  - Step 3: Pick Date & Time (Calendar + Slots)
  - Step 4: Visit Type (In-Clinic/Video/Audio)
  - Step 5: Review Booking
  - Step 6: Payment Method
- `DoctorProfileScreen.jsx` - Doctor details & bio
- `BookingSlotScreen.jsx` - Alternative slot picker
- `BookingConfirmScreen.jsx` - Final confirmation
- `AppointmentSuccessScreen.jsx` - Booking success
- `AppointmentsScreen.jsx` - Appointment history & list

**Appointment Flow:**
```
Specialty → Doctor → Date → Slot → Visit Type → Review → Payment → Success
```

#### **Investigations** (`screens/Investigations/`)
Lab tests & medical reports
- `InvestigationsScreen.jsx` - List all reports
- `InvestigationReportScreen.jsx` - View report details
- `InvestigationRequestScreen.jsx` - Request new test
- `SelectHospitalScreen.jsx` - Choose lab location
- `SelectDateTimeScreen.jsx` - Pick test date/time
- `BookingConfirmedScreen.jsx` - Test booking success

#### **Invoices** (`screens/Invoices/`)
Billing & payment history
- `InvoicesScreen.jsx` - Invoice list & payment tracking

#### **Medicine** (`screens/Medicine/`)
Medication tracking & prescriptions
- `PrescriptionsScreen.jsx` - Digital prescriptions
- `MedicineScheduleScreen.jsx` - Medication reminders
- `AddMedicinesScreen.jsx` - Add new medication
- `AboutMedicineScreen.jsx` - Medicine information
- `RestockMedicineScreen.jsx` - Reorder reminders

#### **Profile** (`screens/Profile/`)
User account & settings
- `ProfileScreen.jsx` - User profile & details
- `SettingsScreen.jsx` - App preferences

#### **Security** (`screens/Security/`)
App security features
- `PINSetupScreen.jsx` - Create/change PIN
- `AppLockScreen.jsx` - PIN entry on app open

#### **Assistant** (`screens/Assistant/`)
AI-powered health assistant
- `AIAssistantScreen.jsx` - Chatbot interface

---

### 📂 **Assets** (`src/assets/`)

#### **Icons** (`assets/icons/`)
- `Icons.jsx` - Centralized icon components
  - Medical icons (Stethoscope, Heart, Tooth, etc.)
  - Navigation icons
  - Action icons (Calendar, Clock, Phone, Video)
  - Payment icons (UPI, Card, Cash)

#### **Images** (`assets/images/`)
- Logos, illustrations, doctor avatars

---

### 📂 **Theme** (`src/theme/`)
**Purpose:** Design system & styling constants

- `colors.js` - Color palette
  - Primary: `#6C63FF` (Purple)
  - Success: Green, Error: Red, Warning: Orange
  - Text colors, backgrounds, borders
  
- `spacing.js` - Spacing scale
  ```js
  xs: 4, sm: 8, base: 16, md: 20, lg: 24, xl: 32, ...
  ```

- `radius.js` - Border radius values
  ```js
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999
  ```

- `shadows.js` - Shadow presets (Android elevation)

---

### 📂 **Components** (`src/components/`)
**Purpose:** Reusable UI components (if exists)

Common patterns:
- Custom buttons
- Input fields
- Cards
- Loading indicators
- Error boundaries

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────┐
│                   User Action                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Screen Component                    │
│  - Handles UI state                             │
│  - Validates input                              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│             AppContext (Optional)                │
│  - Global state (auth, appointments, etc.)      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                 API Module                       │
│  - buildHeaders() → Token, clinic ID            │
│  - apiCall() → fetch() wrapper                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│      Backend API (saas.smartcarehis.com)        │
│  - HISAPI (port 8443): /hisapi_test/            │
│  - BILLING (port 8443): /billing/               │
│  - SMARTCARE (port 8443): /smartcaremain/       │
│  - IPD (port 8443): /ipd/                       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│               Response Handling                  │
│  - Success: Update state → Show data            │
│  - Error: Show error message → Retry option     │
└─────────────────────────────────────────────────┘
```

---

## Key Dependencies (package.json)

### Core
- `react`, `react-native` - Framework
- `react-navigation` - Navigation
- `@react-native-async-storage/async-storage` - Local storage

### UI Libraries
- `react-native-svg` - SVG icons
- `react-native-safe-area-context` - Safe area handling

### Utilities
- `date-fns` - Date manipulation
- `axios` / `fetch` - HTTP requests

---

## Storage Keys (AsyncStorage)

### Authentication
```
AUTHTOKEN              - Bearer token
SESSIONEXPIRTIME       - Token expiry
mobileNumber           - User's phone
IsRegister             - Registration status
UserId / userid        - User ID
```

### Clinic/Hospital
```
CLINICID               - Clinic identifier (e.g., 'aureus')
CLINICNAME             - Full clinic name
Tenant                 - Tenant ID (same as clinic)
branchId / branch_id   - Branch identifier
```

### Appointment Data
```
PRACTIONERDATA         - Selected doctor (JSON)
APPOTYPE               - Appointment type (Walk/Phone/Video)
APPODATE               - Appointment date (DD-MM-YYYY)
SLOT                   - Time slot (HH:MM AM/PM)
SLOTID                 - Slot record ID
```

### Patient
```
patientId              - Current patient ID
SELCETEDPATIENTID      - Selected patient for booking
SELCETEDPATIENTDETAILS - Full patient object (JSON)
```

### Payment
```
ChargeAmount           - Consultation fee
PAYMODE                - Payment mode (CASH/UPI)
```

---

## API Endpoints Summary

### Authentication
- `POST /hisapi/patient/generateOTP` - Send OTP
- `POST /hisapi/login` - Verify OTP & login

### Appointments
- `GET /hisapi/user/practitioner/all` - List doctors
- `GET /hisapi/appointment/availableSlots?date=X&practionerId=Y` - Get slots
- `GET /hisapi/appointment/appointmentTypeDetails` - Get charges
- `POST /hisapi/appointment/book` - Book appointment
- `GET /hisapi/appointment/fetchAppointment/history/{id}` - History
- `POST /hisapi/appointment/cancelAppointment` - Cancel

### Patient
- `GET /hisapi/patient/byMobileNo?mobileNo=X` - Get patients by phone
- `POST /hisapi/patient/register` - Register new patient
- `POST /hisapi/patient/editPatient` - Update patient

### Investigations
- `POST /hisapi/investigation/approved/reports` - Get reports
- `POST /smartcaremain/investigation/generatepdfreport` - Generate PDF

### Invoices
- `POST /billing/invoice/fetchinvoiceData` - Get invoices
- `GET /billing/invoice/printdetails?invoiceId=X` - Invoice details

### Hospital
- `GET /hisapi/hospital/details` - Hospital info
- `GET /smartcaremain/clinic/details/clinicid/{id}` - Clinic details

---

## Important Notes

### Date Formats
- **API expects:** `YYYY-MM-DD` (e.g., 2026-08-21)
- **Display format:** `DD-MM-YYYY` (e.g., 21-08-2026)
- **Slot format (API):** `HH:MM` 24-hour (e.g., "09:00", "14:30")
- **Slot format (Display):** `HH:MM AM/PM` 12-hour (e.g., "09:00 AM", "02:30 PM")

### Clinic Configuration
Currently hardcoded for **Aureus Institute Of Medical Science**
- Clinic ID: `aureus`
- All API calls use this tenant

### Authentication Flow
```
Phone Entry → OTP Generation → OTP Verification → 
  ↓
Check IsRegister
  ↓
If false → Registration Screen
If true  → Main App (Home)
```

### Appointment Booking Flow
```
Select Specialty (8 options) →
Select Doctor (from practitioner list) →
Select Date (calendar picker) →
  ↓ (API call: getAvailableSlots)
Select Time Slot (dynamic grid) →
Select Visit Type (In-Clinic/Video/Audio) →
Review Details (show summary + charges) →
Payment Method (UPI/Card/NetBanking/Cash) →
  ↓ (API call: book appointment)
Success Screen
```

### Slot Generation Logic
1. User selects date → Triggers API call
2. Backend calculates:
   - Doctor's working hours
   - Appointment duration (e.g., 10 min intervals)
   - Already booked slots
   - Doctor availability
3. API returns: `{id, availableSlotList: ["01:00", "01:10", ...]}`
4. App converts to 12-hour format: `["01:00 AM", "01:10 AM", ...]`
5. Renders as clickable grid

---

## Development Commands

```bash
# Install dependencies
npm install

# Start Metro bundler
npx react-native start

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios

# Clear cache & restart
npx react-native start --reset-cache

# Debug build
npm run android

# Release build
cd android && ./gradlew assembleRelease
```

---

## Environment Configuration

### Android
- Package: `com.sus`
- Min SDK: 21 (Android 5.0)
- Target SDK: Latest

### Network Configuration
- Base URL: `https://saas.smartcarehis.com:8443`
- Uses HTTPS with self-signed cert (requires network security config)

---

## Known Issues & Workarounds

### Slot Display Issue
**Problem:** Slots not rendering after API success  
**Cause:** React Native hot reload not picking up component changes  
**Solution:** Full app rebuild with cache clear

### Date Picker Past Dates
**Current:** Past dates disabled with gray styling  
**Logic:** `isPast = dateObj < today`

### Video Appointments
**Status:** Currently disabled in code  
**When enabled:** Requires Video SDK integration + meeting room creation

---

**Generated:** August 21, 2026  
**Project:** Sus Medicare Mobile App  
**Platform:** React Native (Android/iOS)
