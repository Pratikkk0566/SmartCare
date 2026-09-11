/**
 * Scheduled Dose Repository
 * ------------------------
 * Handles scheduled medication doses, tracking when medicines should be taken,
 * and managing dose status updates (taken, missed, skipped, etc.).
 */

import { BaseRepository } from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../Database';

export class ScheduledDoseRepository extends BaseRepository {
  constructor() {
    super('scheduled_doses');
  }

  /**
   * Create a scheduled dose
   */
  async createScheduledDose(doseData) {
    const dose = {
      id: generateId('dose'),
      medicine_id: doseData.medicineId || doseData.medicine_id,
      scheduled_date: doseData.scheduledDate || doseData.scheduled_date,
      scheduled_time: doseData.scheduledTime || doseData.scheduled_time,
      dose_value: parseFloat(doseData.doseValue || doseData.dose_value || 1),
      dose_unit: doseData.doseUnit || doseData.dose_unit || 'tablet',
      status: doseData.status || 'upcoming',
      taken_time: doseData.takenTime || doseData.taken_time || null,
      notes: doseData.notes || '',
    };

    return this.insert(dose, false);
  }

  /**
   * Generate scheduled doses for a medicine
   */
  async generateSchedulesForMedicine(medicineId, startDate, endDate, times) {
    const doses = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate doses for each day in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Create a dose for each time of day
      for (const time of times) {
        const doseData = {
          medicineId,
          scheduledDate: dateStr,
          scheduledTime: time,
          status: 'upcoming'
        };
        
        doses.push(doseData);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch insert all doses
    return this.executeTransaction(async () => {
      const results = [];
      for (const doseData of doses) {
        const dose = await this.createScheduledDose(doseData);
        results.push(dose);
      }
      return results;
    });
  }

  /**
   * Get today's scheduled doses
   */
  async getTodaysDoses(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        sd.*,
        pm.medicine_name,
        pm.medicine_type,
        pm.food_instruction,
        p.name as prescription_name,
        p.doctor_name
      FROM scheduled_doses sd
      JOIN prescription_medicines pm ON sd.medicine_id = pm.id
      JOIN prescriptions p ON pm.prescription_id = p.id
      WHERE sd.scheduled_date = ? AND p.status = 'active'
      ORDER BY sd.scheduled_time ASC
    `;
    
    return this.query(query, [targetDate]);
  }

  /**
   * Get upcoming doses (next few hours)
   */
  async getUpcomingDoses(hoursAhead = 4) {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const futureDate = futureTime.toISOString().split('T')[0];
    const futureTimeStr = futureTime.toTimeString().split(' ')[0].substring(0, 5);
    
    const query = `
      SELECT 
        sd.*,
        pm.medicine_name,
        pm.medicine_type,
        pm.food_instruction,
        p.name as prescription_name
      FROM scheduled_doses sd
      JOIN prescription_medicines pm ON sd.medicine_id = pm.id
      JOIN prescriptions p ON pm.prescription_id = p.id
      WHERE p.status = 'active'
        AND sd.status = 'upcoming'
        AND (
          (sd.scheduled_date = ? AND sd.scheduled_time >= ?) OR
          (sd.scheduled_date = ? AND sd.scheduled_time <= ?)
        )
      ORDER BY sd.scheduled_date ASC, sd.scheduled_time ASC
    `;
    
    return this.query(query, [currentDate, currentTime, futureDate, futureTimeStr]);
  }

  /**
   * Get overdue/missed doses
   */
  async getOverdueDoses() {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const query = `
      SELECT 
        sd.*,
        pm.medicine_name,
        pm.medicine_type,
        pm.food_instruction,
        p.name as prescription_name
      FROM scheduled_doses sd
      JOIN prescription_medicines pm ON sd.medicine_id = pm.id
      JOIN prescriptions p ON pm.prescription_id = p.id
      WHERE p.status = 'active'
        AND sd.status = 'upcoming'
        AND (
          sd.scheduled_date < ? OR
          (sd.scheduled_date = ? AND sd.scheduled_time < ?)
        )
      ORDER BY sd.scheduled_date DESC, sd.scheduled_time DESC
    `;
    
    return this.query(query, [currentDate, currentDate, currentTime]);
  }

  /**
   * Mark dose as taken
   */
  async markDoseAsTaken(doseId, takenTime = null, notes = '') {
    const updateData = {
      status: 'taken',
      taken_time: takenTime || getCurrentTimestamp(),
      notes: notes
    };

    return this.executeTransaction(async () => {
      const updatedDose = await this.update(doseId, updateData);
      
      // Add to medication history
      await this.addToHistory(doseId, 'taken', notes);
      
      return updatedDose;
    });
  }

  /**
   * Mark dose as skipped
   */
  async markDoseAsSkipped(doseId, notes = '') {
    const updateData = {
      status: 'skipped',
      notes: notes
    };

    return this.executeTransaction(async () => {
      const updatedDose = await this.update(doseId, updateData);
      
      // Add to medication history
      await this.addToHistory(doseId, 'skipped', notes);
      
      return updatedDose;
    });
  }

  /**
   * Mark dose as missed (system generated)
   */
  async markDoseAsMissed(doseId, notes = 'Automatically marked as missed') {
    const updateData = {
      status: 'missed',
      notes: notes
    };

    return this.executeTransaction(async () => {
      const updatedDose = await this.update(doseId, updateData);
      
      // Add to medication history
      await this.addToHistory(doseId, 'missed', notes);
      
      return updatedDose;
    });
  }

  /**
   * Snooze a dose (reschedule for later)
   */
  async snoozeDose(doseId, newTime, notes = '') {
    const updateData = {
      scheduled_time: newTime,
      status: 'upcoming',
      notes: notes
    };

    return this.executeTransaction(async () => {
      const updatedDose = await this.update(doseId, updateData);
      
      // Add to medication history
      await this.addToHistory(doseId, 'snoozed', `Snoozed to ${newTime}. ${notes}`.trim());
      
      return updatedDose;
    });
  }

  /**
   * Get doses for a specific medicine
   */
  async getDosesForMedicine(medicineId, status = null, limit = null) {
    const conditions = { medicine_id: medicineId };
    if (status) conditions.status = status;
    
    const orderBy = 'scheduled_date DESC, scheduled_time DESC';
    const limitClause = limit ? limit.toString() : '';
    
    return this.findWhere(conditions, orderBy, limitClause);
  }

  /**
   * Get doses for a date range
   */
  async getDosesInDateRange(startDate, endDate, status = null) {
    let query = `
      SELECT 
        sd.*,
        pm.medicine_name,
        pm.medicine_type,
        p.name as prescription_name
      FROM scheduled_doses sd
      JOIN prescription_medicines pm ON sd.medicine_id = pm.id
      JOIN prescriptions p ON pm.prescription_id = p.id
      WHERE sd.scheduled_date >= ? AND sd.scheduled_date <= ?
    `;
    
    const params = [startDate, endDate];
    
    if (status) {
      query += ' AND sd.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY sd.scheduled_date ASC, sd.scheduled_time ASC';
    
    return this.query(query, params);
  }

  /**
   * Auto-mark overdue doses as missed
   */
  async autoMarkOverdueDosesAsMissed(gracePeriodMinutes = 30) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - gracePeriodMinutes * 60 * 1000);
    const cutoffDate = cutoffTime.toISOString().split('T')[0];
    const cutoffTimeStr = cutoffTime.toTimeString().split(' ')[0].substring(0, 5);
    
    const query = `
      UPDATE scheduled_doses 
      SET status = 'missed', 
          updated_at = ?,
          notes = COALESCE(notes, '') || ' [Auto-marked as missed]'
      WHERE status = 'upcoming'
        AND (
          scheduled_date < ? OR
          (scheduled_date = ? AND scheduled_time <= ?)
        )
    `;
    
    const result = await this.execute(query, [
      getCurrentTimestamp(),
      cutoffDate,
      cutoffDate,
      cutoffTimeStr
    ]);

    console.log(`[ScheduledDose] Auto-marked ${result.changes} overdue doses as missed`);
    return result.changes;
  }

  /**
   * Add entry to medication history
   */
  async addToHistory(doseId, action, notes = '') {
    const dose = await this.findById(doseId);
    if (!dose) return null;

    const historyEntry = {
      dose_id: doseId,
      medicine_id: dose.medicine_id,
      action: action,
      timestamp: getCurrentTimestamp(),
      notes: notes
    };

    return this.execute(`
      INSERT INTO medication_history (dose_id, medicine_id, action, timestamp, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      historyEntry.dose_id,
      historyEntry.medicine_id,
      historyEntry.action,
      historyEntry.timestamp,
      historyEntry.notes
    ]);
  }

