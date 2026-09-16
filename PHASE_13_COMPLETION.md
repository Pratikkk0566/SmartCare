# Phase 13: Network Handling and Offline Restrictions — INFRASTRUCTURE READY ✅

## Summary

Phase 13 adds explicit network connectivity checks to ensure operations that require internet (appointment booking, PDF downloads) fail gracefully with user-friendly messages when offline.

## Status: INFRASTRUCTURE READY, IMPLEMENTATION DOCUMENTED

Network monitoring already active in AppContext (Phase 1 audit). This phase documents where to add connectivity checks.

---

## What's Already Complete

### ✅ Network State Monitoring (AppContext)
**File:** `src/context/AppContext.jsx`

```javascript
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

// Network monitoring active
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const nowOnline = state.isConnected && state.isInternetReachable !== false;
    setIsOnline(nowOnline);
  });
  return unsubscribe;
}, []);

// Exposed in context
return (
  <AppContext.Provider value={{
    isOnline,  // ✅ Already available
    // ...
  }}>
```

**All screens can access `isOnline` state:**
```javascript
import { useApp } from '../context/AppContext';

function MyScreen() {
  const { isOnline } = useApp();
  
  if (!isOnline) {
    // Show offline message
  }
}
```

---

## Operations Requiring Internet

### ❌ Must Be Online

#### 1. Appointment Booking
**Current state:** No connectivity check  
**Required:** Pre-flight check before API call

**Files:**
- `src/screens/Appointments/BookAppointmentScreen.jsx`
- `src/context/AppContext.jsx` (bookAppointment function)

#### 2. PDF Downloads
**Current state:** No connectivity check (Phase 9 finding)  
**Required:** Pre-flight check before download

**Files:**
- `src/screens/Investigations/InvestigationReportScreen.jsx` (handleDownloadPDF)
- `src/screens/Invoices/InvoiceDetailScreen.jsx` (handleDownloadInvoice)

#### 3. Fresh Data Sync
**Current state:** Silent failure when offline  
**Required:** User notification when sync fails

**Files:**
- `src/context/AppContext.jsx` (refreshProfile, refreshPrescriptions, etc.)

#### 4. New Prescription Fetch
**Current state:** Falls back to SQLite cache (Phase 10)  
**Status:** ✅ Already handled correctly

---

### ✅ Works Offline

#### 1. View PHR Data
- Profile
- Prescriptions
- Investigations
- Invoices
- Appointments (history)

**Source:** SQLite cache

#### 2. Medication Alarms
- View schedule
- Mark dose taken/skipped
- Snooze alarm
- View adherence stats

**Source:** SQLite medication tables

#### 3. PDF Viewing (if already downloaded)
- View cached PDF from filesystem

---

## Implementation Details

### 1. Appointment Booking Restriction

#### Update BookAppointmentScreen.jsx

```javascript
// src/screens/Appointments/BookAppointmentScreen.jsx
import { useApp } from '../../context/AppContext';

export default function BookAppointmentScreen({ navigation }) {
  const { isOnline } = useApp();

  const handleBookAppointment = async () => {
    // ✅ Pre-flight check
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'Appointment booking requires an active internet connection. Please connect to WiFi or mobile data and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setBooking(true);
      
      // Existing booking logic
      const result = await AppointmentApi.book({
        patientId,
        doctorId,
        date,
        time,
      });
      
      if (result.success) {
        Alert.alert('Success', 'Appointment booked successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.message || 'Booking failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to book appointment: ' + error.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <View>
      {/* ... form fields ... */}
      
      <TouchableOpacity
        style={[
          styles.bookButton,
          (!isOnline || booking) && styles.bookButtonDisabled  // ✅ Disable when offline
        ]}
        onPress={handleBookAppointment}
        disabled={!isOnline || booking}  // ✅ Disable when offline
      >
        <Text style={styles.bookButtonText}>
          {!isOnline ? 'Booking Unavailable (Offline)' : 'Book Appointment'}
        </Text>
      </TouchableOpacity>
      
      {/* ✅ Optional: Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineWarningText}>
            ⚠️ You're offline. Appointment booking requires internet connection.
          </Text>
        </View>
      )}
    </View>
  );
}
```

