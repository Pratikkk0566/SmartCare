/**
 * SQLite Prescription Service
 * --------------------------
 * Service layer that provides application-level operations for prescriptions.
 * Uses repositories for data access and handles business logic.
 * This will replace the existing AsyncStorage-based prescription management.
 */

import PrescriptionRepository from '../database/repositories/PrescriptionRepository';
import MedicineRepository from '../database/repositories/MedicineRepository';
import ScheduledDoseRepository from '../database/repositories/ScheduledDoseRepository';
import { Database } from '../database/Database';

export class SQLitePrescriptionService {
  constructor() {
    this.prescriptionRepo = new PrescriptionRepository();
    this.medicineRepo = new MedicineRepository();
    this.scheduledDoseRepo = new ScheduledDoseRepository();
  }

  /**
   * Initialize the service (ensures database is ready)
   */
  async init() {
    await Database.init();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRESCRIPTION MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new prescription with medicines
   */
  async createPrescription(prescriptionData) {
    await this.init();

    return Database.executeTransaction(async () => {
      // Create prescription
      const prescription = await this.prescriptionRepo.createPrescription({
        name: prescriptionData.name,
        doctorName: prescriptionData.doctorName,
        startDate: prescriptionData.startDate,
        endDate: prescriptionData.endDate,
        notes: prescriptionData.notes,
        status: 'draft'
      });

      // Add medicines if provided
      const medicines = [];
      if (prescriptionData.medicines && prescriptionData.medicines.length > 0) {
        for (const medicineData of prescriptionData.medicines) {
          const medicine = await this.addMedicineToPrescription(
            prescription.id, 
            medicineData,
            false // Don't generate schedules yet
          );
          medicines.push(medicine);
        }
      }

      return {
        ...prescription,
        medicines
      };
    });
  }

  /**
   * Get prescription with all details
   */
  async getPrescription(prescriptionId) {
    await this.init();
    return this.prescriptionRepo.getPrescriptionWithDetails(prescriptionId);
  }

  /**
   * Get all prescriptions with medicine counts
   */
  async getAllPrescriptions() {
    await this.init();
    return this.prescriptionRepo.getAllPrescriptionsWithCounts();
  }

  /**
   * Update prescription
   */
  async updatePrescription(prescriptionId, updates) {
    await this.init();
    return this.prescriptionRepo.updatePrescription(prescriptionId, updates);
  }

  /**
   * Delete prescription
   */
  async deletePrescription(prescriptionId) {
    await this.init();
    return this.prescriptionRepo.deletePrescription(prescriptionId);
  }

  /**
   * Activate prescription (generate schedules)
   */
  async activatePrescription(prescriptionId) {
    await this.init();

    return Database.executeTransaction(async () => {
      // Update prescription status
      const prescription = await this.prescriptionRepo.updateStatus(prescriptionId, 'active');
      
      // Get all medicines for this prescription
      const medicines = await this.medicineRepo.getMedicinesForPrescription(prescriptionId);
      
      // Generate schedules for each medicine
      for (const medicine of medicines) {
        await this.generateSchedulesForMedicine(medicine);
      }

      return prescription;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MEDICINE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Add medicine to prescription
   */
  async addMedicineToPrescription(prescriptionId, medicineData, generateSchedules = true) {
    await this.init();

    return Database.executeTransaction(async () => {
      // Prepare medicine data
      const medicinePayload = {
        prescriptionId,
        medicineName: medicineData.medicineName || medicineData.name,
        medicineType: medicineData.medicineType || medicineData.type || 'tablet',
        doseValue: medicineData.doseValue || medicineData.dose || 1,
        doseUnit: medicineData.doseUnit || medicineData.unit || 'tablet',
        frequency: medicineData.frequency || 'once_daily',
        foodInstruction: medicineData.foodInstruction || medicineData.food || '',
        startDate: medicineData.startDate,
        endDate: medicineData.endDate,
        durationDays: medicineData.durationDays || medicineData.duration,
        totalQuantity: medicineData.totalQuantity || medicineData.quantity,
        instructions: medicineData.instructions || '',
        times: medicineData.times || this.getDefaultTimesForFrequency(medicineData.frequency)
      };

      // Create medicine
      const medicine = await this.medicineRepo.createMedicine(medicinePayload);

      // Generate schedules if requested and prescription is active
      if (generateSchedules) {
        const prescription = await this.prescriptionRepo.findById(prescriptionId);
        if (prescription && prescription.status === 'active') {
          await this.generateSchedulesForMedicine(medicine);
        }
      }

      return medicine;
    });
  }

  /**
   * Update medicine
   */
  async updateMedicine(medicineId, updates) {
    await this.init();

    return Database.executeTransaction(async () => {
      const medicine = await this.medicineRepo.updateMedicine(medicineId, updates);

      // If times or schedule-related fields changed, regenerate future schedules
      const scheduleFields = ['times', 'frequency', 'doseValue', 'startDate', 'endDate'];
      const scheduleChanged = scheduleFields.some(field => updates.hasOwnProperty(field));

      if (scheduleChanged) {
        // Delete future scheduled doses
        await this.scheduledDoseRepo.deleteFutureDosesForMedicine(medicineId);
        
        // Regenerate schedules
        const updatedMedicine = await this.medicineRepo.getMedicineWithTimes(medicineId);
        await this.generateSchedulesForMedicine(updatedMedicine);
      }

      return medicine;
    });
  }

  /**
   * Delete medicine
   */
  async deleteMedicine(medicineId) {
    await this.init();
    return this.medicineRepo.deleteMedicine(medicineId);
  }

  /**
   * Generate schedules for a medicine
   */
  async generateSchedulesForMedicine(medicine) {
    const startDate = medicine.start_date || medicine.startDate;
    let endDate = medicine.end_date || medicine.endDate;
    
    // Calculate end date if not provided
    if (!endDate && medicine.duration_days) {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + (medicine.duration_days * 24 * 60 * 60 * 1000));
      endDate = end.toISOString().split('T')[0];
    } else if (!endDate && medicine.total_quantity) {
      const dailyQuantity = this.medicineRepo.calculateDailyQuantity(medicine);
      const durationDays = Math.ceil(medicine.total_quantity / dailyQuantity);
      const start = new Date(startDate);
      const end = new Date(start.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      endDate = end.toISOString().split('T')[0];
    }

    if (!endDate) {
      console.warn('[PrescriptionService] Cannot generate schedules without end date or duration');
      return [];
    }

    const times = medicine.times || this.getDefaultTimesForFrequency(medicine.frequency);
    
    return this.scheduledDoseRepo.generateSchedulesForMedicine(
      medicine.id,
      startDate,
      endDate,
      times
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCHEDULE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get today's medication schedule
   */
  async getTodaysSchedule(date = null) {
    await this.init();
    return this.scheduledDoseRepo.getTodaysDoses(date);
  }

  /**
   * Get upcoming doses
   */
  async getUpcomingDoses(hoursAhead = 4) {
    await this.init();
    return this.scheduledDoseRepo.getUpcomingDoses(hoursAhead);
  }

  /**
   * Get overdue doses
   */
  async getOverdueDoses() {
    await this.init();
    return this.scheduledDoseRepo.getOverdueDoses();
  }

  /**
   * Mark dose as taken
   */
  async markDoseAsTaken(doseId, takenTime = null, notes = '') {
    await this.init();
    return this.scheduledDoseRepo.markDoseAsTaken(doseId, takenTime, notes);
  }

  /**
   * Mark dose as skipped
   */
  async markDoseAsSkipped(doseId, notes = '') {
    await this.init();
    return this.scheduledDoseRepo.markDoseAsSkipped(doseId, notes);
  }

  /**
   * Snooze dose
   */
  async snoozeDose(doseId, newTime, notes = '') {
    await this.init();
    return this.scheduledDoseRepo.snoozeDose(doseId, newTime, notes);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATISTICS & ANALYTICS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get prescription statistics
   */
  async getPrescriptionStats() {
    await this.init();
    return this.prescriptionRepo.getPrescriptionStats();
  }

  /**
   * Get medication adherence statistics
   */
  async getAdherenceStats(startDate = null, endDate = null) {
    await this.init();
    return this.scheduledDoseRepo.getAdherenceStats(startDate, endDate);
  }

  /**
   * Get medicine statistics
   */
  async getMedicineStats(medicineId) {
    await this.init();
    return this.medicineRepo.getMedicineStats(medicineId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SEARCH & UTILITIES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Search prescriptions
   */
  async searchPrescriptions(searchTerm) {
    await this.init();
    return this.prescriptionRepo.searchPrescriptions(searchTerm);
  }

  /**
   * Search medicines by name
   */
  async searchMedicinesByName(searchTerm) {
    await this.init();
    return this.medicineRepo.searchMedicinesByName(searchTerm);
  }

  /**
   * Get default times for frequency
   */
  getDefaultTimesForFrequency(frequency) {
    return this.medicineRepo.getDefaultTimesForFrequency(frequency);
  }

  /**
   * Auto-mark overdue doses as missed
   */
  async autoMarkOverdueDoses(gracePeriodMinutes = 30) {
    await this.init();
    return this.scheduledDoseRepo.autoMarkOverdueDosesAsMissed(gracePeriodMinutes);
  }

  /**
   * Get database statistics for debugging
   */
  async getDebugStats() {
    await this.init();
    return Database.getStats();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MIGRATION HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Import prescriptions from old AsyncStorage format
   */
  async importFromAsyncStorage(asyncStorageData) {
    await this.init();

    if (!asyncStorageData || !Array.isArray(asyncStorageData)) {
      console.log('[PrescriptionService] No AsyncStorage data to import');
      return { imported: 0, errors: 0 };
    }

    let imported = 0;
    let errors = 0;

    for (const oldPrescription of asyncStorageData) {
      try {
        await this.importSinglePrescription(oldPrescription);
        imported++;
      } catch (error) {
        console.error('[PrescriptionService] Import error:', error);
        errors++;
      }
    }

    console.log(`[PrescriptionService] Import completed: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  /**
   * Import a single prescription from old format
   */
  async importSinglePrescription(oldData) {
    // This will need to be customized based on the actual old data structure
    const prescriptionData = {
      name: oldData.name || oldData.prescriptionName,
      doctorName: oldData.doctorName || oldData.doctor,
      startDate: oldData.startDate || oldData.createdAt,
      endDate: oldData.endDate,
      notes: oldData.notes || oldData.instructions,
      medicines: oldData.medicines || oldData.medications || []
    };

    return this.createPrescription(prescriptionData);
  }
}

// Export singleton instance
export const prescriptionService = new SQLitePrescriptionService();

export default prescriptionService;