/**
 * Patient Repository
 * -----------------
 * Data access layer for patient information in SQLite
 */

import BaseRepository from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../Database';

export class PatientRepository extends BaseRepository {
  constructor() {
    super('patients');  // Pass tableName to BaseRepository constructor
  }

  /**
   * Override findById to use patient_id instead of id
   */
  async findById(patientId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE patient_id = ?`;
    return this.queryFirst(sql, [patientId]);
  }

  /**
   * Override exists to use patient_id instead of id
   */
  async exists(patientId) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE patient_id = ? LIMIT 1`;
    const result = await this.queryFirst(sql, [patientId]);
    return !!result;
  }

  /**
   * Override update to use patient_id instead of id
   */
  async update(patientId, data) {
    const updateData = {
      ...data,
      updated_at: getCurrentTimestamp(),
    };

    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => updateData[col]), patientId];

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE patient_id = ?`;
    const result = await this.execute(sql, values);
    
    if (result.changes === 0) {
      throw new Error(`Patient with id ${patientId} not found`);
    }

    return this.findById(patientId);
  }

  /**
   * Create a new patient
   */
  async createPatient(patientData) {
    const patient = {
      patient_id: patientData.patient_id || patientData.patientId || generateId('pat'),
      uhid: patientData.uhid,
      phone: patientData.phone,
      first_name: patientData.firstName || patientData.first_name,
      last_name: patientData.lastName || patientData.last_name,
      middle_name: patientData.middleName || patientData.middle_name,
      email: patientData.email,
      gender: patientData.gender,
      dob: patientData.dob,
      address: patientData.address,
      city: patientData.city,
      state: patientData.state,
      blood_group: patientData.bloodGroup || patientData.blood_group,
      height: patientData.height,
      height_unit: patientData.heightUnit || patientData.height_unit || 'cm',
      weight: patientData.weight,
      weight_unit: patientData.weightUnit || patientData.weight_unit || 'kg',
      bp: patientData.bp,
      allergies: Array.isArray(patientData.allergies) ? JSON.stringify(patientData.allergies) : patientData.allergies,
      is_active: 1,
      last_sync: getCurrentTimestamp(),
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    await this.insert(patient);
    return this.transformFromDb(patient);
  }

  /**
   * Get patient by ID
   */
  async getPatient(patientId) {
    const result = await this.findById(patientId);
    return result ? this.transformFromDb(result) : null;
  }

  /**
   * Get patient by phone number
   */
  async getPatientByPhone(phone) {
    const result = await this.findFirstWhere({ phone });
    return result ? this.transformFromDb(result) : null;
  }

  /**
   * Get all active patients
   */
  async getAllActivePatients() {
    const results = await this.findWhere(
      { is_active: 1 },
      'first_name ASC'
    );
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Update patient
   */
  async updatePatient(patientId, updates) {
    const existing = await this.findById(patientId);
    if (!existing) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const updatedPatient = {
      uhid: updates.uhid !== undefined ? updates.uhid : existing.uhid,
      phone: updates.phone !== undefined ? updates.phone : existing.phone,
      first_name: updates.firstName || updates.first_name || existing.first_name,
      last_name: updates.lastName || updates.last_name || existing.last_name,
      middle_name: updates.middleName || updates.middle_name || existing.middle_name,
      email: updates.email !== undefined ? updates.email : existing.email,
      gender: updates.gender !== undefined ? updates.gender : existing.gender,
      dob: updates.dob !== undefined ? updates.dob : existing.dob,
      address: updates.address !== undefined ? updates.address : existing.address,
      city: updates.city !== undefined ? updates.city : existing.city,
      state: updates.state !== undefined ? updates.state : existing.state,
      blood_group: updates.bloodGroup || updates.blood_group || existing.blood_group,
      height: updates.height !== undefined ? updates.height : existing.height,
      height_unit: updates.heightUnit || updates.height_unit || existing.height_unit,
      weight: updates.weight !== undefined ? updates.weight : existing.weight,
      weight_unit: updates.weightUnit || updates.weight_unit || existing.weight_unit,
      bp: updates.bp !== undefined ? updates.bp : existing.bp,
      allergies: updates.allergies !== undefined ? 
        (Array.isArray(updates.allergies) ? JSON.stringify(updates.allergies) : updates.allergies) : 
        existing.allergies,
      last_sync: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    };

    await this.update(patientId, updatedPatient);
    
    const updated = await this.findById(patientId);
    return this.transformFromDb(updated);
  }

  /**
   * Deactivate patient (soft delete)
   */
  async deactivatePatient(patientId) {
    await this.update(patientId, {
      is_active: 0,
      updated_at: getCurrentTimestamp()
    });
  }

  /**
   * Activate patient
   */
  async activatePatient(patientId) {
    await this.update(patientId, {
      is_active: 1,
      updated_at: getCurrentTimestamp()
    });
  }

  /**
   * Search patients by name or phone
   */
  async searchPatients(query) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE is_active = 1 AND (
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        phone LIKE ? OR
        uhid LIKE ?
      )
      ORDER BY first_name ASC
    `;
    const searchPattern = `%${query}%`;
    const results = await this.query(sql, [searchPattern, searchPattern, searchPattern, searchPattern]);
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(patientId) {
    await this.update(patientId, {
      last_sync: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    });
  }

  /**
   * Check if patient exists by phone
   */
  async existsByPhone(phone) {
    const sql = `SELECT patient_id FROM ${this.tableName} WHERE phone = ? LIMIT 1`;
    const results = await this.query(sql, [phone]);
    return results.length > 0;
  }

  /**
   * Transform database record to application format
   */
  transformFromDb(dbRecord) {
    let allergies = [];
    if (dbRecord.allergies) {
      try {
        allergies = JSON.parse(dbRecord.allergies);
      } catch (e) {
        allergies = dbRecord.allergies ? [dbRecord.allergies] : [];
      }
    }

    return {
      patientId: dbRecord.patient_id,
      patient_id: dbRecord.patient_id,
      uhid: dbRecord.uhid,
      phone: dbRecord.phone,
      firstName: dbRecord.first_name,
      lastName: dbRecord.last_name,
      middleName: dbRecord.middle_name,
      email: dbRecord.email,
      gender: dbRecord.gender,
      dob: dbRecord.dob,
      address: dbRecord.address,
      city: dbRecord.city,
      state: dbRecord.state,
      bloodGroup: dbRecord.blood_group,
      height: dbRecord.height,
      heightUnit: dbRecord.height_unit,
      weight: dbRecord.weight,
      weightUnit: dbRecord.weight_unit,
      bp: dbRecord.bp,
      allergies: allergies,
      isActive: dbRecord.is_active === 1,
      lastSync: dbRecord.last_sync,
      created_at: dbRecord.created_at,
      updated_at: dbRecord.updated_at
    };
  }
}

export default PatientRepository;