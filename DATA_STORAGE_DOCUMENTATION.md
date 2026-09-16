# Data Storage Architecture - SmartCare PHR

## Overview

The SmartCare PHR application uses a hybrid data storage approach combining **SQLite** for structured relational data and **AsyncStorage** for simple key-value storage. This document provides comprehensive information about how, where, and why each storage method is used.

---

## 🗄️ SQLite Database Usage

### **Primary Purpose**
SQLite serves as the main relational database for storing structured patient data, providing:
- **Offline-first architecture** - Data persists when network is unavailable
- **Patient-scoped operations** - All data is isolated per patient
- **Complex relationships** - Foreign key constraints and joins
- **Data integrity** - ACID transactions and type safety

### **Database Implementation**

#### **Core Database Layer**
- **File**: `src/database/Database.js`
- **Library**: `react-native-nitro-sqlite`
- **Architecture**: Singleton pattern with connection pooling

```javascript
// Database initialization
import { NitroSQLiteConnection, open } from 'react-native-nitro-sqlite';

class DatabaseManager {
  async init() {
    this.connection = open({ name: 'smartcare_phr.db' });
    await this.createTables();
  }
}
```

#### **Repository Pattern**
All database operations follow the Repository pattern for data access:

**Patient Repository** (`src/database/repositories/PatientRepository.js`)
- Stores patient profiles, demographics, vitals
- Replaces AsyncStorage profile data
- Supports patient switching and multi-tenant scenarios

**Investigation Repository** (`src/database/repositories/InvestigationRepository.js`)
- Stores medical reports, lab results, imaging
- Patient-scoped investigation history
- Supports PDF attachments and metadata

**Scheduled Dose Repository** (`src/database/repositories/ScheduledDoseRepository.js`)
- Medication scheduling and adherence tracking
- Alarm management and notification data
- Status tracking (taken, skipped, snoozed)

**Medication Alarm Repository** (`src/database/repositories/MedicationAlarmRepository.js`)
- Alarm scheduling and management
- Integration with system notifications
- Snooze and repeat logic

### **SQLite Data Service**

#### **Primary Service Layer**
- **File**: `src/services/SQLiteDataService.js`
- **Purpose**: Unified interface replacing AsyncStorage for complex data

```javascript
export class SQLiteDataService {
  // Patient Operations
  async savePatient(patientData) { /* Patient profile management */ }
  async getPatient(patientId) { /* Retrieve patient data */ }
  
  // Investigation Operations
  async saveInvestigations(investigations, patientId) { /* Medical reports */ }
  async getInvestigations(patientId) { /* Retrieve reports */ }
  
  // Medication Operations
  async getTodaysSchedule(patientId) { /* Daily medication schedule */ }
  async takeMedicine(doseId, notes) { /* Mark dose as taken */ }
  async skipMedicine(doseId, notes) { /* Mark dose as skipped */ }
  async snoozeMedicine(alarmId, minutes) { /* Snooze alarm */ }
}
```

#### **Key Features**
- **Patient-scoped operations**: All data isolated by patient ID
- **Automatic initialization**: Database setup on first access
- **Migration support**: AsyncStorage to SQLite data migration
- **Offline-first**: Works without network connectivity

### **SQLite Integration Points**

#### **React Hooks**
**useSQLiteInit Hook** (`src/hooks/useSQLiteInit.js`)
```javascript
export function useSQLiteInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  
  useEffect(() => {
    initializeSQLite();
  }, []);
  
  return { isInitialized, migrationStatus, error };
}
```

**useSQLiteData Hook** (`src/hooks/useSQLiteData.js`)
```javascript
export function useSQLiteData(patientId) {
  // Unified data access for React components
  // Handles loading states and error management
  // Provides real-time data synchronization
}
```

#### **Services Integration**
- **NotificationManager**: Stores notification mappings in SQLite
- **LocalAlarmManager**: Medication alarm persistence
- **MedicationEngineService**: Scheduling engine data storage

---

## 📱 AsyncStorage Usage

### **Primary Purpose**
AsyncStorage handles simple key-value storage for:
- **Authentication tokens** - Session management
- **App preferences** - Settings and configurations  
- **Cache data** - API response caching
- **Migration flags** - One-time setup tracking

### **AsyncStorage Implementation**

#### **Core Storage Service**
- **File**: `src/services/StorageService.js`
- **Wrapper around**: `@react-native-async-storage/async-storage`

```javascript
export const StorageService = {
  set: async (key, value) => {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  get: async key => {
    const val = await AsyncStorage.getItem(key);
    try { return JSON.parse(val); } catch { return val; }
  },
  remove: async key => AsyncStorage.removeItem(key),
  clear: async () => AsyncStorage.clear()
};
```

