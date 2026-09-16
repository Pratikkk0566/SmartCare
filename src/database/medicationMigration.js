/**
 * medicationMigration.js
 * 
 * Migrates medication scheduling data from AsyncStorage to SQLite
 * Handles:
 * - Medications (@medications)
 * - Schedules (@medication_schedules)
 * - Alarms (@medication_alarms)
 * - Events (@medication_events)
 * - Timing config stays in AsyncStorage (global setting)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, generateId, getCurrentTimestamp } from './db';

const ASYNC_STORAGE_KEYS = {
  PRESCRIPTIONS: '@medication_prescriptions',
  MEDICATIONS: '@medications',
  SCHEDULES: '@medication_schedules',
  ALARMS: '@medication_alarms',
  EVENTS: '@medication_events',
};

/**
 * Main migration function - call this during app initialization
 */
export async function migrateMedicationData() {
  console.log('[MedicationMigration] Starting medication data migration from AsyncStorage to SQLite');

  try {
    const migrated = await AsyncStorage.getItem('@medication_migration_complete');
    if (migrated === 'true') {
      console.log('[MedicationMigration] Migration already completed');
      return { success: true, alreadyMigrated: true };
    }

    const results = {
      medications: 0,
      schedules: 0,
      alarms: 0,
      events: 0,
    };

    // Get patient ID
    const patientId = await AsyncStorage.getItem('patientId');
    if (!patientId) {
      console.warn('[MedicationMigration] No patient ID found, skipping migration');
      return { success: false, reason: 'No patientId' };
    }

    // Migrate medications
    const medicationsCount = await migrateMedications(patientId);
    results.medications = medicationsCount;

    // Migrate schedules
    const schedulesCount = await migrateSchedules(patientId);
    results.schedules = schedulesCount;

    // Migrate alarms
    const alarmsCount = await migrateAlarms(patientId);
    results.alarms = alarmsCount;

    // Migrate events
    const eventsCount = await migrateEvents(patientId);
    results.events = eventsCount;

    // Mark migration as complete
    await AsyncStorage.setItem('@medication_migration_complete', 'true');

    console.log('[MedicationMigration] Migration completed successfully:', results);
    return { success: true, results };

  } catch (error) {
    console.error('[MedicationMigration] Migration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Migrate medications from AsyncStorage to medication_schedules table
 */
async function migrateMedications(patientId) {
  try {
    const data = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.MEDICATIONS);
    if (!data) {
      console.log('[MedicationMigration] No medications to migrate');
      return 0;
    }

    const medications = JSON.parse(data);
    if (!Array.isArray(medications) || medications.length === 0) {
      console.log('[MedicationMigration] No medications found');
      return 0;
    }

    const db = await getDatabase();
    const timestamp = getCurrentTimestamp();
    let count = 0;

    for (const med of medications) {
      try {
        const medicationId = med.id || generateId('med');

        // Check if already exists
        const existing = await db.execute(
          'SELECT id FROM medication_schedules WHERE id = ?',
          [medicationId]
        );

        if (existing.rows.length > 0) {
          console.log('[MedicationMigration] Medication already exists:', medicationId);
          continue;
        }

        await db.execute(
          `INSERT INTO medication_schedules (
            id, patient_id, prescription_id, medicine_name, medicine_type,
            dose_value, dose_unit, frequency, food_instruction, start_date,
            end_date, schedule_times, is_active, data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            medicationId,
            patientId,
            med.prescriptionId || null,
            med.medicineName || med.drugName || 'Unknown',
            med.medicineType || 'tablet',
            med.doseValue || 1,
            med.doseUnit || 'tablet',
            med.frequency || null,
            med.foodInstruction || med.whenToTake || null,
            med.startDate || null,
            med.expectedCompletionDate || null,
            med.scheduleTimes ? JSON.stringify(med.scheduleTimes) : null,
            med.cancelled ? 0 : 1,
            JSON.stringify(med),
            timestamp,
            timestamp
          ]
        );

        count++;
      } catch (err) {
        console.error('[MedicationMigration] Error migrating medication:', med.id, err.message);
      }
    }

    console.log(`[MedicationMigration] Migrated ${count} medications`);
    return count;

  } catch (error) {
    console.error('[MedicationMigration] migrateMedications error:', error);
    return 0;
  }
}

/**
 * Migrate schedules from AsyncStorage to scheduled_doses table
 */
async function migrateSchedules(patientId) {
  try {
    const data = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.SCHEDULES);
    if (!data) {
      console.log('[MedicationMigration] No schedules to migrate');
      return 0;
    }

    const schedules = JSON.parse(data);
    if (!Array.isArray(schedules) || schedules.length === 0) {
      console.log('[MedicationMigration] No schedules found');
      return 0;
    }

    const db = await getDatabase();
    const timestamp = getCurrentTimestamp();
    let count = 0;

    for (const schedule of schedules) {
      try {
        const scheduleId = schedule.id || schedule.scheduleId || generateId('schedule');

        // Check if already exists
        const existing = await db.execute(
          'SELECT id FROM scheduled_doses WHERE id = ?',
          [scheduleId]
        );

        if (existing.rows.length > 0) {
          console.log('[MedicationMigration] Schedule already exists:', scheduleId);
          continue;
        }

        await db.execute(
          `INSERT INTO scheduled_doses (
            id, patient_id, schedule_id, scheduled_date, scheduled_time,
            dose_value, dose_unit, status, taken_at, notes, data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scheduleId,
            patientId,
            schedule.medicationId || schedule.schedule_id || null,
            schedule.scheduledDate || schedule.scheduled_date || null,
            schedule.scheduledTime || schedule.scheduled_time || null,
            schedule.doseValue || schedule.dose_value || 1,
            schedule.doseUnit || schedule.dose_unit || 'tablet',
            schedule.status || 'pending',
            schedule.takenAt || schedule.taken_at || null,
            schedule.notes || null,
            JSON.stringify(schedule),
            timestamp,
            timestamp
          ]
        );

        count++;
      } catch (err) {
        console.error('[MedicationMigration] Error migrating schedule:', schedule.id, err.message);
      }
    }

    console.log(`[MedicationMigration] Migrated ${count} schedules`);
    return count;

  } catch (error) {
    console.error('[MedicationMigration] migrateSchedules error:', error);
    return 0;
  }
}

/**
 * Migrate alarms from AsyncStorage to medication_alarms table
 */
async function migrateAlarms(patientId) {
  try {
    const data = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.ALARMS);
    if (!data) {
      console.log('[MedicationMigration] No alarms to migrate');
      return 0;
    }

    const alarms = JSON.parse(data);
    if (!Array.isArray(alarms) || alarms.length === 0) {
      console.log('[MedicationMigration] No alarms found');
      return 0;
    }

    const db = await getDatabase();
    const timestamp = getCurrentTimestamp();
    let count = 0;

    for (const alarm of alarms) {
      try {
        const alarmId = alarm.alarmId || alarm.id || generateId('alarm');

        // Check if already exists
        const existing = await db.execute(
          'SELECT id FROM medication_alarms WHERE id = ?',
          [alarmId]
        );

        if (existing.rows.length > 0) {
          console.log('[MedicationMigration] Alarm already exists:', alarmId);
          continue;
        }

        await db.execute(
          `INSERT INTO medication_alarms (
            id, patient_id, dose_id, schedule_id, alarm_time,
            notification_id, status, snooze_count, data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            alarmId,
            patientId,
            alarm.scheduleId || alarm.dose_id || null,
            alarm.medicationId || alarm.schedule_id || null,
            alarm.scheduledAt || alarm.alarm_time || null,
            alarm.notificationId || alarm.notification_id || null,
            alarm.status || 'scheduled',
            alarm.snoozeCount || alarm.snooze_count || 0,
            JSON.stringify(alarm),
            timestamp,
            timestamp
          ]
        );

        count++;
      } catch (err) {
        console.error('[MedicationMigration] Error migrating alarm:', alarm.alarmId, err.message);
      }
    }

    console.log(`[MedicationMigration] Migrated ${count} alarms`);
    return count;

  } catch (error) {
    console.error('[MedicationMigration] migrateAlarms error:', error);
    return 0;
  }
}

/**
 * Migrate events from AsyncStorage to dose_events table
 */
async function migrateEvents(patientId) {
  try {
    const data = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.EVENTS);
    if (!data) {
      console.log('[MedicationMigration] No events to migrate');
      return 0;
    }

    const events = JSON.parse(data);
    if (!Array.isArray(events) || events.length === 0) {
      console.log('[MedicationMigration] No events found');
      return 0;
    }

    const db = await getDatabase();
    let count = 0;

    for (const event of events) {
      try {
        // Events use auto-increment ID in SQLite
        await db.execute(
          `INSERT INTO dose_events (
            patient_id, dose_id, schedule_id, event_type, event_time, notes, data, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            patientId,
            event.scheduleId || event.dose_id || null,
            event.medicationId || event.schedule_id || null,
            event.type || event.event_type || 'UNKNOWN',
            event.timestamp ? Math.floor(new Date(event.timestamp).getTime() / 1000) : getCurrentTimestamp(),
            event.notes || null,
            JSON.stringify(event),
            getCurrentTimestamp()
          ]
        );

        count++;
      } catch (err) {
        console.error('[MedicationMigration] Error migrating event:', event.id, err.message);
      }
    }

    console.log(`[MedicationMigration] Migrated ${count} events`);
    return count;

  } catch (error) {
    console.error('[MedicationMigration] migrateEvents error:', error);
    return 0;
  }
}

/**
 * Clear AsyncStorage medication data after successful migration
 * Call this after verifying SQLite data is correct
 */
export async function clearAsyncStorageMedicationData() {
  try {
    await AsyncStorage.multiRemove([
      ASYNC_STORAGE_KEYS.PRESCRIPTIONS,
      ASYNC_STORAGE_KEYS.MEDICATIONS,
      ASYNC_STORAGE_KEYS.SCHEDULES,
      ASYNC_STORAGE_KEYS.ALARMS,
      ASYNC_STORAGE_KEYS.EVENTS,
    ]);
    console.log('[MedicationMigration] Cleared AsyncStorage medication data');
    return { success: true };
  } catch (error) {
    console.error('[MedicationMigration] Error clearing AsyncStorage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset migration flag (for testing)
 */
export async function resetMedicationMigration() {
  await AsyncStorage.removeItem('@medication_migration_complete');
  console.log('[MedicationMigration] Migration flag reset');
}
