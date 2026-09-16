# BORING Storage Refactor Plan

## The Problem

Too many layers for simple offline PHR data:

```
❌ CURRENT (Over-engineered)
Screen → Context/Hook → SQLiteDataService → Repository → DatabaseManager → Nitro SQLite
```

## The Solution

**Deliberately boring:**

```
✅ TARGET (Simple & Boring)
                    SERVER
                      │
                    API
                      │
             ┌────────┴────────┐
             │                 │
          ONLINE             OFFLINE
             │                 │
             ▼                 ▼
          SQLite ───────────► SQLite
             │                 │
             └────────┬────────┘
                      ▼
                     UI
```

## Storage Responsibilities (Final)

```
SQLite (patient data)
├── patients
├── prescriptions  
├── medicines
├── investigations
├── invoices
└── appointments

Secure storage (sensitive)
└── auth token

Key/value (simple settings)
├── selectedPatientId
├── clinicId  
├── tenant
├── language
└── onboarding flag

File system (large files)
└── PDFs / images

OS (notifications)
└── medication notifications
```

## JSON-First Approach

**DON'T** spend days normalizing everything into relational tables.

**DO** store JSON and normalize only when you need SQL queries:

```sql
prescriptions
------------------------  
id
patient_id
prescription_id  
data_json              ← Store the whole API response
updated_at

-- Later, if you need SQL filtering on specific fields:
ALTER TABLE prescriptions ADD COLUMN doctor_name TEXT;
UPDATE prescriptions SET doctor_name = JSON_EXTRACT(data_json, '$.doctorName');
```

This gives you:
- ✅ Immediate offline access  
- ✅ No data loss from API responses
- ✅ Simple implementation
- ✅ Future flexibility

---

## 🔧 Implementation Changes

### **1. Remove SQLiteDataService Mega-Service**

**❌ Current:**
```javascript
class SQLiteDataService {
  savePatient()
  getPatient()
  saveInvestigations()
  getInvestigations()
  getTodaysSchedule()
  takeMedicine()
  skipMedicine()
  snoozeMedicine()
  // ... becomes 1000-line god class
}
```

**✅ New:**
```javascript
// database/patientStorage.js
export async function savePatient(patientId, data) {
  // SQLite operation only
}

export async function getPatient(patientId) {
  // SQLite operation only
}

// database/prescriptionStorage.js
export async function savePrescriptions(patientId, data) {
  // SQLite operation only
}

export async function getPrescriptions(patientId) {
  // SQLite operation only
}
```

### **2. Remove Repository Layer**

**❌ Current:**
```
Feature → SQLiteDataService → Repository → DatabaseManager → SQLite
```

**✅ New:**
```
Feature → Storage Module → Database → SQLite
```

### **3. One Source of Truth**

**❌ Current (Multiple sources):**
```javascript
// AsyncStorage cache
@rx_detail_{id}
@appointments_cache
@investigations_cache

// AND SQLite data
prescriptions table
appointments table
investigations table
```

**✅ New (Single source):**
```
API → SQLite → UI
```

### **4. Minimal AsyncStorage**

**❌ Current (Too many responsibilities):**
- Authentication tokens
- API response cache
- App settings  
- Migration flags
- Notification mappings
- Test data

**✅ New (Essential only):**
```javascript
// storage/settingsStorage.js
const KEYS = {
  SELECTED_PATIENT_ID: 'selectedPatientId',
  CLINIC_ID: 'clinicId', 
  TENANT: 'tenant',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboardingCompleted'
};
```

### **5. Patient-First Schema**

**✅ Every table includes patient_id:**
```sql
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  data TEXT,
  created_at INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE investigations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  title TEXT,
  date TEXT,
  file_path TEXT,  -- Not blob data
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

### **6. File Storage Separation**

**❌ Don't store PDFs in SQLite**

**✅ Store metadata in SQLite, files separately:**
```javascript
// SQLite stores metadata
{
  id: "inv_123",
  patient_id: "patient_456", 
  title: "Blood Test Results",
  date: "2024-01-15",
  file_path: "/SmartCare/reports/inv_123.pdf"
}

// File system stores actual PDF
RNFS.DocumentDirectoryPath + '/SmartCare/reports/inv_123.pdf'
```

---

## 📋 Migration Strategy

### **Simple Migration Approach**

**❌ Current (Over-complex):**
```
AsyncStorage → PrescriptionMigrationService → SQLiteDataService → Repository → DatabaseManager
```

**✅ New (Direct):**
```javascript
// migration/migrate.js
export async function migrateToSQLite() {
  const version = await getSchemaVersion();
  
  if (version < 1) {
    // Migrate AsyncStorage data to SQLite
    await migratePatientData();
    await migratePrescriptionData();
    await setSchemaVersion(1);
  }
  
  if (version < 2) {
    // Future migrations
    await addNewColumns();
    await setSchemaVersion(2);
  }
}

