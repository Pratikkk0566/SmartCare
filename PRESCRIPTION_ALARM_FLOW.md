# Prescription & Alarm Data Allotment System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Flow](#architecture-flow)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Service Layer](#service-layer)
6. [Alarm Flow](#alarm-flow)
7. [Screen Flow](#screen-flow)
8. [Data Storage](#data-storage)
9. [Complete Flow Diagram](#complete-flow-diagram)

---

## 1. System Overview

The SmartCare Medicare app implements a comprehensive medication scheduling and alarm system with:

- **Offline-first architecture** using AsyncStorage
- **Deterministic alarm scheduling** based on prescription data
- **Multi-slot daily scheduling** (Morning, Afternoon, Evening, Night)
- **Real-time sync** with SmartCare HIS backend
- **Automated medication tracking** with take/skip/snooze actions

### Key Components:
- **PrescriptionRepeatApi**: Fetches repeat prescriptions from hospital
- **MedicationSchedulingEngine**: Generates daily schedules from prescriptions
- **AsyncStorageMedicationStore**: Persists medication data offline
- **LocalAlarmManager**: Manages OS-level notifications (currently disabled)
- **NotificationManager**: Coordinates foreground/background notifications
- **MedicationEngineService**: High-level orchestration service

---

## 2. Architecture Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                       │
│  PrescriptionsScreen → PrescriptionDetail → MedicineSchedule    │
│           ↓                  ↓                     ↓            │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION LAYER                         │
│              AppContext.jsx (Global State)                      │
│              MedicationEngineService.js                         │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                       BUSINESS LOGIC                            │
│         MedicationSchedulingEngine.js                           │
│    - parseFrequency()  → Parse "1-1-1", "BD", etc.            │
│    - generateSchedules() → Create daily dose entries           │
│    - resolveTimingProfile() → Map to actual times              │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                       STORAGE LAYER                             │
│         AsyncStorageMedicationStore.js                          │
│    - Prescriptions  - Medications  - Schedules                 │
│    - Alarms        - Events        - TimingConfig              │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION LAYER                        │
│    LocalAlarmManager.js + NotificationManager.js               │
│    OS Notifications (Android/iOS)                              │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. API Endpoints

### Base URL
```
Production: https://saas.smartcarehis.com:8443/
```

### 3.1 Prescription API

#### GET All Repeat Prescriptions
**Endpoint**: `POST /hisapi_test/repeatprescription/patient/{clientId}`

**Request Headers**:
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {TOKEN}',
  'zoneid': 'Asia/Kolkata',
  'Tenant': '{clinicId}',
  'clinicid': '{clinicId}',
  'userid': '{clinicId}',
  'branchid': '{branchId}' or 'null',
  'patientid': '{clientId}'
}
```

**Request Body**:
```json
{
  "practids": ["1849", "2001", "2156"],
  "clientid": "885"
}
```

**Response** (Summary List):
```json
[
  {
    "id": "123456",
    "lastmodified": "2026-08-19 11:35:58",
    "is_visible": 1,
    "_doctorPractid": "1849",
    "medicineCount": 3,
    "medicines": [
      {
        "id": "789",
        "drug": "Paracetamol 500mg",
        "dose": "500mg",
        "frequencyNote": "1-1-1",
        "duration": "7",
        "priscdurationtype": "Days",
        "qty": "21",
        "genericname": "Acetaminophen",
        "routes": "Oral",
        "medicineid": "12345",
        "remark": "Take after food",
        "strength": "500mg"
      }
    ]
  }
]
```

#### GET Prescription Detail (Per Medicine)
**Endpoint**: `GET /hisapi_test/repeatprescription/{prescriptionId}/{medicineId}`

**Response** (Single Medicine Detail):
```json
{
  "id": "789",
  "drug": "Paracetamol 500mg",
  "dose": "500mg",
  "frequencyNote": "1-1-1",
  "duration": "7",
  "priscdurationtype": "Days",
  "qty": "21",
  "genericname": "Acetaminophen",
  "routes": "Oral",
  "medicineid": "12345",
  "remark": "Take after food",
  "whentoeat": "After Food",
  "strength": "500mg"
}
```

### 3.2 Patient Profile API

#### GET Patient by Mobile
**Endpoint**: `GET /hisapi_test/patient/byMobileNo?mobileNo={mobile}`

**Response**:
```json
{
  "id": "885",
  "firstname": "John",
  "surname": "Doe",
  "mobno": "9876543210",
  "email": "john@example.com",
  "uhid": "PAT-885",
  "gender": "Male",
  "newdob": "1985-05-15"
}
```

---

## 4. Data Models

### 4.1 Prescription Domain Model

```typescript
interface Prescription {
  prescriptionId: string;        // "RX-123456"
  patientId: string;            // "PAT-885"
  doctorId: string | null;      // "1849"
  prescribedAt: string | null;  // ISO timestamp
  version: number;              // 1
  status: string | null;        // "ACTIVE"
  cancelled: boolean;           // false
  medicines: Medicine[];
}
```

### 4.2 Medicine Domain Model

```typescript
interface Medicine {
  medicinePrescriptionId: string;  // "RX-123456-MED-1"
  medicineId: string;              // "12345"
  medicineName: string;            // "Paracetamol 500mg"
  dosage: string;                  // "500mg tablet"
  prescribedQuantity: number;      // 21
  durationDays: number;            // 7
  frequency: string;               // "1-1-1"
  startDate: string;               // "2026-08-19"
  endDate: string | null;          // "2026-08-25"
  notes: string;                   // "Take after food"
  timingInstruction: string;       // "After food"
  cancelled: boolean;              // false
  doctorTimings?: TimingProfile;
  medicineTimings?: TimingProfile;
  timezone: string;                // "Asia/Kolkata"
  timezoneOffset: string;          // "+05:30"
}
```

### 4.3 Medication Record (After Processing)

```typescript
interface MedicationRecord {
  id: string;                      // "medication:PAT-885:RX-123456:MED-1"
  patientId: string;
  doctorId: string | null;
  prescriptionId: string;
  prescriptionVersion: number;
  prescribedAt: string;
  medicinePrescriptionId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  prescribedQuantity: number;      // Total prescribed (e.g., 21 tablets)
  consumedQuantity: number;        // Taken so far (e.g., 5)
  remainingQuantity: number;       // Left to take (e.g., 16)
  scheduledQuantity: number;       // Scheduled doses count
  frequency: string;               // "1-1-1"
  dailyQuantity: number;           // Doses per day (e.g., 3)
  medicationDurationDays: number;  // 7 days
  startDate: string;
  endDate: string;
  expectedCompletionDate: string;
  notes: string;
  timingInstruction: string;
  timingProfile: TimingProfile;    // Resolved time slots
  timezone: string;
  timezoneOffset: string;
  cancelled: boolean;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  updatedAt: string;
}
```

### 4.4 Schedule Entry

```typescript
interface ScheduleEntry {
  id: string;                      // "schedule:PAT-885:RX-123456:MED-1:2026-08-19:MORNING"
  scheduleId: string;
  prescriptionId: string;
  medicinePrescriptionId: string;
  patientId: string;
  medicineId: string;
  medicineName: string;            // "Paracetamol 500mg"
  dosage: string;                  // "500mg tablet"
  doseQuantity: number;            // 1
  scheduledDate: string;           // "2026-08-19"
  scheduledTime: string;           // "08:00"
  scheduledTime12h: string;        // "08:00 AM"
  scheduledAt: string;             // "2026-08-19T08:00:00+05:30"
  timezone: string;
  timezoneOffset: string;
  slot: string;                    // "MORNING"
  notes: string;
  timingInstruction: string;       // "After food"
  status: 'SCHEDULED' | 'TAKEN' | 'SKIPPED' | 'SNOOZED' | 'CANCELLED';
  createdAt: string;
  takenAt?: string;
  skipReason?: string;
  expectedCompletionDate: string;
}
```

### 4.5 Alarm Entry

```typescript
interface AlarmEntry {
  alarmId: string;                 // "alarm:schedule-id:timestamp"
  scheduleId: string;
  scheduledAt: string;             // ISO timestamp
  status: 'SCHEDULED' | 'FIRED' | 'CANCELLED';
  notificationId?: string;         // OS notification ID
  createdAt: string;
}
```

### 4.6 Timing Profile

```typescript
interface TimingProfile {
  MORNING: string;    // "08:00"
  AFTERNOON: string;  // "14:00"
  EVENING: string;    // "20:00"
  NIGHT: string;      // "22:00"
}
```

---

## 5. Service Layer

### 5.1 MedicationSchedulingEngine

**File**: `src/services/MedicationSchedulingEngine.js`

**Core Functions**:

#### `parseFrequency(frequency)`
Converts medical frequency notation into slot doses.

**Supported Formats**:
- Numeric: `"1-1-1"`, `"1-0-1"`, `"1-1-1-1"`
- Latin: `"BD"`, `"TDS"`, `"QID"`, `"OD"`
- Natural: `"Morning"`, `"Morning & Night"`, `"Twice daily"`
- Keywords: `"before_sleep"`, `"afternoon"`, `"night"`

**Examples**:
```javascript
parseFrequency("1-1-1")
// Returns: [
//   { slot: 'MORNING', dose: 1 },
//   { slot: 'AFTERNOON', dose: 1 },
//   { slot: 'NIGHT', dose: 1 }
// ]

parseFrequency("BD")
// Returns: [
//   { slot: 'MORNING', dose: 1 },
//   { slot: 'AFTERNOON', dose: 0 },
//   { slot: 'NIGHT', dose: 1 }
// ]
```

#### `generateSchedules(medicine, options)`
Creates daily dose schedules from a medicine record.

**Input**:
```javascript
{
  medicineId: "12345",
  medicineName: "Paracetamol 500mg",
  prescribedQuantity: 21,
  frequency: "1-1-1",
  startDate: "2026-08-19",
  timezoneOffset: "+05:30"
}
```

**Output**:
```javascript
[
  {
    id: "schedule:PAT-885:RX-123:MED-1:2026-08-19:MORNING",
    scheduledDate: "2026-08-19",
    scheduledTime: "08:00",
    slot: "MORNING",
    doseQuantity: 1,
    status: "SCHEDULED"
  },
  {
    id: "schedule:PAT-885:RX-123:MED-1:2026-08-19:AFTERNOON",
    scheduledDate: "2026-08-19",
    scheduledTime: "14:00",
    slot: "AFTERNOON",
    doseQuantity: 1,
    status: "SCHEDULED"
  },
  // ... continues for 7 days (21 total doses)
]
```

#### `resolveTimingProfile(options)`
Merges timing configurations with priority: doctor > medicine > patient > default.

**Example**:
```javascript
resolveTimingProfile({
  patientTimingProfile: { MORNING: "07:00" },
  defaultTimingProfile: { MORNING: "08:00", AFTERNOON: "14:00" }
})
// Returns: { MORNING: "07:00", AFTERNOON: "14:00", ... }
```

### 5.2 MedicationEngineService

**File**: `src/services/MedicationEngineService.js`

**High-level orchestration service**

#### `syncPrescriptions(prescriptionsList, options)`
Syncs raw API prescriptions into the medication engine.

**Flow**:
1. Maps API format → Domain format (`mapApiPrescription`)
2. Creates `MedicationRecord` for each medicine
3. Generates daily schedules (`generateSchedules`)
4. Creates alarms for each schedule
5. Saves to AsyncStorage

**Example**:
```javascript
await medicationEngineService.syncPrescriptions([
  {
    id: "123456",
    lastmodified: "2026-08-19 11:35:58",
    medicines: [...]
  }
], { patientId: "PAT-885" });
```

#### `markTaken(scheduleId)`
Records a dose as taken and updates consumed quantity.

**Flow**:
1. Find schedule by ID
2. Update status to `"TAKEN"`
3. Set `takenAt` timestamp
4. Increment `consumedQuantity` on medication record
5. Cancel associated alarm
6. Persist to storage

#### `markSkipped(scheduleId, reason)`
Records a dose as skipped with reason.

**Flow**:
1. Find schedule by ID
2. Update status to `"SKIPPED"`
3. Set `skipReason`
4. Cancel associated alarm
5. Persist to storage

#### `snooze(scheduleId, minutes)`
Delays a scheduled dose alarm.

**Flow**:
1. Find schedule and alarm
2. Create new alarm with delayed time
3. Update schedule status to `"SNOOZED"`
4. Cancel old alarm, schedule new one

#### `getTodaysTimeline(date)`
Returns all scheduled doses for a given date, grouped by slot.

**Response**:
```javascript
{
  MORNING: [
    {
      id: "schedule:...",
      medicineName: "Paracetamol 500mg",
      scheduledTime: "08:00",
      status: "SCHEDULED",
      doseQuantity: 1
    }
  ],
  AFTERNOON: [...],
  EVENING: [...],
  NIGHT: [...]
}
```

### 5.3 AsyncStorageMedicationStore

**File**: `src/services/AsyncStorageMedicationStore.js`

**Storage Keys**:
- `@medication_prescriptions`: Raw prescriptions from API
- `@medications`: Processed medication records
- `@medication_schedules`: Daily dose schedules
- `@medication_alarms`: Alarm entries
- `@medication_timing_config`: User's timing preferences
- `@medication_events`: Action log (taken/skipped/snoozed)

**Key Methods**:
```javascript
// Save/retrieve prescriptions
savePrescription(prescription)
getPrescription(prescriptionId)
listPrescriptions()

// Save/retrieve medications
saveMedication(medication)
getMedication(medicationId)
listMedications()

// Save/retrieve schedules
saveSchedule(schedule)
getSchedule(scheduleId)
listSchedules()
getSchedulesForMedication(medication)

// Save/retrieve alarms
saveAlarm(alarm)
getAlarm(alarmId)
listAlarms()

// Timing config
saveTimingConfig(config)
getTimingConfig()

// Event log
appendEvent(event)
listEvents(options)
```

---

## 6. Alarm Flow

### 6.1 LocalAlarmManager (Currently Disabled - Library Not Installed)

**File**: `src/services/LocalAlarmManager.js`

**Note**: `react-native-push-notification` library is not installed, so alarm functionality is currently disabled pending reimplementation.

**Planned Features**:
- Rich OS notifications with action buttons (Take, Snooze, Skip)
- Foreground/background notification handling
- Deep linking back to app
- Snooze limits (max 3 snoozes)
- Grace period for missed doses (30 minutes)

**Planned Notification Structure**:
```javascript
{
  id: "notification_123",
  title: "💊 Take your Paracetamol 500mg",
  message: "500mg tablet • After food",
  scheduledTime: "2026-08-19T08:00:00+05:30",
  actions: [
    { id: "TAKE_ACTION", title: "✅ Take" },
    { id: "SNOOZE_ACTION", title: "⏰ Snooze 15min" },
    { id: "SKIP_ACTION", title: "❌ Skip" }
  ],
  userInfo: {
    doseId: "schedule-id",
    medicineId: "12345",
    alarmId: "alarm-id",
    medicineName: "Paracetamol 500mg",
    dosage: "500mg tablet",
    scheduledTime: "08:00 AM"
  }
}
```

### 6.2 NotificationManager

**File**: `src/services/NotificationManager.js`

**Coordinates foreground/background notifications**

**Methods**:
- `showMedicationReminder(medicationData, isOverdue)`: Shows in-app popup when app is active
- `handleMedicationAction(action, medicationData)`: Handles Take/Skip/Snooze actions
- `queuePopup(popupData)`: Queues notifications for display
- `hideActivePopup()`: Dismisses current popup

**Popup Types**:
- `medication_reminder`: Time to take medicine
- `success_notification`: Dose taken confirmation
- `warning_notification`: Dose skipped
- `info_notification`: Alarm snoozed

---

## 7. Screen Flow

### 7.1 PrescriptionsScreen

**File**: `src/screens/Medicine/PrescriptionsScreen.jsx`

**Purpose**: Lists all prescriptions (local + server)

**Data Sources**:
- Server: `PrescriptionRepeatApi.getAllForPatient()`
- Local: AsyncStorage (future implementation)

**Features**:
- Relevance filtering (All / Active)
- Date filtering (All Time, Past Week, Past Month, etc.)
- Search by medicine name, doctor, diagnosis
- Relevance badges (Active, Expiring, Expired)

**Actions**:
- Tap prescription → Navigate to `PrescriptionDetailScreen`
- "Create New Prescription" → Navigate to `CreatePrescription`
- "View Schedule" → Navigate to `MedicineScheduleScreen`

**Data Flow**:
```
1. fetchServerPrescriptions()
   ↓
2. PrescriptionRepeatApi.getAllForPatient(practids, patientId)
   ↓
3. Normalize response → compute relevance
   ↓
4. setServerPrescriptions(normalized)
   ↓
5. Auto-sync to engine: syncPrescriptionsToEngine(normalized, patientId)
```

### 7.2 PrescriptionDetailScreen

**File**: `src/screens/Medicine/PrescriptionDetailScreen.jsx`

**Purpose**: Shows detailed view of a single prescription

**Data Sources**:
- Passed via navigation params from PrescriptionsScreen

**Displays**:
- Doctor information (name, specialty, qualifications)
- Prescription metadata (date, ID)
- Diagnosis (if available)
- Medicine list with:
  - Medicine name & generic name
  - Dose, frequency, duration
  - Expiry date & relevance status
  - Food instructions
  - Notes/remarks

**Relevance Display**:
- **Active**: Green badge "Active" or "Xd left"
- **Expiring**: Yellow badge "Finishing · Xd"
- **Expired**: Gray badge "Xd ago" with strikethrough styling

**Integration Card**:
- "View in Schedule" → `MedicineScheduleScreen`
- "Alarm Settings" → `MedicationAlarms`

### 7.3 MedicineScheduleScreen

**File**: `src/screens/Medicine/MedicineScheduleScreen.jsx`

**Purpose**: Daily medication timeline with alarm integration

**Data Sources**:
- `engineSchedules` from AppContext
- `engineAlarms` from AppContext
- `engineTimingConfig` from AppContext

**Features**:
- **Horizontal Date Strip**: 7-day view (3 days before/after today)
- **Daily Adherence Card**: Shows taken/total doses and adherence %
- **Search**: Filter by medicine name, slot, or notes
- **Slot Groups**: MORNING, AFTERNOON, EVENING, NIGHT
- **Per-Dose Actions**:
  - **Mark Taken**: Records dose and shows success modal
  - **Snooze**: Opens snooze options modal (10min, 15min, 30min, 1hr)
  - **Skip**: Opens skip reason modal with predefined reasons
- **Settings Modal**: Adjust timing for each slot

**Dose Card States**:
- **Locked**: Future doses (before scheduled time) - cannot take
- **Pending**: Current/past scheduled doses - can take/snooze/skip
- **Taken**: Completed doses with timestamp
- **Skipped**: Skipped doses with reason
- **Snoozed**: Temporarily delayed doses

**Data Flow**:
```
1. refreshEngineData(selectedDate)
   ↓
2. medicationEngineService.getTodaysTimeline({ date })
   ↓
3. Group schedules by slot (MORNING, AFTERNOON, EVENING, NIGHT)
   ↓
4. Render slot cards with dose cards
   ↓
5. User action (Take/Skip/Snooze)
   ↓
6. markEngineDoseTaken(scheduleId) / markEngineDoseSkipped() / snoozeEngineDose()
   ↓
7. Refresh data → Update UI
```

### 7.4 TodaysMedicineScreen

**File**: `src/screens/Medicine/TodaysMedicineScreen.jsx`

**Purpose**: Quick view of today's medication schedule (legacy screen, overlaps with MedicineScheduleScreen)

**Data Sources**:
- Medication schedule (currently empty due to SQLite removal)

**Features**:
- Adherence stats for today
- List of scheduled doses
- Take/Skip/Snooze actions
- Status icons (Pending, Taken, Skipped, Missed)

**Note**: This screen has overlapping functionality with MedicineScheduleScreen and may be deprecated in future refactoring.

### 7.5 MedicationAlarmScreen

**File**: `src/screens/Medicine/MedicationAlarmScreen.jsx`

**Purpose**: Individual alarm notification screen (launched from OS notification)

**Data Sources**:
- Passed via navigation params from notification

**Displays**:
- Medicine name & dosage
- Scheduled time
- Food instructions

**Actions**:
- **Take**: Marks dose as taken → `handleTaken()`
- **Snooze**: Delays alarm 15 minutes → `handleSnooze()`
- **Skip**: Records skip with confirmation → `handleSkip()`
- **Close**: Dismisses alarm without action

**Integration**:
- Uses `MedAlarm` component for UI
- Calls `localAlarmManager` methods for alarm management
- Navigates back after action

---

## 8. Data Storage

### 8.1 AsyncStorage Keys

```javascript
// Medication System
'@medication_prescriptions'    // Raw prescriptions from API
'@medications'                 // Processed medication records
'@medication_schedules'        // Daily dose schedules
'@medication_alarms'           // Alarm entries
'@medication_timing_config'    // User timing preferences
'@medication_events'           // Action event log

// User Data
'@userProfile'                 // Patient profile
'@appointments'                // Appointment list
'@practitioners'               // Doctor list
'@invoices'                    // Invoice list

// Auth
'AUTHTOKEN'                    // JWT token
'mobileNumber'                 // User mobile
'patientId'                    // Patient ID
'CLINICID'                     // Clinic ID
```

### 8.2 Storage Operations

**Write Operations**:
```javascript
// Save single item
await AsyncStorage.setItem(key, JSON.stringify(value))

// Save multiple items
await AsyncStorage.multiSet([
  ['key1', JSON.stringify(value1)],
  ['key2', JSON.stringify(value2)]
])
```

**Read Operations**:
```javascript
// Get single item
const value = JSON.parse(await AsyncStorage.getItem(key) || '[]')

// Get multiple items
const values = await AsyncStorage.multiGet(['key1', 'key2'])
```

---

## 9. Complete Flow Diagram

### 9.1 Prescription Fetch & Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Opens PrescriptionsScreen                               │
└──────────────┬──────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. AppContext.refreshAllData()                                   │
│    - Gets patientId from AsyncStorage                            │
│    - Collects visited doctor IDs from appointments/invoices      │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. PrescriptionRepeatApi.getAllForPatient(practids, patientId)   │
│    POST https://saas.smartcarehis.com:8443/                      │
│         hisapi_test/repeatprescription/patient/{clientId}        │
│    Body: { practids: ["1849", "2001"], clientid: "885" }        │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. API Response (Summary List)                                   │
│    [                                                              │
│      {                                                            │
│        id: "123456",                                              │
│        lastmodified: "2026-08-19 11:35:58",                      │
│        _doctorPractid: "1849",                                   │
│        medicines: [                                               │
│          {                                                        │
│            id: "789",                                             │
│            drug: "Paracetamol 500mg",                            │
│            dose: "500mg",                                         │
│            frequencyNote: "1-1-1",                               │
│            duration: "7",                                         │
│            qty: "21"                                              │
│          }                                                        │
│        ]                                                          │
│      }                                                            │
│    ]                                                              │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. Normalize & Compute Relevance                                 │
│    - Map API fields to domain model                              │
│    - computePrescriptionRelevance(medicines, lastmodified)       │
│    - Attach relevanceLevel: 'active' | 'expiring' | 'expired'   │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. Display in PrescriptionsScreen                                │
│    - Filter by relevance (All / Active)                          │
│    - Sort by date DESC                                            │
│    - Show badges (Active, Expiring, Expired)                     │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. Auto-Sync to MedicationEngine                                 │
│    AppContext.syncPrescriptionsToEngine(normalized, patientId)   │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 8. MedicationEngineService.syncPrescriptions()                   │
│    For each prescription:                                         │
│      - mapApiPrescription(raw)                                   │
│      - For each medicine:                                         │
│        • engine.syncMedicine(prescription, medicine)             │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 9. MedicationSchedulingEngine.syncMedicine()                     │
│    - makeMedicationDomainRecord(prescription, medicine)          │
│    - generateSchedules(medicine, timingProfile)                  │
│    - For each schedule:                                           │
│      • store.saveSchedule(schedule)                              │
│      • Create alarm entry                                         │
│      • store.saveAlarm(alarm)                                    │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 10. AsyncStorageMedicationStore.save*()                          │
│     - Prescriptions saved to '@medication_prescriptions'         │
│     - Medications saved to '@medications'                        │
│     - Schedules saved to '@medication_schedules'                 │
│     - Alarms saved to '@medication_alarms'                       │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Daily Schedule Display Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Opens MedicineScheduleScreen                             │
└──────────────┬──────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. refreshEngineData(selectedDate)                               │
│    - Default: todayInUtc()                                       │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. MedicationEngineService.getTodaysTimeline({ date })           │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. AsyncStorageMedicationStore.listSchedules()                   │
│    - Loads all schedules from '@medication_schedules'            │
│    - Filters by date: schedule.scheduledDate === selectedDate    │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. Return Today's Schedules                                      │
│    [                                                              │
│      {                                                            │
│        id: "schedule:PAT-885:RX-123:MED-1:2026-08-19:MORNING",  │
│        medicineName: "Paracetamol 500mg",                        │
│        dosage: "500mg tablet",                                    │
│        scheduledDate: "2026-08-19",                              │
│        scheduledTime: "08:00",                                    │
│        scheduledTime12h: "08:00 AM",                             │
│        slot: "MORNING",                                           │
│        doseQuantity: 1,                                           │
│        status: "SCHEDULED",                                       │
│        timingInstruction: "After food"                           │
│      },                                                           │
│      // ... more schedules                                        │
│    ]                                                              │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. Group Schedules by Slot                                       │
│    {                                                              │
│      MORNING: [schedule1, schedule2],                            │
│      AFTERNOON: [schedule3],                                     │
│      EVENING: [],                                                 │
│      NIGHT: [schedule4]                                           │
│    }                                                              │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. Render Slot Groups                                            │
│    For each slot (MORNING, AFTERNOON, EVENING, NIGHT):           │
│      - Show slot header with time (e.g., "08:00 AM")            │
│      - Show medicine count badge                                  │
│      - Render dose cards for each schedule in slot               │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 8. Render Dose Cards                                             │
│    For each schedule:                                             │
│      - Medicine name & dosage                                     │
│      - Timing instruction (e.g., "After food")                   │
│      - Status chip (DUE, TAKEN, SKIPPED, SNOOZED, LOCKED)       │
│      - Action buttons (Mark Taken, Snooze, Skip) if pending      │
│      - Completion metadata if already taken/skipped              │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Take Medicine Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Taps "Mark Taken" Button                                │
└──────────────┬──────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. handleMarkTaken(schedule)                                     │
│    - Show success modal immediately (optimistic UI)              │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. markEngineDoseTaken(schedule.id)                             │
│    -> MedicationEngineService.markTaken(scheduleId)              │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. MedicationSchedulingEngine.markTaken(scheduleId)              │
│    - Load schedule from store                                     │
│    - Update status: "SCHEDULED" -> "TAKEN"                       │
│    - Set takenAt: new Date().toISOString()                       │
│    - Save updated schedule                                        │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. Update Consumed Quantity                                      │
│    - Load medication record from store                            │
│    - Increment consumedQuantity by doseQuantity                  │
│    - Recalculate remainingQuantity                               │
│    - Update status if completed                                   │
│    - Save updated medication                                      │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. Cancel Associated Alarm                                       │
│    - Load alarm for this schedule                                 │
│    - Update alarm status: "SCHEDULED" -> "CANCELLED"             │
│    - Save updated alarm                                           │
│    - (OS notification cancellation currently disabled)           │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. Log Event                                                     │
│    store.appendEvent({                                           │
│      type: 'DOSE_TAKEN',                                         │
│      scheduleId: schedule.id,                                    │
│      timestamp: new Date().toISOString(),                        │
│      doseQuantity: schedule.doseQuantity                         │
│    })                                                             │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 8. Refresh Engine Data                                           │
│    refreshEngineData(selectedDate)                               │
│    - Reloads schedules from store                                │
│    - Updates UI to show "TAKEN" status                           │
│    - Shows completion metadata with timestamp                    │
└──────────────────────────────────────────────────────────────────┘
```

### 9.4 Alarm Notification Flow (Planned - Currently Disabled)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Schedule Created                                              │
│    - engine.generateSchedules() creates schedule entry           │
│    - Scheduled time: "2026-08-19T08:00:00+05:30"                │
└──────────────┬──────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. Alarm Created                                                 │
│    store.saveAlarm({                                             │
│      alarmId: "alarm:schedule-id:timestamp",                    │
│      scheduleId: "schedule-id",                                  │
│      scheduledAt: "2026-08-19T08:00:00+05:30",                  │
│      status: "SCHEDULED"                                         │
│    })                                                             │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. OS Notification Scheduled (Planned)                           │
│    LocalAlarmManager.scheduleAlarmForDose(doseData)             │
│    - Creates rich notification with action buttons              │
│    - Stores notificationId in alarm record                       │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. Notification Fires at Scheduled Time                          │
│    - OS delivers notification to device                          │
│    - User sees notification with action buttons                  │
└──────────────┬───────────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5A. User Taps "Take" Button                                     │
│     - handleNotificationAction({ action: 'take' })               │
│     - Marks dose as taken                                         │
│     - Shows success notification                                  │
│     - Dismisses alarm notification                               │
└──────────────────────────────────────────────────────────────────┘
               │
┌──────────────┴───────────────────────────────────────────────────┐
│ 5B. User Taps "Snooze" Button                                   │
│     - handleNotificationAction({ action: 'snooze', minutes: 15 })│
│     - Creates new alarm 15 minutes later                         │
│     - Updates schedule status to "SNOOZED"                       │
│     - Dismisses current notification                             │
└──────────────────────────────────────────────────────────────────┘
               │
┌──────────────┴───────────────────────────────────────────────────┐
│ 5C. User Taps "Skip" Button                                     │
│     - handleNotificationAction({ action: 'skip' })               │
│     - Marks dose as skipped                                      │
│     - Shows warning notification                                 │
│     - Dismisses alarm notification                               │
└──────────────────────────────────────────────────────────────────┘
               │
┌──────────────┴───────────────────────────────────────────────────┐
│ 5D. User Taps Notification Body                                 │
│     - Opens app to MedicationAlarmScreen                         │
│     - Passes medication data via navigation params               │
│     - Shows full alarm UI with all action options                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Summary

### Where Data Gets Filled:

1. **API Layer**: `PrescriptionRepeatApi.getAllForPatient()` fetches raw prescription data from SmartCare HIS server
2. **Mapping Layer**: `mapApiPrescription()` converts API format to domain model
3. **Engine Layer**: `MedicationSchedulingEngine` processes prescriptions:
   - Parses frequency strings
   - Calculates quantities & durations
   - Generates daily schedules
   - Creates alarms
4. **Storage Layer**: `AsyncStorageMedicationStore` persists everything to AsyncStorage
5. **Context Layer**: `AppContext` provides global state to all screens

### Where Data Feeds & Shows:

1. **PrescriptionsScreen**: Shows prescription list with relevance badges
2. **PrescriptionDetailScreen**: Shows full prescription details with medicine breakdown
3. **MedicineScheduleScreen**: Shows daily timeline with grouped slots and dose actions
4. **TodaysMedicineScreen**: Shows today's quick view (legacy, overlaps with MedicineScheduleScreen)
5. **MedicationAlarmScreen**: Shows individual alarm notification (from OS notification)

### Alarm Flow Summary:

1. Schedule created → Alarm created → OS notification scheduled
2. Notification fires → User takes action (Take/Snooze/Skip)
3. Action recorded → Schedule status updated → Alarm cancelled
4. UI refreshes → Shows updated status

### Current Status:

- ✅ API integration working
- ✅ Data mapping & normalization working
- ✅ Schedule generation working
- ✅ AsyncStorage persistence working
- ⚠️ OS notifications disabled (library not installed - pending reimplementation)
- ✅ In-app alarm management working
- ✅ Take/Skip/Snooze actions working
- ✅ Relevance computation working
- ✅ Multi-slot scheduling working

---

## Appendix: Key File Locations

```
src/
├── API/
│   └── Api.js                              # All API endpoints
├── services/
│   ├── MedicationSchedulingEngine.js       # Core business logic
│   ├── MedicationEngineService.js          # Orchestration service
│   ├── AsyncStorageMedicationStore.js      # Storage layer
│   ├── LocalAlarmManager.js                # OS alarm manager (disabled)
│   └── NotificationManager.js              # Notification coordinator
├── screens/Medicine/
│   ├── PrescriptionsScreen.jsx             # Prescription list
│   ├── PrescriptionDetailScreen.jsx        # Prescription details
│   ├── MedicineScheduleScreen.jsx          # Daily timeline
│   ├── TodaysMedicineScreen.jsx            # Today's quick view (legacy)
│   └── MedicationAlarmScreen.jsx           # Alarm notification screen
└── context/
    └── AppContext.jsx                      # Global state management
```