#### Update AppContext bookAppointment

```javascript
// src/context/AppContext.jsx
const bookAppointment = async (appointmentData) => {
  // ✅ Pre-flight check
  if (!isOnline) {
    return {
      success: false,
      error: 'Internet connection required for booking appointments'
    };
  }

  try {
    const result = await AppointmentApi.book(appointmentData);
    
    if (result.success) {
      // Refresh appointments
      await refreshAppointments();
    }
    
    return result;
  } catch (error) {
    console.error('[AppContext] bookAppointment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

---

### 2. PDF Download Restriction

#### Update InvestigationReportScreen.jsx

```javascript
// src/screens/Investigations/InvestigationReportScreen.jsx
import { useApp } from '../../context/AppContext';

function InvestigationReportScreen({ navigation, route }) {
  const { user, isOnline } = useApp();  // ✅ Add isOnline
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    // ✅ Pre-flight check
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'PDF downloads require an active internet connection. Please connect to WiFi or mobile data and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setDownloading(true);

      // Check storage permission
      if (Platform.OS === 'android') {
        const granted = await requestStoragePermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Storage permission is needed to download PDF files.',
            [{ text: 'OK' }]
          );
          setDownloading(false);
          return;
        }
      }

      // Existing PDF download logic...
      const pdfResponse = await InvestigationApi.generateInvReportPDF(clientId, pdfPayload);
      
      if (pdfResponse.success && pdfResponse.data) {
        // Save PDF to filesystem
        // ...
        
        Alert.alert('Download Complete', `PDF saved successfully`);
      } else {
        Alert.alert('Error', 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF Download Error:', error);
      
      // ✅ Better error differentiation
      if (!isOnline) {
        Alert.alert('Offline', 'Internet connection lost during download');
      } else {
        Alert.alert('Error', 'Failed to download PDF. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View>
      {/* ... investigation details ... */}
      
      <TouchableOpacity
        style={[
          styles.downloadButton,
          (!isOnline || downloading) && styles.downloadButtonDisabled  // ✅ Disable when offline
        ]}
        onPress={handleDownloadPDF}
        disabled={!isOnline || downloading}  // ✅ Disable when offline
        activeOpacity={0.8}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <DownloadIcon size={20} color={isOnline ? "#fff" : "#999"} />
            <Text style={styles.downloadButtonText}>
              {!isOnline ? 'Download Unavailable (Offline)' : 'Download PDF Report'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* ✅ Optional: Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineWarningText}>
            ⚠️ PDF downloads require internet connection
          </Text>
        </View>
      )}
    </View>
  );
}
```

#### Update InvoiceDetailScreen.jsx

```javascript
// src/screens/Invoices/InvoiceDetailScreen.jsx
import { useApp } from '../../context/AppContext';

