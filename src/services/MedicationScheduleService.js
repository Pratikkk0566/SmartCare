/**
 * MedicationScheduleService.js
 * 
 * Generates medication schedules locally on device
 * Handles various frequency patterns and custom timing
 */

import { MedicineDB, ScheduledDoseDB } from './MedicationDatabaseService';

// ────────────────────────────────────────────────────────────────────────────
// FREQUENCY PATTERNS
// ────────────────────────────────────────────────────────────────────────────

const FREQUENCY_DEFAULTS = {
  once_daily: ['08:00 AM'],
  twice_daily: ['08:00 AM', '08:00 PM'],
  thrice_daily: ['08:00 AM', '02:00 PM', '08:00 PM'],
  four_times_daily: ['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'],
  every_4_hours: ['12:00 AM', '04:00 AM', '08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'],
  every_6_hours: ['12:00 AM', '06:00 AM', '12:00 PM', '06:00 PM'],
  every_8_hours: ['12:00 AM', '08:00 AM', '04:00 PM'],
  every_12_hours: ['08:00 AM', '08:00 PM'],
  morning: ['08:00 AM'],
  afternoon: ['02:00 PM'],
  evening: ['06:00 PM'],
  night: ['10:00 PM'],
  before_sleep: ['10:00 PM'],
  custom: [], // User provides times
};

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULE GENERATION
// ────────────────────────────────────────────────────────────────────────────

