/**
 * SQLite Database Foundation
 * -------------------------
 * Central database layer for SmartCare application
 * 
 * Responsibilities:
 * - Opening/closing database connection
 * - Schema initialization and migrations
 * - Transaction management
 * - Error handling
 * - Foreign key enforcement
 * - Index management
 */

import { NitroSQLiteConnection, open } from 'react-native-nitro-sqlite';

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.currentVersion = 1;
    this.dbName = 'smartcare.db';
  }

  /**
   * Initialize database connection and schema
   */
  async init() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    try {
      console.log('[Database] Opening database:', this.dbName);
      this.db = await open({
        name: this.dbName,
        encryptionKey: undefined // We can add encryption later if needed
      });

      // Enable foreign key constraints
      await this.db.execute('PRAGMA foreign_keys = ON;');
      
      // Enable WAL mode for better performance
      await this.db.execute('PRAGMA journal_mode = WAL;');
      
      // Initialize schema
      await this.initializeSchema();
      
      this.isInitialized = true;
      console.log('[Database] Database initialized successfully');
      
      return this.db;
    } catch (error) {
      console.error('[Database] Failed to initialize:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Get database connection (ensures initialization)
   */
  async getConnection() {
    if (!this.isInitialized || !this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * Initialize database schema and handle migrations
   */
  async initializeSchema() {
    if (!this.db) throw new Error('Database not opened');

    // Get current schema version
    let currentVersion = 0;
    try {
      const result = await this.db.execute('PRAGMA user_version;');
      if (result.rows && result.rows.length > 0) {
        currentVersion = result.rows[0].user_version || 0;
      }
    } catch (error) {
      console.log('[Database] Could not read user_version, assuming new database');
    }

    console.log('[Database] Current version:', currentVersion, 'Target version:', this.currentVersion);

    // Run migrations if needed
    if (currentVersion < this.currentVersion) {
      await this.runMigrations(currentVersion);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(fromVersion) {
    console.log('[Database] Running migrations from version', fromVersion);

    await this.executeTransaction(async () => {
      if (fromVersion < 1) {
        await this.createInitialSchema();
      }

      // Future migrations will go here
      // if (fromVersion < 2) { await this.migrationV2(); }
      // if (fromVersion < 3) { await this.migrationV3(); }

      // Update schema version
      await this.db.execute(`PRAGMA user_version = ${this.currentVersion};`);
    });

    console.log('[Database] Migrations completed successfully');
  }

  /**
   * Create initial database schema (Version 1)
   */
  async createInitialSchema() {
    console.log('[Database] Creating initial schema...');

    // ── PATIENTS TABLE ──────────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY,
        uhid TEXT,
        phone TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        middle_name TEXT,
        email TEXT,
        gender TEXT,
        dob TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        blood_group TEXT,
        height REAL,
        height_unit TEXT DEFAULT 'cm',
        weight REAL,
        weight_unit TEXT DEFAULT 'kg',
        bp TEXT,
        allergies TEXT,
        is_active INTEGER DEFAULT 1,
        last_sync TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ── PRACTITIONERS TABLE ─────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS practitioners (
        practitioner_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialization TEXT,
        qualification TEXT,
        experience TEXT,
        phone TEXT,
        email TEXT,
        clinic_name TEXT,
        clinic_address TEXT,
        availability TEXT,
        rating REAL,
        profile_image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ── APPOINTMENTS TABLE ──────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        practitioner_id TEXT,
        practitioner_name TEXT,
        appointment_type TEXT,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT NOT NULL,
        clinic_name TEXT,
        clinic_address TEXT,
        consultation_fee REAL,
        booking_fee REAL,
        total_amount REAL,
        notes TEXT,
        prescription_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
        FOREIGN KEY (practitioner_id) REFERENCES practitioners (practitioner_id) ON DELETE SET NULL
      );
    `);

    // ── PRESCRIPTIONS TABLE ─────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        appointment_id TEXT,
        practitioner_id TEXT,
        practitioner_name TEXT,
        prescription_name TEXT NOT NULL,
        prescription_date TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        pdf_url TEXT,
        local_pdf_path TEXT,
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE SET NULL,
        FOREIGN KEY (practitioner_id) REFERENCES practitioners (practitioner_id) ON DELETE SET NULL
      );
    `);

    // ── PRESCRIPTION MEDICINES TABLE ────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS prescription_medicines (
        medicine_id TEXT PRIMARY KEY,
        prescription_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        medicine_name TEXT NOT NULL,
        medicine_type TEXT DEFAULT 'tablet',
        dose_value REAL NOT NULL,
        dose_unit TEXT NOT NULL,
        frequency TEXT NOT NULL,
        food_instruction TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        duration_days INTEGER,
        total_quantity REAL,
        instructions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions (prescription_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
      );
    `);

    // ── MEDICINE SCHEDULES TABLE ────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS medicine_schedules (
        schedule_id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        frequency TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES prescription_medicines (medicine_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
      );
    `);

    // ── MEDICINE DOSES TABLE (for dose tracking) ────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS medicine_doses (
        dose_id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        dose_value REAL NOT NULL,
        dose_unit TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming',
        taken_at TEXT,
        skipped_at TEXT,
        snoozed_until TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (medicine_id) REFERENCES prescription_medicines (medicine_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
      );
    `);

    // ── INVESTIGATIONS TABLE ────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS investigations (
        investigation_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        investigation_name TEXT NOT NULL,
        category TEXT,
        status TEXT NOT NULL DEFAULT 'Pending',
        investigation_date TEXT NOT NULL,
        investigation_time TEXT,
        report_url TEXT,
        local_report_path TEXT,
        lab_name TEXT,
        practitioner_name TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE
      );
    `);

    // ── INVOICES TABLE ──────────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        invoice_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        appointment_id TEXT,
        invoice_number TEXT,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        subtotal REAL,
        tax_amount REAL,
        discount_amount REAL,
        total_amount REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        paid_at TEXT,
        pdf_url TEXT,
        local_pdf_path TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE SET NULL
      );
    `);

    // ── INVOICE ITEMS TABLE ─────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        item_id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices (invoice_id) ON DELETE CASCADE
      );
    `);

    // ── SYNC METADATA TABLE ─────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        sync_key TEXT PRIMARY KEY,
        patient_id TEXT,
        entity_type TEXT NOT NULL,
        last_sync_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // ── APP SETTINGS TABLE ──────────────────────────────────────────────
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Create indexes for better query performance
    await this.createIndexes();

    console.log('[Database] Initial schema created successfully');
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    console.log('[Database] Creating indexes...');

    // ── PATIENT INDEXES ────────────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_patients_active ON patients (is_active);');

    // ── PRACTITIONER INDEXES ───────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_practitioners_name ON practitioners (name);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_practitioners_specialization ON practitioners (specialization);');

    // ── APPOINTMENT INDEXES ─────────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_practitioner ON appointments (practitioner_id);');

    // ── PRESCRIPTION INDEXES ────────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions (prescription_date);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions (status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions (appointment_id);');

    // ── MEDICINE INDEXES ────────────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_medicines_prescription ON prescription_medicines (prescription_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_medicines_patient ON prescription_medicines (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_medicines_active ON prescription_medicines (is_active);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_medicines_dates ON prescription_medicines (start_date, end_date);');

    // ── MEDICINE SCHEDULE INDEXES ───────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_schedules_medicine ON medicine_schedules (medicine_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_schedules_patient ON medicine_schedules (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_schedules_time ON medicine_schedules (scheduled_time);');

    // ── MEDICINE DOSE INDEXES ───────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_doses_medicine ON medicine_doses (medicine_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_doses_patient ON medicine_doses (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_doses_date ON medicine_doses (scheduled_date);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_doses_status ON medicine_doses (status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_doses_patient_date ON medicine_doses (patient_id, scheduled_date);');

    // ── INVESTIGATION INDEXES ───────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_patient ON investigations (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_date ON investigations (investigation_date);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations (status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_category ON investigations (category);');

    // ── INVOICE INDEXES ─────────────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (payment_status);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices (appointment_id);');

    // ── SYNC METADATA INDEXES ──────────────────────────────────────────
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_patient ON sync_metadata (patient_id);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_metadata (entity_type);');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_metadata (sync_status);');

    console.log('[Database] Indexes created successfully');
  }

  /**
   * Execute a transaction
   */
  async executeTransaction(callback) {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute('BEGIN TRANSACTION;');
    try {
      await callback();
      await this.db.execute('COMMIT;');
    } catch (error) {
      console.error('[Database] Transaction failed, rolling back:', error);
      await this.db.execute('ROLLBACK;');
      throw error;
    }
  }

  /**
   * Execute a prepared statement
   */
  async execute(sql, params = []) {
    const db = await this.getConnection();
    return db.execute(sql, params);
  }

  /**
   * Execute a query and return results
   */
  async query(sql, params = []) {
    const result = await this.execute(sql, params);
    return result.rows || [];
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      try {
        await this.db.close();
        console.log('[Database] Database connection closed');
      } catch (error) {
        console.error('[Database] Error closing database:', error);
      }
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get database statistics for debugging
   */
  async getStats() {
    const db = await this.getConnection();
    
    const stats = {};
    
    // Get row counts for each table
    const tables = [
      'prescriptions', 
      'prescription_medicines', 
      'medicine_times', 
      'scheduled_doses', 
      'medication_history',
      'invoices',
      'investigations'
    ];
    
    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT COUNT(*) as count FROM ${table};`);
        stats[table] = result.rows[0]?.count || 0;
      } catch (error) {
        stats[table] = 'error';
      }
    }
    
    return stats;
  }
}

// Export singleton instance
export const Database = new DatabaseManager();

// Utility function to generate IDs
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to get current ISO timestamp
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export default Database;