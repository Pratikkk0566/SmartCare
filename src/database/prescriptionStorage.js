/**
 * Prescription Storage Module
 * Simple operations for prescription data with active prescription detection
 */
import { getDatabase, generateId, getCurrentTimestamp } from './db.js';

export async function savePrescriptions(patientId, prescriptions) {
  const db = await getDatabase();
  
  // Clear existing prescriptions for this patient
  await db.execute('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);
  
  // Insert new prescriptions
  const insertSql = `
    INSERT INTO prescriptions (id, patient_id, data, updated_at)
    VALUES (?, ?, ?, ?)
  `;
  
  const timestamp = getCurrentTimestamp();
  
  for (const prescription of prescriptions) {
    const id = prescription.id || generateId('rx');
    await db.execute(insertSql, [
      id,
      patientId,
      JSON.stringify(prescription),
      timestamp
    ]);
  }
  
  console.log(`[PrescriptionStorage] Saved ${prescriptions.length} prescriptions for patient:`, patientId);
}

export async function getPrescriptions(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY updated_at DESC',
    [patientId]
  );
  
  const prescriptions = result.rows.map(row => ({
    id: row.id,
    ...JSON.parse(row.data)
  }));
  
  console.log(`[PrescriptionStorage] Retrieved ${prescriptions.length} prescriptions for patient:`, patientId);
  return prescriptions;
}

export async function getPrescription(patientId, prescriptionId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM prescriptions WHERE patient_id = ? AND id = ?',
    [patientId, prescriptionId]
  );
  
  if (result.rows.length > 0) {
    return {
      id: result.rows[0].id,
      ...JSON.parse(result.rows[0].data)
    };
  }
  
  return null;
}

/**
 * Upsert prescriptions (add new or update existing)
 * This is the recommended method for API data sync
 */
export async function upsertPrescriptions(patientId, prescriptions) {
  const db = await getDatabase();
  
  if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
    console.log('[PrescriptionStorage] No prescriptions to upsert');
    return;
  }
  
  const timestamp = getCurrentTimestamp();
  
  for (const prescription of prescriptions) {
    const id = prescription.id || prescription.prescriptionId || generateId('rx');
    
    // Check if prescription exists
    const existsResult = await db.execute(
      'SELECT 1 FROM prescriptions WHERE id = ? AND patient_id = ? LIMIT 1',
      [id, patientId]
    );
    
    const exists = existsResult.rows && existsResult.rows.length > 0;
    
    if (exists) {
      // Update existing
      await db.execute(
        'UPDATE prescriptions SET data = ?, updated_at = ? WHERE id = ? AND patient_id = ?',
        [JSON.stringify(prescription), timestamp, id, patientId]
      );
    } else {
      // Insert new
      await db.execute(
        'INSERT INTO prescriptions (id, patient_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, patientId, JSON.stringify(prescription), timestamp, timestamp]
      );
    }
  }
  
  console.log(`[PrescriptionStorage] Upserted ${prescriptions.length} prescriptions for patient:`, patientId);
}

/**
 * Get active prescriptions (medicines still within duration window)
 * Uses the same logic as computePrescriptionRelevance from API
 */
export async function getActivePrescriptions(patientId) {
  const allPrescriptions = await getPrescriptions(patientId);
  
  const activePrescriptions = allPrescriptions.filter(prescription => {
    // Check if prescription has relevanceLevel computed
    if (prescription.relevanceLevel === 'active') {
      return true;
    }
    
    // Fallback: compute relevance if not already present
    const medicines = prescription.medicines || [];
    const lastmodified = prescription.lastmodified || prescription.date || '';
    
    if (!lastmodified || medicines.length === 0) {
      return false;
    }
    
    // Check if any medicine is still active
    for (const med of medicines) {
      const durDays = parseDuration(med.duration, med.priscdurationtype);
      if (durDays === 0) {
        // No duration info means maintenance medication (active)
        return true;
      }
      
      const startTs = Date.parse(String(lastmodified).replace(/-/g, '/'));
      if (!startTs) continue;
      
      const expiryTs = startTs + durDays * 24 * 60 * 60 * 1000;
      const daysLeft = Math.floor((expiryTs - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft >= 0) {
        // At least one medicine still active
        return true;
      }
    }
    
    return false;
  });
  
  console.log(`[PrescriptionStorage] Found ${activePrescriptions.length} active prescriptions out of ${allPrescriptions.length}`);
  return activePrescriptions;
}

/**
 * Helper: Parse duration string to days
 * Matches logic from API.js durationToDays
 */
function parseDuration(durationVal, durTypeVal) {
  const raw = String(durationVal || '').trim();
  if (!raw) return 0;
  const n = parseFloat(raw);
  if (!isFinite(n) || n <= 0) return 0;

  const t = String(durTypeVal || 'Days').trim().toLowerCase();
  if (t.startsWith('day'))    return n;
  if (t.startsWith('week'))   return n * 7;
  if (t.startsWith('month'))  return n * 30;
  if (t.startsWith('year'))   return n * 365;
  return n; // Default to days
}

export async function deletePrescription(patientId, prescriptionId) {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM prescriptions WHERE patient_id = ? AND id = ?',
    [patientId, prescriptionId]
  );
  
  console.log('[PrescriptionStorage] Deleted prescription:', prescriptionId);
}

export async function clearPatientPrescriptions(patientId) {
  const db = await getDatabase();
  await db.execute('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);
  
  console.log('[PrescriptionStorage] Cleared all prescriptions for patient:', patientId);
}
