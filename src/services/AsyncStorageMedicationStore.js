/**
 * AsyncStorageMedicationStore.js
 * 
 * Persistent storage adapter for MedicationSchedulingEngine using React Native AsyncStorage.
 * Stores normalized Prescriptions, Medications, Schedules, Alarms, Events, and Timing Profiles.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clone } from './MedicationSchedulingEngine';

const STORAGE_KEYS = {
  PRESCRIPTIONS: '@med_engine_prescriptions_v2',
  MEDICATIONS: '@med_engine_medications_v2',
  SCHEDULES: '@med_engine_schedules_v2',
  ALARMS: '@med_engine_alarms_v2',
  EVENTS: '@med_engine_events_v2',
  TIMING_CONFIG: '@med_engine_timing_config_v2',
};

export class AsyncStorageMedicationStore {
  constructor() {
    this._initialized = false;
    this._prescriptions = new Map();
    this._medications = new Map();
    this._schedules = new Map();
    this._alarms = new Map();
    this._events = [];
    this._timingConfig = null;
  }

  async init() {
    if (this._initialized) return;
    try {
      const [pStr, mStr, sStr, aStr, eStr, tStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PRESCRIPTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES),
        AsyncStorage.getItem(STORAGE_KEYS.ALARMS),
        AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
        AsyncStorage.getItem(STORAGE_KEYS.TIMING_CONFIG),
      ]);

      if (pStr) {
        const list = JSON.parse(pStr);
        list
          .filter(item => !String(item.prescriptionId || item.id).startsWith('RX-MOCK'))
          .forEach(item => this._prescriptions.set(item.prescriptionId || item.id, item));
      }
      if (mStr) {
        const list = JSON.parse(mStr);
        list
          .filter(item => !String(item.prescriptionId || '').startsWith('RX-MOCK'))
          .forEach(item => this._medications.set(item.id, item));
      }
      if (sStr) {
        const list = JSON.parse(sStr);
        list
          .filter(item => !String(item.prescriptionId || '').startsWith('RX-MOCK'))
          .forEach(item => this._schedules.set(item.id, item));
      }
      if (aStr) {
        const list = JSON.parse(aStr);
        list
          .filter(item => !String(item.prescriptionId || '').startsWith('RX-MOCK'))
          .forEach(item => this._alarms.set(item.id || item.alarmId, item));
      }
      if (eStr) {
        this._events = (JSON.parse(eStr) || []).filter(item => !String(item.prescriptionId || '').startsWith('RX-MOCK'));
      }
      if (tStr) {
        this._timingConfig = JSON.parse(tStr);
      }
      this._initialized = true;
    } catch (error) {
      console.warn('[AsyncStorageMedicationStore] Init error:', error);
      this._initialized = true;
    }
  }

  // ── Prescriptions ────────────────────────────────────────────────────────
  async savePrescription(prescription) {
    await this.init();
    const id = prescription.prescriptionId || prescription.id;
    this._prescriptions.set(id, clone(prescription));
    await AsyncStorage.setItem(
      STORAGE_KEYS.PRESCRIPTIONS,
      JSON.stringify([...this._prescriptions.values()])
    );
    return clone(prescription);
  }

  async getPrescription(id) {
    await this.init();
    return clone(this._prescriptions.get(id));
  }

  async listPrescriptions() {
    await this.init();
    return [...this._prescriptions.values()].map(clone);
  }

  // ── Medications ──────────────────────────────────────────────────────────
  async saveMedication(medication) {
    await this.init();
    this._medications.set(medication.id, clone(medication));
    await AsyncStorage.setItem(
      STORAGE_KEYS.MEDICATIONS,
      JSON.stringify([...this._medications.values()])
    );
    return clone(medication);
  }

  async getMedication(id) {
    await this.init();
    return clone(this._medications.get(id));
  }

  async listMedications() {
    await this.init();
    return [...this._medications.values()].map(clone);
  }

  async deleteMedication(id) {
    await this.init();
    this._medications.delete(id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.MEDICATIONS,
      JSON.stringify([...this._medications.values()])
    );
  }

  // ── Schedules ────────────────────────────────────────────────────────────
  async saveSchedule(schedule) {
    await this.init();
    this._schedules.set(schedule.id, clone(schedule));
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULES,
      JSON.stringify([...this._schedules.values()])
    );
    return clone(schedule);
  }

  async getSchedule(id) {
    await this.init();
    return clone(this._schedules.get(id));
  }

  async listSchedules() {
    await this.init();
    return [...this._schedules.values()].map(clone);
  }

  async getSchedulesForMedication(medication) {
    await this.init();
    return [...this._schedules.values()]
      .filter(
        schedule =>
          schedule.prescriptionId === medication.prescriptionId &&
          schedule.medicinePrescriptionId === medication.medicinePrescriptionId &&
          schedule.patientId === medication.patientId,
      )
      .map(clone);
  }

  async deleteSchedule(id) {
    await this.init();
    this._schedules.delete(id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULES,
      JSON.stringify([...this._schedules.values()])
    );
  }

  // ── Alarms ───────────────────────────────────────────────────────────────
  async saveAlarm(alarm) {
    await this.init();
    const id = alarm.id || alarm.alarmId;
    this._alarms.set(id, clone(alarm));
    await AsyncStorage.setItem(
      STORAGE_KEYS.ALARMS,
      JSON.stringify([...this._alarms.values()])
    );
    return clone(alarm);
  }

  async getAlarm(id) {
    await this.init();
    return clone(this._alarms.get(id));
  }

  async listAlarms() {
    await this.init();
    return [...this._alarms.values()].map(clone);
  }

  // ── Events ───────────────────────────────────────────────────────────────
  async appendEvent(event) {
    await this.init();
    this._events.push(clone(event));
    await AsyncStorage.setItem(
      STORAGE_KEYS.EVENTS,
      JSON.stringify(this._events.slice(-500)) // retain last 500 actions
    );
  }

  async listEvents() {
    await this.init();
    return clone(this._events);
  }

  // ── Timing Config ────────────────────────────────────────────────────────
  async saveTimingConfig(config) {
    await this.init();
    this._timingConfig = clone(config);
    await AsyncStorage.setItem(
      STORAGE_KEYS.TIMING_CONFIG,
      JSON.stringify(this._timingConfig)
    );
    return clone(this._timingConfig);
  }

  async getTimingConfig() {
    await this.init();
    return clone(this._timingConfig);
  }

  // ── Clear All ────────────────────────────────────────────────────────────
  async clearAll() {
    this._prescriptions.clear();
    this._medications.clear();
    this._schedules.clear();
    this._alarms.clear();
    this._events = [];
    this._timingConfig = null;
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  }
}
