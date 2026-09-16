# SmartCare Storage Refactor - Phase 1 Audit Summary

## Executive Summary

The SmartCare application already has a **strong foundation** for the refactor requirements. The codebase demonstrates:

✅ SQLite database layer with Nitro SQLite
✅ Basic schema with patient_id isolation
✅ Repository pattern implementation
✅ Medication scheduling engine (MedicationSchedulingEngine.js)
✅ Local alarm repositories
✅ Offline-first medication system architecture
✅ AsyncStorage migration system in place
✅ Network state monitoring with NetInfo

**Critical Finding**: The architecture is MORE COMPLETE than expected. The refactor should **enhance and consolidate** existing patterns rather than rebuild from scratch.

---

## Current Architecture Map

### Database Layer ✅ STRONG

**Primary Files:**
- `src/database/db.js` - Simple singleton connection (GOOD)
- `src/database/Database.js` - Full DatabaseManager with schema versioning (COMPLEX - needs evaluation)
- `src/database/migration.js` - AsyncStorage to SQLite migration logic
- `src/database/schema.js` - **MISSING** (schema embedded in Database.js)

**Storage Modules:**
- `src/database/patientStorage.js` - Patient CRUD operations
- `src/database/prescriptionStorage.js` - Prescription storage with JSON data column
- `src/database/investigationStorage.js` - Investigation storage with file paths

**Repositories:**
- `src/database/repositories/BaseRepository.js` - Generic repository pattern
- `src/database/repositories/PatientRepository.js`
- `src/database/repositories/PrescriptionRepository.js` - DIFFERENT schema than prescriptionStorage.js ⚠️
- `src/database/repositories/MedicineRepository.js`
- `src/database/repositories/InvestigationRepository.js`
- `src/database/repositories/ScheduledDoseRepository.js`
- `src/database/repositories/MedicationAlarmRepository.js`

**⚠️ CRITICAL DUPLICATION ISSUE:**
- TWO database initialization systems exist:
  1. `src/database/db.js` - Simple schema (prescriptions table with JSON data column)
  2. `src/database/Database.js` - Complex schema (prescription_medicines, medicine_times, scheduled_doses tables)
- TWO prescription storage approaches:
  1. Simple JSON storage via prescriptionStorage.js
  2. Normalized relational via PrescriptionRepository.js
- This creates confusion about which system is actually used

### Current Schema (from db.js - SIMPLER VERSION)

```sql
-- Patients table
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER
)

-- Prescriptions table (JSON storage)
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
)

-- Investigations table
CREATE TABLE investigations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  title TEXT,
  date TEXT,
  file_path TEXT,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
)

-- Medicines table
CREATE TABLE medicines (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  prescription_id TEXT,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
)

-- Invoices table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
)

-- Appointments table
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON storage
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
)
```

**⚠️ ISSUE:** Invoice and appointment tables exist but no storage modules created yet.

### AsyncStorage Usage Map

**Authentication & Session (KEEP):**
- `AUTHTOKEN` - API authentication token
- `patientId` - Currently logged-in patient
- `mobileNo` - User mobile number
- `branchId` - Hospital branch
- `CLINICID` - Tenant/clinic identifier
- `Tenant` - Multi-tenant config

**Settings (KEEP):**
- `selectedPatientId` - Currently selected patient
- `clinicId` - Clinic configuration
- `language` - App language
- `onboardingCompleted` - First-time setup
- `migrationCompleted` - SQLite migration status

**PHR Data Caches (MIGRATE TO SQLITE):**
- `userProfile` - Patient profile data
- `prescriptions` - Prescription data
- `medications` - Medicine data
- `rxData` - Prescription details
- `investigations` - Investigation reports
- `reports` - Lab results
- `labResults` - Lab data
- `@rx_detail_{id}` - Individual prescription caches
- `@appointments_cache` - Appointment history cache
- `@investigations_cache` - Investigation cache

**Notification Mappings (EVALUATE):**
- `@scheduled_notifications` - Notification ID to dose ID mappings

### Medication Alarm System ✅ STRONG FOUNDATION

