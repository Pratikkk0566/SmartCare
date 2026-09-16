/**
 * Invoice Storage Module
 * ----------------------
 * Handles invoice data storage with offline capability
 * Invoices are read-only PHR data from the hospital
 */
import { getDatabase, generateId, getCurrentTimestamp, batchUpsert } from './db.js';

/**
 * Save invoices for a patient (replaces existing)
 */
export async function saveInvoices(patientId, invoices) {
  const db = await getDatabase();
  
  if (!Array.isArray(invoices) || invoices.length === 0) {
    console.log('[InvoiceStorage] No invoices to save');
    return;
  }
  
  // Clear existing invoices for this patient
  await db.execute('DELETE FROM invoices WHERE patient_id = ?', [patientId]);
  
  // Insert new invoices
  const insertSql = `
    INSERT INTO invoices (id, patient_id, invoice_date, invoice_number, amount, data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const timestamp = getCurrentTimestamp();
  
  for (const invoice of invoices) {
    const id = invoice.id || invoice.invoiceId || generateId('inv');
    const invoiceDate = invoice.date || invoice.invoiceDate || invoice.createdDate || '';
    const invoiceNumber = invoice.invoiceNo || invoice.invoiceNumber || invoice.billNo || '';
    const amount = parseFloat(invoice.amount || invoice.totalAmount || invoice.total || 0);
    
    await db.execute(insertSql, [
      id,
      patientId,
      invoiceDate,
      invoiceNumber,
      amount,
      JSON.stringify(invoice),
      timestamp
    ]);
  }
  
  console.log(`[InvoiceStorage] Saved ${invoices.length} invoices for patient:`, patientId);
}

/**
 * Upsert invoices (add new or update existing)
 */
export async function upsertInvoices(patientId, invoices) {
  const db = await getDatabase();
  
  if (!Array.isArray(invoices) || invoices.length === 0) {
    console.log('[InvoiceStorage] No invoices to upsert');
    return;
  }
  
  const timestamp = getCurrentTimestamp();
  
  for (const invoice of invoices) {
    const id = invoice.id || invoice.invoiceId || generateId('inv');
    const invoiceDate = invoice.date || invoice.invoiceDate || invoice.createdDate || '';
    const invoiceNumber = invoice.invoiceNo || invoice.invoiceNumber || invoice.billNo || '';
    const amount = parseFloat(invoice.amount || invoice.totalAmount || invoice.total || 0);
    
    // Check if invoice exists
    const existsResult = await db.execute(
      'SELECT 1 FROM invoices WHERE id = ? AND patient_id = ? LIMIT 1',
      [id, patientId]
    );
    
    const exists = existsResult.rows && existsResult.rows.length > 0;
    
    if (exists) {
      // Update existing
      await db.execute(
        `UPDATE invoices 
         SET invoice_date = ?, invoice_number = ?, amount = ?, data = ?, updated_at = ?
         WHERE id = ? AND patient_id = ?`,
        [invoiceDate, invoiceNumber, amount, JSON.stringify(invoice), timestamp, id, patientId]
      );
    } else {
      // Insert new
      await db.execute(
        `INSERT INTO invoices (id, patient_id, invoice_date, invoice_number, amount, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patientId, invoiceDate, invoiceNumber, amount, JSON.stringify(invoice), timestamp, timestamp]
      );
    }
  }
  
  console.log(`[InvoiceStorage] Upserted ${invoices.length} invoices for patient:`, patientId);
}

/**
 * Get all invoices for a patient
 */
export async function getInvoices(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC, updated_at DESC',
    [patientId]
  );
  
  const invoices = result.rows.map(row => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    ...JSON.parse(row.data)
  }));
  
  console.log(`[InvoiceStorage] Retrieved ${invoices.length} invoices for patient:`, patientId);
  return invoices;
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(patientId, invoiceId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT * FROM invoices WHERE patient_id = ? AND id = ?',
    [patientId, invoiceId]
  );
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      id: row.id,
      invoiceDate: row.invoice_date,
      invoiceNumber: row.invoice_number,
      amount: row.amount,
      ...JSON.parse(row.data)
    };
  }
  
  return null;
}

/**
 * Get invoices within a date range
 */
export async function getInvoicesByDateRange(patientId, startDate, endDate) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM invoices 
     WHERE patient_id = ? AND invoice_date >= ? AND invoice_date <= ?
     ORDER BY invoice_date DESC`,
    [patientId, startDate, endDate]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    ...JSON.parse(row.data)
  }));
}

/**
 * Search invoices by invoice number
 */
export async function searchInvoices(patientId, searchQuery) {
  const db = await getDatabase();
  const result = await db.execute(
    `SELECT * FROM invoices 
     WHERE patient_id = ? AND (invoice_number LIKE ? OR data LIKE ?)
     ORDER BY invoice_date DESC`,
    [patientId, `%${searchQuery}%`, `%${searchQuery}%`]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    ...JSON.parse(row.data)
  }));
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(patientId, invoiceId) {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM invoices WHERE patient_id = ? AND id = ?',
    [patientId, invoiceId]
  );
  
  console.log('[InvoiceStorage] Deleted invoice:', invoiceId);
}

/**
 * Clear all invoices for a patient
 */
export async function clearPatientInvoices(patientId) {
  const db = await getDatabase();
  await db.execute('DELETE FROM invoices WHERE patient_id = ?', [patientId]);
  
  console.log('[InvoiceStorage] Cleared all invoices for patient:', patientId);
}

/**
 * Get invoice count for a patient
 */
export async function getInvoiceCount(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM invoices WHERE patient_id = ?',
    [patientId]
  );
  
  return result.rows[0]?.count || 0;
}

/**
 * Get total amount for a patient's invoices
 */
export async function getTotalInvoiceAmount(patientId) {
  const db = await getDatabase();
  const result = await db.execute(
    'SELECT SUM(amount) as total FROM invoices WHERE patient_id = ?',
    [patientId]
  );
  
  return result.rows[0]?.total || 0;
}
