/**
 * MedicationScheduleService.js
 * 
 * SQLite removed - all methods return empty/placeholder results pending reimplementation
 */

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
// SERVICE (SQLITE REMOVED - STUB METHODS)
// ────────────────────────────────────────────────────────────────────────────

export const MedicationScheduleService = {
  async generateScheduleForMedicine(medicine) {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return [];
  },
  
  async generateScheduleForPrescription(prescriptionId) {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return [];
  },
  
  async regenerateScheduleForMedicine(medicineId) {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return [];
  },
  
  async getUpcomingSummary(prescriptionId, days = 7) {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return [];
  },
  
  async getTodayScheduleWithDetails() {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return [];
  },
  
  async updateDoseStatuses() {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return 0;
  },
  
  async getNextDose() {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return null;
  },
  
  async calculateAdherence(prescriptionId, days = 30) {
    console.warn('[MedicationScheduleService] SQLite removed - functionality pending reimplementation');
    return { taken: 0, total: 0, adherenceRate: 0 };
  },
  
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
  
  getDefaultTimes(frequency) {
    return FREQUENCY_DEFAULTS[frequency] || FREQUENCY_DEFAULTS.once_daily;
  },
  
  convertTo24Hour(time12h) {
    if (!time12h) return '00:00';
    if (!time12h.includes('AM') && !time12h.includes('PM')) return time12h;
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours = hours + 12;
    
    return `${String(hours).padStart(2, '0')}:${minutes || '00'}`;
  },
  
  convertTo12Hour(time24h) {
    if (!time24h) return '12:00 AM';
    if (time24h.includes('AM') || time24h.includes('PM')) return time24h;
    
    let [hours, minutes] = time24h.split(':');
    hours = parseInt(hours, 10);
    
    const modifier = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    else if (hours > 12) hours = hours - 12;
    
    return `${String(hours).padStart(2, '0')}:${minutes || '00'} ${modifier}`;
  },
};

export default MedicationScheduleService;
