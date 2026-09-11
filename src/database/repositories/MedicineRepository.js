/**
 * Medicine Repository
 * ------------------
 * Handles prescription medicine database operations, including medicine times,
 * scheduled doses, and medication history.
 */

import { BaseRepository } from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../Database';

export class MedicineRepository extends BaseRepository {
  constructor() {
    super('prescription_medicines');
  }

  /**
   * Create a new medicine for a prescription
   */
  async createMedicine(medicineData) {
    const medicine = {
      id: generateId('med'),
      prescription_id: medicineData.prescriptionId || medicineData.prescription_id,
      medicine_name: medicineData.medicineName || medicineData.medicine_name,
      medicine_type: medicineData.medicineType || medicineData.medicine_type || 'tablet',
      dose_value: parseFloat(medicineData.doseValue || medicineData.dose_value || 1),
      dose_unit: medicineData.doseUnit || medicineData.dose_unit || 'tablet',
      frequency: medicineData.frequency || 'once_daily',
      food_instruction: medicineData.foodInstruction || medicineData.food_instruction || '',
      start_date: medicineData.startDate || medicineData.start_date || getCurrentTimestamp(),
      end_date: medicineData.endDate || medicineData.end_date || null,
      duration_days: parseInt(medicineData.durationDays || medicineData.duration_days || 0),
      total_quantity: parseFloat(medicineData.totalQuantity || medicineData.total_quantity || 0),
      instructions: medicineData.instructions || '',
    };

    return this.executeTransaction(async () => {
      // Insert medicine
      const insertedMedicine = await this.insert(medicine, false);

      // Insert medicine times if provided
      const times = medicineData.times || [];
      if (times.length > 0) {
        await this.saveMedicineTimes(insertedMedicine.id, times);
      }

      return insertedMedicine;
    });
  }

  /**
   * Update medicine
   */
  async updateMedicine(id, updates) {
    const allowedUpdates = [
      'medicine_name', 'medicine_type', 'dose_value', 'dose_unit', 
      'frequency', 'food_instruction', 'start_date', 'end_date', 
      'duration_days', 'total_quantity', 'instructions'
    ];
    
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    return this.executeTransaction(async () => {
      // Update medicine
      const updatedMedicine = await this.update(id, filteredUpdates);

      // Update medicine times if provided
      if (updates.times !== undefined) {
        await this.saveMedicineTimes(id, updates.times);
      }

      return updatedMedicine;
    });
  }

  /**
   * Get medicine with its times
   */
  async getMedicineWithTimes(id) {
    const medicine = await this.findById(id);
    if (!medicine) return null;

    const times = await this.getMedicineTimes(id);
    return {
      ...medicine,
      times: times.map(t => t.time)
    };
  }

  /**
   * Get all medicines for a prescription
   */
  async getMedicinesForPrescription(prescriptionId) {
    const query = `
      SELECT 
        pm.*,
        GROUP_CONCAT(mt.time ORDER BY mt.sort_order) as medicine_times
      FROM prescription_medicines pm
      LEFT JOIN medicine_times mt ON pm.id = mt.medicine_id
      WHERE pm.prescription_id = ?
      GROUP BY pm.id
      ORDER BY pm.created_at
    `;
    
    const medicines = await this.query(query, [prescriptionId]);
    
    // Parse medicine times
    medicines.forEach(medicine => {
      medicine.times = medicine.medicine_times 
        ? medicine.medicine_times.split(',').filter(Boolean)
        : [];
      delete medicine.medicine_times;
    });

    return medicines;
  }

  /**
   * Save medicine times (replaces existing times)
   */
  async saveMedicineTimes(medicineId, times) {
    return this.executeTransaction(async () => {
      // Delete existing times
      await this.execute('DELETE FROM medicine_times WHERE medicine_id = ?', [medicineId]);

      // Insert new times
      if (times && times.length > 0) {
        for (let i = 0; i < times.length; i++) {
          await this.execute(`
            INSERT INTO medicine_times (medicine_id, time, sort_order, created_at)
            VALUES (?, ?, ?, ?)
          `, [medicineId, times[i], i, getCurrentTimestamp()]);
        }
      }
    });
  }

  /**
   * Get medicine times
   */
  async getMedicineTimes(medicineId) {
    return this.query(
      'SELECT * FROM medicine_times WHERE medicine_id = ? ORDER BY sort_order',
      [medicineId]
    );
  }

  /**
   * Delete medicine and all related data
   */
  async deleteMedicine(id) {
    return this.executeTransaction(async () => {
      // Archive any medication history before deletion
      await this.execute(`
        UPDATE medication_history 
        SET notes = COALESCE(notes, '') || ' [Medicine deleted]'
        WHERE medicine_id = ?
      `, [id]);

      // Delete medicine (CASCADE will handle times and scheduled doses)
      const deleted = await this.deleteById(id);
      
      return deleted;
    });
  }

  /**
   * Get medicines by type
   */
  async getMedicinesByType(type) {
    return this.findWhere({ medicine_type: type }, 'medicine_name ASC');
  }