function InvoiceDetailScreen({ route, navigation }) {
  const { isOnline } = useApp();  // ✅ Add isOnline

  const handleDownloadInvoice = async () => {
    // ✅ Pre-flight check
    if (!isOnline) {
      Alert.alert(
        'Internet Required',
        'Invoice PDF generation requires an active internet connection. Please connect to WiFi or mobile data and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setDownloading(true);
      
      // Check storage permission
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save the invoice.');
        setDownloading(false);
        return;
      }

      // Existing invoice PDF generation logic...
      // 1. Generate HTML
      // 2. Save to server
      // 3. Download PDF
      
      Alert.alert('Download Complete', 'Invoice PDF successfully downloaded!');
    } catch (error) {
      console.error('Invoice download error:', error);
      
      // ✅ Better error differentiation
      if (!isOnline) {
        Alert.alert('Offline', 'Internet connection lost during generation');
      } else {
        Alert.alert('Error', error.message || 'Failed to download invoice');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View>
      {/* ... invoice details ... */}
      
      <TouchableOpacity
        style={[
          styles.downloadButton,
          (!isOnline || downloading) && styles.downloadButtonDisabled
        ]}
        onPress={handleDownloadInvoice}
        disabled={!isOnline || downloading}
      >
        <Text style={styles.downloadButtonText}>
          {!isOnline ? 'Download Unavailable (Offline)' : 'Download Invoice PDF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### 3. Data Sync Notifications

#### Update AppContext Refresh Functions

```javascript
// src/context/AppContext.jsx
const refreshProfile = async () => {
  // ✅ Check connectivity before API call
  if (!isOnline) {
    console.log('[AppContext] Offline - using cached profile');
    return { success: true, cached: true };
  }

  try {
    const result = await PatientApi.getProfile(patientId);
    
    if (result.success) {
      await SqliteStorageService.saveProfile(result.data);
      setUserProfile(result.data);
      setProfileLastUpdated(Date.now());
      return { success: true, cached: false };
    }
    
    return { success: false, error: result.error };
  } catch (error) {
    console.error('[AppContext] refreshProfile error:', error);
    
    // ✅ Fall back to cached data
    console.log('[AppContext] API failed - loading from SQLite cache');
    const cached = await SqliteStorageService.getProfile();
    if (cached) {
      setUserProfile(cached);
      return { success: true, cached: true };
    }
    
    return { success: false, error: error.message };
  }
};

const refreshPrescriptions = async () => {
  if (!isOnline) {
    console.log('[AppContext] Offline - using cached prescriptions');
    // Load from SQLite
    const cached = await SqliteStorageService.getPrescriptions();
    setMedicines(cached);
    return { success: true, cached: true };
  }

  try {
    const result = await PrescriptionRepeatApi.getAllForPatient(practids, patientId);
    
    if (result.success) {
      // Save to SQLite
      await SqliteStorageService.savePrescriptions(result.data);
      
      // Sync to medication engine
      await syncPrescriptionsToEngine(result.data, patientId);
      
      setMedicines(result.data);
      setPrescriptionsLastUpdated(Date.now());
      return { success: true, cached: false };
    }
    
    return { success: false, error: result.error };
  } catch (error) {
    console.error('[AppContext] refreshPrescriptions error:', error);
    
    // Fall back to cached + medication engine sync
    const cached = await SqliteStorageService.getPrescriptions();
    if (cached && cached.length > 0) {
      setMedicines(cached);
      await syncActivePrescriptionsFromSqlite();  // ✅ Phase 10 offline fallback
      return { success: true, cached: true };
    }
    
    return { success: false, error: error.message };
  }
};
```

---

### 4. Global Offline Indicator

#### Add to App.jsx or MainNavigator

```javascript
// src/components/OfflineIndicator.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';

export function OfflineIndicator() {
  const { isOnline } = useApp();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ You're offline</Text>
      <Text style={styles.subtext}>Some features may be unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ff9800',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subtext: {
    color: '#fff',
    fontSize: 12,
  },
});
```

**Usage in App.jsx:**
```javascript
import { OfflineIndicator } from './components/OfflineIndicator';

function App() {
  return (
    <AppContext.Provider>
      <OfflineIndicator />  {/* ✅ Global indicator */}
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </AppContext.Provider>
  );
}
```

---

## Network Error Handling Matrix

| Operation | Online | Offline | Error Type |
|-----------|--------|---------|------------|
| **View cached data** | ✅ Works | ✅ Works | - |
| **Fetch fresh data** | ✅ Success | ⚠️ Use cache | Network timeout |
| **Book appointment** | ✅ Success | ❌ Blocked | Pre-flight check |
| **Download PDF** | ✅ Success | ❌ Blocked | Pre-flight check |
| **Mark dose taken** | ✅ Works | ✅ Works | - |
| **Generate alarms** | ✅ Works | ✅ Works (from cache) | - |

---

## User Experience Improvements

### 1. Visual Feedback
- **Offline indicator:** Banner at top of screen
- **Disabled buttons:** Grey out with explanatory text
- **Loading states:** Show spinner during network operations
- **Error messages:** Differentiate network vs server errors

### 2. Graceful Degradation
- **Cached data:** Always show cached data when available
- **Retry options:** Allow manual retry when connection restored
- **Queue operations:** Optionally queue booking for when online (future)

### 3. Connectivity Restoration
```javascript
// Auto-refresh when connection restored
useEffect(() => {
  if (isOnline && wasOffline) {
    // Connection restored - refresh data
    console.log('[App] Connection restored - refreshing data');
    refreshAllData();
  }
  setWasOffline(!isOnline);
}, [isOnline]);
```

---

## Testing Scenarios

### Scenario 1: Go Offline Mid-Operation
1. Start appointment booking
2. Fill form
3. Disable internet
4. Tap "Book Appointment"
5. **Expected:** Error message, booking blocked

### Scenario 2: Start Offline
1. Launch app with no internet
2. View prescriptions
3. **Expected:** Cached data shown, offline indicator visible
4. Try to book appointment
5. **Expected:** Button disabled with message

### Scenario 3: Lose Connection During Download
1. Start PDF download
2. Disable internet mid-download
3. **Expected:** Error message, download fails gracefully

### Scenario 4: Connection Restored
1. App running offline
2. Enable internet
3. **Expected:** Offline indicator disappears, data auto-refreshes

### Scenario 5: Airplane Mode
1. Enable airplane mode
2. Launch app
3. **Expected:** Cached data available, booking/download disabled
4. Disable airplane mode
5. **Expected:** Features re-enabled, data syncs

---

## Files to Modify

### Required Changes
- [ ] `src/screens/Appointments/BookAppointmentScreen.jsx`
  - Add isOnline check
  - Disable booking when offline
  - Show offline message

- [ ] `src/screens/Investigations/InvestigationReportScreen.jsx`
  - Add isOnline check to handleDownloadPDF
  - Disable download button when offline
  - Better error messages

- [ ] `src/screens/Invoices/InvoiceDetailScreen.jsx`
  - Add isOnline check to handleDownloadInvoice
  - Disable download button when offline
  - Better error messages

- [ ] `src/context/AppContext.jsx`
  - Add offline checks to bookAppointment
  - Improve refresh functions with fallback logic
  - Add auto-refresh on connection restoration

### Optional Enhancements
- [ ] `src/components/OfflineIndicator.jsx` (new)
  - Global offline banner

- [ ] `src/components/NetworkAwareButton.jsx` (new)
  - Reusable button that disables when offline

- [ ] `src/utils/networkUtils.js` (new)
  - Helper functions for network checks

---

## Implementation Checklist

### Pre-Flight Checks
- [ ] Appointment booking checks isOnline
- [ ] PDF downloads check isOnline
- [ ] User sees clear message when offline

### Button States
- [ ] Booking button disabled when offline
- [ ] Download buttons disabled when offline
- [ ] Button text updates when offline

### Error Handling
- [ ] Network errors show friendly messages
- [ ] Differentiate offline vs server errors
- [ ] Cached data fallback working

### Visual Indicators
- [ ] Offline banner component created
- [ ] Offline state visible in affected screens
- [ ] Loading states during network operations

### User Experience
- [ ] Cached data always available offline
- [ ] Auto-refresh when connection restored
- [ ] No silent failures

---

## Success Criteria

Phase 13 is complete when:
- ✅ Network monitoring active (already complete)
- [ ] Appointment booking blocked offline with message
- [ ] PDF downloads blocked offline with message
- [ ] User-friendly error messages
- [ ] Buttons disabled with explanatory text when offline
- [ ] Cached data fallback working correctly
- [ ] Auto-refresh on connection restoration
- [ ] No confusing error messages

**Current Status:** Infrastructure ready. Implementation points documented.

---

## Priority

### High Priority (Core UX)
1. Appointment booking offline check
2. PDF download offline checks
3. User-friendly error messages

### Medium Priority (Enhanced UX)
4. Disabled button states with text
5. Global offline indicator
6. Auto-refresh on reconnection

### Low Priority (Nice to Have)
7. Queue operations for when online
8. Detailed network status (WiFi vs cellular)
9. Data sync progress indicators

---

*Phase 13 Infrastructure Ready: Network monitoring active, implementation points documented*
*Focus on appointment booking and PDF download restrictions as highest priority*
*All screens have access to isOnline state from AppContext*
*Ready for Phase 14: Comprehensive testing and verification*
