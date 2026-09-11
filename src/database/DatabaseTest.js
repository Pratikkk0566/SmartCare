/**
 * Database Test Utility
 * --------------------
 * Simple test functions to verify SQLite foundation is working correctly
 */

import { Database } from './Database';
import { prescriptionService } from '../services/SQLitePrescriptionService';

export class DatabaseTest {
  
  /**
   * Test basic database connectivity and schema
   */
  static async testConnection() {
    console.log('[DatabaseTest] Testing database connection...');
    
    try {
      await Database.init();
      console.log('✓ Database initialized successfully');
      
      const stats = await Database.getStats();
      console.log('✓ Database stats:', stats);
      
      return true;
    } catch (error) {
      console.error('✗ Database connection failed:', error);
      return false;
    }
  }

  /**
   * Test prescription creation and retrieval
   */
  static async testPrescriptionCRUD() {
    console.log('[DatabaseTest] Testing prescription CRUD operations...');
    
    try {
      // Create a test prescription
      const prescriptionData = {
        name: 'Test Prescription',
        doctorName: 'Dr. Test',
        startDate: new Date().toISOString(),
        notes: 'Test prescription for verification',
        medicines: [
          {
            medicineName: 'Test Medicine',
            medicineType: 'tablet',
            doseValue: 1,
            doseUnit: 'tablet',
            frequency: 'twice_daily',
            foodInstruction: 'after_food',
            durationDays: 7,
            times: ['08:00', '20:00']
          }
        ]
      };

      const created = await prescriptionService.createPrescription(prescriptionData);
      console.log('✓ Prescription created:', created.id);

      // Retrieve the prescription
      const retrieved = await prescriptionService.getPrescription(created.id);
      console.log('✓ Prescription retrieved:', retrieved.name, 'with', retrieved.medicines?.length, 'medicines');

      // Update the prescription
      const updated = await prescriptionService.updatePrescription(created.id, {
        notes: 'Updated test prescription'
      });
      console.log('✓ Prescription updated');

      // Activate prescription (this generates schedules)
      await prescriptionService.activatePrescription(created.id);
      console.log('✓ Prescription activated');

      // Get today's schedule
      const todaysSchedule = await prescriptionService.getTodaysSchedule();
      console.log('✓ Today\'s schedule retrieved:', todaysSchedule.length, 'doses');

      // Clean up
      await prescriptionService.deletePrescription(created.id);
      console.log('✓ Prescription deleted');

      return true;
    } catch (error) {
      console.error('✗ Prescription CRUD test failed:', error);
      return false;
    }
  }

  /**
   * Test medication schedule operations
   */
  static async testScheduleOperations() {
    console.log('[DatabaseTest] Testing schedule operations...');
    
    try {
      // Create a prescription with medicine
      const prescriptionData = {
        name: 'Schedule Test Prescription',
        doctorName: 'Dr. Schedule',
        startDate: new Date().toISOString(),
        medicines: [
          {
            medicineName: 'Schedule Test Medicine',
            medicineType: 'tablet',
            doseValue: 1,
            doseUnit: 'tablet',
            frequency: 'three_times_daily',
            durationDays: 2,
            times: ['08:00', '14:00', '20:00']
          }
        ]
      };

      const prescription = await prescriptionService.createPrescription(prescriptionData);
      await prescriptionService.activatePrescription(prescription.id);
      console.log('✓ Test prescription created and activated');

      // Get today's doses
      const todaysDoses = await prescriptionService.getTodaysSchedule();
      console.log('✓ Today\'s doses:', todaysDoses.length);

      // Mark first dose as taken (if any)
      if (todaysDoses.length > 0) {
        await prescriptionService.markDoseAsTaken(todaysDoses[0].id, null, 'Test taken');
        console.log('✓ Dose marked as taken');
      }

      // Get adherence stats
      const adherenceStats = await prescriptionService.getAdherenceStats();
      console.log('✓ Adherence stats:', adherenceStats);

      // Clean up
      await prescriptionService.deletePrescription(prescription.id);
      console.log('✓ Test prescription cleaned up');

      return true;
    } catch (error) {
      console.error('✗ Schedule operations test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests() {
    console.log('[DatabaseTest] Running SQLite foundation tests...\n');
    
    const tests = [
      { name: 'Connection Test', test: this.testConnection },
      { name: 'Prescription CRUD Test', test: this.testPrescriptionCRUD },
      { name: 'Schedule Operations Test', test: this.testScheduleOperations }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      console.log(`\n--- ${name} ---`);
      try {
        const result = await test();
        if (result) {
          passed++;
          console.log(`✓ ${name} PASSED\n`);
        } else {
          failed++;
          console.log(`✗ ${name} FAILED\n`);
        }
      } catch (error) {
        failed++;
        console.error(`✗ ${name} FAILED with error:`, error, '\n');
      }
    }

    console.log(`\n--- TEST SUMMARY ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    return { passed, failed, total: passed + failed };
  }
}

export default DatabaseTest;