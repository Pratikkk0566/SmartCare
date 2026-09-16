/**
 * AsyncStorageMedicationStore.js
 * 
 * AsyncStorage-backed store implementation for medication scheduling system.
 * Provides persistent storage for prescriptions, medications, schedules, alarms,
 * timing configuration, and events.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  PRESCRIPTIONS: '@medication_prescriptions',
  MEDICATIONS: '@medications',
  SCHEDULES: '@medication_schedules',
  ALARMS: '@medication_alarms',
  TIMING_CONFIG: '@medication_timing_config',
  EVENTS: '@medication_events',
};

export class AsyncStorageMedicationStore {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    // Pre-load any necessary data or verify storage access
    try {
      await AsyncStorage.getAllKeys();
      this._initialized = true;
      console.log('[AsyncStorageMedicationStore] Initialized successfully');
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Initialization failed:', error);
      throw error;
    }
  }

  // ========== Prescription Methods ==========

  async savePrescription(prescription) {
    const prescriptions = await this._getAllPrescriptions();
    const index = prescriptions.findIndex(p => p.prescriptionId === prescription.prescriptionId);
    
    if (index >= 0) {
      prescriptions[index] = prescription;
    } else {
      prescriptions.push(prescription);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
    return prescription;
  }

  async getPrescription(prescriptionId) {
    const prescriptions = await this._getAllPrescriptions();
    return prescriptions.find(p => p.prescriptionId === prescriptionId) || null;
  }

  async listPrescriptions() {
    return await this._getAllPrescriptions();
  }

  async _getAllPrescriptions() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading prescriptions:', error);
      return [];
    }
  }

  // ========== Medication Methods ==========

  async saveMedication(medication) {
    const medications = await this._getAllMedications();
    const index = medications.findIndex(m => m.id === medication.id);
    
    if (index >= 0) {
      medications[index] = medication;
    } else {
      medications.push(medication);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    return medication;
  }

  async getMedication(medicationId) {
    const medications = await this._getAllMedications();
    return medications.find(m => m.id === medicationId) || null;
  }

  async listMedications() {
    return await this._getAllMedications();
  }

  async _getAllMedications() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading medications:', error);
      return [];
    }
  }

  // ========== Schedule Methods ==========

  async saveSchedule(schedule) {
    const schedules = await this._getAllSchedules();
    const index = schedules.findIndex(s => s.id === schedule.id || s.scheduleId === schedule.scheduleId);
    
    if (index >= 0) {
      schedules[index] = schedule;
    } else {
      schedules.push(schedule);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    return schedule;
  }

  async getSchedule(scheduleId) {
    const schedules = await this._getAllSchedules();
    return schedules.find(s => s.id === scheduleId || s.scheduleId === scheduleId) || null;
  }

  async listSchedules() {
    return await this._getAllSchedules();
  }

  async getSchedulesForMedication(medication) {
    const schedules = await this._getAllSchedules();
    return schedules.filter(s => 
      s.medicinePrescriptionId === medication.medicinePrescriptionId &&
      s.prescriptionId === medication.prescriptionId
    );
  }

  async _getAllSchedules() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading schedules:', error);
      return [];
    }
  }

  // ========== Alarm Methods ==========

  async saveAlarm(alarm) {
    const alarms = await this._getAllAlarms();
    const index = alarms.findIndex(a => a.alarmId === alarm.alarmId);
    
    if (index >= 0) {
      alarms[index] = alarm;
    } else {
      alarms.push(alarm);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    return alarm;
  }

  async getAlarm(alarmId) {
    const alarms = await this._getAllAlarms();
    return alarms.find(a => a.alarmId === alarmId) || null;
  }

  async listAlarms() {
    return await this._getAllAlarms();
  }

  async _getAllAlarms() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ALARMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading alarms:', error);
      return [];
    }
  }

  // ========== Timing Configuration Methods ==========

  async saveTimingConfig(config) {
    await AsyncStorage.setItem(STORAGE_KEYS.TIMING_CONFIG, JSON.stringify(config));
    return config;
  }

  async getTimingConfig() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TIMING_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading timing config:', error);
      return null;
    }
  }

  // ========== Event Log Methods ==========

  async appendEvent(event) {
    const events = await this._getAllEvents();
    const timestampedEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      id: `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    events.push(timestampedEvent);
    
    // Keep only last 1000 events to avoid storage bloat
    const trimmedEvents = events.slice(-1000);
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(trimmedEvents));
    return timestampedEvent;
  }

  async listEvents(options = {}) {
    const events = await this._getAllEvents();
    let filtered = events;

    if (options.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    if (options.scheduleId) {
      filtered = filtered.filter(e => e.scheduleId === options.scheduleId);
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  async _getAllEvents() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error loading events:', error);
      return [];
    }
  }

  // ========== Utility Methods ==========

  async clearAll() {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      console.log('[AsyncStorageMedicationStore] All data cleared');
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error clearing data:', error);
      throw error;
    }
  }

  async exportData() {
    try {
      const data = {
        prescriptions: await this._getAllPrescriptions(),
        medications: await this._getAllMedications(),
        schedules: await this._getAllSchedules(),
        alarms: await this._getAllAlarms(),
        timingConfig: await this.getTimingConfig(),
        events: await this._getAllEvents(),
        exportedAt: new Date().toISOString(),
      };
      return data;
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error exporting data:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      if (data.prescriptions) {
        await AsyncStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(data.prescriptions));
      }
      if (data.medications) {
        await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(data.medications));
      }
      if (data.schedules) {
        await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(data.schedules));
      }
      if (data.alarms) {
        await AsyncStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(data.alarms));
      }
      if (data.timingConfig) {
        await AsyncStorage.setItem(STORAGE_KEYS.TIMING_CONFIG, JSON.stringify(data.timingConfig));
      }
      if (data.events) {
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events));
      }
      console.log('[AsyncStorageMedicationStore] Data imported successfully');
    } catch (error) {
      console.error('[AsyncStorageMedicationStore] Error importing data:', error);
      throw error;
    }
  }
}

export default AsyncStorageMedicationStore;
