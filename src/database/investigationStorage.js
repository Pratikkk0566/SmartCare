/**
 * Investigation Storage Module
 * Simple operations for investigation/report data
 * Stores metadata in SQLite, file paths for PDFs
 */
import { getDatabase, generateId } from './db.js';

export async function saveInvestigations(patientId, investigations) {
  const db = await getDatabase();
  
  // Clear existing investigations for this patient
  await db.execute('DELETE FROM investigations WHERE patient_id = ?', [patientId]);
  
  // Insert new investigations
  const insertSql = `
    INSERT INTO investigations (id, patient_id, title, date, file_path, data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  for (const investigation of investigations) {
    const id = investigation.id || generateId();
    await db.execute(insertSql, [
      id,
      patientId,
      investigation.title || investigation.name || 'Investigation Report',
      investigation.date || investigation.reportDate,
      investigation.filePath || null, // Store file path separately
      JSON.stringify(investigation),
      timestamp
    ]);
  }
  
  console.log(`[InvestigationStorage] Saved ${investigations.length} investigations for patient:`, patientId);
}

export async function getInvestigations(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM investigations WHERE patient_id = ? ORDER BY date DESC, updated_at DESC',
    [patientId]
  );
  
  const investigations = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    date: row.date,
    filePath: row.file_path,
    ...JSON.parse(row.data)
  }));
  
  console.log(`[InvestigationStorage] Retrieved ${investigations.length} investigations for patient:`, patientId);
  return investigations;
}

export async function getInvestigation(patientId, investigationId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM investigations WHERE patient_id = ? AND id = ?',
    [patientId, investigationId]
  );
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      filePath: row.file_path,
      ...JSON.parse(row.data)
    };
  }
  
  return null;
}

export async function updateInvestigationFile(patientId, investigationId, filePath) {
  const db = await getDatabase();
  await db.execute(
    'UPDATE investigations SET file_path = ? WHERE patient_id = ? AND id = ?',
    [filePath, patientId, investigationId]
  );
  
  console.log('[InvestigationStorage] Updated file path for investigation:', investigationId);
}

export async function deleteInvestigation(patientId, investigationId) {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM investigations WHERE patient_id = ? AND id = ?',
    [patientId, investigationId]
  );
  
  console.log('[InvestigationStorage] Deleted investigation:', investigationId);
}

export async function clearPatientInvestigations(patientId) {
  const db = await getDatabase();
  await db.execute('DELETE FROM investigations WHERE patient_id = ?', [patientId]);
  
  console.log('[InvestigationStorage] Cleared all investigations for patient:', patientId);
}

export async function searchInvestigations(patientId, searchQuery) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM investigations 
     WHERE patient_id = ? AND (title LIKE ? OR data LIKE ?)
     ORDER BY date DESC, updated_at DESC`,
    [patientId, `%${searchQuery}%`, `%${searchQuery}%`]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    date: row.date,
    filePath: row.file_path,
    ...JSON.parse(row.data)
  }));
}