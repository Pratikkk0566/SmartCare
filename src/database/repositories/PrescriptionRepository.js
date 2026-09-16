/**
 * Prescription Repository
 * ----------------------
 * Handles all prescription-related database operations following the Repository pattern.
 * Provides methods for CRUD operations, querying, and relationship management.
 */

import { BaseRepository } from '../BaseRepository';
import { generateId, getCurrentTimestamp } from '../db';

export class PrescriptionRepository extends BaseRepository {
  constructor() {
    super('prescriptions');
  }

  /**
   * Create a new prescription
   */
  async createPrescription(prescriptionData) {
    const prescription = {
      id: generateId('rx'),
      name: prescriptionData.name || '',
      doctor_name: prescriptionData.doctorName || prescriptionData.doctor_name || '',
      start_date: prescriptionData.startDate || prescriptionData.start_date || getCurrentTimestamp(),
      end_date: prescriptionData.endDate || prescriptionData.end_date || null,
      status: prescriptionData.status || 'draft',
      notes: prescriptionData.notes || '',
    };

    return this.insert(prescription, false); // Don't generate ID, we already have one
  }

  /**
   * Update prescription
   */
  async updatePrescription(id, updates) {
    const allowedUpdates = ['name', 'doctor_name', 'start_date', 'end_date', 'status', 'notes'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    return this.update(id, filteredUpdates);
  }

  /**
   * Get prescription with all its medicines and schedules
   */
  async getPrescriptionWithDetails(id) {
    const prescription = await this.findById(id);
    if (!prescription) return null;

    // Get medicines for this prescription
    const medicinesQuery = `
      SELECT 
        pm.*,
        GROUP_CONCAT(mt.time ORDER BY mt.sort_order) as medicine_times
      FROM prescription_medicines pm
      LEFT JOIN medicine_times mt ON pm.id = mt.medicine_id
      WHERE pm.prescription_id = ?
      GROUP BY pm.id
      ORDER BY pm.created_at
    `;
    
    const medicines = await this.query(medicinesQuery, [id]);
    
    // Parse medicine times from string to array
    medicines.forEach(medicine => {
      medicine.times = medicine.medicine_times 
        ? medicine.medicine_times.split(',').filter(Boolean)
        : [];
      delete medicine.medicine_times;
    });

    return {
      ...prescription,
      medicines: medicines || []
    };
  }

  /**
   * Get all prescriptions with medicine counts
   */
  async getAllPrescriptionsWithCounts() {
    const query = `
      SELECT 
        p.*,
        COUNT(pm.id) as medicine_count
      FROM prescriptions p
      LEFT JOIN prescription_medicines pm ON p.id = pm.prescription_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    return this.query(query);
  }

  /**
   * Get active prescriptions
   */
  async getActivePrescriptions() {
    return this.findWhere(
      { status: 'active' },
      'start_date DESC'
    );
  }

  /**
   * Get prescriptions by status
   */
  async getPrescriptionsByStatus(status) {
    return this.findWhere(
      { status },
      'created_at DESC'
    );
  }

  /**
   * Get prescriptions within date range
   */
  async getPrescriptionsInDateRange(startDate, endDate) {
    const query = `
      SELECT * FROM prescriptions 
      WHERE start_date >= ? AND start_date <= ?
      ORDER BY start_date DESC
    `;
    
    return this.query(query, [startDate, endDate]);
  }

  /**
   * Delete prescription and all related data
   */
  async deletePrescription(id) {
    return this.executeTransaction(async () => {
      // Foreign keys with CASCADE will handle related deletions
      // But we might want to preserve medication history
      
      // First, get all medicine IDs for this prescription
      const medicines = await this.query(
        'SELECT id FROM prescription_medicines WHERE prescription_id = ?',
        [id]
      );
      
      const medicineIds = medicines.map(m => m.id);
      
      // Archive medication history before deletion (optional)
      if (medicineIds.length > 0) {
        const placeholders = medicineIds.map(() => '?').join(',');
        await this.execute(`
          UPDATE medication_history 
          SET notes = COALESCE(notes, '') || ' [Prescription deleted]'
          WHERE medicine_id IN (${placeholders})
        `, medicineIds);
      }

      // Delete the prescription (CASCADE will handle the rest)
      const deleted = await this.deleteById(id);
      
      return {
        deleted,
        archivedHistoryCount: medicineIds.length
      };
    });
  }

  /**
   * Search prescriptions by name or doctor
   */
  async searchPrescriptions(searchTerm) {
    const query = `
      SELECT 
        p.*,
        COUNT(pm.id) as medicine_count
      FROM prescriptions p
      LEFT JOIN prescription_medicines pm ON p.id = pm.prescription_id
      WHERE p.name LIKE ? OR p.doctor_name LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    const term = `%${searchTerm}%`;
    return this.query(query, [term, term]);
  }

  /**
   * Get prescription statistics
   */
  async getPrescriptionStats() {
    const statsQueries = {
      total: 'SELECT COUNT(*) as count FROM prescriptions',
      active: 'SELECT COUNT(*) as count FROM prescriptions WHERE status = ?',
      draft: 'SELECT COUNT(*) as count FROM prescriptions WHERE status = ?',
      completed: 'SELECT COUNT(*) as count FROM prescriptions WHERE status = ?',
      totalMedicines: 'SELECT COUNT(*) as count FROM prescription_medicines',
      scheduledDosesToday: `
        SELECT COUNT(*) as count FROM scheduled_doses 
        WHERE scheduled_date = DATE('now', 'localtime')
      `
    };

    const results = {};
    
    results.total = (await this.queryFirst(statsQueries.total))?.count || 0;
    results.active = (await this.queryFirst(statsQueries.active, ['active']))?.count || 0;
    results.draft = (await this.queryFirst(statsQueries.draft, ['draft']))?.count || 0;
    results.completed = (await this.queryFirst(statsQueries.completed, ['completed']))?.count || 0;
    results.totalMedicines = (await this.queryFirst(statsQueries.totalMedicines))?.count || 0;
    results.scheduledDosesToday = (await this.queryFirst(statsQueries.scheduledDosesToday))?.count || 0;

    return results;
  }

  /**
   * Update prescription status
   */
  async updateStatus(id, status) {
    return this.update(id, { status });
  }

  /**
   * Check if prescription name already exists for the same doctor
   */
  async isDuplicateName(name, doctorName, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM prescriptions WHERE name = ? AND doctor_name = ?';
    const params = [name, doctorName];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const result = await this.queryFirst(query, params);
    return (result?.count || 0) > 0;
  }

  /**
   * Get recent prescriptions (last N prescriptions)
   */
  async getRecentPrescriptions(limit = 10) {
    return this.findWhere({}, 'created_at DESC', limit);
  }

  /**
   * Get prescriptions expiring soon
   */
  async getExpiringPrescriptions(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const query = `
      SELECT 
        p.*,
        COUNT(pm.id) as medicine_count
      FROM prescriptions p
      LEFT JOIN prescription_medicines pm ON p.id = pm.prescription_id
      WHERE p.end_date IS NOT NULL 
        AND p.end_date <= ? 
        AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.end_date ASC
    `;
    
    return this.query(query, [futureDate.toISOString().split('T')[0]]);
  }
}

export default PrescriptionRepository;