/**
 * SQLite Data Service
 * ------------------
 * Primary data service that completely replaces AsyncStorage
 * Provides unified interface for all app data with patient-scoped operations
 * 
 * UPDATED: Now uses db.js (Phase 2-10 architecture) instead of Database.js
 */

import { getDatabase } from '../database/db';
// Note: Repositories are legacy and use the old Database.js system
// We'll keep them for now but they won't be actively used
// TODO: Phase 15 - Remove old repositories after migration complete
import PatientRepository from '../database/repositories/PatientRepository';
import InvestigationRepository from '../database/repositories/InvestigationRepository';
import PrescriptionRepository from '../database/repositories/PrescriptionRepository';
import MedicineRepository from '../database/repositories/MedicineRepository';
import ScheduledDoseRepository from '../database/repositories/ScheduledDoseRepository';
import MedicationAlarmRepository from '../database/repositories/MedicationAlarmRepository';
import { localAlarmManager } from './LocalAlarmManager';

export class SQLiteDataService {
  constructor() {
    this.patientRepo = new PatientRepository();
    this.investigationRepo = new InvestigationRepository();
    this.prescriptionRepo = new PrescriptionRepository();
    this.medicineRepo = new MedicineRepository();
    this.scheduledDoseRepo = new ScheduledDoseRepository();
    this.alarmRepo = new MedicationAlarmRepository();
    
    this.isInitialized = false;
    this.currentPatientId = null;
  }

