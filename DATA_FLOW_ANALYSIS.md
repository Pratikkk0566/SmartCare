# Complete Data Flow Analysis

## ROOT CAUSE IDENTIFIED ✅

**The app is STILL using AsyncStorage (via `StorageService`) instead of SQLite (`SQLiteDataService`)**

### Current (BROKEN) Flow:
```
Login → PatientApi → AsyncStorage → AppContext loads from AsyncStorage
  ↓
Data exists in AsyncStorage
  ↓
BUT repositories try to save with foreign keys to SQLite patients table
  ↓
Patient doesn't exist in SQLite → FOREIGN KEY constraint failed
```

### Expected (CORRECT) Flow:
```
Login → PatientApi → SQLiteDataService.saveProfile() → PatientRepository → SQLite patients table
  ↓
Patient EXISTS in SQLite
  ↓
Investigations/Invoices/Prescriptions can reference patient_id
  ↓
No FOREIGN KEY errors
```

---

## CURRENT LOGIN → DATA STORAGE FLOW

### Step 1: Login (OTPVerificationScreen.jsx line 145-176)
```javascript
// Line 145: After OTP verification
await saveSession(result.data, phone);

// Line 148-176: Fetch patient from API
const patientResult = await PatientApi.getByMobile(cleanPhone);

if (patientResult.success) {
  const patient = Array.isArray(raw) ? raw[0] : (raw?.patient || raw);
  
  // Line 162-169: Save to AsyncStorage ONLY
  await AsyncStorage.setItem('patientId',  pid);
  await AsyncStorage.setItem('@patientId', pid);
  await AsyncStorage.setItem('patientName', `${patient.firstname || ''} ${patient.surname || ''}`.trim());
  await AsyncStorage.setItem('uhid', patient.uhid || '');
  await AsyncStorage.setItem('SELCETEDPATIENTDETAILS', JSON.stringify(patient));
  await AsyncStorage.setItem('IsRegister', 'true');
}
```

**ISSUE #1**: Patient data saved to AsyncStorage but **NOT to SQLite**

### Step 2: App Context Refresh (AppContext.jsx line 134-196)
```javascript
// Line 134-138: Get patient info from AsyncStorage
const refreshAllData = async () => {
  const token      = await AsyncStorage.getItem('AUTHTOKEN');
  const mobileNo   = await AsyncStorage.getItem('mobileNumber');
  const patientId  = await AsyncStorage.getItem('patientId');

  // Line 143-148: Fetch patient from API
  const byMobileResult = await PatientApi.getByMobile(mobileNo10);
  
  // Line 149-196: Transform and save
  const mergedProfile = { ...EMPTY_PROFILE, ...localProfile, ...apiProfile, ... };
  setUserProfile(mergedProfile);
  await StorageService.saveProfile(mergedProfile);  // ← GOES TO ASYNCSTORAGE
  setProfileLastUpdated(Date.now());
}
```

**ISSUE #2**: `StorageService.saveProfile()` writes to **AsyncStorage**, NOT SQLite

Let's check StorageService.js:

```javascript
// src/services/StorageService.js line 19-22
saveProfile: async profile => {
  await StorageService.set('@userProfile', profile);  // ← AsyncStorage
  await StorageService.set('@profileLastUpdated', Date.now());
},
```

**CONFIRMED**: StorageService uses AsyncStorage.setItem()

### Step 3: Investigations Storage (AppContext.jsx line 402-426)
```javascript
const investigationResult = await InvestigationApi.getAll(patientId);
if (investigationResult.success) {
  const normalizedInvestigations = investigationList.map(inv => ({ ... }));
  setInvestigations(normalizedInvestigations);
  await StorageService.saveInvestigations(normalizedInvestigations);  // ← ASYNCSTORAGE AGAIN
  setInvestigationsLastUpdated(Date.now());
}
```

**ISSUE #3**: Investigations also saved to AsyncStorage

---

## THE PROBLEM

**AppContext.jsx uses `StorageService` everywhere, NOT `sqliteDataService`**