**Core Engine:**
- `src/services/MedicationSchedulingEngine.js` - **1600+ lines** of comprehensive scheduling logic
  - Frequency parsing (once_daily, BD, TID, QID, etc.)
  - Timing profile resolution
  - Schedule generation
  - Medication domain records
  - Prescription superseding logic
  - Alarm reconciliation
  - Take/skip/snooze operations
  - Active medicine queries
  - Timeline generation

**Supporting Services:**
- `src/services/MedicationEngineService.js` - High-level medication engine wrapper
- `src/services/MedicationScheduleService.js` - Schedule management
- `src/services/LocalAlarmManager.js` - OS alarm scheduling
- `src/services/MedicationNotificationManager.js` - Notification management
- `src/services/NotificationService.js` - Push notification configuration
- `src/services/SimpleNotificationService.js` - Simple notification wrapper

**Data Services:**
- `src/services/MedicationDatabaseService.js` - AsyncStorage-based medication storage (NEEDS MIGRATION)
- `src/services/AsyncStorageMedicationStore.js` - AsyncStorage medication store
- `src/services/MedicationTestDataService.js` - Test data generation

**Repository Integration:**
- `src/database/repositories/MedicationAlarmRepository.js` - SQLite alarm persistence
- `src/database/repositories/ScheduledDoseRepository.js` - SQLite dose tracking

**⚠️ CRITICAL:** Medication system uses BOTH:
1. AsyncStorage via MedicationDatabaseService.js
2. SQLite via repositories

This dual-storage creates potential consistency issues.

### API Layer

**Main API File:**
- `src/API/Api.js` - Centralized API calls with clinic configuration
  - Base URLs for different services (HISAPI, BILLING, SMARTCARE, IPD)
  - Multi-clinic support (aureus, aureus2024, borneowaluj, etc.)
  - Header building with authentication and tenant context
  - API endpoints:
    - OTPApi: sendOTP, verifyOTP, resendOTP
    - PatientApi: getByMobile, register, update
    - PrescriptionRepeatApi: getActive (prescription fetching)
  - **⚠️ ISSUE:** API response caching to AsyncStorage detected:
    - Prescription details cached with `@rx_detail_{id}` keys
    - This caching should be replaced with SQLite

**Network Monitoring:**
- Uses `@react-native-community/netinfo`
- Context integration in `src/context/AppContext.jsx`
- Monitors connection state and triggers refreshes

### Notification System

**Native Integration:**
- `react-native-push-notification` - Local notifications
- `@react-native-community/push-notification-ios` - iOS support
- Platform-specific channel configuration (Android)
- Action buttons: Taken, Snooze, Skip

**Notification Flow:**
```
MedicationSchedulingEngine
         ↓
   LocalAlarmManager
         ↓
  NotificationService
         ↓
react-native-push-notification
         ↓
   OS Notification
```

**⚠️ CONCERN:** Notification ID to dose ID mappings stored in AsyncStorage. Need to verify if this is necessary or can move to SQLite.

### Screen Architecture

**Medicine Screens:**
- `src/screens/Medicine/PrescriptionsScreen.jsx` - Prescription list with local + server data
- `src/screens/Medicine/PrescriptionDetailScreen.jsx` - Individual prescription details
- `src/screens/Medicine/MedicineScheduleScreen.jsx` - Medicine schedule view
- `src/screens/Medicine/MedicationAlarmScreen.jsx` - Alarm management
- `src/screens/Medicine/TodaysMedicineScreen.jsx` - Today's medication timeline
- `src/screens/Medicine/RestockMedicineScreen.jsx` - Medicine inventory
- `src/screens/Medicine/ReviewPrescriptionScreen.jsx` - Prescription review

**Investigation Screens:**
- `src/screens/Investigations/InvestigationsScreen.jsx` - Investigation list
- `src/screens/Investigations/SelectHospitalScreen.jsx` - Hospital selection
- `src/screens/Investigations/SelectDateTimeScreen.jsx` - Date/time picker

