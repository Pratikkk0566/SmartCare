/**
 * MedicationDatabaseService.js
 * 
 * Offline-first local database for medication management
 * Uses AsyncStorage as the persistence layer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PRESCRIPTIONS: '@medication_prescriptions',
  MEDICINES: '@medication_medicines',
  SCHEDULED_DOSES: '@medication_scheduled_doses',
  HISTORY: '@medication_history',
  METADATA: '@medication_metadata',
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// ────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

export const PrescriptionDB = {
  /**
   * Create a new prescription
   */
  async create(prescriptionData) {
    const prescriptions = await this.getAll();
    
    const newPrescription = {
      id: generateId('rx'),
      name: prescriptionData.name || '',
      doctorName: prescriptionData.doctorName || '',
      startDate: prescriptionData.startDate || getCurrentTimestamp(),
      endDate: prescriptionData.endDate || null,
      status: 'draft', // draft, active, completed, cancelled
      notes: prescriptionData.notes || '',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    
    prescriptions.push(newPrescription);
    await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
    
    return newPrescription;
  },

  /**
   * Get all prescriptions
   */
  async getAll() {
    try {
      const data = await AsyncStorage.getItem(KEYS.PRESCRIPTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[PrescriptionDB] Error getting all:', error);
      return [];
    }
  },

  /**
   * Get prescription by ID
   */
  async getById(id) {
    const prescriptions = await this.getAll();
    return prescriptions.find(p => p.id === id) || null;
  },

  /**
   * Get active prescriptions
   */
  async getActive() {
    const prescriptions = await this.getAll();
    return prescriptions.filter(p => p.status === 'active');
  },

  /**
   * Update prescription
   */
  async update(id, updates) {
    const prescriptions = await this.getAll();
    const index = prescriptions.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error(`Prescription ${id} not found`);
    }
    
    prescriptions[index] = {
      ...prescriptions[index],
      ...updates,
      updatedAt: getCurrentTimestamp(),
    };
    
    await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
    return prescriptions[index];
  },

  /**
   * Activate prescription (triggers schedule generation)
   */
  async activate(id) {
    return await this.update(id, { status: 'active' });
  },

  /**
   * Complete prescription
   */
  async complete(id) {
    return await this.update(id, { 
      status: 'completed',
      endDate: getCurrentTimestamp(),
    });
  },

  /**
   * Cancel prescription
   */
  async cancel(id) {
    return await this.update(id, { 
      status: 'cancelled',
      endDate: getCurrentTimestamp(),
    });
  },

  /**
   * Delete prescription (and associated medicines/doses)
   */
  async delete(id) {
    // Delete prescription
    const prescriptions = await this.getAll();
    const filtered = prescriptions.filter(p => p.id !== id);
    await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(filtered));
    
    // Delete associated medicines
    const medicines = await MedicineDB.getAll();
    const filteredMedicines = medicines.filter(m => m.prescriptionId !== id);
    await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(filteredMedicines));
    
    // Delete associated scheduled doses
    const doses = await ScheduledDoseDB.getAll();
    const medicineIds = medicines
      .filter(m => m.prescriptionId === id)
      .map(m => m.id);
    const filteredDoses = doses.filter(d => !medicineIds.includes(d.medicineId));
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(filteredDoses));
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MEDICINE MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

