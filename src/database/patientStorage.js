/**
 * Patient Storage Module
 * Simple operations for patient data
 */
import { getDatabase, generateId } from './db.js';

export async function savePatient(patientId, patientData) {
  const db = await getDatabase();
  const sql = `
    INSERT OR REPLACE INTO patients (id, data, updated_at)
    VALUES (?, ?, ?)
  `;
  
  await db.execute(sql, [
    patientId,
    JSON.stringify(patientData),
    Math.floor(Date.now() / 1000)
  ]);
  
  console.log('[PatientStorage] Saved patient:', patientId);
  return patientId;
}

export async function getPatient(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM patients WHERE id = ?',
    [patientId]
  );
  
  if (result.rows.length > 0) {
    const patient = JSON.parse(result.rows[0].data);
    console.log('[PatientStorage] Retrieved patient:', patientId);
    return patient;
  }
  
  return null;
}

export async function getAllPatients() {
  const db = await getDatabase();
  const result = await db.execute('SELECT * FROM patients ORDER BY updated_at DESC');
  
  return result.rows.map(row => ({
    id: row.id,
    ...JSON.parse(row.data),
    updatedAt: row.updated_at
  }));
}

export async function deletePatient(patientId) {
  const db = await getDatabase();
  
  // This will cascade delete all related data due to foreign key constraints
  await db.execute('DELETE FROM patients WHERE id = ?', [patientId]);
  
  console.log('[PatientStorage] Deleted patient and all related data:', patientId);
}

export async function patientExists(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM patients WHERE id = ?',
    [patientId]
  );
  
  return result.rows[0].count > 0;
}