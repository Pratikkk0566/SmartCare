import React, {createContext, useContext, useState, useEffect, useMemo} from 'react';
import {AppState} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { medicines as mockMedicines } from '../data/mockData';
import {StorageService} from '../services/StorageService';
import {scheduleAllMedicineReminders, configurePushNotifications, setBadgeCount} from '../services/NotificationService';
import { AppointmentApi, PatientApi, PractitionerApi, InvoiceApi, InvestigationApi } from '../API/Api';
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
  const [invoices, setInvoices] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  
  // ── Network & sync state ──────────────────────────────────────────────────
  const [isOnline,            setIsOnline]            = useState(true);
  const [profileLastUpdated,  setProfileLastUpdated]  = useState(null);
  const [appointmentsLastUpdated, setAppointmentsLastUpdated] = useState(null);
  const [practitionersLastUpdated, setPractitionersLastUpdated] = useState(null);
  const [invoicesLastUpdated, setInvoicesLastUpdated] = useState(null);
  const [investigationsLastUpdated, setInvestigationsLastUpdated] = useState(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Refresh all data from API ─────────────────────────────────────────────
  const refreshAllData = async () => {
    const token      = await AsyncStorage.getItem('AUTHTOKEN');
    const mobileNo   = await AsyncStorage.getItem('mobileNumber');
    const mobileNo10 = mobileNo ? mobileNo.replace(/\D/g, '').slice(-10) : '';
    const patientId  = await AsyncStorage.getItem('patientId');

    if (!token || !mobileNo10) return; // Not logged in

    // ── 1) Refresh profile ───────────────────────────────────────────────────
    try {
      const byMobileResult = await PatientApi.getByMobile(mobileNo10);
      if (byMobileResult.success && byMobileResult.data) {
        const p = Array.isArray(byMobileResult.data)
          ? byMobileResult.data[0]
          : byMobileResult.data?.patient || byMobileResult.data;

        if (p && typeof p === 'object') {
          const localProfile = await StorageService.getProfile() || {};
          const apiProfile = {
            firstName:  p.firstname  || p.firstName  || '',
            lastName:   p.surname    || p.lastname   || p.lastName || '',
            middleName: p.middlename || p.middleName || '',
            email:      p.email      || '',
            phone:      p.mobno      || p.mobile     || p.phone    || '',
            gender:     p.gender     || '',
            dob:        p.newdob     || p.dob        || '',
            address:    p.address    || '',
            city:       p.town       || p.city       || '',
            state:      p.county     || p.state      || '',
            uhid:       p.uhid       || '',
            patientId:  String(p.id  || p.clientId   || p.patientId || ''),
            bloodGroup: p.bloodgroup || p.bloodGroup || '',
          };

          if (apiProfile.patientId) {
            await AsyncStorage.setItem('patientId', apiProfile.patientId);
          }
          const fullName = [apiProfile.firstName, apiProfile.middleName, apiProfile.lastName]
            .filter(Boolean).join(' ');
          if (fullName)        await AsyncStorage.setItem('patientName', fullName);
          if (apiProfile.uhid) await AsyncStorage.setItem('uhid', apiProfile.uhid);

          const mergedProfile = {
            ...EMPTY_PROFILE,
            ...localProfile,
            ...apiProfile,
            height:     localProfile.height     || '',
            heightUnit: localProfile.heightUnit || 'cm',
            weight:     localProfile.weight     || '',
            weightUnit: localProfile.weightUnit || 'kg',
            bp:         localProfile.bp         || '',
            allergies:  localProfile.allergies  || [],
          };
          setUserProfile(mergedProfile);
          await StorageService.saveProfile(mergedProfile);
          setProfileLastUpdated(Date.now());
        }
      }
    } catch (err) {
      console.log('[AppContext] Profile refresh failed:', err.message);
    }

    // ── 2) Refresh appointments ──────────────────────────────────────────────
    if (patientId) {
      try {
        const apptResult = await AppointmentApi.getHistory(patientId);
        if (apptResult.success) {
          const payload = apptResult.data;
          let allRaw = [];
          if (Array.isArray(payload)) {
            allRaw = payload;
          } else if (payload && typeof payload === 'object') {
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
            if (allRaw.length === 0) {
              for (const v of Object.values(payload)) {
                if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
                  allRaw = allRaw.concat(v);
                }
              }
            }
          }
          const seen = new Set();
          allRaw = allRaw.filter(a => {
            const key = String(pick(a, ['id', 'appointmentId', 'apmtid', 'aptmtid', 'diaryid']) || JSON.stringify(a));
            if (seen.has(key)) return false;
            seen.add(key); return true;
          });

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
          const history  = [];
          for (const a of allRaw) {
            if (isUpcomingStatus(a)) { upcoming.push(a); continue; }
            if (isHistoryStatus(a))  { history.push(a);  continue; }
            const d = pick(a, ['date', 'appointmentDate', 'visitdate', 'apptdate', 'apmtdate',
                               'commencing', 'datetime', 'dateTime']);
            const dIso = typeof d === 'string' ? d.slice(0, 10) : '';
            if (dIso && dIso >= todayIso) upcoming.push(a);
            else history.push(a);
          }

          const normalise = (list) => list.map(a => {
            const docName = pick(a, [
              'practitionerName', 'doctor', 'practitioner_name', 'diaryusername',
              'doctorName', 'doc_name', 'username', 'practitioner', 'doctorname',
              'consultantName', 'consultant',
            ]);
            let dateVal = pick(a, ['date', 'appointmentDate', 'appointment_date', 'visitdate',
                                   'apptdate', 'apmtdate', 'commencing']);
            let timeVal = pick(a, ['time', 'starttime', 'start_time', 'otime',
                                   'appttime', 'apmttime']);
            if (dateVal && !timeVal && typeof dateVal === 'string'
                && (dateVal.includes('T') || dateVal.includes(' '))) {
              if (dateVal.includes('T')) {
                const [dv, tv] = dateVal.split('T');
                dateVal = dv; timeVal = tv ? tv.slice(0, 5) : '';
              } else {
                const [dv, tv] = dateVal.split(' ');
                dateVal = dv; timeVal = tv ? tv.slice(0, 5) : '';
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
          const normUpcoming = normalise(upcoming).sort((x, y) =>
            toTimestamp(x.date) - toTimestamp(y.date));
          const normHistory  = normalise(history).sort((x, y) =>
            toTimestamp(y.date) - toTimestamp(x.date));

          setAppointments(normUpcoming);
          setAppointmentHistory(normHistory);
          await StorageService.saveAppointments([...normUpcoming, ...normHistory]);
          setAppointmentsLastUpdated(Date.now());
        }
      } catch (err) {
        console.log('[AppContext] Appointments refresh failed:', err.message);
      }

      // ── 3) Refresh practitioners ─────────────────────────────────────────────
      try {
        const practResult = await PractitionerApi.getAll();
        if (practResult.success) {
          const list = practResult.data?.practitioners || practResult.data || [];
          const normalisedPract = Array.isArray(list) ? list.map(p => {
            const numericId = [p.id, p.userId, p.userid, p.user_id, p.doctorId, p.practitionerId]
              .map(v => String(v || '').trim())
              .find(v => v && /^\d+$/.test(v)) || String(p.id || p.userId || p.userid || '').trim();
            return {
              id:              numericId,
              practitionerId:  numericId,
              name:            p.name || `${p.firstname || p.firstName || ''} ${p.lastname || p.lastName || ''}`.trim() || 'Dr. Unknown',
              specialty:       p.specialty || p.specialization || p.speciality || p.department || '',
              qualifications:  p.qualifications || p.qualification || '',
              experience:      Number(p.experience) || 0,
              rating:          Number(p.rating) || 4.5,
              reviewCount:     Number(p.reviewCount) || 0,
              patients:        Number(p.patients) || 0,
              consultationFee: Number(p.consultationFee || p.fee) || 0,
              videoFee:        Number(p.videoFee) || 0,
              audioFee:        Number(p.audioFee) || 0,
              clinic:          p.clinic || p.clinicName || p.clinicname || '',
              clinicAddress:   p.clinicAddress || p.address || '',
              languages:       p.languages || [],
              availability:    p.availability || 'Available Today',
              nextSlot:        p.nextSlot || '',
              about:           p.about || p.description || '',
            };
          }) : [];
          setPractitioners(normalisedPract);
          await StorageService.savePractitioners(normalisedPract);
          setPractitionersLastUpdated(Date.now());
        }
      } catch (err) {
        console.log('[AppContext] Practitioners refresh failed:', err.message);
      }

      // ── 4) Refresh invoices ──────────────────────────────────────────────────
      try {
        const invoiceResult = await InvoiceApi.getAll(patientId);
        if (invoiceResult.success) {
          const payload = invoiceResult.data;
          let invoiceList = [];
          if (Array.isArray(payload)) {
            invoiceList = payload;
          } else if (payload && typeof payload === 'object') {
            invoiceList = payload.invoices || payload.data || payload.list || [];
          }
          
          const normalizedInvoices = invoiceList.map(inv => ({
            id: String(pick(inv, ['id', 'invoiceId', 'invoice_id', 'billid']) || Date.now()),
            invoiceNumber: pick(inv, ['invoiceNumber', 'invoice_number', 'billno', 'invoiceNo']),
            date: pick(inv, ['date', 'invoiceDate', 'invoice_date', 'billdate', 'createdAt']),
            time: pick(inv, ['time', 'invoiceTime', 'invoice_time']),
            description: pick(inv, ['description', 'desc', 'particulars', 'service', 'serviceName']),
            amount: Number(pick(inv, ['amount', 'total', 'totalAmount', 'billAmount', 'netAmount'], 0)) || 0,
            status: pick(inv, ['status', 'paymentStatus', 'payment_status'], 'Paid'),
            doctor: pick(inv, ['doctor', 'doctorName', 'practitioner', 'consultantName']),
            specialty: pick(inv, ['specialty', 'department', 'service_type']),
          }));
          
          setInvoices(normalizedInvoices);
          await StorageService.saveInvoices(normalizedInvoices);
          setInvoicesLastUpdated(Date.now());
        }
      } catch (err) {
        console.log('[AppContext] Invoices refresh failed:', err.message);
      }

      // ── 5) Refresh investigations ────────────────────────────────────────────
      try {
        const investigationResult = await InvestigationApi.getAll(patientId);
        if (investigationResult.success) {
          const payload = investigationResult.data;
          let investigationList = [];
          if (Array.isArray(payload)) {
            investigationList = payload;
          } else if (payload && typeof payload === 'object') {
            investigationList = payload.reports || payload.investigations || payload.data || payload.list || [];
          }
          
          const normalizedInvestigations = investigationList.map(inv => ({
            id: String(pick(inv, ['id', 'reportId', 'report_id', 'investigationId']) || Date.now()),
            testName: pick(inv, ['testName', 'test_name', 'investigationName', 'testtype', 'description']),
            date: pick(inv, ['date', 'reportDate', 'report_date', 'testDate', 'investigationDate']),
            status: pick(inv, ['status', 'reportStatus', 'report_status'], 'Completed'),
            result: pick(inv, ['result', 'findings', 'interpretation']),
            doctor: pick(inv, ['doctor', 'referredBy', 'consultantName', 'practitioner']),
            category: pick(inv, ['category', 'testCategory', 'investigationType', 'type']),
            reportUrl: pick(inv, ['reportUrl', 'pdfUrl', 'fileUrl', 'url']),
          }));
          
          setInvestigations(normalizedInvestigations);
          await StorageService.saveInvestigations(normalizedInvestigations);
          setInvestigationsLastUpdated(Date.now());
        }
      } catch (err) {
        console.log('[AppContext] Investigations refresh failed:', err.message);
      }
    }
  };

  // ── Monitor network state ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline  = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(nowOnline);
      
      if (wasOffline && nowOnline) {
        console.log('[AppContext] Back online → refreshing');
        refreshAllData();
      }
    });

    return unsubscribe;
  }, [isOnline]);

  // ── Monitor app state ─────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isOnline) {
        console.log('[AppContext] App foregrounded → refreshing');
        refreshAllData();
      }
    });

    return () => subscription.remove();
  }, [isOnline]);

  // ── Load initial data (from cache + API if online) ───────────────────────
  // ── Load initial data (from cache + API if online) ───────────────────────
  useEffect(() => {
    async function loadData() {
      console.log('[AppContext] Starting loadData...');
      
      // ── 1) Load settings (always from storage) ─────────────────────────────
      const lang = await StorageService.get('@selectedLanguage');
      if (lang) { setSelectedLanguage(lang); setIsLanguageSelected(true); }

      const onboarded = await StorageService.get('@isOnboarded');
      if (onboarded === true || onboarded === 'true') setIsOnboarded(true);

      const loggedIn = await StorageService.get('@isLoggedIn');
      if (loggedIn === true || loggedIn === 'true') setIsLoggedIn(true);

      // ── 2) Load cached data FIRST (instant offline support) ────────────────
      const cachedProfile = await StorageService.getProfile();
      if (cachedProfile && Object.keys(cachedProfile).some(k => cachedProfile[k])) {
        console.log('[AppContext] Loaded cached profile:', cachedProfile.firstName);
        setUserProfile(cachedProfile);
      }

      const cachedAppointments = await StorageService.getAppointments();
      if (cachedAppointments && cachedAppointments.length > 0) {
        console.log('[AppContext] Loaded cached appointments:', cachedAppointments.length);
        const todayIso = new Date().toISOString().slice(0, 10);
        const upcoming = cachedAppointments.filter(a => {
          const s = String(a.status || '').toLowerCase();
          return ['upcoming', 'approved', 'booked', 'pending', 'confirmed', 'scheduled'].includes(s);
        }).sort((x, y) => toTimestamp(x.date) - toTimestamp(y.date));
        const history = cachedAppointments.filter(a => {
          const s = String(a.status || '').toLowerCase();
          return !['upcoming', 'approved', 'booked', 'pending', 'confirmed', 'scheduled'].includes(s);
        }).sort((x, y) => toTimestamp(y.date) - toTimestamp(x.date));
        setAppointments(upcoming);
        setAppointmentHistory(history);
      }

      const cachedPractitioners = await StorageService.getPractitioners();
      if (cachedPractitioners && cachedPractitioners.length > 0) {
        console.log('[AppContext] Loaded cached practitioners:', cachedPractitioners.length);
        setPractitioners(cachedPractitioners);
      }

      const cachedInvoices = await StorageService.getInvoices();
      if (cachedInvoices && cachedInvoices.length > 0) {
        console.log('[AppContext] Loaded cached invoices:', cachedInvoices.length);
        setInvoices(cachedInvoices);
      }

      const cachedInvestigations = await StorageService.getInvestigations();
      if (cachedInvestigations && cachedInvestigations.length > 0) {
        console.log('[AppContext] Loaded cached investigations:', cachedInvestigations.length);
        setInvestigations(cachedInvestigations);
      }

      // Load timestamps
      const profileTs = await StorageService.getProfileLastUpdated();
      if (profileTs) setProfileLastUpdated(profileTs);
      const apptsTs = await StorageService.getAppointmentsLastUpdated();
      if (apptsTs) setAppointmentsLastUpdated(apptsTs);
      const practTs = await StorageService.getPractitionersLastUpdated();
      if (practTs) setPractitionersLastUpdated(practTs);
      const invoicesTs = await StorageService.getInvoicesLastUpdated();
      if (invoicesTs) setInvoicesLastUpdated(invoicesTs);
      const investigationsTs = await StorageService.getInvestigationsLastUpdated();
      if (investigationsTs) setInvestigationsLastUpdated(investigationsTs);

      // Medicine statuses
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

      setAppReady(true);

      // ── 3) Refresh from API if online ───────────────────────────────────────
      const netState = await NetInfo.fetch();
      const online = netState.isConnected && netState.isInternetReachable !== false;
      setIsOnline(online);
      
      if (online) {
        console.log('[AppContext] Online → refreshing from API');
        await refreshAllData();
      } else {
        console.log('[AppContext] Offline → using cached data only');
      }
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
  invoices,
  investigations,
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
  // ── Network & sync state ──────────────────────────────────────────────────
  isOnline,
  profileLastUpdated,
  appointmentsLastUpdated,
  practitionersLastUpdated,
  invoicesLastUpdated,
  investigationsLastUpdated,
  refreshAllData,
}), [userProfile, medicines, appointments, appointmentHistory, practitioners, invoices, investigations, isLoggedIn, selectedLanguage,
    isOnboarded, appReady, isLanguageSelected, notifications, unreadCount, testRequests, isOnline,
    profileLastUpdated, appointmentsLastUpdated, practitionersLastUpdated, invoicesLastUpdated, investigationsLastUpdated]);
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
