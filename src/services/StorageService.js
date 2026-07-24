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
  saveProfile: async profile => StorageService.set('@userProfile', profile),
  getProfile: async () => StorageService.get('@userProfile'),
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
  saveAppointments: async appts => StorageService.set('@appointments', appts),
  getAppointments: async () => (await StorageService.get('@appointments')) || [],
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