### **AsyncStorage Use Cases**

#### **1. Authentication & Session Management**
**File**: `src/API/Api.js`

```javascript
// Session storage after successful login
const saveSession = async (responseData) => {
  const clinicId = await AsyncStorage.getItem('CLINICID') || 'aureus';
  
  const sessionData = {
    'patientId': responseData.patientid || '',
    'mobileNo': responseData.mobile || '',
    'authToken': responseData.token || '',
    'branchId': responseData.branchid || ''
  };
  
  await Promise.all(
    Object.entries(sessionData).map(([key, value]) =>
      AsyncStorage.setItem(key, String(value))
    )
  );
};
```

**Keys Used:**
- `patientId` - Current logged-in patient
- `mobileNo` - User's mobile number
- `authToken` - API authentication token
- `branchId` - Hospital/clinic branch identifier
- `CLINICID` - Tenant/clinic selection
- `Tenant` - Multi-tenant configuration

#### **2. API Response Caching**
**File**: `src/API/Api.js`

```javascript
// Prescription details caching
const getById = async (prescriptionId, { forceRefresh = false } = {}) => {
  const cacheKey = `@rx_detail_${prescriptionId}`;
  
  // Check cache first
  if (!forceRefresh) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  // Fetch from API and cache
  const freshData = await fetchFromApi(prescriptionId);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
  
  return freshData;
};
```

**Cache Keys:**
- `@rx_detail_{id}` - Prescription medicine details
- `@appointments_cache` - Appointment history
- `@investigations_cache` - Medical reports cache

#### **3. App Configuration & Settings**
**Various Files**

```javascript
// Language preference
await AsyncStorage.setItem('selectedLanguage', 'en');

// Onboarding completion
await AsyncStorage.setItem('hasCompletedOnboarding', 'true');

// Migration status
await AsyncStorage.setItem('migrationCompleted', 'true');

// Hospital/clinic selection
await AsyncStorage.setItem('CLINICID', 'aureus2024');
```

**Configuration Keys:**
- `selectedLanguage` - App language (en/hi/regional)
- `hasCompletedOnboarding` - First-time setup completion
- `migrationCompleted` - SQLite migration status
- `CLINICID` - Selected hospital/clinic
- `Tenant` - Multi-tenant identifier

#### **4. Notification Management**
**File**: `src/services/NotificationService.js`

```javascript
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

// Store notification-to-dose mappings
const scheduleNotification = async (medicationData) => {
  const scheduledNotifications = await getScheduledNotifications();
  scheduledNotifications.push({
    notificationId: notificationId,
    medicineId: medicationData.medicineId,
    doseId: medicationData.doseId,
    scheduledTime: medicationData.scheduledTime
  });
  
  await AsyncStorage.setItem(
    SCHEDULED_NOTIFICATIONS_KEY,
    JSON.stringify(scheduledNotifications)
  );
};
```

#### **5. Medication Test Data**
**File**: `src/services/MedicationTestDataService.js`

```javascript
// Development and testing helper
const createSampleMedicationData = async () => {
  const patientId = await AsyncStorage.getItem('patientId');
  if (!patientId) {
    console.log('No patient ID found, creating sample patient');
    return false;
  }
  
  // Create test medication schedules
  // Used for development and QA testing
};
```

---

## 🔄 Migration Strategy

### **AsyncStorage to SQLite Migration**

#### **Migration Service**
**File**: `src/services/PrescriptionMigrationService.js`

```javascript
export const prescriptionMigrationService = {
  async performMigration() {
    const migrationCompleted = await AsyncStorage.getItem('migrationCompleted');
    
    if (migrationCompleted === 'true') {
      return { success: true, alreadyCompleted: true };
    }
    
    try {
      // 1. Read existing AsyncStorage data
      const profileData = await this.getAsyncStorageProfile();
      const investigationsData = await this.getAsyncStorageInvestigations();
      
      // 2. Transform and save to SQLite
      await sqliteDataService.migrateProfileFromAsyncStorage(profileData, patientId);
      await sqliteDataService.migrateInvestigationsFromAsyncStorage(investigationsData, patientId);
      
      // 3. Mark migration as completed
      await AsyncStorage.setItem('migrationCompleted', 'true');
      
      return { success: true, migratedData: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

#### **Migration Triggers**
- **App startup**: Automatic migration check in `useSQLiteInit`
- **Patient login**: Data migration for new patients
- **Version updates**: Schema migrations for database updates

---

## 📊 Storage Decision Matrix

| Data Type | Storage Method | Reason |
|-----------|---------------|---------|
| **Patient Profiles** | SQLite | Complex relationships, offline queries |
| **Medical Reports** | SQLite | Large datasets, patient-scoped |
| **Medication Schedules** | SQLite | Complex scheduling logic, alarms |
| **Authentication Tokens** | AsyncStorage | Simple key-value, session management |
| **App Settings** | AsyncStorage | Simple preferences, fast access |
| **API Cache** | AsyncStorage | Temporary data, TTL-based |
| **Migration Flags** | AsyncStorage | One-time setup tracking |
| **Notification IDs** | AsyncStorage | System integration requirements |

---

## 🔧 Integration Patterns

### **Context Integration**
**File**: `src/context/AppContext.jsx`

```javascript
const AppContext = React.createContext();

