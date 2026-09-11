/**
 * Investigation Repository
 * -----------------------
 * Data access layer for investigations/reports in SQLite
 * Replaces AsyncStorage for investigations completely
 */

import BaseRepository from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../Database';

export class InvestigationRepository extends BaseRepository {
  constructor() {
    super('investigations');  // Pass tableName to BaseRepository constructor
  }

  /**
   * Override findById to use investigation_id instead of id
   */
  async findById(investigationId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE investigation_id = ?`;
    return this.queryFirst(sql, [investigationId]);
  }

  /**
   * Override exists to use investigation_id instead of id
   */
  async exists(investigationId) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE investigation_id = ? LIMIT 1`;
    const result = await this.queryFirst(sql, [investigationId]);
    return !!result;
  }

  /**
   * Override update to use investigation_id instead of id
   */
  async update(investigationId, data) {
    const updateData = {
      ...data,
      updated_at: getCurrentTimestamp(),
    };

    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(col => updateData[col]), investigationId];

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE investigation_id = ?`;
    const result = await this.execute(sql, values);
    
    if (result.changes === 0) {
      throw new Error(`Investigation with id ${investigationId} not found`);
    }

    return this.findById(investigationId);
  }

  /**
   * Transform database row to application format
   */
  transformFromDb(dbRow) {
    if (!dbRow) return null;
    
    return {
      id: dbRow.investigation_id,
      investigation_id: dbRow.investigation_id,
      patientId: dbRow.patient_id,
      name: dbRow.investigation_name,
      category: dbRow.category,
      status: dbRow.status,
      date: dbRow.investigation_date,
      time: dbRow.investigation_time,
      resultUrl: dbRow.report_url,
      printUrl: dbRow.report_url,
      localPath: dbRow.local_report_path,
      labName: dbRow.lab_name,
      doctorName: dbRow.practitioner_name,
      location: dbRow.lab_name || 'Medical Center',
      notes: dbRow.notes,
      iconBg: '#FEE2E2',
      _raw: dbRow
    };
  }

  /**
   * Transform application format to database format
   */
  transformToDb(investigationData) {
    return {
      investigation_id: investigationData.investigation_id || investigationData.id || generateId('inv'),
      patient_id: investigationData.patient_id || investigationData.patientId,
      investigation_name: investigationData.investigation_name || investigationData.name || 'Investigation',
      category: investigationData.category || 'Others',
      status: investigationData.status || 'Approved',
      investigation_date: investigationData.investigation_date || investigationData.date || '',
      investigation_time: investigationData.investigation_time || investigationData.time || '',
      report_url: investigationData.report_url || investigationData.resultUrl || investigationData.printUrl || '',
      local_report_path: investigationData.local_report_path || investigationData.localPath || '',
      lab_name: investigationData.lab_name || investigationData.labName || investigationData.location || 'Medical Center',
      practitioner_name: investigationData.practitioner_name || investigationData.doctorName || '',
      notes: investigationData.notes || ''
    };
  }

  /**
   * Create a new investigation record
   */
  async createInvestigation(investigationData) {
    const investigation = this.transformToDb(investigationData);
    investigation.created_at = getCurrentTimestamp();
    investigation.updated_at = getCurrentTimestamp();

    await this.insert(investigation);
    return this.transformFromDb(investigation);
  }

  /**
   * Override upsert to use investigation_id instead of id
   */
  async upsert(data, idField = 'investigation_id') {
    const investigationId = data[idField] || data.investigation_id;
    
    if (!investigationId) {
      return this.insert(data, false); // Insert without generating ID
    }

    const exists = await this.exists(investigationId);
    if (exists) {
      return this.update(investigationId, data);
    } else {
      return this.insert(data, false); // Don't generate new ID
    }
  }

  /**
   * Override exists method to use investigation_id
   */
  async exists(investigationId) {
    const result = await this.findWhere({ investigation_id: investigationId });
    return result && result.length > 0;
  }

  /**
   * Override insert method to handle investigation_id properly
   */
  async insert(data, generateId = true) {
    try {
      console.log('[InvestigationRepository] INSERT - data received:', data);
      
      // Transform data for database storage
      const dbData = this.transformToDb(data);
      console.log('[InvestigationRepository] INSERT - transformed to DB format:', dbData);
      
      // Use parent insert but without auto-generating ID since we use investigation_id
      const result = await super.insert(dbData, false);
      console.log('[InvestigationRepository] INSERT - result:', result);
      
      return result;
    } catch (error) {
      console.error('[InvestigationRepository] INSERT failed:', error);
      throw error;
    }
  }

  /**
   * Override update method to use investigation_id
   */
  async update(investigationId, data) {
    try {
      console.log('[InvestigationRepository] UPDATE - ID:', investigationId, 'data:', data);
      
      // Transform data for database storage
      const dbData = this.transformToDb(data);
      console.log('[InvestigationRepository] UPDATE - transformed to DB format:', dbData);
      
      // Update using investigation_id instead of id
      const query = `UPDATE ${this.tableName} SET ${Object.keys(dbData).map(key => `${key} = ?`).join(', ')} WHERE investigation_id = ?`;
      const values = [...Object.values(dbData), investigationId];
      
      console.log('[InvestigationRepository] UPDATE - query:', query);
      console.log('[InvestigationRepository] UPDATE - values:', values);
      
      const result = await this.db.execute(query, values);
      console.log('[InvestigationRepository] UPDATE - result:', result);
      
      return result;
    } catch (error) {
      console.error('[InvestigationRepository] UPDATE failed:', error);
      throw error;
    }
  }

  /**
   * Override findById to use investigation_id
   */
  async findById(investigationId) {
    try {
      console.log('[InvestigationRepository] FIND_BY_ID:', investigationId);
      
      const results = await this.findWhere({ investigation_id: investigationId });
      console.log('[InvestigationRepository] FIND_BY_ID - results:', results);
      
      if (results && results.length > 0) {
        return this.transformFromDb(results[0]);
      }
      return null;
    } catch (error) {
      console.error('[InvestigationRepository] FIND_BY_ID failed:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert investigations for a patient
   */
  async bulkUpsertInvestigations(patientId, investigations) {
    const results = [];
    
    for (const investigation of investigations) {
      try {
        // Ensure patient_id is set
        investigation.patient_id = patientId;
        investigation.patientId = patientId;
        
        const transformed = this.transformToDb(investigation);
        
        // Use upsert from BaseRepository
        const result = await this.upsert(transformed, 'investigation_id');
        results.push(this.transformFromDb(result));
      } catch (error) {
        console.error('[InvestigationRepo] Failed to upsert investigation:', error);
        // Continue with other investigations even if one fails
      }
    }
    
    console.log(`[InvestigationRepo] Successfully upserted ${results.length}/${investigations.length} investigations`);
    return results;
  }

  /**
   * Get investigation by ID
   */
  async getInvestigation(investigationId) {
    const result = await this.findById(investigationId);
    return result ? this.transformFromDb(result) : null;
  }

  /**
   * Get all investigations for a patient
   */
  async getInvestigationsByPatient(patientId) {
    try {
      console.log('[InvestigationRepository] getInvestigationsByPatient called with patientId:', patientId);
      console.log('[InvestigationRepository] this.findWhere type:', typeof this.findWhere);
      
      if (typeof this.findWhere !== 'function') {
        console.error('[InvestigationRepository] ❌ ERROR: this.findWhere is not a function!');
        console.error('[InvestigationRepository] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
        throw new Error('findWhere method not available on InvestigationRepository');
      }
      
      const results = await this.findWhere(
        { patient_id: patientId },
        'investigation_date DESC, created_at DESC'
      );
      console.log('[InvestigationRepository] Found', results?.length || 0, 'raw results');
      
      // Fix: Ensure results is an array and transformFromDb exists
      if (!Array.isArray(results)) {
        console.log('[InvestigationRepository] Results is not an array, returning empty array');
        return [];
      }
      
      if (typeof this.transformFromDb !== 'function') {
        console.error('[InvestigationRepository] ❌ ERROR: transformFromDb is not a function!');
        return results; // Return raw results as fallback
      }
      
      const transformed = [];
      for (const result of results) {
        try {
          const transformed_item = this.transformFromDb(result);
          if (transformed_item) {
            transformed.push(transformed_item);
          }
        } catch (error) {
          console.error('[InvestigationRepository] Error transforming result:', error);
        }
      }
      
      console.log('[InvestigationRepository] Transformed to', transformed?.length || 0, 'investigations');
      return transformed;
    } catch (error) {
      console.error('[InvestigationRepository] ❌ Error in getInvestigationsByPatient:', error);
      console.error('[InvestigationRepository] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get investigations by date range for a patient
   */
  async getInvestigationsByDateRange(patientId, startDate, endDate) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE patient_id = ? AND investigation_date BETWEEN ? AND ?
      ORDER BY investigation_date DESC, created_at DESC
    `;
    const results = await this.query(sql, [patientId, startDate, endDate]);
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Get investigations by status for a patient
   */
  async getInvestigationsByStatus(patientId, status) {
    const results = await this.findWhere(
      { patient_id: patientId, status },
      'investigation_date DESC, created_at DESC'
    );
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Get investigations by category for a patient
   */
  async getInvestigationsByCategory(patientId, category) {
    const results = await this.findWhere(
      { patient_id: patientId, category },
      'investigation_date DESC, created_at DESC'
    );
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Search investigations by name for a patient
   */
  async searchInvestigations(patientId, query) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE patient_id = ? AND (
        investigation_name LIKE ? OR 
        category LIKE ? OR 
        lab_name LIKE ?
      )
      ORDER BY investigation_date DESC, created_at DESC
    `;
    const searchPattern = `%${query}%`;
    const results = await this.query(sql, [patientId, searchPattern, searchPattern, searchPattern]);
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Update investigation
   */
  async updateInvestigation(investigationId, updates) {
    const existing = await this.findById(investigationId);
    if (!existing) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const updatedInvestigation = {
      investigation_name: updates.investigation_name || updates.name || existing.investigation_name,
      category: updates.category !== undefined ? updates.category : existing.category,
      status: updates.status !== undefined ? updates.status : existing.status,
      investigation_date: updates.investigation_date || updates.date || existing.investigation_date,
      investigation_time: updates.investigation_time || updates.time || existing.investigation_time,
      report_url: updates.report_url || updates.resultUrl || updates.printUrl || existing.report_url,
      local_report_path: updates.local_report_path || updates.localPath || existing.local_report_path,
      lab_name: updates.lab_name || updates.labName || existing.lab_name,
      practitioner_name: updates.practitioner_name || updates.doctorName || existing.practitioner_name,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      updated_at: getCurrentTimestamp()
    };

    await this.update(investigationId, updatedInvestigation);
    
    const updated = await this.findById(investigationId);
    return this.transformFromDb(updated);
  }

  /**
   * Delete investigation
   */
  async deleteInvestigation(investigationId) {
    await this.delete(investigationId);
  }

  /**
   * Bulk upsert investigations (for API sync)
   */
  async bulkUpsertInvestigations(patientId, investigations) {
    const results = [];
    
    for (const investigationData of investigations) {
      try {
        // Check if investigation already exists
        const existingId = investigationData.investigation_id || investigationData.id;
        let result;
        
        if (existingId) {
          const existing = await this.getInvestigation(existingId);
          if (existing) {
            // Update existing
            result = await this.updateInvestigation(existingId, {
              ...investigationData,
              patient_id: patientId
            });
          } else {
            // Create new with specific ID
            result = await this.createInvestigation({
              ...investigationData,
              patient_id: patientId,
              investigation_id: existingId
            });
          }
        } else {
          // Create new with generated ID
          result = await this.createInvestigation({
            ...investigationData,
            patient_id: patientId
          });
        }
        
        results.push(result);
      } catch (error) {
        console.error(`[InvestigationRepo] Failed to upsert investigation:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get investigations count by status for a patient
   */
  async getInvestigationStats(patientId) {
    const sql = `
      SELECT 
        status,
        category,
        COUNT(*) as count
      FROM ${this.tableName}
      WHERE patient_id = ?
      GROUP BY status, category
    `;
    
    const results = await this.query(sql, [patientId]);
    
    const stats = {
      total: 0,
      byStatus: {},
      byCategory: {}
    };

    results.forEach(row => {
      stats.total += row.count;
      stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + row.count;
      stats.byCategory[row.category] = (stats.byCategory[row.category] || 0) + row.count;
    });

    return stats;
  }

  /**
   * Get recent investigations for a patient
   */
  async getRecentInvestigations(patientId, limit = 10) {
    const results = await this.findAll({
      where: { patient_id: patientId },
      orderBy: 'investigation_date DESC, created_at DESC',
      limit
    });
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Update report download path
   */
  async updateReportPath(investigationId, localPath) {
    await this.update(investigationId, {
      local_report_path: localPath,
      updated_at: getCurrentTimestamp()
    });
  }

  /**
   * Get investigations with downloaded reports for a patient
   */
  async getDownloadedInvestigations(patientId) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE patient_id = ? AND local_report_path IS NOT NULL AND local_report_path != ''
      ORDER BY investigation_date DESC
    `;
    const results = await this.query(sql, [patientId]);
    return results.map(result => this.transformFromDb(result));
  }

  /**
   * Transform database record to application format
   */
  transformFromDb(dbRecord) {
    return {
      id: dbRecord.investigation_id,
      investigation_id: dbRecord.investigation_id,
      patientId: dbRecord.patient_id,
      patient_id: dbRecord.patient_id,
      name: dbRecord.investigation_name,
      investigation_name: dbRecord.investigation_name,
      category: dbRecord.category,
      status: dbRecord.status,
      date: dbRecord.investigation_date,
      investigation_date: dbRecord.investigation_date,
      time: dbRecord.investigation_time,
      investigation_time: dbRecord.investigation_time,
      resultUrl: dbRecord.report_url,
      printUrl: dbRecord.report_url,
      report_url: dbRecord.report_url,
      localPath: dbRecord.local_report_path,
      local_report_path: dbRecord.local_report_path,
      labName: dbRecord.lab_name,
      lab_name: dbRecord.lab_name,
      doctorName: dbRecord.practitioner_name,
      practitioner_name: dbRecord.practitioner_name,
      notes: dbRecord.notes,
      created_at: dbRecord.created_at,
      updated_at: dbRecord.updated_at
    };
  }

  /**
   * Check if investigation exists (for migration)
   */
  async existsById(investigationId) {
    const sql = `SELECT investigation_id FROM ${this.tableName} WHERE investigation_id = ? LIMIT 1`;
    const results = await this.query(sql, [investigationId]);
    return results.length > 0;
  }

  /**
   * Clear all investigations for a patient (for testing/reset)
   */
  async clearPatientInvestigations(patientId) {
    const sql = `DELETE FROM ${this.tableName} WHERE patient_id = ?`;
    await this.query(sql, [patientId]);
  }
}

export default InvestigationRepository;