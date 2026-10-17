/**
 * Medication Test Data Service
 * ----------------------------
 * Creates sample medication data for testing the alarm system
 */

import { generateId, getCurrentTimestamp } from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

class MedicationTestDataService {
  constructor() {
    this.db = null;
  }

  async init() {
    if (!this.db) {
      const { default: Database } = await import('../database/Database');
      this.db = await Database.getConnection();
    }
  }

  /**
   * Create sample prescription and medication data
   */
  async createSampleMedicationData() {
    await this.init();
    
    try {
      const patientId = await AsyncStorage.getItem('patientId');
      if (!patientId) {
        console.log('[MedicationTestData] No patient ID found, creating sample patient');
        return false;
      }

      console.log('[MedicationTestData] Creating sample medication data for patient:', patientId);

      // Create sample prescription
      const prescriptionId = generateId('prescription');
      await this.db.execute(`
        INSERT INTO prescriptions (
          prescription_id, patient_id, practitioner_name, prescription_name,
          prescription_date, start_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        prescriptionId,
        patientId,
        'Dr. Smith',
        'Pain Management Prescription',
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0],
        'active',
        getCurrentTimestamp(),
        getCurrentTimestamp()
      ]);

      // Create sample medicines
      const medicines = [
        {
          medicineId: generateId('medicine'),
          name: 'Paracetamol',
          doseValue: 500,
          doseUnit: 'mg',
          frequency: '3x daily',
          foodInstruction: 'after_food',
          times: ['08:00', '14:00', '20:00']
        },
        {
          medicineId: generateId('medicine'),
          name: 'Ibuprofen',
          doseValue: 400,
          doseUnit: 'mg',
          frequency: '2x daily',
          foodInstruction: 'with_food',
          times: ['09:00', '21:00']
        },
        {
          medicineId: generateId('medicine'),
          name: 'Vitamin D3',
          doseValue: 1000,
          doseUnit: 'IU',
          frequency: '1x daily',
          foodInstruction: 'anytime',
          times: ['10:00']
        }
      ];

      for (const med of medicines) {
        // Insert medicine
        await this.db.execute(`
          INSERT INTO prescription_medicines (
            medicine_id, prescription_id, patient_id, medicine_name,
            dose_value, dose_unit, frequency, food_instruction,
            start_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          med.medicineId,
          prescriptionId,
          patientId,
          med.name,
          med.doseValue,
          med.doseUnit,
          med.frequency,
          med.foodInstruction,
          new Date().toISOString().split('T')[0],
          getCurrentTimestamp(),
          getCurrentTimestamp()
        ]);

        // Create schedules and doses for next 3 days
        for (let day = 0; day < 3; day++) {
          const date = new Date();
          date.setDate(date.getDate() + day);
          const dateString = date.toISOString().split('T')[0];

          for (const time of med.times) {
            const scheduleId = generateId('schedule');
            const doseId = generateId('dose');
            
            // Create schedule
            await this.db.execute(`
              INSERT INTO medicine_schedules (
                schedule_id, medicine_id, patient_id, scheduled_time,
                frequency, created_at
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              scheduleId,
              med.medicineId,
              patientId,
              time,
              med.frequency,
              getCurrentTimestamp()
            ]);

            // Create dose
            await this.db.execute(`
              INSERT INTO medicine_doses (
                dose_id, medicine_id, patient_id, scheduled_date,
                scheduled_time, dose_value, dose_unit, status,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              doseId,
              med.medicineId,
              patientId,
              dateString,
              time,
              med.doseValue,
              med.doseUnit,
              'upcoming',
              getCurrentTimestamp(),
              getCurrentTimestamp()
            ]);

            // Create alarm for upcoming doses (next 24 hours)
            const alarmDateTime = new Date(`${dateString}T${time}:00`);
            if (alarmDateTime > new Date()) {
              const alarmId = generateId('alarm');
              const notificationId = generateId('notification');

              await this.db.execute(`
                INSERT INTO medication_alarms (
                  alarm_id, dose_id, medicine_id, patient_id,
                  alarm_time, notification_id, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                alarmId,
                doseId,
                med.medicineId,
                patientId,
                alarmDateTime.toISOString(),
                notificationId,
                'scheduled',
                getCurrentTimestamp(),
                getCurrentTimestamp()
              ]);
            }
          }
        }
      }

      console.log('[MedicationTestData] ✅ Sample medication data created successfully');
      return true;

    } catch (error) {
      console.error('[MedicationTestData] Error creating sample data:', error);
      return false;
    }
  }

  /**
   * Check if medication data exists
   */
  async hasMedicationData() {
    await this.init();
    
    try {
      const patientId = await AsyncStorage.getItem('patientId');
      if (!patientId) return false;

      const result = await this.db.execute(
        'SELECT COUNT(*) as count FROM prescription_medicines WHERE patient_id = ?',
        [patientId]
      );

      const count = result.rows?.[0]?.count || 0;
      console.log('[MedicationTestData] Found', count, 'medicines for patient');
      
      return count > 0;

    } catch (error) {
      console.error('[MedicationTestData] Error checking medication data:', error);
      return false;
    }
  }

  /**
   * Clear all test medication data
   */
  async clearTestData() {
    await this.init();
    
    try {
      const patientId = await AsyncStorage.getItem('patientId');
      if (!patientId) return false;

      console.log('[MedicationTestData] Clearing test data for patient:', patientId);

      // Delete in reverse order to respect foreign keys
      await this.db.execute('DELETE FROM medication_alarms WHERE patient_id = ?', [patientId]);
      await this.db.execute('DELETE FROM medicine_doses WHERE patient_id = ?', [patientId]);
      await this.db.execute('DELETE FROM medicine_schedules WHERE patient_id = ?', [patientId]);
      await this.db.execute('DELETE FROM prescription_medicines WHERE patient_id = ?', [patientId]);
      await this.db.execute('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);

      console.log('[MedicationTestData] ✅ Test data cleared');
      return true;

    } catch (error) {
      console.error('[MedicationTestData] Error clearing test data:', error);
      return false;
    }
  }
}

export const medicationTestDataService = new MedicationTestDataService();
export default medicationTestDataService;