async function getSchemaVersion() {
  const result = await db.execute('PRAGMA user_version');
  return result.rows[0].user_version;
}
```

### **Run Once Pattern**
```javascript
// App.jsx
useEffect(() => {
  migrateToSQLite().then(() => {
    setMigrationComplete(true);
  });
}, []);
```

---

## 🔄 Refactoring Steps

### **Phase 1: Simplify Storage Modules**
1. Create individual storage modules (patientStorage.js, etc.)
2. Move functions from SQLiteDataService to appropriate modules
3. Remove repository layer
4. Update screens to use storage modules directly

### **Phase 2: Clean AsyncStorage**
1. Move auth tokens to secure storage
2. Remove API caches from AsyncStorage  
3. Keep only essential settings
4. Update all AsyncStorage references

### **Phase 3: File Storage**
1. Extract PDF storage from SQLite
2. Store file paths in SQLite metadata
3. Use RNFS for actual file operations

### **Phase 4: Schema Optimization**
1. Ensure all tables have patient_id
2. Add proper indexes
3. Implement schema versioning
4. Test multi-patient scenarios

---

## 📁 Example Implementation

### **Database Connection (db.js)**
```javascript
import { open } from 'react-native-nitro-sqlite';

let connection = null;

export async function getDatabase() {
  if (!connection) {
    connection = open({ name: 'smartcare.db' });
    await initSchema();
  }
  return connection;
}

async function initSchema() {
  // Create tables with patient_id columns
  // Set up indexes
  // Handle schema versioning
}
```

### **Patient Storage (patientStorage.js)**
```javascript
import { getDatabase } from './db.js';

export async function savePatient(patientId, patientData) {
  const db = await getDatabase();
  const sql = `
    INSERT OR REPLACE INTO patients (id, data, updated_at)
    VALUES (?, ?, ?)
  `;
  
  return db.execute(sql, [
    patientId,
    JSON.stringify(patientData),
    Date.now()
  ]);
}

export async function getPatient(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM patients WHERE id = ?',
    [patientId]
  );
  
  if (result.rows.length > 0) {
    return JSON.parse(result.rows[0].data);
  }
  
  return null;
}
```

### **Settings Storage (settingsStorage.js)**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SELECTED_PATIENT_ID: 'selectedPatientId',
  CLINIC_ID: 'clinicId',
  TENANT: 'tenant',
  LANGUAGE: 'language',
};

export async function setSelectedPatient(patientId) {
  await AsyncStorage.setItem(KEYS.SELECTED_PATIENT_ID, patientId);
}

export async function getSelectedPatient() {
  return AsyncStorage.getItem(KEYS.SELECTED_PATIENT_ID);
}

export async function setClinicId(clinicId) {
  await AsyncStorage.setItem(KEYS.CLINIC_ID, clinicId);
}

export async function getClinicId() {
  return AsyncStorage.getItem(KEYS.CLINIC_ID) || 'aureus';
}
```

### **Screen Usage**
```javascript
// screens/PrescriptionsScreen.jsx
import { getPrescriptions, savePrescriptions } from '../database/prescriptionStorage';
import { getSelectedPatient } from '../storage/settingsStorage';

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState([]);
  
  useEffect(() => {
    loadPrescriptions();
  }, []);
  
  async function loadPrescriptions() {
    const patientId = await getSelectedPatient();
    if (patientId) {
      const data = await getPrescriptions(patientId);
      setPrescriptions(data);
    }
  }
}
```

---

## 🎯 Benefits of Simplified Architecture

### **Reduced Complexity**
- 4 layers → 2 layers
- Single responsibility per module
- Clear data flow
- Easy to debug and maintain

### **Better Performance**
- Direct database access
- No unnecessary service layers
- Fewer abstractions
- Optimized for mobile

### **Easier Testing**
- Test storage modules independently
- Mock database operations easily
- Clear input/output contracts
- No complex dependency chains

### **Future-Proof**
- Easy to add new data types
- Simple migration path
- Patient isolation built-in
- Clean separation of concerns

---

## 🚨 What NOT to Build (Yet)

- ❌ Cloud synchronization engine
- ❌ Real-time collaboration
- ❌ Complex offline conflict resolution  
- ❌ Advanced caching strategies
- ❌ Performance optimizations (until needed)
- ❌ Enterprise-level abstractions

**Focus on:** Clean architecture, reliable offline access, smooth user experience.

---

*This refactoring plan prioritizes simplicity and maintainability over enterprise patterns. The goal is a robust, easy-to-understand storage layer that serves the app's actual needs.*