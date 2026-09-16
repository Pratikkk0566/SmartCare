# 💊 Offline-First Medication Alarm System Documentation

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Core Components](#core-components)
4. [Prescription Management](#prescription-management)
5. [Medicine Management](#medicine-management)
6. [Dosage Scheduling](#dosage-scheduling)
7. [Local Alarm Engine](#local-alarm-engine)
8. [Adherence Tracking](#adherence-tracking)
9. [Prescription Synchronization](#prescription-synchronization)
10. [User Interface](#user-interface)
11. [Data Flow](#data-flow)
12. [Configuration & Setup](#configuration--setup)

---

## �️ System Architecture

The Medication System is an **offline-first local medication management and alarm system** with one-way prescription ingestion from the server. Once prescription data is downloaded and stored locally, the alarm system operates completely independently of internet connectivity.

```
                    PHR APP
                       │
          ┌────────────┴────────────┐
          │                         │
     ONLINE LAYER              OFFLINE LAYER
          │                         │
       REST API                  SQLite
          │                         │
          └────────────┬────────────┘
                       │
                Prescription Data
                       │
              Scheduling Engine
                       │
             Local Alarm Manager
                       │
              📱 OS Notifications
                       │
          ┌────────────┴────────────┐
          │                         │
      Take Medicine             Snooze
      Skip Medicine             Dismiss
      View Schedule             History
```

### Key Features
- ✅ **Offline-First Architecture** - Complete functionality without internet after initial prescription download
- ✅ **Local Alarm Engine** - Native OS notifications that work even when app is closed
- ✅ **Prescription Ingestion** - One-way sync from server to local SQLite
- ✅ **Smart Scheduling** - Automatic dose generation with flexible timing
- ✅ **Local Adherence Tracking** - Complete medication history stored locally
- ✅ **No API Dependencies for Alarms** - All medication actions handled locally
- ✅ **Rolling Alarm Windows** - Efficient notification scheduling (7-30 days ahead)

### Core Principle
> **Internet is required to obtain/synchronize PHR data, but never to execute a previously cached medication schedule or trigger a medication reminder.**

### Data Flow Philosophy
```
SERVER → SQLite → Local Alarm Engine → User Actions → SQLite
```
**No medication actions (taken/skipped/snoozed) are sent back to the server.**

---

## 🗄️ Database Schema

### Core Tables

#### `prescriptions`
```sql
CREATE TABLE prescriptions (
    id TEXT PRIMARY KEY,                -- Prescription ID (rx_xxxxx)
    patient_id TEXT NOT NULL,          -- Foreign key to patients table
    name TEXT NOT NULL,                -- Prescription name/title
    doctor_name TEXT,                  -- Prescribing doctor
    start_date TEXT,                   -- Treatment start date (ISO format)
    end_date TEXT,                     -- Treatment end date (optional)
    status TEXT DEFAULT 'draft',       -- Status: draft, active, completed, cancelled
    notes TEXT,                        -- Additional notes
    created_at TEXT NOT NULL,          -- Creation timestamp
    updated_at TEXT NOT NULL,          -- Last update timestamp
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

#### `prescription_medicines`
```sql
CREATE TABLE prescription_medicines (
    id TEXT PRIMARY KEY,                -- Medicine ID (med_xxxxx)
    prescription_id TEXT NOT NULL,     -- Foreign key to prescriptions
    medicine_name TEXT NOT NULL,       -- Medicine name
    medicine_type TEXT DEFAULT 'tablet', -- Type: tablet, capsule, syrup, injection, etc.
    dose_value REAL DEFAULT 1,         -- Dose amount (e.g., 1, 0.5, 2)
    dose_unit TEXT DEFAULT 'tablet',   -- Dose unit (tablet, ml, mg, etc.)
    frequency TEXT DEFAULT 'once_daily', -- Frequency pattern
    food_instruction TEXT,             -- Before/after food instructions
    start_date TEXT,                   -- Medicine start date
    end_date TEXT,                     -- Medicine end date (optional)
    duration_days INTEGER DEFAULT 0,   -- Treatment duration in days
    total_quantity REAL DEFAULT 0,     -- Total quantity prescribed
    instructions TEXT,                 -- Special instructions
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
```

#### `medicine_times`
```sql
CREATE TABLE medicine_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,         -- Foreign key to prescription_medicines
    time TEXT NOT NULL,                -- Time in HH:MM format
    sort_order INTEGER DEFAULT 0,     -- Order of times within the day
    created_at TEXT NOT NULL,
    FOREIGN KEY (medicine_id) REFERENCES prescription_medicines(id) ON DELETE CASCADE
);
```

#### `scheduled_doses`
```sql
CREATE TABLE scheduled_doses (
    id TEXT PRIMARY KEY,               -- Dose ID (dose_xxxxx)
    medicine_id TEXT NOT NULL,         -- Foreign key to prescription_medicines
    scheduled_date TEXT NOT NULL,      -- Date for this dose (YYYY-MM-DD)
    scheduled_time TEXT NOT NULL,      -- Time for this dose (HH:MM)
    dose_value REAL DEFAULT 1,         -- Actual dose amount
    dose_unit TEXT DEFAULT 'tablet',   -- Dose unit
    status TEXT DEFAULT 'upcoming',    -- Status: upcoming, taken, missed, skipped
    taken_time TEXT,                   -- Actual time when taken
    notes TEXT,                        -- Notes about this dose
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (medicine_id) REFERENCES prescription_medicines(id) ON DELETE CASCADE
);
```

#### `medication_alarms` ⭐ **New Table**
```sql
CREATE TABLE medication_alarms (
    id TEXT PRIMARY KEY,               -- Alarm ID (alarm_xxxxx)
    dose_id TEXT NOT NULL,             -- Foreign key to scheduled_doses
    medicine_id TEXT NOT NULL,         -- Foreign key to prescription_medicines  
    patient_id TEXT NOT NULL,          -- Foreign key to patients table
    alarm_time TEXT NOT NULL,          -- Exact alarm time (YYYY-MM-DD HH:MM)
    notification_id TEXT,              -- OS notification ID for cancellation
    status TEXT DEFAULT 'scheduled',   -- Status: scheduled, fired, cancelled, snoozed
    snooze_count INTEGER DEFAULT 0,    -- Number of times snoozed
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (dose_id) REFERENCES scheduled_doses(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES prescription_medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);
```
```sql
CREATE TABLE medication_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dose_id TEXT NOT NULL,             -- Foreign key to scheduled_doses
    medicine_id TEXT NOT NULL,         -- Foreign key to prescription_medicines
    action TEXT NOT NULL,              -- Action: taken, missed, skipped, snoozed
    timestamp TEXT NOT NULL,           -- When the action occurred
    notes TEXT,                        -- Additional notes
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (dose_id) REFERENCES scheduled_doses(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES prescription_medicines(id) ON DELETE CASCADE
);
```

---

## 🏗️ Core Components

### 1. Repository Layer
Located in `src/database/repositories/`

#### PrescriptionRepository.js
- **Purpose**: Manages prescription CRUD operations
- **Key Methods**:
  - `createPrescription(prescriptionData)` - Create new prescription
  - `getPrescriptionWithDetails(id)` - Get prescription with medicines
  - `getAllPrescriptionsWithCounts()` - Get all with medicine counts
  - `getActivePrescriptions()` - Get currently active prescriptions
  - `searchPrescriptions(searchTerm)` - Search by name or doctor
  - `getPrescriptionStats()` - Get statistical data

#### MedicineRepository.js
- **Purpose**: Manages medicine records and scheduling
- **Key Methods**:
  - `createMedicine(medicineData)` - Create medicine with times
  - `getMedicinesForPrescription(prescriptionId)` - Get all medicines
  - `saveMedicineTimes(medicineId, times)` - Update medicine times
  - `getMedicineStats(medicineId)` - Get adherence statistics
  - `calculateDailyQuantity(medicine)` - Calculate daily consumption

#### ScheduledDoseRepository.js
- **Purpose**: Manages scheduled doses and tracking
- **Key Methods**:
  - `generateSchedulesForMedicine(medicineId, startDate, endDate, times)` - Generate doses
  - `getTodaysDoses(date)` - Get doses for specific date
  - `getUpcomingDoses(hoursAhead)` - Get upcoming doses
  - `markDoseAsTaken(doseId, takenTime, notes)` - Mark dose as taken
  - `markDoseAsSkipped(doseId, notes)` - Mark dose as skipped
  - `autoMarkOverdueDosesAsMissed(gracePeriodMinutes)` - Auto-mark missed doses

### 2. Service Layer
Located in `src/services/`

#### SQLiteDataService.js
- **Purpose**: Unified data access service
- **Key Methods**:
  - `getPrescriptions(patientId)` - Get patient prescriptions
  - `saveProfile(profileData)` - Save patient profile
  - `getTodaysSchedule(patientId)` - Get today's medication schedule
  - `getDashboardStats(patientId)` - Get dashboard statistics

#### MedicationSchedulingEngine.js
- **Purpose**: Advanced scheduling and business logic
- **Features**:
  - Frequency parsing (once_daily, twice_daily, etc.)
  - Smart scheduling algorithms
  - Dosage calculations
  - Status management
  - Notification scheduling

---

## 📝 Prescription Management

### Creating Prescriptions

```javascript
// Example: Create a new prescription
const prescriptionData = {
  name: "Blood Pressure Management",
  doctorName: "Dr. Smith",
  startDate: "2024-01-15",
  endDate: "2024-02-15",
  status: "active",
  notes: "Monitor blood pressure daily"
};

const prescription = await prescriptionRepo.createPrescription(prescriptionData);
```

### Prescription Statuses
- **`draft`** - Being created, not yet active
- **`active`** - Currently active prescription
- **`completed`** - Treatment completed successfully
- **`cancelled`** - Cancelled before completion

### Prescription Operations
1. **Create**: New prescription with patient assignment
2. **Update**: Modify prescription details (except medicines)
3. **Activate**: Change status from draft to active
4. **Complete**: Mark as completed when treatment ends
5. **Search**: Find prescriptions by name or doctor
6. **Delete**: Remove prescription and all related data

---

## 💊 Medicine Management

### Adding Medicines to Prescription

```javascript
// Example: Add medicine with custom times
const medicineData = {
  prescriptionId: "rx_12345",
  medicineName: "Lisinopril",
  medicineType: "tablet",
  doseValue: 10,
  doseUnit: "mg",
  frequency: "once_daily",
  foodInstruction: "Take with food",
  startDate: "2024-01-15",
  durationDays: 30,
  totalQuantity: 30,
  times: ["08:00"]  // Custom time
};

const medicine = await medicineRepo.createMedicine(medicineData);
```

### Medicine Types
- **tablet** - Solid dosage forms
- **capsule** - Encapsulated medications
- **syrup** - Liquid medications
- **injection** - Injectable medications
- **drops** - Eye/ear drops
- **cream** - Topical applications

### Frequency Patterns
- **once_daily** - Once per day
- **twice_daily** - Twice per day (morning, evening)
- **three_times_daily** - Three times per day
- **four_times_daily** - Four times per day
- **every_6_hours** - Every 6 hours
- **every_8_hours** - Every 8 hours
- **every_12_hours** - Every 12 hours
- **as_needed** - As needed basis

### Default Times by Frequency
```javascript
const defaultTimes = {
  'once_daily': ['08:00'],
  'twice_daily': ['08:00', '20:00'],
  'three_times_daily': ['08:00', '14:00', '20:00'],
  'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
  'every_6_hours': ['06:00', '12:00', '18:00', '24:00'],
  'every_8_hours': ['08:00', '16:00', '24:00'],
  'every_12_hours': ['08:00', '20:00'],
  'as_needed': ['08:00']
};
```

---

## ⏰ Dosage Scheduling

### Schedule Generation

The system automatically generates individual dose records for each medicine:

```javascript
// Generate schedules for a medicine
await scheduledDoseRepo.generateSchedulesForMedicine(
  medicineId,
  startDate,    // "2024-01-15"
  endDate,      // "2024-02-15"
  times         // ["08:00", "20:00"]
);
```

### Dose Statuses
- **`upcoming`** - Scheduled but not yet due
- **`taken`** - Successfully taken by patient
- **`missed`** - Not taken within grace period
- **`skipped`** - Intentionally skipped by patient

### Status Transitions
1. **upcoming → taken**: Patient confirms taking medicine
2. **upcoming → skipped**: Patient intentionally skips dose
3. **upcoming → missed**: System auto-marks after grace period
4. **upcoming → snoozed**: Reschedule for later time

### Grace Period Logic
- Doses become "overdue" after scheduled time
- Auto-marked as "missed" after grace period (default 30 minutes)
- Grace period configurable per installation

---

## 🔔 Local Alarm Engine

### Architecture Philosophy
The alarm system is completely **local and offline-first**. Once prescriptions are downloaded, no internet connection is required for:
- Scheduling alarms
- Firing notifications
- Taking/skipping/snoozing medicines
- Recording adherence data

### Native OS Integration
```javascript
// Use react-native-push-notification for local notifications
import PushNotification from 'react-native-push-notification';

// Schedule alarm directly with OS
PushNotification.localNotificationSchedule({
  id: alarmId,
  title: "Take your Lisinopril",
  message: "10mg tablet - Take with food", 
  date: new Date(2024, 1, 15, 8, 0, 0), // Jan 15, 2024 at 8:00 AM
  userInfo: {
    doseId: "dose_12345",
    medicineId: "med_67890", 
    alarmId: "alarm_98765"
  },
  repeatType: null // No repeat, each dose is individually scheduled
});
```

### Rolling Alarm Window
Instead of scheduling hundreds of future alarms, use a **rolling window**:

```javascript
// Schedule next 14 days of alarms
async scheduleUpcomingAlarms(patientId, days = 14) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Get doses in date range
  const doses = await scheduledDoseRepo.getDosesInDateRange(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'upcoming'
  );
  
  // Schedule OS notification for each dose
  for (const dose of doses) {
    await this.scheduleAlarmForDose(dose);
  }
}
```

### Alarm States
- **`scheduled`** - Alarm set with OS, waiting to fire
- **`fired`** - Notification has appeared to user
- **`snoozed`** - User snoozed, new alarm scheduled
- **`cancelled`** - Alarm cancelled (dose taken/skipped)

### Snooze Logic (Completely Offline)
```javascript
async snoozeAlarm(alarmId, snoozeMinutes = 15) {
  const alarm = await alarmRepo.findById(alarmId);
  
  // Cancel current OS notification
  PushNotification.cancelLocalNotifications({ id: alarm.notification_id });
  
  // Calculate new alarm time
  const newAlarmTime = new Date(alarm.alarm_time);
  newAlarmTime.setMinutes(newAlarmTime.getMinutes() + snoozeMinutes);
  
  // Check snooze limits
  if (alarm.snooze_count >= MAX_SNOOZE_COUNT) {
    // Mark as missed instead of allowing more snoozes
    await this.markDoseAsMissed(alarm.dose_id);
    return;
  }
  
  // Schedule new OS notification
  const newNotificationId = await this.scheduleAlarmForTime(newAlarmTime, alarm);
  
  // Update alarm record
  await alarmRepo.update(alarmId, {
    alarm_time: newAlarmTime.toISOString(),
    notification_id: newNotificationId,
    snooze_count: alarm.snooze_count + 1,
    status: 'snoozed'
  });
  
  // Log in medication history
  await scheduledDoseRepo.addToHistory(
    alarm.dose_id, 
    'snoozed', 
    `Snoozed ${snoozeMinutes}min to ${newAlarmTime.toLocaleTimeString()}`
  );
}
```

### Background Processing
Since JavaScript timers don't work reliably in background, use **OS-level notifications** exclusively:

```javascript
// ❌ DON'T do this for alarms:
setInterval(async () => {
  await checkOverdueDoses();
}, 15 * 60 * 1000);

// ✅ DO this instead:
PushNotification.localNotificationSchedule({
  // Each dose gets individual OS notification
});
```

### Missed Dose Detection
Use app foreground events to check for missed doses:

```javascript
// When app comes to foreground
AppState.addEventListener('change', async (nextAppState) => {
  if (nextAppState === 'active') {
    await this.checkAndMarkMissedDoses();
  }
});

async checkAndMarkMissedDoses() {
  const now = new Date();
  const gracePeriodMinutes = 30;
  
  // Find overdue doses
  const overdueDoses = await scheduledDoseRepo.query(`
    SELECT * FROM scheduled_doses 
    WHERE status = 'upcoming' 
    AND datetime(scheduled_date || ' ' || scheduled_time) < datetime('now', '-${gracePeriodMinutes} minutes')
  `);
  
  // Mark as missed locally - no API call
  for (const dose of overdueDoses) {
    await scheduledDoseRepo.markDoseAsMissed(dose.id);
  }
}
```

---

## 📊 Adherence Tracking

### Adherence Calculation
```javascript
// Calculate adherence rate
const adherenceRate = (takenDoses / (takenDoses + missedDoses + skippedDoses)) * 100;
```

### Adherence Metrics
- **Total Doses**: All scheduled doses
- **Taken Doses**: Successfully completed doses
- **Missed Doses**: Automatically marked as missed
- **Skipped Doses**: Intentionally skipped
- **Adherence Rate**: Percentage of compliance
- **Streak Tracking**: Consecutive days of perfect adherence

### Statistics Generation
```javascript
// Get comprehensive adherence stats
const stats = await scheduledDoseRepo.getAdherenceStats(
  startDate,  // Optional date range
  endDate     // Optional date range
);

// Returns:
// {
//   totalDoses: 60,
//   taken: 55,
//   missed: 3,
//   skipped: 2,
//   upcoming: 0,
//   adherenceRate: 91.67
// }
```

### Medication History
Every dose action is logged in `medication_history` table:
- **taken**: When patient confirms taking
- **missed**: When automatically marked as missed
- **skipped**: When intentionally skipped
- **snoozed**: When rescheduled

---

## 🔌 Prescription Synchronization (One-Way)

### Data Flow: Server → SQLite Only
```javascript
// ONLINE: Download prescription data
SERVER
  ↓
Prescription API
  ↓
SQLite (prescriptions, medicines, schedules)
  ↓
Local Alarm Generation

// OFFLINE: Execute locally stored schedules  
SQLite
  ↓
OS Notifications
  ↓
User Actions (take/skip/snooze)
  ↓
SQLite (NO API calls)
```

### Prescription Sync Process
```javascript
async syncPrescriptionsFromServer(patientId) {
  try {
    // Fetch from server
    const prescriptions = await PrescriptionApi.getPrescriptions(patientId);
    
    // Store locally
    for (const prescriptionData of prescriptions) {
      // Save prescription
      const prescription = await prescriptionRepo.upsert(prescriptionData);
      
      // Save medicines
      for (const medicineData of prescriptionData.medicines) {
        const medicine = await medicineRepo.createMedicine({
          ...medicineData,
          prescriptionId: prescription.id
        });
        
        // Generate local dose schedule
        await this.generateDoseSchedule(medicine);
      }
    }
    
    // Schedule upcoming alarms (next 14 days)
    await this.scheduleUpcomingAlarms(patientId);
    
  } catch (error) {
    console.log('Sync failed, using cached prescriptions');
    // App continues working with cached data
  }
}
```

### What Comes From Server
✅ **Downloaded from API:**
- Prescription details
- Medicine information  
- Dosage instructions
- Frequency patterns
- Treatment duration

❌ **NOT sent to server:**
- Dose taken/skipped status
- Snooze actions
- Medication history
- Adherence statistics
- Local alarm data

### Offline Capability Matrix
| Feature | Offline Support |
|---------|----------------|
| View cached prescriptions | ✅ |
| View medicines | ✅ |
| View dosage schedules | ✅ |
| Medication alarms | ✅ |
| Take medicine | ✅ |
| Skip medicine | ✅ |
| Snooze alarm | ✅ |
| Medication history | ✅ |
| Adherence calculation | ✅ |
| Download new prescriptions | ❌ |
| Real-time server sync | ❌ |

---

## 🖥️ User Interface

### Screen Components

#### PrescriptionsScreen.jsx
- **Purpose**: List all patient prescriptions
- **Features**: Search, filter, status indicators
- **Navigation**: → PrescriptionDetailScreen

#### PrescriptionDetailScreen.jsx
- **Purpose**: Show prescription details and medicines
- **Features**: Medicine list, schedule overview, actions
- **Navigation**: → AddMedicinesScreen, → MedicineScheduleScreen

#### MedicineScheduleScreen.jsx
- **Purpose**: Daily medication schedule
- **Features**: Today's doses, upcoming alerts, history
- **Actions**: Take, Skip, Snooze doses

#### CreatePrescriptionScreen.jsx
- **Purpose**: Create new prescriptions
- **Features**: Form validation, doctor selection
- **Navigation**: → AddMedicinesScreen

#### AddMedicinesScreen.jsx
- **Purpose**: Add medicines to prescription
- **Features**: Medicine search, dosage configuration, timing setup

#### MedicationAlarmsScreen.jsx
- **Purpose**: Configure notification settings
- **Features**: Alarm preferences, snooze settings

### UI Components
- **StatusChip**: Visual status indicators
- **TimeSelector**: Custom time picker
- **DoseTracker**: Progress indicators
- **SearchBar**: Filter and search functionality

---

## 🔄 Data Flow

### Prescription Download Flow (Online Required)
```
1. User logs in → Patient selected
2. API call → Fetch prescriptions  
3. Transform data → SQLite format
4. Store in SQLite → prescriptions, medicines, times
5. Generate dose schedules → scheduled_doses
6. Schedule OS alarms → medication_alarms
```

### Daily Medication Flow (Completely Offline)
```
1. OS alarm fires → User sees notification
2. User taps notification → Opens app
3. User selects action → Take/Skip/Snooze
4. Update SQLite → scheduled_doses status
5. Record history → medication_history
6. Update alarm → cancel/reschedule OS notification
```

### Example: Complete Offline Day
```javascript
// Morning: 8:00 AM alarm fires (offline)
OS Notification: "Take Paracetamol 500mg"
   ↓ User taps "Take"
scheduled_doses.status = 'taken'
scheduled_doses.taken_time = '08:03'
medication_history.action = 'taken'
   ↓ Cancel OS notification

// Afternoon: 2:00 PM alarm fires (offline)  
OS Notification: "Take Paracetamol 500mg"
   ↓ User taps "Snooze"  
Schedule new OS notification at 2:15 PM
medication_alarms.snooze_count = 1
medication_history.action = 'snoozed'

// Evening: 8:00 PM alarm fires (offline)
OS Notification: "Take Paracetamol 500mg" 
   ↓ User taps "Skip"
scheduled_doses.status = 'skipped'  
medication_history.action = 'skipped'
   ↓ Cancel OS notification
```

### Multi-Patient Architecture
```
Patient A                     Patient B
    │                            │
    ├── Prescriptions             ├── Prescriptions  
    ├── Medicines                 ├── Medicines
    ├── Scheduled Doses           ├── Scheduled Doses
    ├── Alarms (Patient A only)   ├── Alarms (Patient B only)
    └── History                   └── History
```

**All medication queries are scoped by `patient_id`** to prevent cross-contamination.

---

## ⚙️ Configuration & Setup

### Database Initialization
```javascript
await Database.init();
await Database.createTables();
```

### Notification System Setup
```javascript
import PushNotification from 'react-native-push-notification';

PushNotification.configure({
  // Handle notification when app is in foreground
  onNotification: function(notification) {
    if (notification.userInfo?.doseId) {
      // Open medication screen for this dose
      navigation.navigate('MedicineSchedule', {
        doseId: notification.userInfo.doseId
      });
    }
  },
  
  // Request permissions on iOS
  requestPermissions: Platform.OS === 'ios',
});
```

### Local Alarm Manager Initialization
```javascript
class LocalAlarmManager {
  async init() {
    // Clean up old notifications
    PushNotification.cancelAllLocalNotifications();
    
    // Schedule upcoming alarms for all active patients
    const patients = await patientRepo.getActivePatients();
    for (const patient of patients) {
      await this.scheduleUpcomingAlarms(patient.patient_id);
    }
  }
  
  async scheduleUpcomingAlarms(patientId, days = 14) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    
    const doses = await scheduledDoseRepo.getDosesInDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0], 
      'upcoming'
    );
    
    for (const dose of doses) {
      await this.scheduleAlarmForDose(dose);
    }
  }
  
  async scheduleAlarmForDose(dose) {
    const alarmTime = new Date(`${dose.scheduled_date}T${dose.scheduled_time}`);
    const notificationId = generateId('notification');
    
    PushNotification.localNotificationSchedule({
      id: notificationId,
      title: `Take your ${dose.medicine_name}`,
      message: `${dose.dose_value} ${dose.dose_unit} - ${dose.food_instruction || 'As prescribed'}`,
      date: alarmTime,
      userInfo: {
        doseId: dose.id,
        medicineId: dose.medicine_id,
        alarmId: generateId('alarm')
      }
    });
    
    // Store alarm record  
    await alarmRepo.insert({
      id: generateId('alarm'),
      dose_id: dose.id,
      medicine_id: dose.medicine_id,
      patient_id: dose.patient_id,
      alarm_time: alarmTime.toISOString(),
      notification_id: notificationId,
      status: 'scheduled'
    });
  }
}
```

### App Lifecycle Management
```javascript
import { AppState } from 'react-native';

class MedicationManager {
  constructor() {
    // Check for missed doses when app becomes active
    AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active') {
      await this.checkAndMarkMissedDoses();
      await this.refreshAlarmWindow();
    }
  };
  
  async refreshAlarmWindow() {
    // Cancel old alarms and schedule fresh ones
    // This handles cases where app was closed for days
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    await alarmRepo.deleteWhere(
      'alarm_time < ? AND status = ?', 
      [cutoffDate.toISOString(), 'scheduled']
    );
    
    // Reschedule upcoming alarms
    const patients = await patientRepo.getActivePatients();
    for (const patient of patients) {
      await this.alarmManager.scheduleUpcomingAlarms(patient.patient_id);
    }
  }
}
```

### Critical Rules for Implementation

1. **Never depend on JavaScript timers for alarms**
   ```javascript
   // ❌ DON'T DO THIS
   setInterval(() => checkDoses(), 60000);
   
   // ✅ DO THIS INSTEAD  
   PushNotification.localNotificationSchedule({...});
   ```

2. **All medication actions stay local**
   ```javascript
   // ❌ DON'T DO THIS
   await api.markDoseAsTaken(doseId);
   
   // ✅ DO THIS INSTEAD
   await scheduledDoseRepo.markDoseAsTaken(doseId);
   ```

3. **Patient-scoped queries always**
   ```javascript
   // ✅ ALWAYS include patient filter
   const doses = await scheduledDoseRepo.getTodaysDoses(patientId);
   ```

4. **Rolling alarm windows**
   ```javascript
   // ✅ Schedule manageable number of alarms
   await scheduleUpcomingAlarms(patientId, 14); // 14 days ahead
   ```

---

## 🚀 Advanced Features

### Intelligent Alarm Scheduling
- **Adaptive windows**: Schedule 7-30 days based on treatment duration
- **Conflict resolution**: Handle overlapping medication times  
- **Battery optimization**: Minimize OS notification overhead
- **Smart cleanup**: Auto-remove expired alarms

### Enhanced User Experience  
- **Quick actions**: Take/Skip/Snooze from notification
- **Offline indicators**: Clear visual feedback when offline
- **Adherence streaks**: Gamification of medication compliance
- **Smart reminders**: Context-aware notification content

### Multi-Patient Safety
- **Profile isolation**: Complete data separation per patient
- **Active patient context**: Always know which patient is active
- **Notification scoping**: Only show alarms for active patient
- **Data integrity**: Prevent cross-patient data contamination

---

## 🔧 Implementation Priority

### Phase 1: Local Foundation
1. ✅ SQLite schema with `medication_alarms` table
2. ✅ Local alarm manager with OS notifications  
3. ✅ Basic take/skip/snooze functionality
4. ✅ Offline adherence tracking

### Phase 2: Prescription Integration
5. ✅ One-way prescription sync from server
6. ✅ Automatic dose schedule generation
7. ✅ Rolling alarm window implementation
8. ✅ Patient-scoped data access

### Phase 3: Advanced Features  
9. ✅ Smart snooze limits and escalation
10. ✅ Background missed dose detection
11. ✅ Comprehensive medication history
12. ✅ Multi-patient alarm isolation

---

## 🏛️ Architectural Principles

### 1. Offline-First Design
- **Local storage** is the primary data source for alarms
- **OS notifications** handle all alarm scheduling  
- **No API dependencies** for medication execution
- **Graceful degradation** when server unavailable

### 2. Patient Data Isolation
- **Scoped queries** always include `patient_id`
- **Active patient context** maintained throughout app
- **Notification filtering** by current patient
- **History separation** per patient account

### 3. Native Integration
- **OS notification system** for reliable alarms
- **App state handling** for background detection
- **Platform-specific** notification features
- **Battery optimization** considerations

### 4. Scalable Architecture
- **Rolling windows** prevent notification overflow
- **Efficient cleanup** of expired data
- **Batch operations** for performance
- **Incremental sync** for large datasets

This offline-first medication alarm system provides a robust, reliable foundation for medication adherence tracking that works independently of internet connectivity while maintaining seamless user experience and multi-patient safety.