export const MedicineDB = {
  /**
   * Add medicine to prescription
   */
  async create(medicineData) {
    const medicines = await this.getAll();
    
    const newMedicine = {
      id: generateId('med'),
      prescriptionId: medicineData.prescriptionId,
      name: medicineData.name,
      type: medicineData.type || 'tablet', // tablet, capsule, syrup, injection, drops
      dose: medicineData.dose || '1',
      unit: medicineData.unit || 'tablet',
      frequency: medicineData.frequency || 'once_daily', // once_daily, twice_daily, thrice_daily, custom
      times: medicineData.times || [], // Array of time strings e.g., ['08:00 AM', '02:00 PM']
      foodInstruction: medicineData.foodInstruction || 'after_food', // before_food, after_food, with_food, empty_stomach
      startDate: medicineData.startDate || getCurrentTimestamp(),
      endDate: medicineData.endDate || null,
      durationDays: medicineData.durationDays || null,
      totalQuantity: medicineData.totalQuantity || null,
      instructions: medicineData.instructions || '',
      createdAt: getCurrentTimestamp(),
    };
    
    medicines.push(newMedicine);
    await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(medicines));
    
    return newMedicine;
  },

  /**
   * Get all medicines
   */
  async getAll() {
    try {
      const data = await AsyncStorage.getItem(KEYS.MEDICINES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[MedicineDB] Error getting all:', error);
      return [];
    }
  },

  /**
   * Get medicines by prescription ID
   */
  async getByPrescriptionId(prescriptionId) {
    const medicines = await this.getAll();
    return medicines.filter(m => m.prescriptionId === prescriptionId);
  },

  /**
   * Get medicine by ID
   */
  async getById(id) {
    const medicines = await this.getAll();
    return medicines.find(m => m.id === id) || null;
  },

  /**
   * Update medicine
   */
  async update(id, updates) {
    const medicines = await this.getAll();
    const index = medicines.findIndex(m => m.id === id);
    
    if (index === -1) {
      throw new Error(`Medicine ${id} not found`);
    }
    
    medicines[index] = {
      ...medicines[index],
      ...updates,
    };
    
    await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(medicines));
    return medicines[index];
  },

  /**
   * Delete medicine
   */
  async delete(id) {
    const medicines = await this.getAll();
    const filtered = medicines.filter(m => m.id !== id);
    await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(filtered));
    
    // Delete associated scheduled doses
    const doses = await ScheduledDoseDB.getAll();
    const filteredDoses = doses.filter(d => d.medicineId !== id);
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(filteredDoses));
  },
};

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED DOSE MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