export const MedicationScheduleService = {
  /**
   * Generate full schedule for a medicine
   * Creates all scheduled dose entries for the medicine's duration
   * Supports quantity-based scheduling with partial days
   */
  async generateScheduleForMedicine(medicine) {
    if (!medicine || !medicine.id) {
      throw new Error('Invalid medicine object');
    }

    // Determine times for doses
    let times = [];
    if (medicine.times && medicine.times.length > 0) {
      // User-specified times
      times = medicine.times;
    } else if (medicine.frequency) {
      // Use frequency pattern
      times = FREQUENCY_DEFAULTS[medicine.frequency] || FREQUENCY_DEFAULTS.once_daily;
    } else {
      // Default to once daily at 8 AM
      times = FREQUENCY_DEFAULTS.once_daily;
    }

    if (times.length === 0) {
      console.warn(`[ScheduleService] No times found for medicine ${medicine.id}`);
      return [];
    }

    // Determine date range and quantity-based scheduling
    const startDate = new Date(medicine.startDate);
    const scheduledDoses = [];
    const currentDate = new Date(startDate);
    
    // Calculate quantity-based schedule if totalQuantity is provided
    if (medicine.totalQuantity && medicine.dose) {
      const totalQuantity = parseFloat(medicine.totalQuantity);
      const dosePerTime = parseFloat(medicine.dose);
      let remainingQuantity = totalQuantity;
      
      // Generate doses until quantity runs out
      while (remainingQuantity > 0) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        for (const time of times) {
          if (remainingQuantity >= dosePerTime) {
            scheduledDoses.push({
              medicineId: medicine.id,
              scheduledDate: dateStr,
              scheduledTime: time,
              dose: `${medicine.dose} ${medicine.unit}`,
            });
            remainingQuantity -= dosePerTime;
          } else {
            // Skip doses that don't have enough quantity remaining
            break;
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Safety check to prevent infinite loops (max 365 days)
        if (scheduledDoses.length > times.length * 365) {
          console.warn(`[ScheduleService] Schedule generation exceeded 365 days for medicine ${medicine.id}`);
          break;
        }
      }
    } else {
      // Duration-based scheduling (original logic)
      let endDate;

      if (medicine.endDate) {
        endDate = new Date(medicine.endDate);
      } else if (medicine.durationDays) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + medicine.durationDays);
      } else {
        // Default to 30 days if no end date specified
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
      }

      // Generate scheduled doses for all days
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        for (const time of times) {
          scheduledDoses.push({
            medicineId: medicine.id,
            scheduledDate: dateStr,
            scheduledTime: time,
            dose: `${medicine.dose} ${medicine.unit}`,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Save to database
    const created = await ScheduledDoseDB.createBulk(scheduledDoses);
    
    console.log(`[ScheduleService] Generated ${created.length} doses for medicine ${medicine.name}`);
    return created;
  },

  /**
   * Generate schedules for all medicines in a prescription
   */
  async generateScheduleForPrescription(prescriptionId) {
    const medicines = await MedicineDB.getByPrescriptionId(prescriptionId);
    
    if (!medicines || medicines.length === 0) {
      console.warn(`[ScheduleService] No medicines found for prescription ${prescriptionId}`);
      return [];
    }

    const allScheduledDoses = [];

    for (const medicine of medicines) {
      try {
        const doses = await this.generateScheduleForMedicine(medicine);
        allScheduledDoses.push(...doses);
      } catch (error) {
        console.error(`[ScheduleService] Error generating schedule for medicine ${medicine.id}:`, error);
      }
    }

    console.log(`[ScheduleService] Generated ${allScheduledDoses.length} total doses for prescription ${prescriptionId}`);
    return allScheduledDoses;
  },

  /**
   * Regenerate schedule for a medicine (e.g., after editing)
   * Clears existing future doses and creates new ones
   */
  async regenerateScheduleForMedicine(medicineId) {
    // Get medicine
    const medicine = await MedicineDB.getById(medicineId);
    if (!medicine) {
      throw new Error(`Medicine ${medicineId} not found`);
    }

    // Delete existing future doses for this medicine
    const allDoses = await ScheduledDoseDB.getAll();
    const today = new Date().toISOString().split('T')[0];
    const futureDoses = allDoses.filter(d => 
      d.medicineId === medicineId && 
      d.scheduledDate >= today &&
      d.status === 'upcoming'
    );

    for (const dose of futureDoses) {
      await ScheduledDoseDB.delete(dose.id);
    }

    // Generate new schedule
    return await this.generateScheduleForMedicine(medicine);
  },

  /**
   * Get summary of upcoming doses for a prescription
   */
  async getUpcomingSummary(prescriptionId, days = 7) {
    const medicines = await MedicineDB.getByPrescriptionId(prescriptionId);
    const medicineIds = medicines.map(m => m.id);

    const allDoses = await ScheduledDoseDB.getAll();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const upcomingDoses = allDoses.filter(d =>
      medicineIds.includes(d.medicineId) &&
      d.scheduledDate >= todayStr &&
      d.scheduledDate <= futureStr &&
      d.status === 'upcoming'
    );

    // Group by date
    const dosesByDate = upcomingDoses.reduce((acc, dose) => {
      if (!acc[dose.scheduledDate]) {
        acc[dose.scheduledDate] = [];
      }
      acc[dose.scheduledDate].push(dose);
      return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(dosesByDate).sort();

    return sortedDates.map(date => ({
      date,
      doses: dosesByDate[date],
      count: dosesByDate[date].length,
    }));
  },

  /**
   * Get today's schedule with medicine details
   */
  async getTodayScheduleWithDetails() {
    const todayDoses = await ScheduledDoseDB.getToday();
    
    // Enrich with medicine details
    const enrichedDoses = await Promise.all(
      todayDoses.map(async (dose) => {
        const medicine = await MedicineDB.getById(dose.medicineId);
        return {
          ...dose,
          medicine,
        };
      })
    );

    // Sort by time
    return enrichedDoses.sort((a, b) => {
      const aTime = this.convertTo24Hour(a.scheduledTime);
      const bTime = this.convertTo24Hour(b.scheduledTime);
      return aTime.localeCompare(bTime);
    });
  },

  /**
   * Check and update statuses for doses that are now due or missed
   */
  async updateDoseStatuses() {
    const allDoses = await ScheduledDoseDB.getAll();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime24 = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let updatedCount = 0;

    for (const dose of allDoses) {
      if (dose.status !== 'upcoming') continue; // Already processed

      const doseTime24 = this.convertTo24Hour(dose.scheduledTime);
      const doseDateTime = new Date(`${dose.scheduledDate}T${doseTime24}`);

      // Check if dose is due (within 30 minutes window)
      const timeDiff = now - doseDateTime;
      const thirtyMinutes = 30 * 60 * 1000;

      if (dose.scheduledDate === today && currentTime24 >= doseTime24) {
        if (timeDiff <= thirtyMinutes) {
          // Mark as due
          await ScheduledDoseDB.markDue(dose.id);
          updatedCount++;
        } else {
          // Mark as missed (more than 30 minutes past)
          await ScheduledDoseDB.markMissed(dose.id);
          updatedCount++;
        }
      } else if (dose.scheduledDate < today) {
        // Past date, mark as missed
        await ScheduledDoseDB.markMissed(dose.id);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[ScheduleService] Updated ${updatedCount} dose statuses`);
    }

    return updatedCount;
  },

  /**
   * Helper: Convert 12-hour time to 24-hour format
   */
  convertTo24Hour(time12h) {
    if (!time12h) return '00:00';
    
    // Check if already in 24-hour format
    if (!time12h.includes('AM') && !time12h.includes('PM')) {
      return time12h;
    }
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    hours = parseInt(hours, 10);
    
    if (hours === 12) {
      hours = 0;
    }
    
    if (modifier === 'PM') {
      hours = hours + 12;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes || '00'}`;
  },

  /**
   * Helper: Convert 24-hour time to 12-hour format
   */
  convertTo12Hour(time24h) {
    if (!time24h) return '12:00 AM';
    
    // Check if already in 12-hour format
    if (time24h.includes('AM') || time24h.includes('PM')) {
      return time24h;
    }
    
    let [hours, minutes] = time24h.split(':');
    hours = parseInt(hours, 10);
    
    const modifier = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours = hours - 12;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes || '00'} ${modifier}`;
  },

  /**
   * Get next upcoming dose
   */
  async getNextDose() {
    const upcoming = await ScheduledDoseDB.getUpcoming(1);
    if (upcoming.length === 0) return null;
    
    const dose = upcoming[0];
    const medicine = await MedicineDB.getById(dose.medicineId);
    
    return {
      ...dose,
      medicine,
    };
  },

  /**
   * Calculate adherence rate for a prescription
   */
  async calculateAdherence(prescriptionId, days = 30) {
    const medicines = await MedicineDB.getByPrescriptionId(prescriptionId);
    const medicineIds = medicines.map(m => m.id);

    const allDoses = await ScheduledDoseDB.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const relevantDoses = allDoses.filter(d =>
      medicineIds.includes(d.medicineId) &&
      d.scheduledDate >= cutoffStr &&
      d.scheduledDate <= todayStr
    );

    const taken = relevantDoses.filter(d => d.status === 'taken').length;
    const total = relevantDoses.length;

    return {
      taken,
      total,
      adherenceRate: total > 0 ? Math.round((taken / total) * 100 * 10) / 10 : 0,
    };
  },

  /**
   * Get available frequency options
   */
  getFrequencyOptions() {
    return [
      { value: 'once_daily', label: 'Once Daily', times: 1 },
      { value: 'twice_daily', label: 'Twice Daily', times: 2 },
      { value: 'thrice_daily', label: 'Three Times Daily', times: 3 },
      { value: 'four_times_daily', label: 'Four Times Daily', times: 4 },
      { value: 'every_4_hours', label: 'Every 4 Hours', times: 6 },
      { value: 'every_6_hours', label: 'Every 6 Hours', times: 4 },
      { value: 'every_8_hours', label: 'Every 8 Hours', times: 3 },
      { value: 'every_12_hours', label: 'Every 12 Hours', times: 2 },
      { value: 'morning', label: 'Morning Only', times: 1 },
      { value: 'afternoon', label: 'Afternoon Only', times: 1 },
      { value: 'evening', label: 'Evening Only', times: 1 },
      { value: 'night', label: 'Night Only', times: 1 },
      { value: 'before_sleep', label: 'Before Sleep', times: 1 },
      { value: 'custom', label: 'Custom Times', times: 0 },
    ];
  },

  /**
   * Get default times for a frequency
   */
  getDefaultTimes(frequency) {
    return FREQUENCY_DEFAULTS[frequency] || FREQUENCY_DEFAULTS.once_daily;
  },
};

export default MedicationScheduleService;