  /**
   * Get medication adherence statistics
   */
  async getAdherenceStats(startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE scheduled_date >= ? AND scheduled_date <= ?';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_doses,
        COUNT(CASE WHEN status = 'taken' THEN 1 END) as taken,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming,
        (COUNT(CASE WHEN status = 'taken' THEN 1 END) * 100.0 / 
         COUNT(CASE WHEN status IN ('taken', 'missed', 'skipped') THEN 1 END)) as adherence_rate
      FROM scheduled_doses
      ${dateFilter}
    `;
    
    const result = await this.queryFirst(query, params);
    
    return {
      totalDoses: result?.total_doses || 0,
      taken: result?.taken || 0,
      missed: result?.missed || 0,
      skipped: result?.skipped || 0,
      upcoming: result?.upcoming || 0,
      adherenceRate: result?.adherence_rate || 0
    };
  }

  /**
   * Delete doses for a medicine (when medicine is deleted/updated)
   */
  async deleteDosesForMedicine(medicineId) {
    return this.deleteWhere('medicine_id = ?', [medicineId]);
  }

  /**
   * Delete future doses for a medicine (when medicine schedule changes)
   */
  async deleteFutureDosesForMedicine(medicineId, fromDate = null) {
    const date = fromDate || new Date().toISOString().split('T')[0];
    return this.deleteWhere(
      'medicine_id = ? AND scheduled_date >= ? AND status = ?',
      [medicineId, date, 'upcoming']
    );
  }
}

export default ScheduledDoseRepository;