**Invoice Screens:**
- `src/screens/Invoices/InvoicesScreen.jsx` - Invoice list
- `src/screens/Invoices/InvoiceDetailScreen.jsx` - Invoice details

**Appointment Screens:**
- Directory exists: `src/screens/Appointments/` (not yet examined)

**⚠️ OBSERVATION:** PrescriptionsScreen.jsx shows dual data loading:
- `loadPrescriptions()` - Loads from local DB (PrescriptionDB)
- `fetchServerPrescriptions()` - Fetches from API
- Merges both sources for display
- **This is GOOD pattern** - matches requirements!

### Context Layer

**AppContext.jsx:**
- Central state management
- Handles:
  - Authentication state
  - User profile
  - Investigations
  - Appointments
  - Network state monitoring with NetInfo
  - Prescription sync to engine
- **⚠️ CONCERN:** Large context with many responsibilities - may need evaluation

### Storage Services

**Secure Storage:**
- `src/storage/secureStorage.js` - Authentication and session data (AsyncStorage-based)
- Functions: setAuthToken, getAuthToken, setPatientId, getPatientId, etc.
- **✅ APPROPRIATE:** Uses AsyncStorage for session data (matches requirements)

**Settings Storage:**
- `src/storage/settingsStorage.js` - App settings and preferences
- Functions: setSelectedPatient, getClinicId, setLanguage, isMigrationCompleted
- **✅ APPROPRIATE:** Uses AsyncStorage for settings (matches requirements)

**Generic Storage Service:**
- `src/services/StorageService.js` - Wrapper around AsyncStorage
- Simple get/set/remove/clear operations
- **⚠️ USAGE:** Check if this is still used or can be deprecated

### Migration System

**Migration Module:**
- `src/database/migration.js`
- Handles AsyncStorage → SQLite migration
- Migrates:
  - Patient profiles
  - Prescriptions
  - Investigations
- Uses schema versioning with `PRAGMA user_version`
- **✅ GOOD:** Includes safety checks and repeat-safe logic

**⚠️ GAPS:**
- No invoice migration
- No appointment migration
- No medicine migration
- Migration cleanup function exists but may not be called

### PDF Handling

**Library:**
- `react-native-fs` - File system operations
- Investigation table has `file_path` column

**Current Implementation:**
- Investigations store PDF file paths in SQLite
- Actual PDFs stored on device filesystem
- **✅ MATCHES REQUIREMENTS:** PDF metadata in SQLite, files on filesystem

**⚠️ TODO:** Need to verify PDF download is internet-only (no offline caching attempted)

---

## Critical Findings & Decisions

### 1. **DUAL DATABASE INITIALIZATION** ⚠️⚠️⚠️

**Problem:**
- `src/database/db.js` - Simple schema with JSON storage (6 tables)
- `src/database/Database.js` - Complex schema with normalized tables (12+ tables)
- They define DIFFERENT schemas for the same data

**Evidence:**
- db.js: `prescriptions` table with `data TEXT` column (JSON storage)
- Database.js: Normalized `prescriptions`, `prescription_medicines`, `medicine_times`, `scheduled_doses` tables

**Impact:**
- Repository classes expect normalized schema
- Storage modules expect JSON schema
- Unclear which system is actually initialized at runtime

**Required Action:**
- **INVESTIGATE URGENTLY:** Which system is actually used?
- Determine if Database.js schema is desired final state
- If yes: migrate db.js → Database.js
- If no: remove Database.js complexity, keep simple JSON approach

### 2. **MEDICATION STORAGE DUALITY** ⚠️⚠️

**Problem:**
- MedicationDatabaseService.js uses AsyncStorage
- MedicationAlarmRepository.js uses SQLite
- Potential for data inconsistency

**Required Action:**
- Migrate MedicationDatabaseService.js to use SQLite repositories
- Remove AsyncStorage medication storage
- Ensure alarm system uses only SQLite

### 3. **INCOMPLETE STORAGE MODULES**

**Missing:**
- `src/database/invoiceStorage.js` - Invoice storage module
- `src/database/bookingStorage.js` - Appointment storage module (if needed)

**Partial:**
- Medicine storage exists but may conflict with repository approach