  /**
   * Initialize the service
   * UPDATED: Now uses db.js singleton pattern (Phase 2-10)
   */
  async init() {
    if (this.isInitialized) {
      console.log('[SQLiteDataService] Already initialized, skipping');
      return;
    }
    
    try {
      // Use the new db.js singleton (Phase 2-10 architecture)
      await getDatabase();
      console.log('[SQLiteDataService] Database connection established');
      
      // Initialize the local alarm manager
      await localAlarmManager.init();
      
      this.isInitialized = true;
      console.log('[SQLiteDataService] ✅ Initialized successfully with alarm system');
    } catch (error) {
      console.error('[SQLiteDataService] ❌ Initialization failed:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Set current active patient
   */
  setCurrentPatient(patientId) {
    this.currentPatientId = patientId;
    console.log('[SQLiteDataService] Active patient set to:', patientId);
  }

  /**
   * Get current active patient ID
   */
  getCurrentPatientId() {
    return this.currentPatientId;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PATIENT OPERATIONS (replaces profile in AsyncStorage)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Save patient profile (replaces StorageService.saveProfile)
   */
  async saveProfile(profileData) {
    await this.init();

    const patientId = profileData.patientId || profileData.patient_id;
    if (!patientId) {
      throw new Error('Patient ID is required to save profile');
    }

    const existing = await this.patientRepo.getPatient(patientId);
    
    if (existing) {
      return await this.patientRepo.updatePatient(patientId, profileData);
    } else {
      return await this.patientRepo.createPatient(profileData);
    }
  }

  /**
   * Get patient profile (replaces StorageService.getProfile)
   */
  async getProfile(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return null;

    return await this.patientRepo.getPatient(id);
  }

  /**
   * Get patient by phone
   */
  async getPatientByPhone(phone) {
    await this.init();
    return await this.patientRepo.getPatientByPhone(phone);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INVESTIGATION OPERATIONS (replaces AsyncStorage investigations)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Save investigations (replaces StorageService.saveInvestigations)
   */
  async saveInvestigations(investigations, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required to save investigations');
    }

    console.log(`[SQLiteDataService] Saving ${investigations.length} investigations for patient ${id}`);
    
    // 🎯 CRITICAL FIX: Ensure patient exists before saving investigations
    try {
      console.log('[SQLiteDataService] 🔍 Checking if patient exists...');
      const existingPatient = await this.patientRepo.findById(id);
      
      if (!existingPatient) {
        console.log('[SQLiteDataService] 📝 Patient not found, creating minimal patient record...');
        
        // Create minimal patient record to satisfy foreign key constraint
        const minimalPatient = {
          patient_id: id,
          first_name: 'Unknown',
          last_name: 'Patient',
          email: '',
          phone: '',
          gender: 'Unknown',
          date_of_birth: '',
          address: '',
          city: '',
          state: '',
          uhid: id,
          blood_group: '',
          height: '',
          weight: ''
        };
        
        await this.patientRepo.upsert(minimalPatient);
        console.log('[SQLiteDataService] ✅ Minimal patient record created');
      } else {
        console.log('[SQLiteDataService] ✅ Patient already exists');
      }
    } catch (patientError) {
      console.error('[SQLiteDataService] ⚠️ Patient check/creation failed:', patientError.message);
      // Continue anyway - some databases might not have foreign key constraints enabled
    }

    return await this.investigationRepo.bulkUpsertInvestigations(id, investigations);
  }

  /**
   * Get investigations (replaces StorageService.getInvestigations)
   */
  async getInvestigations(patientId = null) {
    try {
      console.log('[SQLiteDataService] getInvestigations called with patientId:', patientId);
      await this.init();
      
      const id = patientId || this.currentPatientId;
      console.log('[SQLiteDataService] Resolved patient ID:', id);
      
      if (!id) {
        console.log('[SQLiteDataService] No patient ID available, returning empty array');
        return [];
      }

      console.log('[SQLiteDataService] Calling investigationRepo.getInvestigationsByPatient...');
      const result = await this.investigationRepo.getInvestigationsByPatient(id);
      console.log('[SQLiteDataService] Retrieved', result?.length || 0, 'investigations');
      return result;
    } catch (error) {
      console.error('[SQLiteDataService] ❌ Error in getInvestigations:', error);
      console.error('[SQLiteDataService] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Search investigations
   */
  async searchInvestigations(query, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    return await this.investigationRepo.searchInvestigations(id, query);
  }

  /**
   * Filter investigations by category
   */
  async getInvestigationsByCategory(category, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    return await this.investigationRepo.getInvestigationsByCategory(id, category);
  }

  /**
   * Filter investigations by date range
   */
  async getInvestigationsByDateRange(startDate, endDate, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    return await this.investigationRepo.getInvestigationsByDateRange(id, startDate, endDate);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRESCRIPTION OPERATIONS (enhanced patient-scoped)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Save prescription with patient scope
   */
  async savePrescription(prescriptionData, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required to save prescription');
    }

    return await this.prescriptionRepo.createPrescription({
      ...prescriptionData,
      patient_id: id
    });
  }

  /**
   * Get prescriptions for current/specified patient
   */
  async getPrescriptions(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    return await this.prescriptionRepo.getPrescriptionsByPatient(id);
  }

  /**
   * Get active prescriptions for patient
   */
  async getActivePrescriptions(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    return await this.prescriptionRepo.getActivePrescriptionsByPatient(id);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MEDICATION SCHEDULE OPERATIONS (patient-scoped)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get today's medication schedule for patient
   */
  async getTodaysSchedule(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return [];

    const today = new Date().toISOString().split('T')[0];
    return await this.scheduledDoseRepo.getDosesByDate(id, today);
  }

  /**
   * Mark dose as taken
   */
  async markDoseAsTaken(doseId, actualTime = null, notes = '') {
    await this.init();
    
    return await this.scheduledDoseRepo.markDoseAsTaken(doseId, actualTime, notes);
  }

  /**
   * Get adherence statistics for patient
   */
  async getAdherenceStats(days = 7, patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) return { totalDoses: 0, takenDoses: 0, adherencePercent: 0 };

    return await this.scheduledDoseRepo.getAdherenceStats(id, days);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MULTI-PATIENT OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get all available patients
   */
  async getAllPatients() {
    await this.init();
    return await this.patientRepo.getAllActivePatients();
  }

  /**
   * Switch to different patient context
   */
  async switchPatient(patientId) {
    await this.init();
    
    const patient = await this.patientRepo.getPatient(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    this.setCurrentPatient(patientId);
    console.log('[SQLiteDataService] Switched to patient:', patient.firstName, patient.lastName);
    
    return patient;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DATA MIGRATION FROM ASYNCSTORAGE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Migrate profile data from AsyncStorage format
   */
  async migrateProfileFromAsyncStorage(asyncProfileData, patientId) {
    console.log('[SQLiteDataService] Migrating profile data for patient:', patientId);
    
    const transformedProfile = {
      patient_id: patientId,
      uhid: asyncProfileData.uhid,
      phone: asyncProfileData.phone,
      firstName: asyncProfileData.firstName,
      lastName: asyncProfileData.lastName,
      middleName: asyncProfileData.middleName,
      email: asyncProfileData.email,
      gender: asyncProfileData.gender,
      dob: asyncProfileData.dob,
      address: asyncProfileData.address,
      city: asyncProfileData.city,
      state: asyncProfileData.state,
      bloodGroup: asyncProfileData.bloodGroup,
      height: asyncProfileData.height,
      heightUnit: asyncProfileData.heightUnit,
      weight: asyncProfileData.weight,
      weightUnit: asyncProfileData.weightUnit,
      bp: asyncProfileData.bp,
      allergies: asyncProfileData.allergies || []
    };

    return await this.saveProfile(transformedProfile);
  }

  /**
   * Migrate investigations from AsyncStorage format
   */
  async migrateInvestigationsFromAsyncStorage(asyncInvestigations, patientId) {
    console.log('[SQLiteDataService] Migrating investigations for patient:', patientId);
    
    const transformedInvestigations = asyncInvestigations.map(inv => ({
      investigation_id: inv.id,
      patient_id: patientId,
      investigation_name: inv.name,
      category: inv.category,
      status: inv.status || 'Approved',
      investigation_date: inv.date,
      investigation_time: inv.time || '',
      report_url: inv.resultUrl || inv.printUrl,
      lab_name: inv.labName,
      practitioner_name: inv.doctorName
    }));

    return await this.saveInvestigations(transformedInvestigations, patientId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STATISTICS AND UTILITIES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get patient dashboard stats
   */
  async getPatientDashboardStats(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      return {
        investigations: 0,
        prescriptions: 0,
        activePrescriptions: 0,
        todaysDoses: 0
      };
    }

    const [investigations, prescriptions, activePrescriptions, todaysDoses] = await Promise.all([
      this.investigationRepo.getInvestigationsByPatient(id),
      this.prescriptionRepo.getPrescriptionsByPatient(id),
      this.prescriptionRepo.getActivePrescriptionsByPatient(id),
      this.getTodaysSchedule(id)
    ]);

    return {
      investigations: investigations.length,
      prescriptions: prescriptions.length,
      activePrescriptions: activePrescriptions.length,
      todaysDoses: todaysDoses.length
    };
  }

  /**
   * Clear all data for a patient (for testing)
   */
  async clearPatientData(patientId) {
    await this.init();
    
    console.log('[SQLiteDataService] Clearing all data for patient:', patientId);
    
    // Clear in reverse dependency order
    await this.scheduledDoseRepo.clearPatientDoses(patientId);
    await this.medicineRepo.clearPatientMedicines(patientId);
    await this.prescriptionRepo.clearPatientPrescriptions(patientId);
    await this.investigationRepo.clearPatientInvestigations(patientId);
    
    console.log('[SQLiteDataService] Patient data cleared successfully');
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    await this.init();
    return await Database.getStats();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APP SETTINGS (replaces small AsyncStorage values)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Save app setting
   */
  async saveSetting(key, value) {
    await this.init();
    
    const sql = `
      INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at) 
      VALUES (?, ?, ?)
    `;
    await Database.query(sql, [key, JSON.stringify(value), new Date().toISOString()]);
  }

  /**
   * Get app setting
   */
  async getSetting(key, defaultValue = null) {
    await this.init();
    
    const sql = `SELECT setting_value FROM app_settings WHERE setting_key = ?`;
    const results = await Database.query(sql, [key]);
    
    if (results.length === 0) return defaultValue;
    
    try {
      return JSON.parse(results[0].setting_value);
    } catch (e) {
      return results[0].setting_value;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MEDICATION ALARM SYSTEM METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get today's medication schedule with alarm information
   */
  async getTodaysScheduleWithAlarms(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required to get schedule');
    }

    console.log(`[SQLiteDataService] Getting today's schedule with alarms for patient ${id}`);
    
    // Get today's doses
    const todaysDoses = await this.scheduledDoseRepo.getTodaysDoses(id);
    
    // Get associated alarms
    const todaysAlarms = await this.alarmRepo.getTodaysAlarms(id);
    
    // Combine dose and alarm data
    const schedule = todaysDoses.map(dose => {
      const alarm = todaysAlarms.find(a => a.dose_id === dose.dose_id);
      return {
        ...dose,
        alarm: alarm || null,
        hasAlarm: !!alarm,
        alarmStatus: alarm?.status || 'none'
      };
    });
    
    return schedule;
  }

  /**
   * Take a medicine dose (with alarm cancellation)
   */
  async takeMedicine(doseId, notes = '') {
    await this.init();
    
    console.log('[SQLiteDataService] Taking medicine - dose:', doseId);
    return this.scheduledDoseRepo.markDoseAsTaken(doseId, null, notes);
  }

  /**
   * Skip a medicine dose (with alarm cancellation)
   */
  async skipMedicine(doseId, notes = '') {
    await this.init();
    
    console.log('[SQLiteDataService] Skipping medicine - dose:', doseId);
    return this.scheduledDoseRepo.markDoseAsSkipped(doseId, notes);
  }

  /**
   * Snooze a medicine alarm
   */
  async snoozeMedicine(alarmId, snoozeMinutes = 15) {
    await this.init();
    
    console.log('[SQLiteDataService] Snoozing alarm:', alarmId, 'for', snoozeMinutes, 'minutes');
    return localAlarmManager.snoozeAlarm(alarmId, snoozeMinutes);
  }

  /**
   * Get medication adherence statistics
   */
  async getMedicationAdherence(patientId = null, startDate = null, endDate = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required for adherence stats');
    }

    return this.scheduledDoseRepo.getAdherenceStats(startDate, endDate);
  }

  /**
   * Get medication history
   */
  async getMedicationHistory(patientId = null, limit = 50) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required for medication history');
    }

    const query = `
      SELECT 
        mh.*,
        pm.medicine_name,
        md.scheduled_date,
        md.scheduled_time
      FROM medication_history mh
      JOIN medicine_doses md ON mh.dose_id = md.dose_id
      JOIN prescription_medicines pm ON mh.medicine_id = pm.medicine_id
      WHERE mh.patient_id = ?
      ORDER BY mh.timestamp DESC
      LIMIT ?
    `;
    
    return this.alarmRepo.query(query, [id, limit]);
  }

  /**
   * Schedule alarms for upcoming medications
   */
  async scheduleUpcomingAlarms(patientId = null, days = 14) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required to schedule alarms');
    }

    console.log('[SQLiteDataService] Scheduling upcoming alarms for patient:', id);
    return localAlarmManager.scheduleUpcomingAlarms(id, days);
  }

  /**
   * Get alarm statistics
   */
  async getAlarmStats(patientId = null) {
    await this.init();
    
    const id = patientId || this.currentPatientId;
    if (!id) {
      throw new Error('Patient ID is required for alarm stats');
    }

    return this.alarmRepo.getAlarmStats(id);
  }
}

// Export singleton instance
export const sqliteDataService = new SQLiteDataService();
export default sqliteDataService;