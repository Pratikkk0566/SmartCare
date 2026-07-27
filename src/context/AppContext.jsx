import React, {createContext, useContext, useState, useEffect, useMemo} from 'react';
import { medicines as mockMedicines } from '../data/mockData';
import {StorageService} from '../services/StorageService';
import {scheduleAllMedicineReminders, configurePushNotifications, setBadgeCount} from '../services/NotificationService';
import { AppointmentApi, PatientApi, PractitionerApi } from '../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const INITIAL_NOTIFICATIONS = [
  {id: 'n1', type: 'medicine', title: 'Medicine Reminder', message: 'Time to take Omega-3 — 1 capsule', time: 'Today, 1:00 PM', group: 'today', read: false},
  {id: 'n2', type: 'appointment', title: 'Appointment Tomorrow', message: 'General Check-up with Dr. James Carter at 10:30 AM — City Health Clinic', time: 'Today, 9:00 AM', group: 'today', read: false},
  {id: 'n3', type: 'medicine', title: 'Medicine Taken ✓', message: 'Vitamin D3 1000 IU marked as taken for 8:00 AM', time: 'Today, 8:05 AM', group: 'today', read: true},
  {id: 'n4', type: 'report', title: 'New Report Available', message: 'Your HbA1c test report is now available. Tap to view.', time: 'Yesterday', group: 'earlier', read: false},
  {id: 'n5', type: 'invoice', title: 'Invoice Generated', message: 'Invoice INV-2024-0056 for ₹500.00 has been generated for your recent consultation.', time: 'May 20, 2024', group: 'earlier', read: true},
  {id: 'n6', type: 'medicine', title: 'Restock Alert', message: 'Paracetamol 500mg is running low. Consider restocking soon.', time: 'May 19, 2024', group: 'earlier', read: true},
  {id: 'n7', type: 'system', title: 'Profile Incomplete', message: 'Complete your health profile to get personalised care recommendations.', time: 'May 18, 2024', group: 'earlier', read: false},
];

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  phone: '',
  gender: '',
  dob: '',
  address: '',
  city: '',
  state: '',
  uhid: '',
  patientId: '',
  bloodGroup: '',
  height: '',
  heightUnit: 'cm',
  weight: '',
  weightUnit: 'kg',
  bp: '',
  allergies: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — robust name/value extraction from inconsistent HIS response fields
// ─────────────────────────────────────────────────────────────────────────────

// Split "PRASHANT HIRADUTT PANDE" or "Dr. ANAND Shukla" into first/middle/last
function splitFullName(full = '') {
  if (!full) return {first: '', middle: '', last: ''};
  let s = String(full).trim().replace(/^Dr\.\s*/i, '');
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {first: '', middle: '', last: ''};
  if (parts.length === 1) return {first: parts[0], middle: '', last: ''};
  if (parts.length === 2) return {first: parts[0], middle: '', last: parts[1]};
  return {first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1]};
}