**Required Action:**
- Create missing storage modules
- Ensure consistent pattern across all PHR data types

### 4. **ASYNC STORAGE CLEANUP NEEDED**

**To Remove:**
- `userProfile` caching
- `prescriptions` caching
- `@rx_detail_{id}` caching
- `@appointments_cache`
- `@investigations_cache`
- Any other PHR data caches

**To Keep:**
- `AUTHTOKEN`, `patientId`, `mobileNo`, `branchId`
- `CLINICID`, `Tenant`
- `selectedPatientId`
- `language`, `onboardingCompleted`, `migrationCompleted`

### 5. **APPOINTMENT BOOKING RESTRICTIONS**

**Status:** NOT YET VERIFIED
- Need to examine appointment screens
- Need to verify booking flow requires internet
- Need to ensure no offline booking queue exists

### 6. **SCHEMA VERSIONING CLARITY**

**Current:**
- `PRAGMA user_version` used
- Migration logic exists
- Version transitions defined

**⚠️ CONCERN:**
- Dual schema systems make version management unclear
- Need to establish ONE authoritative schema version

---

## Medication Alarm System Analysis

### ✅ Strengths

1. **MedicationSchedulingEngine.js is EXCELLENT:**
   - Comprehensive frequency parsing
   - Timing profile system
   - Schedule generation logic
   - Medication lifecycle management
   - Superseding logic for updated prescriptions
   - In-memory testing included
   - Well-documented with extensive comments

2. **Repository Layer Complete:**
   - MedicationAlarmRepository for alarm persistence
   - ScheduledDoseRepository for dose tracking
   - Good separation of concerns

3. **OS Integration:**
   - LocalAlarmManager handles native scheduling
   - Platform-specific notification configuration
   - Action button support (Taken/Snooze/Skip)

4. **Offline-First Design:**
   - Engine designed to work without API
   - Local state management
   - No server dependencies for actions

### ⚠️ Gaps & Issues

1. **AsyncStorage Dependency:**
   - MedicationDatabaseService.js still uses AsyncStorage
   - Need to migrate to SQLite-only

2. **Notification ID Mapping:**
   - Currently stored in AsyncStorage
   - Should be in SQLite for consistency

3. **Prescription Ingestion:**
   - Need to verify API → SQLite upsert logic
   - Ensure proper active/inactive status handling
   - Verify superseding logic works correctly

4. **Alarm Reconciliation:**
   - Need to verify old alarms are cancelled when prescription changes
   - Need to verify no duplicate alarms created on refresh

5. **Device Reboot Handling:**
   - Need to verify alarm rescheduling after device reboot
   - Android may need AlarmManager.setExactAndAllowWhileIdle for reliability

---

## Network Handling Analysis

### ✅ Current Implementation

**NetInfo Integration:**
- `@react-native-community/netinfo` installed
- Context monitors network state
- Online/offline state tracked

**Usage Pattern:**
```javascript
NetInfo.addEventListener(state => {
  const online = state.isConnected && state.isInternetReachable !== false;
  setIsOnline(online);
});
```

**API Handling:**
- API calls attempt to execute
- Errors returned if network fails
- No pre-flight connectivity checks in API layer

### ⚠️ Gaps

1. **Booking Restriction:**
   - Need to add pre-flight check before booking operations
   - Block UI if offline, show clear message

2. **PDF Download Restriction:**
   - Need to verify PDF downloads check connectivity
   - Block if offline

3. **Offline Mode UI:**
   - Need consistent offline indicators
   - Need clear messaging for blocked operations

---

## Multi-Patient Support Analysis

### ✅ Current Implementation

**Patient ID Isolation:**
- All tables have `patient_id` column
- Foreign key constraints properly defined
- Indexes created on `patient_id`

**Session Management:**
- `secureStorage.js` has `setPatientId()` / `getPatientId()`
- `settingsStorage.js` has `setSelectedPatient()` / `getSelectedPatient()`

**⚠️ CONCERN:** Two separate patient ID storage mechanisms:
- `patientId` in secureStorage (from auth)
- `selectedPatientId` in settingsStorage (user selection)

