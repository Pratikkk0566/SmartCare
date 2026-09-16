/**
 * Investigation Repository
 * -----------------------
 * Data access layer for investigations/reports in SQLite
 * Replaces AsyncStorage for investigations completely
 */

import BaseRepository from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../db';

export class InvestigationRepository extends BaseRepository {
  constructor() {
    super('investigations');  // Pass tableName to BaseRepository constructor
  }

  /**
   * Override findById to use investigation_id instead of id
   */
  async findById(investigationId) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE investigation_id = ?`;
      const result = await this.queryFirst(sql, [investigationId]);
      return result ? this.transformFromDb(result) : null;
    } catch (error) {
      console.error('[InvestigationRepository] findById error:', error);
      return null;
    }
  }

  /**
   * Override exists to use investigation_id instead of id
   */
  async exists(investigationId) {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE investigation_id = ? LIMIT 1`;
      const result = await this.queryFirst(sql, [investigationId]);
      return !!result;
    } catch (error) {
      console.error('[InvestigationRepository] exists error:', error);
      return false;
    }
  }

  /**
   * Override update to use investigation_id instead of id
   */
  async update(investigationId, data) {
    try {
      const dbData = this.transformToDb(data);
      const updateData = {
        ...dbData,
        updated_at: getCurrentTimestamp(),
      };

      // Remove investigation_id from update data to avoid conflicts
      delete updateData.investigation_id;

      const columns = Object.keys(updateData);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...columns.map(col => updateData[col]), investigationId];

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE investigation_id = ?`;
      const result = await this.execute(sql, values);
      
      if (result.changes === 0) {
        throw new Error(`Investigation with id ${investigationId} not found`);
      }

      return this.findById(investigationId);
    } catch (error) {
      console.error('[InvestigationRepository] update error:', error);
      throw error;
    }
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
      patient_id: dbRow.patient_id,
      name: dbRow.investigation_name,
      investigation_name: dbRow.investigation_name,
      category: dbRow.category,
      status: dbRow.status,
      date: dbRow.investigation_date,
      investigation_date: dbRow.investigation_date,
      time: dbRow.investigation_time,
      investigation_time: dbRow.investigation_time,
      resultUrl: dbRow.report_url,
      printUrl: dbRow.report_url,
      report_url: dbRow.report_url,
      localPath: dbRow.local_report_path,
      local_report_path: dbRow.local_report_path,
      labName: dbRow.lab_name,
      lab_name: dbRow.lab_name,
      location: dbRow.lab_name || 'Medical Center',
      doctorName: dbRow.practitioner_name,
      practitioner_name: dbRow.practitioner_name,
      notes: dbRow.notes,
      iconBg: '#FEE2E2',
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
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

    const columns = Object.keys(investigation);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => investigation[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await this.execute(sql, values);
    return this.transformFromDb(investigation);
  }

  /**
   * Override upsert to use investigation_id instead of id
   */
  async upsert(data, idField = 'investigation_id') {
    const investigationId = data[idField] || data.investigation_id;
    
    if (!investigationId) {
      return this.createInvestigation(data);
    }

    const exists = await this.exists(investigationId);
    if (exists) {
      return this.update(investigationId, data);
    } else {
      return this.createInvestigation(data);
    }
  }

  /**
   * Get investigation by ID
   */
  async getInvestigation(investigationId) {
    return await this.findById(investigationId);
  }

  /**
   * Get all investigations for a patient
   */
  async getInvestigationsByPatient(patientId) {
    try {
      console.log('[InvestigationRepository] getInvestigationsByPatient called with patientId:', patientId);
      
      const results = await this.findWhere(
        { patient_id: patientId },
        'investigation_date DESC, created_at DESC'
      );
      console.log('[InvestigationRepository] Found', results?.length || 0, 'raw results');
      
      if (!Array.isArray(results)) {
        console.log('[InvestigationRepository] Results is not an array, returning empty array');
        return [];
      }
      
      const transformed = results.map(result => this.transformFromDb(result)).filter(Boolean);
      console.log('[InvestigationRepository] Transformed to', transformed?.length || 0, 'investigations');
      return transformed;
    } catch (error) {
      console.error('[InvestigationRepository] ❌ Error in getInvestigationsByPatient:', error);
      console.error('[InvestigationRepository] Error stack:', error.stack);
      return [];
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
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
  }

  /**
   * Get investigations by status for a patient
   */
  async getInvestigationsByStatus(patientId, status) {
    const results = await this.findWhere(
      { patient_id: patientId, status },
      'investigation_date DESC, created_at DESC'
    );
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
  }

  /**
   * Get investigations by category for a patient
   */
  async getInvestigationsByCategory(patientId, category) {
    const results = await this.findWhere(
      { patient_id: patientId, category },
      'investigation_date DESC, created_at DESC'
    );
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
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
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
  }

  /**
   * Update investigation
   */
  async updateInvestigation(investigationId, updates) {
    const existing = await this.findById(investigationId);
    if (!existing) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    // Merge updates with existing data
    const merged = {
      ...existing,
      ...updates
    };

    return await this.update(investigationId, merged);
  }

  /**
   * Delete investigation
   */
  async deleteInvestigation(investigationId) {
    const sql = `DELETE FROM ${this.tableName} WHERE investigation_id = ?`;
    const result = await this.execute(sql, [investigationId]);
    return result.changes > 0;
  }

  /**
   * Bulk upsert investigations (for API sync)
   */
  async bulkUpsertInvestigations(patientId, investigations) {
    const results = [];
    
    for (const investigationData of investigations) {
      try {
        // Ensure patient_id is set
        investigationData.patient_id = patientId;
        investigationData.patientId = patientId;
        
        // Use upsert
        const result = await this.upsert(investigationData, 'investigation_id');
        results.push(result);
      } catch (error) {
        console.error(`[InvestigationRepo] Failed to upsert investigation:`, error);
      }
    }
    
    console.log(`[InvestigationRepo] Successfully upserted ${results.length}/${investigations.length} investigations`);
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
    const results = await this.findWhere(
      { patient_id: patientId },
      'investigation_date DESC, created_at DESC',
      limit
    );
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
  }

  /**
   * Update report download path
   */
  async updateReportPath(investigationId, localPath) {
    return await this.update(investigationId, {
      local_report_path: localPath
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
    return results.map(result => this.transformFromDb(result)).filter(Boolean);
  }

  /**
   * Check if investigation exists (for migration)
   */
  async existsById(investigationId) {
    return await this.exists(investigationId);
  }

  /**
   * Clear all investigations for a patient (for testing/reset)
   */
  async clearPatientInvestigations(patientId) {
    const sql = `DELETE FROM ${this.tableName} WHERE patient_id = ?`;
    await this.execute(sql, [patientId]);
  }
}

export default InvestigationRepository;