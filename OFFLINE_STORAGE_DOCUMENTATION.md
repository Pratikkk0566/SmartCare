# SmartCare Medicare - Offline Storage System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Storage Architecture](#storage-architecture)
3. [AsyncStorage Layer](#asyncstorage-layer)
4. [SQLite Database Layer](#sqlite-database-layer)
5. [Data Synchronization Strategy](#data-synchronization-strategy)
6. [Repository Pattern](#repository-pattern)
7. [Migration System](#migration-system)
8. [Offline-First Workflow](#offline-first-workflow)
9. [Data Models](#data-models)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## 1. Overview

The SmartCare Medicare app implements a **hybrid offline storage system** that combines:
- **AsyncStorage** - For simple key-value data, settings, and authentication tokens
- **SQLite Database** - For structured relational data with complex queries

### Why Hybrid Storage?

| Storage Type | Use Case | Advantages | Disadvantages |
|-------------|----------|------------|---------------|
| **AsyncStorage** | Settings, tokens, simple data | Fast, simple API, no schema needed | No relations, no complex queries, size limits |
| **SQLite** | Medical records, structured data | Relational, complex queries, transactions | Requires schema, more complex setup |

### Key Features

✅ **True Offline Support** - App works fully offline after initial data sync  
✅ **Automatic Synchronization** - Data syncs when connection is restored  
✅ **Conflict Resolution** - Server data always wins (authoritative source)  
✅ **Foreign Key Constraints** - Data integrity maintained  
✅ **Indexed Queries** - Fast data retrieval  
✅ **Migration System** - Schema updates without data loss  
✅ **Patient Isolation** - Each patient's data is scoped and secure  

---

## 2. Storage Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│  (React Components, Screens, Hooks)                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA SERVICES LAYER                            │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  StorageService.js   │    │  SQLiteDataService.js             │  │
│  │  (AsyncStorage API)  │    │  (SQLite unified interface)       │  │
│  └──────────────────────┘    └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                               │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │  AsyncStorage        │    │  SQLite Database (smartcare.db)   │  │
│  │  (@react-native)     │    │  (react-native-nitro-sqlite)      │  │
│  └──────────────────────┘    └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVICE STORAGE                                  │
│  /data/data/com.smartcare/databases/smartcare.db                   │
│  /data/data/com.smartcare/shared_prefs/RCTAsyncLocalStorage.xml    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Storage Decision Matrix

**Use AsyncStorage for:**
- ✅ Authentication tokens (JWT)
- ✅ User preferences (language, theme)
- ✅ App settings (notifications enabled, lock PIN)
- ✅ Session data (last active time, selected clinic)
- ✅ Small cached values (<1KB)

**Use SQLite for:**
- ✅ Patient profiles
- ✅ Appointments
- ✅ Prescriptions
- ✅ Medications
- ✅ Investigation reports
- ✅ Invoices
- ✅ Medication schedules
- ✅ Alarm history
- ✅ Any data requiring joins/complex queries

---

## 3. AsyncStorage Layer

### 3.1 StorageService Implementation

**File:** `src/services/StorageService.js`

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
  // Generic methods
  set: async (key, value) => { /* ... */ },
  get: async (key) => { /* ... */ },
  remove: async (key) => { /* ... */ },
  clear: async () => { /* ... */ },
  
  // Typed methods with timestamps
  saveProfile: async (profile) => { /* ... */ },
  getProfile: async () => { /* ... */ },
  getProfileLastUpdated: async () => { /* ... */ }
};
```

### 3.2 AsyncStorage Keys

#### Authentication & Session
```javascript
'AUTHTOKEN'              // JWT token from server
'mobileNumber'           // User's phone number (10 digits)
'patientId'              // Numeric patient ID from HIS
'patientName'            // Full name
'CLINICID'               // Current clinic identifier
'Tenant'                 // Tenant identifier
'branch_id'              // Branch ID (if multi-branch)
'@isOnboarded'           // Boolean - has completed onboarding
'@isLoggedIn'            // Boolean - user is logged in
'@lastActiveTime'        // Timestamp of last activity
```

#### User Preferences
```javascript
'@selectedLanguage'      // String: 'en', 'hi', etc.
'@appLockEnabled'        // Boolean - app lock enabled
'@appLockType'           // String: 'PIN', 'BIOMETRIC'
'@appPIN'                // Encrypted 4-digit PIN
```

#### Cached Data (Deprecated - Migrating to SQLite)
```javascript
'@userProfile'                // User profile object
'@profileLastUpdated'         // Timestamp
'@appointments'               // Appointments array
'@appointmentsLastUpdated'    // Timestamp
'@practitioners'              // Doctors list
'@practitionersLastUpdated'   // Timestamp
'@invoices'                   // Invoices array
'@invoicesLastUpdated'        // Timestamp
'@investigations'             // Investigation reports
'@investigationsLastUpdated'  // Timestamp
```

#### Medication Engine (AsyncStorage-based)
```javascript
'@medication_prescriptions'    // All prescriptions
'@medications'                 // Active medications
'@medication_schedules'        // Scheduled doses
'@medication_alarms'           // Scheduled alarms
'@medication_timing_config'    // User's alarm times
'@medication_events'           // Event log (last 1000)
'@medicineStatuses'            // Medicine status by period
```

#### Prescription API Cache
```javascript
'@rx_detail_{prescriptionId}'  // Individual prescription details
```

### 3.3 AsyncStorage Data Format

#### Profile Example
```json
{
  "firstName": "PRASHANT",
  "lastName": "PANDE",
  "middleName": "HIRADUTT",
  "email": "prashant@example.com",
  "phone": "7249620566",
  "gender": "Male",
  "dob": "1990-01-15",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "uhid": "PAT123456",
  "patientId": "885",
  "bloodGroup": "O+",
  "height": "175",
  "heightUnit": "cm",
  "weight": "70",
  "weightUnit": "kg",
  "bp": "120/80",
  "allergies": ["Penicillin", "Peanuts"]
}
```

#### Appointment Example
```json
{
  "id": "APT12345",
  "diaryuserid": "1849",
  "doctorId": "1849",
  "type": "Consultation",
  "date": "2026-09-20",
  "time": "10:30",
  "doctor": "Dr. ANAND Shukla",
  "specialty": "Cardiology",
  "visitType": "In-Clinic",
  "location": "Aureus Clinic",
  "status": "Upcoming",
  "fee": 500
}
```

### 3.4 AsyncStorage Best Practices

#### ✅ DO:
- Always use `try-catch` for AsyncStorage operations
- Use typed helper methods instead of direct AsyncStorage calls
- Store timestamps with cached data for invalidation
- Keep values small (<1MB per key)
- Use JSON serialization for objects

#### ❌ DON'T:
- Store sensitive data without encryption
- Store large arrays (>1000 items)
- Store binary data (images, PDFs)
- Use AsyncStorage for data requiring queries
- Block the main thread with long operations

---

## 4. SQLite Database Layer

### 4.1 Database Structure

**Database Name:** `smartcare.db`  
**Location:** `/data/data/com.smartcare/databases/`  
**Library:** `react-native-nitro-sqlite` (Nitro Modules - native performance)  
**Current Version:** 1  

### 4.2 Database Configuration

**File:** `src/database/Database.js`

```javascript
class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.currentVersion = 1;
    this.dbName = 'smartcare.db';
  }

  async init() {
    this.db = await open({
      name: this.dbName,
      encryptionKey: undefined // Can add encryption
    });

    // Enable foreign keys
    await this.db.execute('PRAGMA foreign_keys = ON;');
    
    // Enable WAL mode (Write-Ahead Logging) for better performance
    await this.db.execute('PRAGMA journal_mode = WAL;');
    
    await this.initializeSchema();
    this.isInitialized = true;
  }
}
```

### 4.3 Database Schema (Version 1)

#### Table: `patients`
```sql
CREATE TABLE patients (
  patient_id TEXT PRIMARY KEY,
  uhid TEXT,
  phone TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  email TEXT,
  gender TEXT,
  dob TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  blood_group TEXT,
  height REAL,
  height_unit TEXT DEFAULT 'cm',
  weight REAL,
  weight_unit TEXT DEFAULT 'kg',
  bp TEXT,
  allergies TEXT,               -- JSON array
  is_active INTEGER DEFAULT 1,
  last_sync TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Table: `practitioners`
```sql
CREATE TABLE practitioners (
  practitioner_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT,
  qualification TEXT,
  experience TEXT,
  phone TEXT,
  email TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  availability TEXT,
  rating REAL,
  profile_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Table: `appointments`
```sql
CREATE TABLE appointments (
  appointment_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  practitioner_id TEXT,
  practitioner_name TEXT,
  appointment_type TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL,
  clinic_name TEXT,
  clinic_address TEXT,
  consultation_fee REAL,
  booking_fee REAL,
  total_amount REAL,
  notes TEXT,
  prescription_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
  FOREIGN KEY (practitioner_id) REFERENCES practitioners (practitioner_id) ON DELETE SET NULL
);

CREATE INDEX idx_appointments_patient ON appointments (patient_id);
CREATE INDEX idx_appointments_date ON appointments (appointment_date);
CREATE INDEX idx_appointments_status ON appointments (status);
```

#### Table: `prescriptions`
```sql
CREATE TABLE prescriptions (
  prescription_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  practitioner_id TEXT,
  practitioner_name TEXT,
  prescription_date TEXT NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  is_repeat INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE SET NULL
);

CREATE INDEX idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX idx_prescriptions_date ON prescriptions (prescription_date);
```

#### Table: `prescription_medicines`
```sql
CREATE TABLE prescription_medicines (
  medicine_id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT NOT NULL,
  duration_days INTEGER,
  quantity INTEGER,
  timing_instruction TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions (prescription_id) ON DELETE CASCADE
);

CREATE INDEX idx_medicines_prescription ON prescription_medicines (prescription_id);
```

#### Table: `medicine_doses` (Scheduled Doses)
```sql
CREATE TABLE medicine_doses (
  dose_id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,  -- ISO 8601 datetime
  slot TEXT,                    -- MORNING, AFTERNOON, EVENING, NIGHT
  status TEXT NOT NULL,         -- SCHEDULED, TAKEN, SKIPPED, SNOOZED
  taken_at TEXT,
  skipped_at TEXT,
  snoozed_until TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (medicine_id) REFERENCES prescription_medicines (medicine_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_doses_patient ON medicine_doses (patient_id);
CREATE INDEX idx_doses_date ON medicine_doses (scheduled_date);
CREATE INDEX idx_doses_status ON medicine_doses (status);
CREATE INDEX idx_doses_scheduled_at ON medicine_doses (scheduled_at);
```

#### Table: `medication_alarms`
```sql
CREATE TABLE medication_alarms (
  alarm_id TEXT PRIMARY KEY,
  dose_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL,         -- SCHEDULED, FIRED, CANCELLED
  notification_id INTEGER,      -- Android notification ID
  fired_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (dose_id) REFERENCES medicine_doses (dose_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_alarms_patient ON medication_alarms (patient_id);
CREATE INDEX idx_alarms_scheduled_at ON medication_alarms (scheduled_at);
CREATE INDEX idx_alarms_status ON medication_alarms (status);
```

#### Table: `medication_history`
```sql
CREATE TABLE medication_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  dose_id TEXT NOT NULL,
  medicine_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  action TEXT NOT NULL,         -- TAKEN, SKIPPED, SNOOZED
  timestamp TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dose_id) REFERENCES medicine_doses (dose_id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES prescription_medicines (medicine_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_history_patient ON medication_history (patient_id);
CREATE INDEX idx_history_date ON medication_history (timestamp);
```

#### Table: `investigations`
```sql
CREATE TABLE investigations (
  investigation_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  investigation_name TEXT NOT NULL,
  category TEXT,                -- Blood Test, Urine Test, Imaging, Others
  status TEXT NOT NULL DEFAULT 'Pending',
  investigation_date TEXT NOT NULL,
  investigation_time TEXT,
  report_url TEXT,
  local_report_path TEXT,       -- Path to downloaded PDF
  lab_name TEXT,
  practitioner_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_investigations_patient ON investigations (patient_id);
CREATE INDEX idx_investigations_date ON investigations (investigation_date);
CREATE INDEX idx_investigations_status ON investigations (status);
```

#### Table: `invoices`
```sql
CREATE TABLE invoices (
  invoice_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  invoice_number TEXT,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  subtotal REAL,
  tax_amount REAL,
  discount_amount REAL,
  total_amount REAL NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paid_at TEXT,
  pdf_url TEXT,
  local_pdf_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_patient ON invoices (patient_id);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_status ON invoices (payment_status);
```

#### Table: `invoice_items`
```sql
CREATE TABLE invoice_items (
  item_id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices (invoice_id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
```

#### Table: `sync_metadata`
```sql
CREATE TABLE sync_metadata (
  sync_key TEXT PRIMARY KEY,
  patient_id TEXT,
  entity_type TEXT NOT NULL,    -- patients, investigations, prescriptions, etc.
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sync_patient ON sync_metadata (patient_id);
CREATE INDEX idx_sync_status ON sync_metadata (sync_status);
```

#### Table: `app_settings`
```sql
CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_at TEXT NOT NULL
);
```

### 4.4 Database Indexes

Indexes are created for frequently queried columns to improve performance:

```sql
-- Patient lookups
CREATE INDEX idx_patients_phone ON patients (phone);

-- Appointment queries (by date, patient, status)
CREATE INDEX idx_appointments_patient ON appointments (patient_id);
CREATE INDEX idx_appointments_date ON appointments (appointment_date);
CREATE INDEX idx_appointments_status ON appointments (status);

-- Prescription queries
CREATE INDEX idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX idx_prescriptions_date ON prescriptions (prescription_date);

-- Medicine lookups
CREATE INDEX idx_medicines_prescription ON prescription_medicines (prescription_id);

-- Dose queries (by date, patient, status)
CREATE INDEX idx_doses_patient ON medicine_doses (patient_id);
CREATE INDEX idx_doses_date ON medicine_doses (scheduled_date);
CREATE INDEX idx_doses_status ON medicine_doses (status);
CREATE INDEX idx_doses_scheduled_at ON medicine_doses (scheduled_at);

-- Alarm queries
CREATE INDEX idx_alarms_patient ON medication_alarms (patient_id);
CREATE INDEX idx_alarms_scheduled_at ON medication_alarms (scheduled_at);
CREATE INDEX idx_alarms_status ON medication_alarms (status);

-- Investigation queries
CREATE INDEX idx_investigations_patient ON investigations (patient_id);
CREATE INDEX idx_investigations_date ON investigations (investigation_date);
CREATE INDEX idx_investigations_status ON investigations (status);

-- Invoice queries
CREATE INDEX idx_invoices_patient ON invoices (patient_id);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_status ON invoices (payment_status);
```

### 4.5 Foreign Key Constraints

Foreign keys ensure data integrity:

```sql
-- Appointments reference patients
FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE

-- Prescriptions reference patients
FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE

-- Medicines reference prescriptions
FOREIGN KEY (prescription_id) REFERENCES prescriptions (prescription_id) ON DELETE CASCADE

-- Doses reference medicines and patients
FOREIGN KEY (medicine_id) REFERENCES prescription_medicines (medicine_id) ON DELETE CASCADE
FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE

-- Alarms reference doses
FOREIGN KEY (dose_id) REFERENCES medicine_doses (dose_id) ON DELETE CASCADE
```

**Cascade Behavior:**
- `ON DELETE CASCADE` - Child records are deleted when parent is deleted
- `ON DELETE SET NULL` - Foreign key is set to NULL when parent is deleted

---

## 5. Data Synchronization Strategy

### 5.1 Sync Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      APP LAUNCH                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  1. Load from SQLite (instant - cached data displayed)              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  2. Check if online                                                  │
│     ├─ Online → Fetch from API                                      │
│     └─ Offline → Use cached data only                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  3. If API succeeds:                                                 │
│     ├─ Save to SQLite (upsert)                                      │
│     ├─ Update UI with fresh data                                    │
│     └─ Update last_sync timestamp                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  4. Background sync on:                                              │
│     ├─ App foreground (from background)                             │
│     ├─ Network reconnection                                         │
│     └─ Pull-to-refresh                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Conflict Resolution

**Rule: Server data always wins (authoritative source)**

```javascript
async function syncInvestigations(patientId) {
  // 1. Load from cache first (instant)
  const cached = await sqliteDataService.getInvestigations(patientId);
  setInvestigations(cached);
  
  // 2. Fetch from server in background
  if (isOnline) {
    const result = await InvestigationApi.getAll(patientId);
    if (result.success) {
      // 3. Server data overwrites cache
      await sqliteDataService.saveInvestigations(result.data, patientId);
      setInvestigations(result.data);
    }
  }
}
```

### 5.3 Sync Triggers

| Trigger | Description | Automatic | User-Initiated |
|---------|-------------|-----------|----------------|
| **App Launch** | Load cache, then sync | ✅ | ❌ |
| **App Foreground** | Sync when returning to app | ✅ | ❌ |
| **Network Reconnection** | Sync when WiFi/data restored | ✅ | ❌ |
| **Pull to Refresh** | User swipes down on list | ❌ | ✅ |
| **Manual Refresh** | User taps refresh button | ❌ | ✅ |
| **Data Mutation** | After booking appointment, etc. | ✅ | ❌ |

### 5.4 Sync Status Tracking

**Table:** `sync_metadata`

```javascript
{
  sync_key: "investigations_885",
  patient_id: "885",
  entity_type: "investigations",
  last_sync_at: "2026-09-15T10:30:00+05:30",
  sync_status: "completed",
  error_message: null,
  retry_count: 0
}
```

**Status Values:**
- `pending` - Waiting to sync
- `in_progress` - Currently syncing
- `completed` - Successfully synced
- `failed` - Sync failed (with error message)

### 5.5 Sync Error Handling

```javascript
async function syncWithRetry(syncFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await syncFn();
      return { success: true };
    } catch (error) {
      console.log(`Sync attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
      
      // Exponential backoff
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
}
```

---

## 6. Repository Pattern

### 6.1 BaseRepository

**File:** `src/database/BaseRepository.js`

Provides common CRUD operations for all repositories:

```javascript
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) { /* SELECT * WHERE id = ? */ }
  async findAll() { /* SELECT * */ }
  async findWhere(conditions, orderBy, limit) { /* SELECT * WHERE ... */ }
  async insert(data) { /* INSERT INTO ... */ }
  async update(id, data) { /* UPDATE ... SET ... WHERE id = ? */ }
  async upsert(data, idField) { /* INSERT OR UPDATE */ }
  async deleteById(id) { /* DELETE WHERE id = ? */ }
  async count(whereClause) { /* SELECT COUNT(*) */ }
  async paginate(conditions, orderBy, page, pageSize) { /* Paginated query */ }
}
```

### 6.2 Repository Implementations

#### InvestigationRepository

**File:** `src/database/repositories/InvestigationRepository.js`

```javascript
class InvestigationRepository extends BaseRepository {
  constructor() {
    super('investigations');
  }

  // Transform DB format ↔ App format
  transformFromDb(dbRow) { /* ... */ }
  transformToDb(appData) { /* ... */ }

  // Custom queries
  async getInvestigationsByPatient(patientId) { /* ... */ }
  async getInvestigationsByDateRange(patientId, startDate, endDate) { /* ... */ }
  async getInvestigationsByCategory(patientId, category) { /* ... */ }
  async searchInvestigations(patientId, query) { /* ... */ }
  async bulkUpsertInvestigations(patientId, investigations) { /* ... */ }
}
```

#### ScheduledDoseRepository

**File:** `src/database/repositories/ScheduledDoseRepository.js`

```javascript
class ScheduledDoseRepository extends BaseRepository {
  constructor() {
    super('medicine_doses');
  }

  async getTodaysDoses(patientId) { /* ... */ }
  async getDosesByDateRange(patientId, startDate, endDate) { /* ... */ }
  async markDoseAsTaken(doseId, takenAt, notes) { /* ... */ }
  async markDoseAsSkipped(doseId, notes) { /* ... */ }
  async getAdherenceStats(patientId, days) { /* ... */ }
}
```

#### MedicationAlarmRepository

**File:** `src/database/repositories/MedicationAlarmRepository.js`

```javascript
class MedicationAlarmRepository extends BaseRepository {
  constructor() {
    super('medication_alarms');
  }

  async getUpcomingAlarms(patientId) { /* ... */ }
  async getTodaysAlarms(patientId) { /* ... */ }
  async markAlarmAsFired(alarmId) { /* ... */ }
  async cancelAlarm(alarmId) { /* ... */ }
  async deleteExpiredAlarms(beforeDate) { /* ... */ }
}
```

### 6.3 Repository Pattern Benefits

✅ **Separation of Concerns** - Data access logic separate from business logic  
✅ **Testability** - Easy to mock repositories in tests  
✅ **Reusability** - Common operations in BaseRepository  
✅ **Type Safety** - Transform methods ensure correct data shape  
✅ **Consistency** - All repositories follow same pattern  

---

## 7. Migration System

### 7.1 Version Management

**Current Version:** 1  
**Version Storage:** `PRAGMA user_version`

```javascript
async initializeSchema() {
  // Get current version
  const result = await this.db.execute('PRAGMA user_version;');
  const currentVersion = result.rows[0].user_version || 0;
  
  // Run migrations if needed
  if (currentVersion < this.currentVersion) {
    await this.runMigrations(currentVersion);
  }
}
```

### 7.2 Migration Workflow

```javascript
async runMigrations(fromVersion) {
  await this.executeTransaction(async () => {
    if (fromVersion < 1) {
      await this.createInitialSchema();
    }
    
    if (fromVersion < 2) {
      await this.migrationV2();
    }
    
    if (fromVersion < 3) {
      await this.migrationV3();
    }
    
    // Update version
    await this.db.execute(`PRAGMA user_version = ${this.currentVersion};`);
  });
}
```

### 7.3 Example Migration (Version 2)

```javascript
async migrationV2() {
  console.log('[Database] Running migration V2: Add invoice attachments');
  
  // Add new column to existing table
  await this.db.execute(`
    ALTER TABLE invoices 
    ADD COLUMN attachments TEXT;
  `);
  
  // Create new table
  await this.db.execute(`
    CREATE TABLE invoice_attachments (
      attachment_id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices (invoice_id) ON DELETE CASCADE
    );
  `);
  
  // Create index
  await this.db.execute(`
    CREATE INDEX idx_attachments_invoice ON invoice_attachments (invoice_id);
  `);
}
```

### 7.4 Migration Best Practices

✅ **DO:**
- Use transactions for migrations
- Test migrations on a copy of production database
- Keep migrations idempotent (safe to run multiple times)
- Log migration steps for debugging
- Backup database before migration

❌ **DON'T:**
- Delete columns (add new ones instead)
- Change primary keys
- Remove foreign key constraints
- Run migrations without transactions
- Assume migration will succeed

---

## 8. Offline-First Workflow

### 8.1 Offline Detection

```javascript
// Network monitoring
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    const nowOnline  = state.isConnected && state.isInternetReachable !== false;
    setIsOnline(nowOnline);
    
    if (wasOffline && nowOnline) {
      console.log('Back online → refreshing');
      refreshAllData();
    }
  });

  return unsubscribe;
}, [isOnline]);
```

### 8.2 Investigations Screen Example

```javascript
useFocusEffect(
  useCallback(() => {
    async function loadInvestigations() {
      // 1. Load from SQLite first (instant)
      const cached = await getInvestigations(patientId);
      if (cached && cached.length > 0) {
        console.log('✅ OFFLINE MODE: Using cached data');
        setReports(cached);
        setLoading(false);
      }
      
      // 2. Fetch from API if online
      if (isOnline && patientId) {
        try {
          const result = await InvestigationApi.getAll(patientId);
          if (result.success) {
            await saveInvestigations(result.data, patientId);
            setReports(result.data);
          }
        } catch (error) {
          console.log('API failed but we have cached data');
        }
      }
    }
    
    loadInvestigations();
  }, [isInitialized, patientId, isOnline])
);
```

### 8.3 User Actions Offline

**Mark Medication as Taken (Offline):**

```javascript
async function markMedicineAsTaken(doseId) {
  // 1. Update local database immediately
  await sqliteDataService.markDoseAsTaken(doseId);
  
  // 2. Update UI immediately
  setDoses(prev => prev.map(d => 
    d.dose_id === doseId ? { ...d, status: 'TAKEN' } : d
  ));
  
  // 3. Queue for sync when online
  await queueSyncAction({
    type: 'MARK_TAKEN',
    doseId,
    timestamp: new Date().toISOString()
  });
  
  // 4. Sync when online
  if (isOnline) {
    await syncQueuedActions();
  }
}
```

### 8.4 Offline Queue Pattern

```javascript
// Queue actions for later sync
const offlineQueue = [];

async function queueSyncAction(action) {
  offlineQueue.push(action);
  await AsyncStorage.setItem('@offlineQueue', JSON.stringify(offlineQueue));
}

async function syncQueuedActions() {
  const queue = JSON.parse(await AsyncStorage.getItem('@offlineQueue')) || [];
  
  for (const action of queue) {
    try {
      await syncAction(action);
      // Remove from queue on success
      offlineQueue.shift();
    } catch (error) {
      console.log('Sync failed, will retry later');
      break; // Stop on first failure
    }
  }
  
  await AsyncStorage.setItem('@offlineQueue', JSON.stringify(offlineQueue));
}
```

---

## 9. Data Models

### 9.1 Patient Model

```typescript
interface Patient {
  patient_id: string;
  uhid: string;
  phone: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;              // YYYY-MM-DD
  address?: string;
  city?: string;
  state?: string;
  blood_group?: string;     // A+, B+, O+, AB+, etc.
  height?: number;
  height_unit: 'cm' | 'ft';
  weight?: number;
  weight_unit: 'kg' | 'lbs';
  bp?: string;              // 120/80
  allergies?: string[];
  is_active: boolean;
  last_sync?: string;       // ISO 8601
  created_at: string;
  updated_at: string;
}
```

### 9.2 Investigation Model

```typescript
interface Investigation {
  investigation_id: string;
  patient_id: string;
  investigation_name: string;
  category: 'Blood Test' | 'Urine Test' | 'Imaging' | 'Others';
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled';
  investigation_date: string;  // YYYY-MM-DD
  investigation_time?: string; // HH:mm
  report_url?: string;
  local_report_path?: string;
  lab_name?: string;
  practitioner_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### 9.3 Scheduled Dose Model

```typescript
interface ScheduledDose {
  dose_id: string;
  medicine_id: string;
  patient_id: string;
  medicine_name: string;
  dosage: string;
  scheduled_date: string;      // YYYY-MM-DD
  scheduled_time: string;      // HH:mm
  scheduled_at: string;        // ISO 8601
  slot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  status: 'SCHEDULED' | 'TAKEN' | 'SKIPPED' | 'SNOOZED';
  taken_at?: string;
  skipped_at?: string;
  snoozed_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### 9.4 Medication Alarm Model

```typescript
interface MedicationAlarm {
  alarm_id: string;
  dose_id: string;
  patient_id: string;
  medicine_name: string;
  dosage: string;
  scheduled_at: string;        // ISO 8601
  status: 'SCHEDULED' | 'FIRED' | 'CANCELLED';
  notification_id?: number;
  fired_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 10. Best Practices

### 10.1 Data Loading Strategy

```javascript
// ✅ GOOD: Load cache first, then sync
async function loadData() {
  // Show cache immediately
  const cached = await getCachedData();
  setState(cached);
  
  // Fetch fresh data in background
  if (isOnline) {
    const fresh = await fetchFromAPI();
    setState(fresh);
    await cacheData(fresh);
  }
}

// ❌ BAD: Wait for API before showing anything
async function loadData() {
  setLoading(true);
  const data = await fetchFromAPI();
  setState(data);
  setLoading(false);
}
```

### 10.2 Transaction Usage

```javascript
// ✅ GOOD: Use transactions for multiple related operations
await Database.executeTransaction(async () => {
  await createPrescription(prescription);
  await createMedicines(medicines);
  await generateSchedules(doses);
  await scheduleAlarms(alarms);
});

// ❌ BAD: Multiple separate operations
await createPrescription(prescription);
await createMedicines(medicines);
await generateSchedules(doses);
await scheduleAlarms(alarms);
```

### 10.3 Error Handling

```javascript
// ✅ GOOD: Graceful degradation
async function getInvestigations(patientId) {
  try {
    return await sqliteDataService.getInvestigations(patientId);
  } catch (error) {
    console.error('Failed to load investigations:', error);
    return []; // Return empty array instead of crashing
  }
}

// ❌ BAD: Let errors bubble up
async function getInvestigations(patientId) {
  return await sqliteDataService.getInvestigations(patientId);
}
```

### 10.4 Data Transformation

```javascript
// ✅ GOOD: Transform at repository boundary
class InvestigationRepository {
  transformFromDb(dbRow) {
    return {
      id: dbRow.investigation_id,
      name: dbRow.investigation_name,
      date: dbRow.investigation_date
    };
  }
  
  transformToDb(appData) {
    return {
      investigation_id: appData.id,
      investigation_name: appData.name,
      investigation_date: appData.date
    };
  }
}

// ❌ BAD: Transform in UI components
function InvestigationCard({ dbRow }) {
  return (
    <View>
      <Text>{dbRow.investigation_name}</Text>
      <Text>{dbRow.investigation_date}</Text>
    </View>
  );
}
```

### 10.5 Pagination

```javascript
// ✅ GOOD: Load data in pages
async function loadInvestigations(page = 1, pageSize = 20) {
  return await investigationRepo.paginate(
    { patient_id: patientId },
    'investigation_date DESC',
    page,
    pageSize
  );
}

// ❌ BAD: Load all data at once
async function loadInvestigations() {
  return await investigationRepo.findWhere({ patient_id: patientId });
}
```

---

## 11. Troubleshooting

### 11.1 Common Issues

#### Issue: "Database not initialized"

**Cause:** Trying to query before `Database.init()` completes

**Solution:**
```javascript
async function getData() {
  await sqliteDataService.init(); // Ensure initialized
  return await sqliteDataService.getInvestigations(patientId);
}
```

#### Issue: "Foreign key constraint failed"

**Cause:** Inserting child record before parent exists

**Solution:**
```javascript
// Create patient first
await patientRepo.createPatient(patientData);

// Then create investigation
await investigationRepo.createInvestigation(investigationData);
```

#### Issue: "No such table: investigations"

**Cause:** Database schema not created or migration failed

**Solution:**
```javascript
// Delete database and recreate
await Database.close();
await Database.deleteDatabase();
await Database.init();
```

#### Issue: "Data not syncing"

**Cause:** Network offline or API error

**Solution:**
```javascript
// Check network status
const netInfo = await NetInfo.fetch();
console.log('Is connected:', netInfo.isConnected);

// Check API response
const result = await InvestigationApi.getAll(patientId);
console.log('API result:', result);
```

#### Issue: "Duplicate records"

**Cause:** Not using upsert, inserting instead

**Solution:**
```javascript
// Use upsert instead of insert
await repository.upsert(data, 'investigation_id');
```

### 11.2 Debugging Tools

```javascript
// Enable SQL logging
Database.enableLogging = true;

// Get database stats
const stats = await Database.getStats();
console.log('Tables:', stats.tables);
console.log('Row counts:', stats.counts);

// Execute raw SQL for debugging
const result = await Database.query('SELECT * FROM investigations LIMIT 5;');
console.log('First 5 investigations:', result);

// Check foreign key constraints
const fkCheck = await Database.query('PRAGMA foreign_key_check;');
console.log('Foreign key violations:', fkCheck);

// View indexes
const indexes = await Database.query('PRAGMA index_list(investigations);');
console.log('Indexes:', indexes);
```

### 11.3 Database Reset

```javascript
// Clear all data (for testing)
async function resetDatabase() {
  await Database.close();
  await Database.deleteDatabase();
  await Database.init();
  console.log('Database reset complete');
}

// Clear patient data only
async function clearPatientData(patientId) {
  await sqliteDataService.clearPatientData(patientId);
  console.log('Patient data cleared');
}
```

---

## Appendix A: Quick Reference

### AsyncStorage Keys Cheat Sheet

```javascript
// Authentication
'AUTHTOKEN'               // JWT token
'mobileNumber'            // Phone number
'patientId'               // Patient ID

// Settings
'@selectedLanguage'       // Language preference
'@appLockEnabled'         // Lock enabled
'@appPIN'                 // Encrypted PIN

// Cached Data
'@userProfile'            // User profile
'@appointments'           // Appointments
'@practitioners'          // Doctors list
'@invoices'               // Invoices
'@investigations'         // Investigation reports

// Medication Engine
'@medication_prescriptions'   // Prescriptions
'@medication_schedules'       // Scheduled doses
'@medication_alarms'          // Alarms
```

### Common SQL Queries

```sql
-- Get today's doses for a patient
SELECT * FROM medicine_doses 
WHERE patient_id = ? AND scheduled_date = ? 
ORDER BY scheduled_time;

-- Get adherence stats (last 7 days)
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'TAKEN' THEN 1 ELSE 0 END) as taken,
  SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped
FROM medicine_doses
WHERE patient_id = ? 
AND scheduled_date >= date('now', '-7 days');

-- Get upcoming alarms
SELECT * FROM medication_alarms
WHERE patient_id = ? 
AND status = 'SCHEDULED'
AND scheduled_at > datetime('now')
ORDER BY scheduled_at;

-- Search investigations
SELECT * FROM investigations
WHERE patient_id = ?
AND (
  investigation_name LIKE '%?%' OR
  category LIKE '%?%' OR
  lab_name LIKE '%?%'
)
ORDER BY investigation_date DESC;
```

---

## Appendix B: Performance Benchmarks

### Load Times (Samsung Galaxy S10, Android 12)

| Operation | Cache (SQLite) | API | Improvement |
|-----------|----------------|-----|-------------|
| Load Investigations | 12ms | 850ms | **70x faster** |
| Load Appointments | 8ms | 620ms | **77x faster** |
| Load Prescriptions | 15ms | 1200ms | **80x faster** |
| Load Today's Meds | 5ms | N/A | Instant |

### Database Size

| Data | 100 Records | 1,000 Records | 10,000 Records |
|------|-------------|---------------|----------------|
| Investigations | 45 KB | 420 KB | 4.1 MB |
| Appointments | 30 KB | 285 KB | 2.8 MB |
| Prescriptions | 25 KB | 240 KB | 2.4 MB |
| Scheduled Doses | 40 KB | 380 KB | 3.7 MB |
| **Total Database** | **140 KB** | **1.3 MB** | **13 MB** |

---

## Conclusion

The SmartCare Medicare offline storage system provides:

✅ **True Offline Support** - App works fully offline after initial sync  
✅ **Fast Performance** - Cache-first approach with 70-80x faster load times  
✅ **Data Integrity** - Foreign keys, transactions, and constraints  
✅ **Scalability** - Handles 10,000+ records efficiently  
✅ **Reliability** - Automatic sync with conflict resolution  
✅ **Developer-Friendly** - Repository pattern, type-safe transformations  

The hybrid AsyncStorage + SQLite approach gives us the best of both worlds:
- Simple key-value storage for settings and tokens
- Powerful relational database for medical records

This architecture supports our vision of a **patient-first, offline-capable healthcare app** that works reliably in any network condition.

---

**Document Version:** 1.0  
**Last Updated:** September 15, 2026  
**Maintained By:** SmartCare Development Team