### ⚠️ Gaps

1. **Patient Switching:**
   - Need to verify data queries use correct patient ID
   - Need to ensure switching doesn't delete cached data
   - Need to test multi-patient scenarios

2. **Data Isolation:**
   - Need to verify no data leakage between patients
   - Need to test patient A → B → A switching

3. **Login Flow:**
   - Need to understand multiple patient IDs per phone number flow
   - Need to verify patient selection UI exists

---

## Recommendations for Phase 2+

### Priority 1: Resolve Dual Schema Issue

**Action:**
1. Examine actual app startup/initialization code
2. Determine which database system is active
3. Choose ONE authoritative schema:
   - Option A: Keep simple JSON approach (db.js)
   - Option B: Migrate to normalized approach (Database.js)
4. Remove/deprecate the unused system

**Recommendation:** **Option A (Simple JSON)** unless there's a strong reason for normalization:
- Simpler to maintain
- Matches hybrid storage philosophy from requirements
- Already has working storage modules
- Medication alarm system can work with JSON data
- Repository pattern can be removed/simplified

### Priority 2: Consolidate Medication Storage

**Action:**
1. Migrate MedicationDatabaseService.js from AsyncStorage to SQLite
2. Update engine to use SQLite repositories exclusively
3. Remove AsyncStorage medication data
4. Verify alarm system works end-to-end with SQLite only

### Priority 3: Complete Storage Module Set

**Action:**
1. Create `src/database/invoiceStorage.js`
2. Create `src/database/appointmentStorage.js` (for history only)
3. Ensure consistent pattern across all modules
4. Update migration.js to include all data types

### Priority 4: AsyncStorage Cleanup

**Action:**
1. Remove PHR data caching from AsyncStorage
2. Update API.js to remove cache keys
3. Keep only session/settings data in AsyncStorage
4. Run migration to move any remaining data

### Priority 5: Offline Operation Enforcement

**Action:**
1. Add pre-flight connectivity checks for:
   - Appointment booking
   - PDF downloads
   - Any server-dependent operations
2. Show clear offline messages
3. Test all scenarios thoroughly

### Priority 6: Multi-Patient Testing

**Action:**
1. Clarify patient ID vs selected patient ID usage
2. Test patient switching scenarios
3. Verify data isolation
4. Ensure cached data persists per patient

---

## Risk Assessment

### High Risk 🔴

1. **Dual Schema System** - Could cause data corruption or confusion
2. **Medication Storage Duality** - AsyncStorage + SQLite inconsistency
3. **Incomplete Migration** - Old data may remain in AsyncStorage

### Medium Risk 🟡

1. **Repository Pattern Overhead** - May be unnecessary complexity
2. **Notification ID Mapping** - AsyncStorage dependency for alarms
3. **Missing Storage Modules** - Invoice and appointment storage incomplete

### Low Risk 🟢

1. **Network Handling** - NetInfo integration solid, just needs offline blocks
2. **PDF Handling** - Already follows filesystem approach
3. **Patient Isolation** - Schema supports it, just needs testing

---

## Phase 1 Audit Complete ✅

**Conclusion:**

The codebase has a **strong foundation** that is MORE COMPLETE than the requirements anticipated. The primary challenge is **consolidation and cleanup** rather than building from scratch.

**Key Insight:** The app already has TWO database architectures implemented. The refactor must choose one and remove the other to eliminate confusion and potential bugs.

**Next Steps:**
1. Determine which database schema is actually active
2. Make architectural decision: Simple JSON vs Normalized
3. Proceed with consolidation based on that decision
4. Complete missing pieces (invoice/appointment storage)
5. Migrate medication system fully to SQLite
6. Remove AsyncStorage PHR caching
7. Add offline operation enforcement
8. Test multi-patient scenarios

**Estimated Refactor Scope:** MEDIUM
- Not a complete rewrite
- Consolidation and migration work
- Some new storage modules
- Testing and verification

---

*Audit Date: Phase 1 Complete*
*Next: Phase 2 - Database Foundation Decision & Implementation*