AppContext imports:
```javascript
import {StorageService} from '../services/StorageService';  // ← OLD AsyncStorage service
import {sqliteDataService} from '../services/SQLiteDataService';  // ← IMPORTED BUT BARELY USED
```

AppContext ONLY uses sqliteDataService for:
- Line 430+: Prescription engine sync (medicine dosages)

AppContext uses StorageService for:
- Profile
- Appointments
- Practitioners
- Invoices
- Investigations

**This is why:**
1. ✅ Invoices appear to work (they're in AsyncStorage, UI reads from AsyncStorage)
2. ❌ Investigations fail (code tries to save to SQLite but patient doesn't exist in SQLite)
3. ❌ Prescriptions broken (medicine engine writes to SQLite but parent prescription doesn't exist)

---

## WHAT NEEDS TO BE FIXED

### Fix 1: OTPVerificationScreen.jsx
**After login, save patient to SQLite PatientRepository**

```javascript
// After line 176 (after AsyncStorage saves)
// Add SQLite save:
await sqliteDataService.saveProfile({
  patient_id: pid,
  patientId: pid,
  firstName: patient.firstname || patient.firstName || '',
  lastName: patient.surname || patient.lastName || '',
  middleName: patient.middlename || patient.middleName || '',
  email: patient.email || '',
  phone: cleanPhone,
  gender: patient.gender || '',
  dob: patient.newdob || patient.dob || '',
  address: patient.address || '',
  city: patient.town || patient.city || '',
  state: patient.county || patient.state || '',
  uhid: patient.uhid || '',
  bloodGroup: patient.bloodgroup || patient.bloodGroup || ''
});
```

### Fix 2: AppContext.jsx refreshAllData()
**Replace ALL StorageService calls with sqliteDataService calls**

```javascript
// OLD (line 195):
await StorageService.saveProfile(mergedProfile);

// NEW:
await sqliteDataService.saveProfile(mergedProfile);

// OLD (line 319):
await StorageService.saveAppointments([...normUpcoming, ...normHistory]);

// NEW:
// Keep in AsyncStorage (appointments not in SQLite schema yet)

// OLD (line 382):
await StorageService.saveInvoices(normalizedInvoices);

// NEW:
// Keep in AsyncStorage (invoices working, don't break them)

// OLD (line 423):
await StorageService.saveInvestigations(normalizedInvestigations);

// NEW:
await sqliteDataService.saveInvestigations(normalizedInvestigations, patientId);
```

### Fix 3: AppContext.jsx loadData()
**Read from SQLite, not AsyncStorage**

```javascript
// OLD (line 510):
const cachedProfile = await StorageService.getProfile();

// NEW:
const cachedProfile = await sqliteDataService.getProfile(patientId);

// OLD (line 547):
const cachedInvestigations = await StorageService.getInvestigations();

// NEW:
const cachedInvestigations = await sqliteDataService.getInvestigations(patientId);
```

---

## WHY THIS FAILED BEFORE

My previous fix tried to auto-create "Unknown Patient" when saving investigations.

**That was wrong** because:
1. The patient DOES exist in AsyncStorage
2. The patient just wasn't being saved to SQLite
3. So we need to fix the LOGIN flow, not patch the investigation save

---

## CORRECT FIX STRATEGY

1. ✅ Remove the "create minimal patient" code from SQLiteDataService
2. ✅ Add SQLite patient save to OTPVerificationScreen (login)
3. ✅ Replace StorageService with sqliteDataService in AppContext
4. ✅ Ensure patient is saved to SQLite BEFORE any child data
5. ✅ Keep invoices/appointments in AsyncStorage (working, don't break)

---

## NEXT STEPS

1. Remove dummy patient creation from SQLiteDataService.saveInvestigations()
2. Add sqliteDataService.saveProfile() to OTPVerificationScreen after login
3. Update AppContext to use sqliteDataService for profile & investigations
4. Test login → patient saved → investigations saved
5. Verify no FOREIGN KEY errors

