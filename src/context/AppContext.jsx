import React, {createContext, useContext, useState, useEffect, useMemo} from 'react';
import {medicines as initialMedicines, appointments as initialAppointments, appointmentHistory as initialHistory, userProfile as initialProfile} from '../data/mockData';
import {StorageService} from '../services/StorageService';
import {scheduleAllMedicineReminders, configurePushNotifications, setBadgeCount} from '../services/NotificationService';

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
  const [userProfile, setUserProfile] = useState(initialProfile);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [appointmentHistory] = useState(initialHistory);
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
      const lang = await StorageService.get('@selectedLanguage');
      if (lang) {
        setSelectedLanguage(lang);
        setIsLanguageSelected(true);
      }

const onboarded = await StorageService.get('@isOnboarded');
if (onboarded === true || onboarded === 'true') {
  setIsOnboarded(true);
}
const loggedIn = await StorageService.get('@isLoggedIn');
if (loggedIn === true || loggedIn === 'true') {
  setIsLoggedIn(true);
}

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

      const savedAppts = await StorageService.getAppointments();
      if (savedAppts && savedAppts.length > 0) setAppointments(savedAppts);

      const profile = await StorageService.getProfile();
      if (profile) setUserProfile(profile);

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
