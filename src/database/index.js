/**
 * Database Module Exports
 * -----------------------
 * Central export point for all database-related components
 * 
 * ARCHITECTURE DECISION: Using simplified JSON storage approach (db.js)
 * Database.js and repositories are legacy/experimental - not in active use
 */

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY DATABASE SYSTEM (Active - Simple JSON Storage)
// ═══════════════════════════════════════════════════════════════════════════

// Core database connection and utilities
export {
  getDatabase,
  getSchemaVersion,
  setSchemaVersion,
  generateId,
  getCurrentTimestamp,
  executeTransaction,
  upsert,
  batchUpsert
} from './db.js';

// Storage modules (simplified PHR data access)
export * from './patientStorage.js';
export * from './prescriptionStorage.js';
export * from './investigationStorage.js';
export * from './invoiceStorage.js';
export * from './appointmentStorage.js';

// Migration
export { runMigrations } from './migration.js';

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY SYSTEM (Inactive - Kept for reference)
// These exports are maintained for backwards compatibility but not actively used
// ═══════════════════════════════════════════════════════════════════════════

// Core database (normalized schema - not used in production)
// export { Database, generateId, getCurrentTimestamp } from './Database';

// Base repository (repository pattern - not used in production)
// export { BaseRepository } from './BaseRepository';

// Repositories (repository pattern - not used in production)
// export { default as PrescriptionRepository } from './repositories/PrescriptionRepository';
// export { default as MedicineRepository } from './repositories/MedicineRepository';
// export { default as ScheduledDoseRepository } from './repositories/ScheduledDoseRepository';