export const ScheduledDoseDB = {
  /**
   * Create a scheduled dose
   */
  async create(doseData) {
    const doses = await this.getAll();
    
    const newDose = {
      id: generateId('dose'),
      medicineId: doseData.medicineId,
      scheduledDate: doseData.scheduledDate, // ISO date string
      scheduledTime: doseData.scheduledTime, // e.g., '08:00 AM'
      dose: doseData.dose,
      status: 'upcoming', // upcoming, due, taken, missed, skipped
      takenTime: null,
      notes: '',
      createdAt: getCurrentTimestamp(),
    };
    
    doses.push(newDose);
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(doses));
    
    return newDose;
  },

  /**
   * Bulk create scheduled doses
   */
  async createBulk(dosesArray) {
    const existingDoses = await this.getAll();
    const newDoses = dosesArray.map(doseData => ({
      id: generateId('dose'),
      medicineId: doseData.medicineId,
      scheduledDate: doseData.scheduledDate,
      scheduledTime: doseData.scheduledTime,
      dose: doseData.dose,
      status: 'upcoming',
      takenTime: null,
      notes: '',
      createdAt: getCurrentTimestamp(),
    }));
    
    const allDoses = [...existingDoses, ...newDoses];
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(allDoses));
    
    return newDoses;
  },

  /**
   * Get all scheduled doses
   */
  async getAll() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SCHEDULED_DOSES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[ScheduledDoseDB] Error getting all:', error);
      return [];
    }
  },

  /**
   * Get doses for a specific date
   */
  async getByDate(date) {
    const doses = await this.getAll();
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return doses.filter(d => d.scheduledDate === dateStr);
  },

  /**
   * Get doses for today
   */
  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getByDate(today);
  },

  /**
   * Get upcoming doses
   */
  async getUpcoming(limit = 10) {
    const doses = await this.getAll();
    const now = new Date();
    
    return doses
      .filter(d => {
        const doseDateTime = new Date(`${d.scheduledDate}T${this.convertTo24Hour(d.scheduledTime)}`);
        return doseDateTime >= now && d.status === 'upcoming';
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.scheduledDate}T${this.convertTo24Hour(a.scheduledTime)}`);
        const bTime = new Date(`${b.scheduledDate}T${this.convertTo24Hour(b.scheduledTime)}`);
        return aTime - bTime;
      })
      .slice(0, limit);
  },

  /**
   * Get doses by medicine ID
   */
  async getByMedicineId(medicineId) {
    const doses = await this.getAll();
    return doses.filter(d => d.medicineId === medicineId);
  },

  /**
   * Mark dose as taken
   */
  async markTaken(id, takenTime = null) {
    const doses = await this.getAll();
    const index = doses.findIndex(d => d.id === id);
    
    if (index === -1) {
      throw new Error(`Dose ${id} not found`);
    }
    
    doses[index] = {
      ...doses[index],
      status: 'taken',
      takenTime: takenTime || getCurrentTimestamp(),
    };
    
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(doses));
    
    // Add to history
    await MedicationHistoryDB.addEntry({
      doseId: id,
      medicineId: doses[index].medicineId,
      action: 'taken',
      timestamp: takenTime || getCurrentTimestamp(),
    });
    
    return doses[index];
  },

  /**
   * Mark dose as skipped
   */
  async markSkipped(id, reason = '') {
    const doses = await this.getAll();
    const index = doses.findIndex(d => d.id === id);
    
    if (index === -1) {
      throw new Error(`Dose ${id} not found`);
    }
    
    doses[index] = {
      ...doses[index],
      status: 'skipped',
      notes: reason,
    };
    
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(doses));
    
    // Add to history
    await MedicationHistoryDB.addEntry({
      doseId: id,
      medicineId: doses[index].medicineId,
      action: 'skipped',
      timestamp: getCurrentTimestamp(),
      notes: reason,
    });
    
    return doses[index];
  },

  /**
   * Mark dose as missed (automated or manual)
   */
  async markMissed(id) {
    const doses = await this.getAll();
    const index = doses.findIndex(d => d.id === id);
    
    if (index === -1) {
      throw new Error(`Dose ${id} not found`);
    }
    
    doses[index] = {
      ...doses[index],
      status: 'missed',
    };
    
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(doses));
    
    // Add to history
    await MedicationHistoryDB.addEntry({
      doseId: id,
      medicineId: doses[index].medicineId,
      action: 'missed',
      timestamp: getCurrentTimestamp(),
    });
    
    return doses[index];
  },

  /**
   * Update dose status to 'due' when time arrives
   */
  async markDue(id) {
    const doses = await this.getAll();
    const index = doses.findIndex(d => d.id === id);
    
    if (index === -1) return null;
    
    doses[index] = {
      ...doses[index],
      status: 'due',
    };
    
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(doses));
    return doses[index];
  },

  /**
   * Get missed doses
   */
  async getMissed() {
    const doses = await this.getAll();
    return doses.filter(d => d.status === 'missed');
  },

  /**
   * Helper: Convert 12-hour time to 24-hour format
   */
  convertTo24Hour(time12h) {
    if (!time12h) return '00:00';
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  },

  /**
   * Delete dose
   */
  async delete(id) {
    const doses = await this.getAll();
    const filtered = doses.filter(d => d.id !== id);
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(filtered));
  },

  /**
   * Clear old doses (older than 30 days)
   */
  async clearOldDoses(daysToKeep = 30) {
    const doses = await this.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const filtered = doses.filter(d => d.scheduledDate >= cutoffStr);
    await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(filtered));
    
    return doses.length - filtered.length; // Return count of deleted doses
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MEDICATION HISTORY
// ────────────────────────────────────────────────────────────────────────────

export const MedicationHistoryDB = {
  /**
   * Add history entry
   */
  async addEntry(entryData) {
    const history = await this.getAll();
    
    const newEntry = {
      id: generateId('hist'),
      doseId: entryData.doseId,
      medicineId: entryData.medicineId,
      action: entryData.action, // taken, skipped, missed
      timestamp: entryData.timestamp || getCurrentTimestamp(),
      notes: entryData.notes || '',
    };
    
    history.push(newEntry);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    
    return newEntry;
  },

  /**
   * Get all history
   */
  async getAll() {
    try {
      const data = await AsyncStorage.getItem(KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[MedicationHistoryDB] Error getting all:', error);
      return [];
    }
  },

  /**
   * Get history by medicine ID
   */
  async getByMedicineId(medicineId) {
    const history = await this.getAll();
    return history.filter(h => h.medicineId === medicineId);
  },

  /**
   * Get history for date range
   */
  async getByDateRange(startDate, endDate) {
    const history = await this.getAll();
    return history.filter(h => {
      const timestamp = new Date(h.timestamp);
      return timestamp >= new Date(startDate) && timestamp <= new Date(endDate);
    });
  },

  /**
   * Clear old history
   */
  async clearOldHistory(daysToKeep = 90) {
    const history = await this.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const filtered = history.filter(h => new Date(h.timestamp) >= cutoffDate);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
    
    return history.length - filtered.length;
  },
};

// ────────────────────────────────────────────────────────────────────────────
// METADATA & STATISTICS
// ────────────────────────────────────────────────────────────────────────────

export const MedicationMetadata = {
  /**
   * Get adherence statistics
   */
  async getAdherenceStats(days = 30) {
    const history = await MedicationHistoryDB.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentHistory = history.filter(h => new Date(h.timestamp) >= cutoffDate);
    
    const taken = recentHistory.filter(h => h.action === 'taken').length;
    const missed = recentHistory.filter(h => h.action === 'missed').length;
    const skipped = recentHistory.filter(h => h.action === 'skipped').length;
    const total = taken + missed + skipped;
    
    const adherenceRate = total > 0 ? (taken / total) * 100 : 0;
    
    return {
      taken,
      missed,
      skipped,
      total,
      adherenceRate: Math.round(adherenceRate * 10) / 10,
    };
  },

  /**
   * Get current streak (consecutive days with all doses taken)
   */
  async getStreak() {
    const doses = await ScheduledDoseDB.getAll();
    
    // Group by date
    const dosesByDate = doses.reduce((acc, dose) => {
      if (!acc[dose.scheduledDate]) {
        acc[dose.scheduledDate] = [];
      }
      acc[dose.scheduledDate].push(dose);
      return acc;
    }, {});
    
    // Sort dates descending
    const sortedDates = Object.keys(dosesByDate).sort().reverse();
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (const date of sortedDates) {
      if (date > today) continue; // Skip future dates
      
      const dayDoses = dosesByDate[date];
      const totalDoses = dayDoses.length;
      const takenDoses = dayDoses.filter(d => d.status === 'taken').length;
      
      // Consider day complete if all doses taken
      if (totalDoses > 0 && takenDoses === totalDoses) {
        streak++;
      } else if (date !== today) {
        // Break streak (except for today which might be incomplete)
        break;
      }
    }
    
    return streak;
  },
};

// ────────────────────────────────────────────────────────────────────────────
// DATABASE UTILITIES
// ────────────────────────────────────────────────────────────────────────────

export const MedicationDB = {
  /**
   * Clear all medication data (use with caution!)
   */
  async clearAll() {
    await AsyncStorage.multiRemove([
      KEYS.PRESCRIPTIONS,
      KEYS.MEDICINES,
      KEYS.SCHEDULED_DOSES,
      KEYS.HISTORY,
      KEYS.METADATA,
    ]);
  },

  /**
   * Export all data (for backup/sync)
   */
  async exportData() {
    const [prescriptions, medicines, doses, history] = await Promise.all([
      PrescriptionDB.getAll(),
      MedicineDB.getAll(),
      ScheduledDoseDB.getAll(),
      MedicationHistoryDB.getAll(),
    ]);
    
    return {
      version: '1.0',
      exportedAt: getCurrentTimestamp(),
      data: {
        prescriptions,
        medicines,
        scheduledDoses: doses,
        history,
      },
    };
  },

  /**
   * Import data (for restore/sync)
   */
  async importData(exportedData) {
    if (!exportedData || !exportedData.data) {
      throw new Error('Invalid import data');
    }
    
    const { prescriptions, medicines, scheduledDoses, history } = exportedData.data;
    
    if (prescriptions) {
      await AsyncStorage.setItem(KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
    }
    if (medicines) {
      await AsyncStorage.setItem(KEYS.MEDICINES, JSON.stringify(medicines));
    }
    if (scheduledDoses) {
      await AsyncStorage.setItem(KEYS.SCHEDULED_DOSES, JSON.stringify(scheduledDoses));
    }
    if (history) {
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    }
    
    return true;
  },

  /**
   * Get database statistics
   */
  async getStats() {
    const [prescriptions, medicines, doses, history] = await Promise.all([
      PrescriptionDB.getAll(),
      MedicineDB.getAll(),
      ScheduledDoseDB.getAll(),
      MedicationHistoryDB.getAll(),
    ]);
    
    return {
      totalPrescriptions: prescriptions.length,
      activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
      totalMedicines: medicines.length,
      totalScheduledDoses: doses.length,
      upcomingDoses: doses.filter(d => d.status === 'upcoming').length,
      takenDoses: doses.filter(d => d.status === 'taken').length,
      missedDoses: doses.filter(d => d.status === 'missed').length,
      historyEntries: history.length,
    };
  },
};

export default MedicationDB;