export const AppProvider = ({ children }) => {
  // AsyncStorage for session data
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  
  // SQLite for patient data
  const [userProfile, setUserProfile] = useState(defaultProfile);
  const [investigations, setInvestigations] = useState([]);
  
  useEffect(() => {
    // Initialize both storage systems
    loadAsyncStorageData();
    initializeSQLiteData();
  }, []);
};
```

### **Screen Integration**
**Example**: `src/screens/Profile/ProfileScreen.jsx`

```javascript
export default function ProfileScreen({ navigation }) {
  // AsyncStorage for hospital name
  const [hospitalName, setHospitalName] = useState('Test Server');
  
  // SQLite for patient data
  const { userProfile, investigations, appointments } = useApp();
  
  useEffect(() => {
    // Load hospital name from AsyncStorage
    const loadClinicInfo = async () => {
      const clinicId = await AsyncStorage.getItem('CLINICID') || 'aureus';
      
      if (clinicId.toLowerCase() === 'aureus') {
        setHospitalName('Test Server');
      } else if (clinicId.toLowerCase() === 'aureus2024') {
        setHospitalName('Aureus Hospital');
      }
    };
    
    loadClinicInfo();
  }, []);
}
```

---

## 📈 Performance Considerations

### **SQLite Optimizations**
1. **Connection Pooling**: Single connection reuse
2. **Prepared Statements**: SQL injection prevention and performance
3. **Indexing**: Primary and foreign key indexes
4. **Batch Operations**: Bulk inserts and updates
5. **Lazy Loading**: On-demand data initialization

### **AsyncStorage Optimizations**
1. **Batch Operations**: Multiple keys in single operation
2. **JSON Parsing**: Error handling for corrupted data
3. **Key Namespacing**: Avoiding key collisions
4. **Size Limits**: Keeping values under 2MB limit
5. **Cleanup**: Regular cache invalidation

---

## 🐛 Debugging & Monitoring

### **SQLite Debugging**
```javascript
// Enable detailed logging
console.log('[SQLiteDataService] Saving patient data:', patientData);
console.log('[Database] Executing query:', sql, params);
console.log('[Repository] Retrieved records:', results.length);
```

### **AsyncStorage Debugging**
```javascript
// Storage inspection
const debugAsyncStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const values = await AsyncStorage.multiGet(keys);
  
  console.log('AsyncStorage contents:', values);
};
```

### **Common Issues**
1. **SQLite**: Foreign key constraint violations
2. **AsyncStorage**: JSON parsing errors on corrupted data
3. **Migration**: Partial migration state inconsistencies
4. **Performance**: Large data operations blocking UI thread

---

## 🚀 Future Enhancements

### **Planned Improvements**
1. **Encryption**: Add database encryption for sensitive data
2. **Sync Service**: Cloud synchronization for multi-device access
3. **Compression**: Data compression for large medical images
4. **Indexing**: Advanced search capabilities
5. **Caching**: Intelligent cache invalidation strategies

### **Migration Roadmap**
1. **Phase 1**: Complete AsyncStorage to SQLite migration ✅
2. **Phase 2**: Optimize database schema and indexes
3. **Phase 3**: Implement cloud sync capabilities
4. **Phase 4**: Add real-time collaboration features

---

## 📝 Maintenance Guidelines

### **Regular Tasks**
1. **Database cleanup**: Remove old cached data
2. **Storage monitoring**: Track storage usage and performance
3. **Migration testing**: Verify data integrity during updates
4. **Performance profiling**: Monitor query performance
5. **Error tracking**: Log and analyze storage-related errors

### **Best Practices**
1. Always use try-catch blocks for storage operations
2. Implement proper error handling and fallbacks
3. Use TypeScript interfaces for data consistency
4. Regular backup strategies for critical data
5. Monitor storage quotas and cleanup policies

---

*This documentation is maintained alongside the codebase and should be updated when storage patterns change.*