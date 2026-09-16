/**
 * MedicationEngineService.js
 * 
 * High-level orchestration service for Medication Scheduling & Alarms.
 * Singleton coordinating:
 *   - MedicationSchedulingEngine
 *   - AsyncStorageMedicationStore
 *   - MedicationNotificationManager
 *   - PrescriptionRepeatApi / SmartCare HIS
 */

import {
  MedicationSchedulingEngine,
  DEFAULT_MEDICATION_TIMING_CONFIG,
  DEFAULT_SLOT_NAMES,
  todayInUtc,
  mapApiPrescription,
  runMedicationEngineSelfTests,
} from './MedicationSchedulingEngine';
import { SqliteMedicationStore } from './SqliteMedicationStore';
import { MedicationNotificationManager } from './MedicationNotificationManager';
import { PrescriptionRepeatApi } from '../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class MedicationEngineService {
  constructor() {
    this.store = new SqliteMedicationStore();
    this.notificationManager = new MedicationNotificationManager();
    this.engine = new MedicationSchedulingEngine({
      store: this.store,
      notificationManager: this.notificationManager,
      timingConfig: DEFAULT_MEDICATION_TIMING_CONFIG,
      slotNames: DEFAULT_SLOT_NAMES,
      prescriptionMapper: mapApiPrescription,
    });
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this.store.init();
    const customTiming = await this.store.getTimingConfig();
    if (customTiming) {
      this.engine.timingConfig = {
        ...DEFAULT_MEDICATION_TIMING_CONFIG,
        ...customTiming,
      };
    }
    this._initialized = true;
    console.log('[MedicationEngineService] Initialized successfully');
  }

  /**
   * Sync from raw or mapped prescriptions list (e.g. from local DB or server response)
   */
  async syncPrescriptions(prescriptionsList = [], { patientId = 'PAT-1', now = new Date() } = {}) {
    await this.init();
    const list = Array.isArray(prescriptionsList) ? prescriptionsList : [prescriptionsList];
    const results = [];

    for (const raw of list) {
      if (!raw) continue;
      try {
        const mapped = mapApiPrescription(raw);
        mapped.patientId = patientId || mapped.patientId || 'PAT-1';
        const res = await this.engine.syncPrescription(mapped, { now });
        results.push(res);
      } catch (error) {
        console.warn('[MedicationEngineService] Error syncing prescription:', raw?.id || raw?.prescriptionId, error.message);
      }
    }
    return results;
  }

  /**
   * Sync directly from SmartCare HIS repeat prescription API
   */
  async syncFromHisApi({ practids = [], patientId, forceRefresh = false } = {}) {
    await this.init();
    const pid = patientId || (await AsyncStorage.getItem('patientId'));
    if (!pid) return { success: false, reason: 'No patientId' };

    try {
      const resp = await PrescriptionRepeatApi.getAllForPatient(practids, pid, { forceRefresh });
      if (resp.success && Array.isArray(resp.data)) {
        const syncResults = await this.syncPrescriptions(resp.data, { patientId: pid });
        return { success: true, count: resp.data.length, syncResults };
      }
      return { success: false, error: resp.error || 'Failed to fetch prescriptions' };
    } catch (error) {
      console.error('[MedicationEngineService] syncFromHisApi error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * User Actions
   */
  async markTaken(scheduleId) {
    await this.init();
    return await this.engine.markTaken(scheduleId);
  }

  async markSkipped(scheduleId, reason = '') {
    await this.init();
    return await this.engine.markSkipped(scheduleId, { reason });
  }

  async snooze(scheduleId, minutes = 15) {
    await this.init();
    return await this.engine.snooze(scheduleId, minutes);
  }

  /**
   * Selectors for UI
   */
  async getTodaysTimeline(date = todayInUtc()) {
    await this.init();
    return await this.engine.getTodaysMedicationTimeline({ date });
  }

  async getActiveMedications(patientId) {
    await this.init();
    return await this.engine.getActiveMedicines({ patientId });
  }

  async getAllSchedules() {
    await this.init();
    return await this.store.listSchedules();
  }

  async getUpcomingAlarms() {
    await this.init();
    const alarms = await this.store.listAlarms();
    const now = Date.now();
    return alarms
      .filter((a) => a.status === 'SCHEDULED' && Date.parse(a.scheduledAt) > now)
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  }

  async getTimingConfig() {
    await this.init();
    const custom = await this.store.getTimingConfig();
    return {
      ...DEFAULT_MEDICATION_TIMING_CONFIG,
      ...custom,
    };
  }

  async updateTimingConfig(configUpdates) {
    await this.init();
    const current = await this.getTimingConfig();
    const updated = {
      ...current,
      ...configUpdates,
    };
    await this.store.saveTimingConfig(updated);
    this.engine.timingConfig = updated;

    // Resync existing active medications to recalculate future schedules and alarms with new timings
    const activeMeds = await this.store.listMedications();
    const activeMedsFiltered = activeMeds.filter((m) => !m.cancelled && m.remainingQuantity > 0);
    const prescriptions = await this.store.listPrescriptions();

    for (const med of activeMedsFiltered) {
      const rx = prescriptions.find((p) => p.prescriptionId === med.prescriptionId) || {
        prescriptionId: med.prescriptionId,
        patientId: med.patientId,
        doctorId: med.doctorId,
        version: med.prescriptionVersion,
      };
      await this.engine.syncMedicine(rx, med);
    }
    return updated;
  }

  async calculateAdherenceStats(days = 7) {
    await this.init();
    const allSchedules = await this.store.listSchedules();
    const today = todayInUtc();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startIso = startDate.toISOString().slice(0, 10);

    const relevant = allSchedules.filter(
      (s) => s.scheduledDate >= startIso && s.scheduledDate <= today && s.status !== 'CANCELLED'
    );

    const total = relevant.length;
    const taken = relevant.filter((s) => s.status === 'TAKEN').length;
    const skipped = relevant.filter((s) => s.status === 'SKIPPED').length;
    const pending = relevant.filter((s) => s.status === 'SCHEDULED' || s.status === 'SNOOZED').length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      total,
      taken,
      skipped,
      pending,
      rate,
      days,
    };
  }

  async runDiagnostics() {
    return await runMedicationEngineSelfTests();
  }
}

export const medicationEngineService = new MedicationEngineService();
export default medicationEngineService;