// Try many possible keys on an object — return the first non-empty value
function pick(obj, keys, fallback = '') {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

// Parse any date string to a comparable timestamp (returns 0 on failure)
function toTimestamp(dateStr = '') {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
}

export function AppProvider({children}) {
  const [userProfile, setUserProfile] = useState(EMPTY_PROFILE);
  const [medicines, setMedicines] = useState(mockMedicines);
  const [appointments, setAppointments] = useState([]);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [appReady, setAppReady] = useState(false);
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [testRequests, setTestRequests] = useState([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    async function loadData() {
  // Load language and onboarding status — same as before
  const lang = await StorageService.get('@selectedLanguage');
  if (lang) { setSelectedLanguage(lang); setIsLanguageSelected(true); }

  const onboarded = await StorageService.get('@isOnboarded');
  if (onboarded === true || onboarded === 'true') setIsOnboarded(true);

  const loggedIn = await StorageService.get('@isLoggedIn');
  if (loggedIn === true || loggedIn === 'true') setIsLoggedIn(true);

  // Get the patientId that was saved when the user logged in
  const patientId = await AsyncStorage.getItem('patientId');

  if (patientId) {
    // User is logged in — fetch real data from server

    // Load real appointments + history
    const apptResult = await AppointmentApi.getHistory(patientId);
    if (apptResult.success) {
      // ── 1) Robust response unwrapping (same pattern as invoices/reports) ──
      const payload = apptResult.data;
      let allRaw = [];
      if (Array.isArray(payload)) {
        allRaw = payload;
      } else if (payload && typeof payload === 'object') {
        // Known wrapper keys — prefer explicit {appointments, history} structure
        const knownLists = [
          payload.appointments, payload.upcoming, payload.today, payload.future,
          payload.history, payload.past, payload.completed,
          payload.data, payload.list, payload.result, payload.records,
        ];
        for (const candidate of knownLists) {
          if (Array.isArray(candidate) && candidate.length > 0) {
            allRaw = allRaw.concat(candidate);
          }
        }
        // If still nothing, scan any property for arrays
        if (allRaw.length === 0) {
          for (const v of Object.values(payload)) {
            if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
              allRaw = allRaw.concat(v);
            }
          }
        }
      }
      // De-duplicate by id (in case {appointments}+{history} overlap)
      const seen = new Set();
      allRaw = allRaw.filter(a => {
        const key = String(pick(a, ['id', 'appointmentId', 'apmtid', 'aptmtid', 'diaryid']) || JSON.stringify(a));
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });

      // ── 2) Split into upcoming vs history by status + date heuristics ──
      const todayIso = new Date().toISOString().slice(0, 10);
      const isUpcomingStatus = (a) => {
        const s = String(pick(a, ['status', 'appointmentStatus', 'aptstatus', 'apmtstatus'], '')).toLowerCase();
        return ['upcoming', 'approved', 'booked', 'pending', 'confirmed', 'scheduled',
                'rescheduled', 'waiting'].includes(s);
      };
      const isHistoryStatus = (a) => {
        const s = String(pick(a, ['status', 'appointmentStatus', 'aptstatus', 'apmtstatus'], '')).toLowerCase();
        return ['completed', 'done', 'visited', 'closed', 'finished', 'cancelled',
                'canceled', 'no show', 'noshow', 'absent', 'rejected'].includes(s);
      };
      const upcoming = [];
      const history = [];
      for (const a of allRaw) {
        if (isUpcomingStatus(a)) { upcoming.push(a); continue; }
        if (isHistoryStatus(a))  { history.push(a);  continue; }
        // Ambiguous status — decide by comparing the appointment date to today
        const d = pick(a, ['date', 'appointmentDate', 'visitdate', 'apptdate', 'apmtdate',
                           'commencing', 'datetime', 'dateTime']);
        const dIso = typeof d === 'string' ? d.slice(0, 10) : '';
        if (dIso && dIso >= todayIso) upcoming.push(a);
        else history.push(a);
      }

      // ── 3) Normalise field names ──
      const normalise = (list) => list.map(a => {
        const docName = pick(a, [
          'practitionerName', 'doctor', 'practitioner_name', 'diaryusername',
          'doctorName', 'doc_name', 'username', 'practitioner', 'doctorname',
          'consultantName', 'consultant',
        ]);
        // Combine date + time nicely (some APIs give ISO datetime in date field)
        let dateVal = pick(a, ['date', 'appointmentDate', 'appointment_date', 'visitdate',
                               'apptdate', 'apmtdate', 'commencing']);
        let timeVal = pick(a, ['time', 'starttime', 'start_time', 'otime',
                               'appttime', 'apmttime']);
        if (dateVal && !timeVal && typeof dateVal === 'string'
            && (dateVal.includes('T') || dateVal.includes(' '))) {
          // extract time from inside the date string (ISO or space-separated)
          if (dateVal.includes('T')) {
            const [d, t] = dateVal.split('T');
            dateVal = d;
            timeVal = t ? t.slice(0, 5) : '';
          } else {
            const [d, t] = dateVal.split(' ');
            dateVal = d;
            timeVal = t ? t.slice(0, 5) : '';
          }
        }
        return {
          id:        String(pick(a, ['id', 'appointmentId', 'appointment_id', 'apmtid',
                                     'aptmtid', 'diaryid', 'bookingId', 'booking_id',
                                     'visitId', 'opdId']) || Date.now()),
          type:      pick(a, ['type', 'appointmentType', 'appointment_type', 'aptmtype',
                               'apmttype', 'visittype', 'purpose', 'department',
                               'specialty'], 'Consultation'),
          date:      dateVal,
          time:      timeVal,
          doctor:    docName,
          specialty: pick(a, ['specialty', 'specialization', 'speciality', 'dept',
                               'department', 'aptmtype']),
          visitType: pick(a, ['visitType', 'visit_type', 'typeOfVisit', 'mode',
                               'visitMode', 'visit_mode'], 'In-Clinic'),
          location:  pick(a, ['location', 'clinicName', 'clinic', 'clinic_name',
                               'centerName', 'hospital', 'hospitalName',
                               'roomname', 'room', 'branch', 'branchName']),
          status:    pick(a, ['status', 'appointmentStatus', 'aptstatus',
                               'apmtstatus'], 'Upcoming'),
          fee:       Number(pick(a, ['fee', 'charge', 'amount',
                                      'consultationFee', 'price', 'totalCharge'], 0)) || 0,
        };
      });
      // Sort upcoming by date ascending (nearest first); history by date desc (newest first)
      const normUpcoming = normalise(upcoming).sort((x, y) =>
        toTimestamp(x.date) - toTimestamp(y.date));
      const normHistory  = normalise(history).sort((x, y) =>
        toTimestamp(y.date) - toTimestamp(x.date));

      setAppointments(normUpcoming);
      setAppointmentHistory(normHistory);
    }

    // Load practitioners (doctors list)
    const practResult = await PractitionerApi.getAll();
    if (practResult.success) {
      const list = practResult.data?.practitioners || practResult.data || [];
      // Normalise practitioner fields
      const normalisedPract = Array.isArray(list) ? list.map(p => ({
        id:              String(p.id              || p.userId       || ''),
        name:            p.name                   || `Dr. ${p.firstname || ''} ${p.lastname || ''}`.trim(),
        specialty:       p.specialty              || p.specialization || '',
        qualifications:  p.qualifications         || p.qualification  || '',
        experience:      Number(p.experience)     || 0,
        rating:          Number(p.rating)         || 4.5,
        reviewCount:     Number(p.reviewCount)    || 0,
        patients:        Number(p.patients)       || 0,
        consultationFee: Number(p.consultationFee || p.fee) || 0,
        videoFee:        Number(p.videoFee)       || 0,
        audioFee:        Number(p.audioFee)       || 0,
        clinic:          p.clinic                 || p.clinicName    || '',
        clinicAddress:   p.clinicAddress          || p.address       || '',
        languages:       p.languages              || [],
        availability:    p.availability           || 'Available Today',
        nextSlot:        p.nextSlot               || '',
        about:           p.about                  || p.description   || '',
      })) : [];
      setPractitioners(normalisedPract);
    }

    // 0) Also read the raw patient object saved by OTP screen (it has the API's
    //    native field names like clientname, firstname, surname etc.)
    let savedPatientDetails = null;
    try {
      const raw = await AsyncStorage.getItem('SELCETEDPATIENTDETAILS');
      if (raw) savedPatientDetails = JSON.parse(raw);
    } catch {}

    // 1) Load any locally saved profile (contains fields HIS API doesn't return:
    //    bloodGroup, height, weight, bp, allergies, heightUnit, weightUnit)
    const localProfile = await StorageService.getProfile() || {};

    // 2) Fetch real profile from HIS API using saved mobile number; also merge
    //    the patient object that was saved during OTP flow.
    const mobileNo = await AsyncStorage.getItem('mobileNumber');
    let apiPatient = savedPatientDetails || null;
    if (mobileNo) {
      const profileResult = await PatientApi.getByMobile(mobileNo);
      if (profileResult.success) {
        const p = Array.isArray(profileResult.data)
          ? profileResult.data[0]
          : profileResult.data?.patient || profileResult.data;
        if (p) apiPatient = p;
      }
    }

    let apiProfile = {};
    if (apiPatient) {
      // Try combined full name first (clientname, patientname, fullname)
      const combinedFull = pick(apiPatient, ['clientname', 'patientname', 'patientName',
                                             'fullname', 'full_name', 'name']);
      const split = splitFullName(combinedFull);

      // Try split names next (firstname, middlename, surname/lastname)
      const firstDirect  = pick(apiPatient, ['firstname', 'firstName', 'first_name']);
      const middleDirect = pick(apiPatient, ['middlename', 'middleName', 'middle_name']);
      const lastDirect   = pick(apiPatient, ['surname', 'lastname', 'lastName', 'last_name']);

      apiProfile = {
        firstName:  firstDirect  || split.first,
        lastName:   lastDirect   || split.last,
        middleName: middleDirect || split.middle,
        email:      pick(apiPatient, ['email', 'emailid', 'emailId', 'email_id']),
        phone:      pick(apiPatient, ['mobno', 'mobileno', 'mobile', 'phone', 'phoneno',
                                      'mobileNo', 'mobileNumber', 'contactno', 'contact']),
        gender:     pick(apiPatient, ['gender', 'sex']),
        dob:        pick(apiPatient, ['newdob', 'dob', 'dateofbirth', 'birthDate', 'dateOfBirth']),
        address:    pick(apiPatient, ['address', 'address1', 'fulladdress', 'residence']),
        city:       pick(apiPatient, ['town', 'city', 'cityname', 'place']),
        state:      pick(apiPatient, ['county', 'state', 'statename']),
        uhid:       pick(apiPatient, ['uhid', 'UHID', 'patientuhid']),
        patientId:  String(pick(apiPatient, ['id', 'patientId', 'patient_id', 'clientId',
                                              'patientid', 'ptid']) || ''),
      };
      // Also save patientId to AsyncStorage if missing (first login)
      if (apiProfile.patientId) {
        const existingPid = await AsyncStorage.getItem('patientId');
        if (!existingPid) await AsyncStorage.setItem('patientId', String(apiProfile.patientId));
      }
      // Also save patientName display string (uses by other screens)
      const fullDisplay =
        `${apiProfile.firstName} ${apiProfile.middleName ? apiProfile.middleName + ' ' : ''}${apiProfile.lastName}`
          .trim();
      if (fullDisplay) {
        const existingName = await AsyncStorage.getItem('patientName');
        if (!existingName) await AsyncStorage.setItem('patientName', fullDisplay);
        if (apiProfile.uhid) {
          const existingUhid = await AsyncStorage.getItem('uhid');
          if (!existingUhid) await AsyncStorage.setItem('uhid', apiProfile.uhid);
        }
      }
    }

    // 3) Merge: EMPTY defaults → local fields → API fields (API wins where present,
    //    except for bloodGroup/height/weight/bp/allergies which only live locally)
    const mergedProfile = {
      ...EMPTY_PROFILE,
      ...localProfile,
      ...apiProfile,
      // Local-only fields — API does not carry these, never overwrite with empty
      bloodGroup: localProfile.bloodGroup || EMPTY_PROFILE.bloodGroup,
      height:     localProfile.height     || EMPTY_PROFILE.height,
      heightUnit: localProfile.heightUnit || EMPTY_PROFILE.heightUnit,
      weight:     localProfile.weight     || EMPTY_PROFILE.weight,
      weightUnit: localProfile.weightUnit || EMPTY_PROFILE.weightUnit,
      bp:         localProfile.bp         || EMPTY_PROFILE.bp,
      allergies:  localProfile.allergies  || EMPTY_PROFILE.allergies,
    };

    setUserProfile(mergedProfile);
    await StorageService.saveProfile(mergedProfile);

    // Medicine statuses — keep existing logic
    const statuses = await StorageService.getMedicineStatuses();
    if (statuses && Object.keys(statuses).length > 0) {
      setMedicines(prev =>
        prev.map(m => ({
          ...m,
          schedule: m.schedule.map(s => ({
            ...s,
            status: statuses[`${m.id}_${s.period}`] || s.status,
          })),
        })),
      );
    }

  } else {
    // User not logged in yet — load profile from device storage
    const profile = await StorageService.getProfile();
    if (profile) setUserProfile(profile);
  }

  setAppReady(true);
}
    loadData();
  }, []);

  useEffect(() => {
    configurePushNotifications(notification => {
      const newNotif = {
        id: Date.now().toString(),
        type: 'medicine',
        title: notification.title || 'Medicine Reminder',
        message: notification.message || notification.body || '',
        time: 'Just now',
        group: 'today',
        read: false,
      };
      setNotifications(prev => [newNotif, ...prev]);
    });
  }, []);

  useEffect(() => {
    scheduleAllMedicineReminders(medicines);
  }, [medicines]);

  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

  const bookAppointment = async appt => {
    const updated = [...appointments, appt];
    setAppointments(updated);
    await StorageService.saveAppointments(updated);
    const newNotif = {
      id: Date.now().toString(),
      type: 'appointment',
      title: 'Appointment Confirmed ✓',
      message: `${appt.type} booked with ${appt.doctor} on ${appt.date} at ${appt.time}`,
      time: 'Just now',
      group: 'today',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const updateProfile = async updates => {
    const updated = {...userProfile, ...updates};
    setUserProfile(updated);
    await StorageService.saveProfile(updated);
  };

  const updateMedicineStatus = async (medicineId, period, status) => {
    let med, sched;
    setMedicines(prev => {
      med = prev.find(m => m.id === medicineId);
      sched = med?.schedule.find(s => s.period === period);
      return prev.map(m =>
        m.id === medicineId
          ? {...m, schedule: m.schedule.map(s => (s.period === period ? {...s, status} : s))}
          : m,
      );
    });
    await StorageService.saveMedicineStatus(medicineId, period, status);
    if (status === 'taken') {
      const newNotif = {
        id: Date.now().toString(),
        type: 'medicine',
        title: 'Medicine Taken ✓',
        message: `${med?.name} marked as taken for ${sched?.time || period}`,
        time: 'Just now',
        group: 'today',
        read: true,
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const markNotificationRead = id => {
    setNotifications(prev => prev.map(n => (n.id === id ? {...n, read: true} : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const addNotification = notif => {
    setNotifications(prev => [{
      id: Date.now().toString(),
      time: 'Just now',
      group: 'today',
      read: false,
      ...notif,
    }, ...prev]);
  };

  const bookTestRequest = request => {
  const newRequest = {
    id: `TR-${Date.now()}`,
    bookedAt: new Date().toLocaleString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}),
    status: 'Approved',
    ...request,
  };
  setTestRequests(prev => [newRequest, ...prev]);
  setNotifications(prev => [{
    id: Date.now().toString(),
    type: 'report',
    title: 'Test Booking Confirmed ✓',
    message: `${request.testName} at ${request.hospitalName} on ${request.date} at ${request.time} — Auto Approved`,
    time: 'Just now',
    group: 'today',
    read: false,
  }, ...prev]);
  return newRequest;
};

  const value = useMemo(() => ({
  userProfile,
  medicines,
  appointments,
  appointmentHistory,
  practitioners,
  selectedLanguage,
  setSelectedLanguage,
  isOnboarded,
  setIsOnboarded,
  appReady,
  isLanguageSelected,
  notifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
  bookAppointment,
  updateProfile,
  updateMedicineStatus,
  isLoggedIn,
  setIsLoggedIn,
  testRequests,
  bookTestRequest,
}), [userProfile, medicines, appointments, appointmentHistory, practitioners, isLoggedIn, selectedLanguage,
    isOnboarded, appReady, isLanguageSelected, notifications, unreadCount, testRequests]);
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
