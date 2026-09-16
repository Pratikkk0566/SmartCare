/**
 * Appointment Storage Module
 * --------------------------
 * Handles appointment HISTORY storage (read-only cached data)
 * 
 * IMPORTANT: This module is ONLY for storing past appointment data
 * New appointment booking must remain strictly online via API
 * Do NOT add booking/creation functions here
 */
import { getDatabase, generateId, getCurrentTimestamp } from './db.js';

/**
 * Save appointment history for a patient (replaces existing)
 * This is for caching appointment history received from the API
 */
export async function saveAppointmentHistory(patientId, appointments) {
  const db = await getDatabase();
  
  if (!Array.isArray(appointments) || appointments.length === 0) {
    console.log('[AppointmentStorage] No appointments to save');
    return;
  }
  
  // Clear existing appointments for this patient
  await db.execute('DELETE FROM appointments WHERE patient_id = ?', [patientId]);
  
  // Insert appointment history
  const insertSql = `
    INSERT INTO appointments (id, patient_id, appointment_date, appointment_time, doctor_name, status, data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const timestamp = getCurrentTimestamp();
  
  for (const appointment of appointments) {
    const id = appointment.id || appointment.appointmentId || generateId('apt');
    const appointmentDate = appointment.date || appointment.appointmentDate || appointment.appointmentdate || '';
    const appointmentTime = appointment.time || appointment.appointmentTime || '';
    const doctorName = appointment.doctorName || appointment.doctor || appointment.practitionerName || '';
    const status = appointment.status || appointment.appointmentStatus || 'unknown';
    
    await db.execute(insertSql, [
      id,
      patientId,
      appointmentDate,
      appointmentTime,
      doctorName,
      status,
      JSON.stringify(appointment),
      timestamp
    ]);
  }
  
  console.log(`[AppointmentStorage] Saved ${appointments.length} appointments for patient:`, patientId);
}

/**
 * Upsert appointments (add new or update existing)
 */
export async function upsertAppointments(patientId, appointments) {
  const db = await getDatabase();
  
  if (!Array.isArray(appointments) || appointments.length === 0) {
    console.log('[AppointmentStorage] No appointments to upsert');
    return;
  }
  
  const timestamp = getCurrentTimestamp();
  
  for (const appointment of appointments) {
    const id = appointment.id || appointment.appointmentId || generateId('apt');
    const appointmentDate = appointment.date || appointment.appointmentDate || appointment.appointmentdate || '';
    const appointmentTime = appointment.time || appointment.appointmentTime || '';
    const doctorName = appointment.doctorName || appointment.doctor || appointment.practitionerName || '';
    const status = appointment.status || appointment.appointmentStatus || 'unknown';
    
    // Check if appointment exists
    const existsResult = await db.execute(
      'SELECT 1 FROM appointments WHERE id = ? AND patient_id = ? LIMIT 1',
      [id, patientId]
    );
    
    const exists = existsResult.rows && existsResult.rows.length > 0;
    
    if (exists) {
      // Update existing
      await db.execute(
        `UPDATE appointments 
         SET appointment_date = ?, appointment_time = ?, doctor_name = ?, status = ?, data = ?, updated_at = ?
         WHERE id = ? AND patient_id = ?`,
        [appointmentDate, appointmentTime, doctorName, status, JSON.stringify(appointment), timestamp, id, patientId]
      );
    } else {
      // Insert new
      await db.execute(
        `INSERT INTO appointments (id, patient_id, appointment_date, appointment_time, doctor_name, status, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patientId, appointmentDate, appointmentTime, doctorName, status, JSON.stringify(appointment), timestamp, timestamp]
      );
    }
  }
  
  console.log(`[AppointmentStorage] Upserted ${appointments.length} appointments for patient:`, patientId);
}

/**
 * Get all appointments for a patient
 */
export async function getAppointments(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC',
    [patientId]
  );
  
  const appointments = result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
  
  console.log(`[AppointmentStorage] Retrieved ${appointments.length} appointments for patient:`, patientId);
  return appointments;
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(patientId, appointmentId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM appointments WHERE patient_id = ? AND id = ?',
    [patientId, appointmentId]
  );
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      id: row.id,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      doctorName: row.doctor_name,
      status: row.status,
      ...JSON.parse(row.data)
    };
  }
  
  return null;
}

/**
 * Get appointments by date range
 */
export async function getAppointmentsByDateRange(patientId, startDate, endDate) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM appointments 
     WHERE patient_id = ? AND appointment_date >= ? AND appointment_date <= ?
     ORDER BY appointment_date DESC, appointment_time DESC`,
    [patientId, startDate, endDate]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
}

/**
 * Get upcoming appointments (future dates)
 */
export async function getUpcomingAppointments(patientId) {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const result = await db.execute(
    `SELECT * FROM appointments 
     WHERE patient_id = ? AND appointment_date >= ?
     ORDER BY appointment_date ASC, appointment_time ASC`,
    [patientId, today]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
}

/**
 * Get past appointments (historical)
 */
export async function getPastAppointments(patientId) {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const result = await db.execute(
    `SELECT * FROM appointments 
     WHERE patient_id = ? AND appointment_date < ?
     ORDER BY appointment_date DESC, appointment_time DESC`,
    [patientId, today]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
}

/**
 * Get appointments by status
 */
export async function getAppointmentsByStatus(patientId, status) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM appointments 
     WHERE patient_id = ? AND status = ?
     ORDER BY appointment_date DESC, appointment_time DESC`,
    [patientId, status]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
}

/**
 * Search appointments by doctor name
 */
export async function searchAppointments(patientId, searchQuery) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM appointments 
     WHERE patient_id = ? AND (doctor_name LIKE ? OR data LIKE ?)
     ORDER BY appointment_date DESC`,
    [patientId, `%${searchQuery}%`, `%${searchQuery}%`]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    doctorName: row.doctor_name,
    status: row.status,
    ...JSON.parse(row.data)
  }));
}

/**
 * Delete an appointment from history
 */
export async function deleteAppointment(patientId, appointmentId) {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM appointments WHERE patient_id = ? AND id = ?',
    [patientId, appointmentId]
  );
  
  console.log('[AppointmentStorage] Deleted appointment:', appointmentId);
}

/**
 * Clear all appointments for a patient
 */
export async function clearPatientAppointments(patientId) {
  const db = await getDatabase();
  await db.execute('DELETE FROM appointments WHERE patient_id = ?', [patientId]);
  
  console.log('[AppointmentStorage] Cleared all appointments for patient:', patientId);
}

/**
 * Get appointment count for a patient
 */
export async function getAppointmentCount(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?',
    [patientId]
  );
  
  return result.rows[0]?.count || 0;
}
