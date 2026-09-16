/**
 * SqliteMedicationStore.js
 * 
 * SQLite-backed store implementation for medication scheduling system.
 * Replaces AsyncStorageMedicationStore with proper relational database storage.
 * 
 * Provides persistent storage for:
 * - Prescriptions (migrated from prescriptions table)
 * - Medications (medication_schedules table)
 * - Schedules (scheduled_doses table)
 * - Alarms (medication_alarms table)
 * - Timing configuration (AsyncStorage - not patient-specific)
 * - Events (dose_events table)
 */

import { getDatabase, generateId, getCurrentTimestamp } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActivePrescriptions } from '../database/prescriptionStorage';

const TIMING_CONFIG_KEY = '@medication_timing_config';

export class SqliteMedicationStore {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    try {
      // Verify database is accessible
      await getDatabase();
      this._initialized = true;
      console.log('[SqliteMedicationStore] Initialized successfully');
    } catch (error) {
      console.error('[SqliteMedicationStore] Initialization failed:', error);
      throw error;
    }
  }

  // ========== Helper: Get Current Patient ID ==========
  
  async _getCurrentPatientId() {
    // Try to get patient ID from secure storage
    try {
      const patientId = await AsyncStorage.getItem('patientId');
      if (patientId) return patientId;
    } catch (e) {
      console.warn('[SqliteMedicationStore] Could not get patientId:', e.message);
    }
    return null;
  }

  // ========== Prescription Methods ==========
  // NOTE: Prescriptions are stored in the prescriptions table from Phase 4
  // We delegate to prescriptionStorage for prescription data

  async savePrescription(prescription) {
    // Prescriptions are managed by prescriptionStorage.js
    // This method is here for compatibility with MedicationSchedulingEngine
    // The engine calls this but we don't need to do anything as prescriptions
    // are already in SQLite via Phase 4's upsertPrescriptions()
    console.log('[SqliteMedicationStore] savePrescription called (delegated to prescriptionStorage)');
    return prescription;
  }

  async getPrescription(prescriptionId) {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return null;

    const result = await db.execute(
      'SELECT * FROM prescriptions WHERE patient_id = ? AND id = ?',
      [patientId, prescriptionId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return JSON.parse(row.data);
    }
    return null;
  }

  async listPrescriptions() {
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return [];

    // Get active prescriptions from Phase 4 implementation
    const activePrescriptions = await getActivePrescriptions(patientId);
    return activePrescriptions || [];
  }

  // ========== Medication Methods ==========
  // Medications are the engine's internal representation stored in medication_schedules

  async saveMedication(medication) {
    const db = await getDatabase();
    const patientId = medication.patientId || await this._getCurrentPatientId();
    if (!patientId) {
      throw new Error('Patient ID required to save medication');
    }

    const medicationId = medication.id;
    const timestamp = getCurrentTimestamp();

    // Check if medication exists
    const existing = await db.execute(
      'SELECT id FROM medication_schedules WHERE id = ?',
      [medicationId]
    );

    const medicationData = {
      id: medicationId,
      patient_id: patientId,
      prescription_id: medication.prescriptionId || null,
      medicine_name: medication.medicineName || medication.drugName || 'Unknown',
      medicine_type: medication.medicineType || 'tablet',
      dose_value: medication.doseValue || 1,
      dose_unit: medication.doseUnit || 'tablet',
      frequency: medication.frequency || null,
      food_instruction: medication.foodInstruction || medication.whenToTake || null,
      start_date: medication.startDate || null,
      end_date: medication.expectedCompletionDate || null,
      schedule_times: medication.scheduleTimes ? JSON.stringify(medication.scheduleTimes) : null,
      is_active: medication.cancelled ? 0 : 1,
      data: JSON.stringify(medication),
      updated_at: timestamp
    };

    if (existing.rows.length > 0) {
      // Update
      await db.execute(
        `UPDATE medication_schedules SET
          patient_id = ?,
          prescription_id = ?,
          medicine_name = ?,
          medicine_type = ?,
          dose_value = ?,
          dose_unit = ?,
          frequency = ?,
          food_instruction = ?,
          start_date = ?,
          end_date = ?,
          schedule_times = ?,
          is_active = ?,
          data = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          medicationData.patient_id,
          medicationData.prescription_id,
          medicationData.medicine_name,
          medicationData.medicine_type,
          medicationData.dose_value,
          medicationData.dose_unit,
          medicationData.frequency,
          medicationData.food_instruction,
          medicationData.start_date,
          medicationData.end_date,
          medicationData.schedule_times,
          medicationData.is_active,
          medicationData.data,
          medicationData.updated_at,
          medicationId
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO medication_schedules (
          id, patient_id, prescription_id, medicine_name, medicine_type,
          dose_value, dose_unit, frequency, food_instruction, start_date,
          end_date, schedule_times, is_active, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          medicationData.id,
          medicationData.patient_id,
          medicationData.prescription_id,
          medicationData.medicine_name,
          medicationData.medicine_type,
          medicationData.dose_value,
          medicationData.dose_unit,
          medicationData.frequency,
          medicationData.food_instruction,
          medicationData.start_date,
          medicationData.end_date,
          medicationData.schedule_times,
          medicationData.is_active,
          medicationData.data,
          timestamp,
          timestamp
        ]
      );
    }

    console.log('[SqliteMedicationStore] Saved medication:', medicationId);
    return medication;
  }

  async getMedication(medicationId) {
    const db = await getDatabase();
    const result = await db.execute(
      'SELECT * FROM medication_schedules WHERE id = ?',
      [medicationId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return JSON.parse(row.data);
    }
    return null;
  }

  async listMedications() {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return [];

    const result = await db.execute(
      'SELECT * FROM medication_schedules WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    );

    return result.rows.map(row => JSON.parse(row.data));
  }

  // ========== Schedule Methods ==========
  // Schedules are individual dose instances stored in scheduled_doses

  async saveSchedule(schedule) {
    const db = await getDatabase();
    const patientId = schedule.patientId || await this._getCurrentPatientId();
    if (!patientId) {
      throw new Error('Patient ID required to save schedule');
    }

    const scheduleId = schedule.id || schedule.scheduleId;
    const timestamp = getCurrentTimestamp();

    // Check if schedule exists
    const existing = await db.execute(
      'SELECT id FROM scheduled_doses WHERE id = ?',
      [scheduleId]
    );

    const scheduleData = {
      id: scheduleId,
      patient_id: patientId,
      schedule_id: schedule.medicationId || schedule.schedule_id || null,
      scheduled_date: schedule.scheduledDate || schedule.scheduled_date || null,
      scheduled_time: schedule.scheduledTime || schedule.scheduled_time || null,
      dose_value: schedule.doseValue || schedule.dose_value || 1,
      dose_unit: schedule.doseUnit || schedule.dose_unit || 'tablet',
      status: schedule.status || 'pending',
      taken_at: schedule.takenAt || schedule.taken_at || null,
      notes: schedule.notes || null,
      data: JSON.stringify(schedule),
      updated_at: timestamp
    };

    if (existing.rows.length > 0) {
      // Update
      await db.execute(
        `UPDATE scheduled_doses SET
          patient_id = ?,
          schedule_id = ?,
          scheduled_date = ?,
          scheduled_time = ?,
          dose_value = ?,
          dose_unit = ?,
          status = ?,
          taken_at = ?,
          notes = ?,
          data = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          scheduleData.patient_id,
          scheduleData.schedule_id,
          scheduleData.scheduled_date,
          scheduleData.scheduled_time,
          scheduleData.dose_value,
          scheduleData.dose_unit,
          scheduleData.status,
          scheduleData.taken_at,
          scheduleData.notes,
          scheduleData.data,
          scheduleData.updated_at,
          scheduleId
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO scheduled_doses (
          id, patient_id, schedule_id, scheduled_date, scheduled_time,
          dose_value, dose_unit, status, taken_at, notes, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scheduleData.id,
          scheduleData.patient_id,
          scheduleData.schedule_id,
          scheduleData.scheduled_date,
          scheduleData.scheduled_time,
          scheduleData.dose_value,
          scheduleData.dose_unit,
          scheduleData.status,
          scheduleData.taken_at,
          scheduleData.notes,
          scheduleData.data,
          timestamp,
          timestamp
        ]
      );
    }

    console.log('[SqliteMedicationStore] Saved schedule:', scheduleId);
    return schedule;
  }

  async getSchedule(scheduleId) {
    const db = await getDatabase();
    const result = await db.execute(
      'SELECT * FROM scheduled_doses WHERE id = ?',
      [scheduleId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return JSON.parse(row.data);
    }
    return null;
  }

  async listSchedules() {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return [];

    const result = await db.execute(
      'SELECT * FROM scheduled_doses WHERE patient_id = ? ORDER BY scheduled_date DESC, scheduled_time ASC',
      [patientId]
    );

    return result.rows.map(row => JSON.parse(row.data));
  }

  async getSchedulesForMedication(medication) {
    const db = await getDatabase();
    const patientId = medication.patientId || await this._getCurrentPatientId();
    if (!patientId) return [];

    const medicationId = medication.id;
    const result = await db.execute(
      'SELECT * FROM scheduled_doses WHERE patient_id = ? AND schedule_id = ? ORDER BY scheduled_date, scheduled_time',
      [patientId, medicationId]
    );

    return result.rows.map(row => JSON.parse(row.data));
  }

  // ========== Alarm Methods ==========
  // Alarms represent OS notifications for scheduled doses

  async saveAlarm(alarm) {
    const db = await getDatabase();
    const patientId = alarm.patientId || await this._getCurrentPatientId();
    if (!patientId) {
      throw new Error('Patient ID required to save alarm');
    }

    const alarmId = alarm.alarmId || alarm.id;
    const timestamp = getCurrentTimestamp();

    // Check if alarm exists
    const existing = await db.execute(
      'SELECT id FROM medication_alarms WHERE id = ?',
      [alarmId]
    );

    const alarmData = {
      id: alarmId,
      patient_id: patientId,
      dose_id: alarm.scheduleId || alarm.dose_id || null,
      schedule_id: alarm.medicationId || alarm.schedule_id || null,
      alarm_time: alarm.scheduledAt || alarm.alarm_time || null,
      notification_id: alarm.notificationId || alarm.notification_id || null,
      status: alarm.status || 'scheduled',
      snooze_count: alarm.snoozeCount || alarm.snooze_count || 0,
      data: JSON.stringify(alarm),
      updated_at: timestamp
    };

    if (existing.rows.length > 0) {
      // Update
      await db.execute(
        `UPDATE medication_alarms SET
          patient_id = ?,
          dose_id = ?,
          schedule_id = ?,
          alarm_time = ?,
          notification_id = ?,
          status = ?,
          snooze_count = ?,
          data = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          alarmData.patient_id,
          alarmData.dose_id,
          alarmData.schedule_id,
          alarmData.alarm_time,
          alarmData.notification_id,
          alarmData.status,
          alarmData.snooze_count,
          alarmData.data,
          alarmData.updated_at,
          alarmId
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO medication_alarms (
          id, patient_id, dose_id, schedule_id, alarm_time,
          notification_id, status, snooze_count, data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alarmData.id,
          alarmData.patient_id,
          alarmData.dose_id,
          alarmData.schedule_id,
          alarmData.alarm_time,
          alarmData.notification_id,
          alarmData.status,
          alarmData.snooze_count,
          alarmData.data,
          timestamp,
          timestamp
        ]
      );
    }

    console.log('[SqliteMedicationStore] Saved alarm:', alarmId);
    return alarm;
  }

  async getAlarm(alarmId) {
    const db = await getDatabase();
    const result = await db.execute(
      'SELECT * FROM medication_alarms WHERE id = ?',
      [alarmId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return JSON.parse(row.data);
    }
    return null;
  }

  async listAlarms() {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return [];

    const result = await db.execute(
      'SELECT * FROM medication_alarms WHERE patient_id = ? ORDER BY alarm_time ASC',
      [patientId]
    );

    return result.rows.map(row => JSON.parse(row.data));
  }

  // ========== Timing Configuration Methods ==========
  // Timing config is global (not patient-specific) so it stays in AsyncStorage

  async saveTimingConfig(config) {
    await AsyncStorage.setItem(TIMING_CONFIG_KEY, JSON.stringify(config));
    console.log('[SqliteMedicationStore] Saved timing config');
    return config;
  }

  async getTimingConfig() {
    try {
      const data = await AsyncStorage.getItem(TIMING_CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[SqliteMedicationStore] Error loading timing config:', error);
      return null;
    }
  }

  // ========== Event Log Methods ==========
  // Events track user actions (taken/skipped/snoozed)

  async appendEvent(event) {
    const db = await getDatabase();
    const patientId = event.patientId || await this._getCurrentPatientId();
    if (!patientId) {
      throw new Error('Patient ID required to append event');
    }

    const timestamp = getCurrentTimestamp();
    const eventId = generateId('event');

    const timestampedEvent = {
      ...event,
      id: eventId,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    await db.execute(
      `INSERT INTO dose_events (
        patient_id, dose_id, schedule_id, event_type, event_time, notes, data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        event.scheduleId || event.dose_id || null,
        event.medicationId || event.schedule_id || null,
        event.type || event.event_type || 'UNKNOWN',
        timestamp,
        event.notes || null,
        JSON.stringify(timestampedEvent),
        timestamp
      ]
    );

    console.log('[SqliteMedicationStore] Appended event:', eventId);
    return timestampedEvent;
  }

  async listEvents(options = {}) {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) return [];

    let query = 'SELECT * FROM dose_events WHERE patient_id = ?';
    const params = [patientId];

    if (options.type) {
      query += ' AND event_type = ?';
      params.push(options.type);
    }

    if (options.scheduleId) {
      query += ' AND dose_id = ?';
      params.push(options.scheduleId);
    }

    query += ' ORDER BY event_time DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = await db.execute(query, params);
    return result.rows.map(row => JSON.parse(row.data));
  }

  // ========== Utility Methods ==========

  async clearAll() {
    const db = await getDatabase();
    const patientId = await this._getCurrentPatientId();
    if (!patientId) {
      console.warn('[SqliteMedicationStore] No patient ID, skipping clearAll');
      return;
    }

    try {
      await db.execute('DELETE FROM medication_alarms WHERE patient_id = ?', [patientId]);
      await db.execute('DELETE FROM dose_events WHERE patient_id = ?', [patientId]);
      await db.execute('DELETE FROM scheduled_doses WHERE patient_id = ?', [patientId]);
      await db.execute('DELETE FROM medication_schedules WHERE patient_id = ?', [patientId]);
      console.log('[SqliteMedicationStore] All medication data cleared for patient:', patientId);
    } catch (error) {
      console.error('[SqliteMedicationStore] Error clearing data:', error);
      throw error;
    }
  }

  async exportData() {
    const patientId = await this._getCurrentPatientId();
    if (!patientId) {
      throw new Error('Patient ID required to export data');
    }

    try {
      const data = {
        prescriptions: await this.listPrescriptions(),
        medications: await this.listMedications(),
        schedules: await this.listSchedules(),
        alarms: await this.listAlarms(),
        timingConfig: await this.getTimingConfig(),
        events: await this.listEvents(),
        patientId,
        exportedAt: new Date().toISOString(),
      };
      console.log('[SqliteMedicationStore] Data exported successfully');
      return data;
    } catch (error) {
      console.error('[SqliteMedicationStore] Error exporting data:', error);
      throw error;
    }
  }

  async importData(data) {
    // Import is handled by migration logic
    // This method is for compatibility
    console.log('[SqliteMedicationStore] importData called (handled by migration)');
    return data;
  }
}

export default SqliteMedicationStore;
