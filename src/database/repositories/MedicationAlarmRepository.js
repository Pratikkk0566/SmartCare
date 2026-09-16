/**
 * Medication Alarm Repository
 * ---------------------------
 * Manages local medication alarms and OS notification scheduling.
 * This is the core of the offline-first alarm system.
 */

import { BaseRepository } from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../db';

export class MedicationAlarmRepository extends BaseRepository {
  constructor() {
    super('medication_alarms');
  }

  /**
   * Create a new medication alarm
   */
  async createAlarm(alarmData) {
    const alarm = {
      alarm_id: alarmData.alarmId || generateId('alarm'),
      dose_id: alarmData.doseId || alarmData.dose_id,
      medicine_id: alarmData.medicineId || alarmData.medicine_id,
      patient_id: alarmData.patientId || alarmData.patient_id,
      alarm_time: alarmData.alarmTime || alarmData.alarm_time,
      notification_id: alarmData.notificationId || alarmData.notification_id,
      status: alarmData.status || 'scheduled',
      snooze_count: alarmData.snoozeCount || alarmData.snooze_count || 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    console.log('[MedicationAlarmRepo] Creating alarm:', alarm);
    return this.insert(alarm, false);
  }

  /**
   * Get alarms for a specific patient
   */
  async getAlarmsByPatient(patientId, status = null) {
    let whereClause = 'patient_id = ?';
    const params = [patientId];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    return this.findWhere(whereClause, 'alarm_time ASC', null, params);
  }

  /**
   * Get alarms for today for a specific patient
   */
  async getTodaysAlarms(patientId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        ma.*,
        md.scheduled_date,
        md.scheduled_time,
        md.dose_value,
        md.dose_unit,
        pm.medicine_name,
        pm.food_instruction
      FROM medication_alarms ma
      JOIN medicine_doses md ON ma.dose_id = md.dose_id
      JOIN prescription_medicines pm ON ma.medicine_id = pm.medicine_id
      WHERE ma.patient_id = ? 
        AND md.scheduled_date = ?
        AND ma.status IN ('scheduled', 'snoozed')
      ORDER BY ma.alarm_time ASC
    `;
    
    return this.query(query, [patientId, targetDate]);
  }

  /**
   * Get upcoming alarms (next few hours)
   */
  async getUpcomingAlarms(patientId, hoursAhead = 4) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    const query = `
      SELECT 
        ma.*,
        md.scheduled_date,
        md.scheduled_time,
        md.dose_value,
        md.dose_unit,
        pm.medicine_name,
        pm.food_instruction
      FROM medication_alarms ma
      JOIN medicine_doses md ON ma.dose_id = md.dose_id
      JOIN prescription_medicines pm ON ma.medicine_id = pm.medicine_id
      WHERE ma.patient_id = ?
        AND ma.status IN ('scheduled', 'snoozed')
        AND datetime(ma.alarm_time) BETWEEN datetime('now') AND datetime(?)
      ORDER BY ma.alarm_time ASC
    `;
    
    return this.query(query, [patientId, futureTime.toISOString()]);
  }

  /**
   * Update alarm status (when fired, snoozed, cancelled)
   */
  async updateAlarmStatus(alarmId, status, additionalData = {}) {
    const updateData = {
      status: status,
      updated_at: getCurrentTimestamp(),
      ...additionalData
    };
    
    console.log('[MedicationAlarmRepo] Updating alarm status:', alarmId, status);
    return this.update(alarmId, updateData);
  }

  /**
   * Snooze an alarm (reschedule for later)
   */
  async snoozeAlarm(alarmId, snoozeMinutes = 15) {
    const alarm = await this.findById(alarmId);
    if (!alarm) {
      throw new Error('Alarm not found');
    }
    
    // Calculate new alarm time
    const currentAlarmTime = new Date(alarm.alarm_time);
    const newAlarmTime = new Date(currentAlarmTime.getTime() + snoozeMinutes * 60 * 1000);
    
    // Update alarm record
    const updateData = {
      alarm_time: newAlarmTime.toISOString(),
      status: 'snoozed',
      snooze_count: alarm.snooze_count + 1,
      updated_at: getCurrentTimestamp()
    };
    
    console.log('[MedicationAlarmRepo] Snoozing alarm:', alarmId, 'to', newAlarmTime.toISOString());
    return this.update(alarmId, updateData);
  }

  /**
   * Cancel an alarm (when dose is taken or skipped)
   */
  async cancelAlarm(alarmId) {
    return this.updateAlarmStatus(alarmId, 'cancelled');
  }

  /**
   * Mark alarm as fired (when notification is shown)
   */
  async markAlarmAsFired(alarmId) {
    return this.updateAlarmStatus(alarmId, 'fired');
  }

  /**
   * Delete alarms for a specific dose
   */
  async deleteAlarmsForDose(doseId) {
    console.log('[MedicationAlarmRepo] Deleting alarms for dose:', doseId);
    return this.deleteWhere('dose_id = ?', [doseId]);
  }

  /**
   * Delete alarms for a specific medicine
   */
  async deleteAlarmsForMedicine(medicineId) {
    console.log('[MedicationAlarmRepo] Deleting alarms for medicine:', medicineId);
    return this.deleteWhere('medicine_id = ?', [medicineId]);
  }

  /**
   * Delete old/expired alarms (cleanup)
   */
  async deleteExpiredAlarms(cutoffDate = null) {
    const cutoff = cutoffDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const cutoffString = cutoff.toISOString();
    
    console.log('[MedicationAlarmRepo] Deleting expired alarms before:', cutoffString);
    return this.deleteWhere(
      'alarm_time < ? AND status IN (?, ?, ?)',
      [cutoffString, 'fired', 'cancelled', 'expired']
    );
  }

  /**
   * Get alarms that need to be scheduled with OS
   * (for rolling window implementation)
   */
  async getAlarmsToSchedule(patientId, startDate, endDate) {
    const query = `
      SELECT 
        ma.*,
        md.scheduled_date,
        md.scheduled_time,
        md.dose_value,
        md.dose_unit,
        pm.medicine_name,
        pm.food_instruction
      FROM medication_alarms ma
      JOIN medicine_doses md ON ma.dose_id = md.dose_id
      JOIN prescription_medicines pm ON ma.medicine_id = pm.medicine_id
      WHERE ma.patient_id = ?
        AND ma.status = 'scheduled'
        AND md.scheduled_date BETWEEN ? AND ?
      ORDER BY ma.alarm_time ASC
    `;
    
    return this.query(query, [patientId, startDate, endDate]);
  }

  /**
   * Bulk create alarms for multiple doses
   */
  async bulkCreateAlarms(alarmDataArray) {
    console.log('[MedicationAlarmRepo] Bulk creating', alarmDataArray.length, 'alarms');
    
    return this.executeTransaction(async () => {
      const results = [];
      for (const alarmData of alarmDataArray) {
        const alarm = await this.createAlarm(alarmData);
        results.push(alarm);
      }
      return results;
    });
  }

  /**
   * Get alarm statistics for a patient
   */
  async getAlarmStats(patientId, startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [patientId];
    
    if (startDate && endDate) {
      dateFilter = 'AND ma.alarm_time >= ? AND ma.alarm_time <= ?';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_alarms,
        COUNT(CASE WHEN ma.status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN ma.status = 'fired' THEN 1 END) as fired,
        COUNT(CASE WHEN ma.status = 'snoozed' THEN 1 END) as snoozed,
        COUNT(CASE WHEN ma.status = 'cancelled' THEN 1 END) as cancelled,
        AVG(ma.snooze_count) as avg_snooze_count
      FROM medication_alarms ma
      WHERE ma.patient_id = ?
      ${dateFilter}
    `;
    
    const result = await this.queryFirst(query, params);
    
    return {
      totalAlarms: result?.total_alarms || 0,
      scheduled: result?.scheduled || 0,
      fired: result?.fired || 0,
      snoozed: result?.snoozed || 0,
      cancelled: result?.cancelled || 0,
      avgSnoozeCount: result?.avg_snooze_count || 0
    };
  }

  /**
   * Find alarm by notification ID (when OS notification is interacted with)
   */
  async findByNotificationId(notificationId) {
    const results = await this.findWhere('notification_id = ?', null, '1', [notificationId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Override findById to use alarm_id
   */
  async findById(alarmId) {
    const results = await this.findWhere('alarm_id = ?', null, '1', [alarmId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Override update method to use alarm_id
   */
  async update(alarmId, data) {
    const query = `UPDATE ${this.tableName} SET ${Object.keys(data).map(key => `${key} = ?`).join(', ')} WHERE alarm_id = ?`;
    const values = [...Object.values(data), alarmId];
    
    console.log('[MedicationAlarmRepo] UPDATE - query:', query);
    console.log('[MedicationAlarmRepo] UPDATE - values:', values);
    
    const result = await this.db.execute(query, values);
    console.log('[MedicationAlarmRepo] UPDATE - result:', result);
    
    return result;
  }

  /**
   * Override exists method to use alarm_id
   */
  async exists(alarmId) {
    const result = await this.findWhere('alarm_id = ?', null, '1', [alarmId]);
    return result && result.length > 0;
  }
}

export default MedicationAlarmRepository;