import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
  set: async (key, value) => {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  get: async key => {
    const val = await AsyncStorage.getItem(key);
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },
  remove: async key => AsyncStorage.removeItem(key),
  clear: async () => AsyncStorage.clear(),
  
  // ── Profile with timestamp ──────────────────────────────────────────────────
  saveProfile: async profile => {
    await StorageService.set('@userProfile', profile);
    await StorageService.set('@profileLastUpdated', Date.now());
  },
  getProfile: async () => StorageService.get('@userProfile'),
  getProfileLastUpdated: async () => {
    const ts = await StorageService.get('@profileLastUpdated');
    return ts ? Number(ts) : null;
  },

  // ── Appointments with timestamp ─────────────────────────────────────────────
  saveAppointments: async appts => {
    await StorageService.set('@appointments', appts);
    await StorageService.set('@appointmentsLastUpdated', Date.now());
  },
  getAppointments: async () => (await StorageService.get('@appointments')) || [],
  getAppointmentsLastUpdated: async () => {
    const ts = await StorageService.get('@appointmentsLastUpdated');
    return ts ? Number(ts) : null;
  },

  // ── Practitioners with timestamp ────────────────────────────────────────────
  savePractitioners: async practitioners => {
    await StorageService.set('@practitioners', practitioners);
    await StorageService.set('@practitionersLastUpdated', Date.now());
  },
  getPractitioners: async () => (await StorageService.get('@practitioners')) || [],
  getPractitionersLastUpdated: async () => {
    const ts = await StorageService.get('@practitionersLastUpdated');
    return ts ? Number(ts) : null;
  },

  // ── Invoices with timestamp ─────────────────────────────────────────────────
  saveInvoices: async invoices => {
    await StorageService.set('@invoices', invoices);
    await StorageService.set('@invoicesLastUpdated', Date.now());
  },
  getInvoices: async () => (await StorageService.get('@invoices')) || [],
  getInvoicesLastUpdated: async () => {
    const ts = await StorageService.get('@invoicesLastUpdated');
    return ts ? Number(ts) : null;
  },

  // ── Investigations with timestamp ───────────────────────────────────────────
  saveInvestigations: async investigations => {
    await StorageService.set('@investigations', investigations);
    await StorageService.set('@investigationsLastUpdated', Date.now());
  },
  getInvestigations: async () => (await StorageService.get('@investigations')) || [],
  getInvestigationsLastUpdated: async () => {
    const ts = await StorageService.get('@investigationsLastUpdated');
    return ts ? Number(ts) : null;
  },

  saveLockSettings: async (enabled, type, pin) => {
    await StorageService.set('@appLockEnabled', String(enabled));
    await StorageService.set('@appLockType', type);
    if (pin) await StorageService.set('@appPIN', pin);
  },
  getLockSettings: async () => ({
    enabled: (await StorageService.get('@appLockEnabled')) === 'true',
    type: await StorageService.get('@appLockType'),
    pin: await StorageService.get('@appPIN'),
  }),
  saveMedicineStatus: async (medicineId, period, status) => {
    const key = '@medicineStatuses';
    const existing = (await StorageService.get(key)) || {};
    existing[`${medicineId}_${period}`] = status;
    await StorageService.set(key, existing);
  },
  getMedicineStatuses: async () => (await StorageService.get('@medicineStatuses')) || {},
  
  updateLastActive: async () => StorageService.set('@lastActiveTime', Date.now().toString()),
  getLastActive: async () => Number((await StorageService.get('@lastActiveTime')) || 0),
  
  saveCredentials: async (email, password) => {
    await StorageService.set('@authEmail', email.toLowerCase().trim());
    await StorageService.set('@authPassword', password);
  },
  getCredentials: async () => ({
    email: await StorageService.get('@authEmail'),
    password: await StorageService.get('@authPassword'),
  }),
};