  /**
   * Search medicines by name
   */
  async searchMedicinesByName(searchTerm) {
    const query = `
      SELECT DISTINCT medicine_name, medicine_type, dose_unit
      FROM prescription_medicines 
      WHERE medicine_name LIKE ?
      ORDER BY medicine_name ASC
      LIMIT 20
    `;
    
    return this.query(query, [`%${searchTerm}%`]);
  }

  /**
   * Get medicine usage statistics
   */
  async getMedicineStats(medicineId) {
    const statsQueries = {
      totalScheduledDoses: `
        SELECT COUNT(*) as count 
        FROM scheduled_doses 
        WHERE medicine_id = ?
      `,
      takenDoses: `
        SELECT COUNT(*) as count 
        FROM scheduled_doses 
        WHERE medicine_id = ? AND status = 'taken'
      `,
      missedDoses: `
        SELECT COUNT(*) as count 
        FROM scheduled_doses 
        WHERE medicine_id = ? AND status = 'missed'
      `,
      skippedDoses: `
        SELECT COUNT(*) as count 
        FROM scheduled_doses 
        WHERE medicine_id = ? AND status = 'skipped'
      `,
      upcomingDoses: `
        SELECT COUNT(*) as count 
        FROM scheduled_doses 
        WHERE medicine_id = ? AND status = 'upcoming'
      `,
      adherenceRate: `
        SELECT 
          (COUNT(CASE WHEN status = 'taken' THEN 1 END) * 100.0 / 
           COUNT(CASE WHEN status IN ('taken', 'missed', 'skipped') THEN 1 END)) as rate
        FROM scheduled_doses 
        WHERE medicine_id = ?
      `
    };

    const results = {};
    
    results.totalScheduled = (await this.queryFirst(statsQueries.totalScheduledDoses, [medicineId]))?.count || 0;
    results.taken = (await this.queryFirst(statsQueries.takenDoses, [medicineId]))?.count || 0;
    results.missed = (await this.queryFirst(statsQueries.missedDoses, [medicineId]))?.count || 0;
    results.skipped = (await this.queryFirst(statsQueries.skippedDoses, [medicineId]))?.count || 0;
    results.upcoming = (await this.queryFirst(statsQueries.upcomingDoses, [medicineId]))?.count || 0;
    
    const adherenceResult = await this.queryFirst(statsQueries.adherenceRate, [medicineId]);
    results.adherenceRate = adherenceResult?.rate || 0;

    return results;
  }

  /**
   * Get medicines requiring attention (low adherence, missed doses, etc.)
   */
  async getMedicinesRequiringAttention() {
    const query = `
      SELECT 
        pm.*,
        COUNT(CASE WHEN sd.status = 'missed' THEN 1 END) as missed_count,
        COUNT(CASE WHEN sd.status = 'taken' THEN 1 END) as taken_count,
        COUNT(*) as total_doses
      FROM prescription_medicines pm
      LEFT JOIN scheduled_doses sd ON pm.id = sd.medicine_id
      WHERE pm.prescription_id IN (
        SELECT id FROM prescriptions WHERE status = 'active'
      )
      GROUP BY pm.id
      HAVING missed_count > 2 OR (taken_count * 100.0 / total_doses) < 80
      ORDER BY missed_count DESC, pm.medicine_name ASC
    `;
    
    return this.query(query);
  }

  /**
   * Calculate daily quantity for a medicine
   */
  calculateDailyQuantity(medicine) {
    const timesPerDay = medicine.times ? medicine.times.length : this.getTimesPerDayFromFrequency(medicine.frequency);
    return medicine.dose_value * timesPerDay;
  }

  /**
   * Calculate total treatment duration in days
   */
  calculateTreatmentDuration(medicine) {
    if (medicine.duration_days && medicine.duration_days > 0) {
      return medicine.duration_days;
    }

    if (medicine.total_quantity && medicine.total_quantity > 0) {
      const dailyQuantity = this.calculateDailyQuantity(medicine);
      return Math.ceil(medicine.total_quantity / dailyQuantity);
    }

    return 0;
  }

  /**
   * Get number of times per day from frequency string
   */
  getTimesPerDayFromFrequency(frequency) {
    const frequencyMap = {
      'once_daily': 1,
      'twice_daily': 2,
      'three_times_daily': 3,
      'four_times_daily': 4,
      'every_6_hours': 4,
      'every_8_hours': 3,
      'every_12_hours': 2,
      'as_needed': 1,
    };
    
    return frequencyMap[frequency] || 1;
  }

  /**
   * Get default times for a frequency
   */
  getDefaultTimesForFrequency(frequency) {
    const defaultTimes = {
      'once_daily': ['08:00'],
      'twice_daily': ['08:00', '20:00'],
      'three_times_daily': ['08:00', '14:00', '20:00'],
      'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
      'every_6_hours': ['06:00', '12:00', '18:00', '24:00'],
      'every_8_hours': ['08:00', '16:00', '24:00'],
      'every_12_hours': ['08:00', '20:00'],
      'as_needed': ['08:00'],
    };
    
    return defaultTimes[frequency] || ['08:00'];
  }
}

export default MedicineRepository;