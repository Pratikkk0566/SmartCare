import React, {createContext, useContext, useState, useEffect, useMemo} from 'react';
import { medicines as mockMedicines, appointments as mockAppointments,
         appointmentHistory as mockHistory, userProfile as mockProfile } 
from '../data/mockData';
import {StorageService} from '../services/StorageService';
import {scheduleAllMedicineReminders, configurePushNotifications, setBadgeCount} from '../services/NotificationService';
import { AppointmentApi, PatientApi } from '../API/Api';
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

export function AppProvider({children}) {
  const [userProfile, setUserProfile] = useState(mockProfile);
  const [medicines, setMedicines] = useState(mockMedicines);
  const [appointments, setAppointments] = useState(mockAppointments);
  const [appointmentHistory] = useState(mockHistory);
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

    // Load real appointments
    const apptResult = await AppointmentApi.getHistory(patientId);
    if (apptResult.success) {
      setAppointments(apptResult.data?.appointments || apptResult.data || mockAppointments);
    } else {
      setAppointments(mockAppointments); // fallback to mock if API fails
    }

    // Load real profile using saved mobile number
    const mobileNo = await AsyncStorage.getItem('mobileNumber');
    if (mobileNo) {
      const profileResult = await PatientApi.getByMobile(mobileNo);
      if (profileResult.success) {
        // Server returns an array — take the first patient
        const patient = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data?.patient;
        if (patient) {
          // Map server field names → app field names
          // This is critical: server uses different names than the app expects
          const mappedProfile = {
            firstName:  patient.firstname   || '',   // server key: firstname
            lastName:   patient.surname     || '',   // server key: surname (NOT lastname)
            middleName: patient.middlename  || '',   // server key: middlename
            email:      patient.email       || '',
            phone:      patient.mobno       || '',   // server key: mobno
            gender:     patient.gender      || '',
            dob:        patient.newdob      || '',   // newdob = "1976-05-11" (clean ISO format)
            address:    patient.address     || '',
            city:       patient.town        || '',
            state:      patient.county      || '',
            uhid:       patient.uhid        || '',   // unique hospital ID e.g. SCD/250505011
            patientId:  patient.id          || '',   // numeric ID — saved here too for easy access
            // bloodGroup, height, weight not in this API response — keep existing values
            bloodGroup: userProfile.bloodGroup || '',
            height:     userProfile.height     || '',
            weight:     userProfile.weight     || '',
            bp:         userProfile.bp         || 'Normal',
          };
          setUserProfile(mappedProfile);
        }
      }
    }

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
    // User not logged in yet — load from device storage as before
    const savedAppts = await StorageService.getAppointments();
    if (savedAppts && savedAppts.length > 0) setAppointments(savedAppts);

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
}), [userProfile, medicines, appointments, appointmentHistory, isLoggedIn, selectedLanguage,
    isOnboarded, appReady, isLanguageSelected, notifications, unreadCount, testRequests]);
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
