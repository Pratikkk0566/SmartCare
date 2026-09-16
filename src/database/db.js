/**
 * SmartCare SQLite Database
 * -------------------------
 * Single database connection with comprehensive schema for:
 * - Patient PHR data (offline-first)
 * - Medication scheduling and alarms (offline-first)
 * - Multi-patient support with patient_id isolation
 * 
 * Architecture: Hybrid JSON + Relational
 * - PHR data: JSON storage in data column for flexibility
 * - Queryable fields: Extracted columns for filtering/sorting
 * - Medication alarms: Normalized tables for scheduling engine
 */
import { open } from 'react-native-nitro-sqlite';

let connection = null;
let isInitializing = false;
let initPromise = null;

/**
 * Get database connection (singleton pattern with concurrency protection)
 */
export async function getDatabase() {
  if (connection) {
    return connection;
  }
  
  // Prevent concurrent initialization
  if (isInitializing) {
    return initPromise;
  }
  
  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('[Database] Opening smartcare.db...');
      connection = open({ name: 'smartcare.db' });
      await initializeSchema();
      console.log('[Database] Ready');
      return connection;
    } catch (error) {
      console.error('[Database] Initialization failed:', error);
      connection = null;
      throw error;
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();
  
  return initPromise;
}

/**
 * Initialize database schema
 * Creates all tables with proper versioning and migrations
 */
async function initializeSchema() {
  const db = connection;
  
  // Enable foreign keys and WAL mode for performance
  await db.execute('PRAGMA foreign_keys = ON');
  await db.execute('PRAGMA journal_mode = WAL');
  
  // Get current schema version
  const versionResult = await db.execute('PRAGMA user_version');
  const currentVersion = versionResult.rows?.[0]?.user_version || 0;
  
  console.log('[Database] Current schema version:', currentVersion);
  
  // Run migrations if needed
  if (currentVersion === 0) {
    await createInitialSchema(db);
    await setSchemaVersion(1);
    console.log('[Database] Initial schema created (version 1)');
  } else if (currentVersion < 2) {
    await migrateToV2(db);
    await setSchemaVersion(2);
    console.log('[Database] Migrated to version 2');
  }
  
  // Future migrations will be added here:
  // if (currentVersion < 3) { await migrateToV3(db); await setSchemaVersion(3); }
}

/**
 * Create initial database schema (version 1)
 */
async function createInitialSchema(db) {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHR DATA TABLES (JSON storage with extracted queryable fields)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Patients table - core identity
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Prescriptions table - patient-scoped with JSON data
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Investigations table - patient-scoped with file paths
  await db.execute(`
    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      title TEXT,
      date TEXT,
      file_path TEXT,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Medicines table - patient-scoped (for medicine catalogue/inventory if needed)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      prescription_id TEXT,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Invoices table - patient-scoped
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      invoice_date TEXT,
      invoice_number TEXT,
      amount REAL,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Appointments table - patient-scoped (for history only, NOT for booking)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      appointment_date TEXT,
      appointment_time TEXT,
      doctor_name TEXT,
      status TEXT,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICATION ALARM SYSTEM TABLES (for offline medication reminders)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Medication schedules - generated from active prescriptions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medication_schedules (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      prescription_id TEXT,
      medicine_name TEXT NOT NULL,
      medicine_type TEXT,
      dose_value REAL DEFAULT 1,
      dose_unit TEXT DEFAULT 'tablet',
      frequency TEXT,
      food_instruction TEXT,
      start_date TEXT,
      end_date TEXT,
      schedule_times TEXT,
      is_active INTEGER DEFAULT 1,
      data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
    )
  `);

  // Scheduled doses - individual dose instances with status tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scheduled_doses (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      dose_value REAL DEFAULT 1,
      dose_unit TEXT DEFAULT 'tablet',
      status TEXT DEFAULT 'pending',
      taken_at INTEGER,
      notes TEXT,
      data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE
    )
  `);

  // Medication alarms - OS notification scheduling
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medication_alarms (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      dose_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      alarm_time TEXT NOT NULL,
      notification_id TEXT,
      status TEXT DEFAULT 'scheduled',
      snooze_count INTEGER DEFAULT 0,
      data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (dose_id) REFERENCES scheduled_doses(id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE
    )
  `);

  // Dose events - history of user actions (taken/skipped/snoozed)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dose_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      dose_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_time INTEGER NOT NULL,
      notes TEXT,
      data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (dose_id) REFERENCES scheduled_doses(id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE
    )
  `);

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEXES FOR PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // PHR data indexes
  await db.execute('CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_patient ON investigations(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_investigations_date ON investigations(patient_id, date DESC)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_medicines_patient ON medicines(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(patient_id, invoice_date DESC)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(patient_id, appointment_date DESC)');

  // Medication system indexes
  await db.execute('CREATE INDEX IF NOT EXISTS idx_med_schedules_patient ON medication_schedules(patient_id, is_active)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_med_schedules_active ON medication_schedules(is_active, start_date, end_date)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_scheduled_doses_patient ON scheduled_doses(patient_id, scheduled_date)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_scheduled_doses_schedule ON scheduled_doses(schedule_id, scheduled_date)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_scheduled_doses_status ON scheduled_doses(patient_id, status, scheduled_date)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_med_alarms_patient ON medication_alarms(patient_id, status)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_med_alarms_dose ON medication_alarms(dose_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_med_alarms_time ON medication_alarms(patient_id, alarm_time)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_dose_events_patient ON dose_events(patient_id, event_time DESC)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_dose_events_dose ON dose_events(dose_id)');

  console.log('[Database] Initial schema created successfully');
}

/**
 * Migration to version 2 (placeholder for future schema changes)
 */
async function migrateToV2(db) {
  // Example future migration:
  // await db.execute('ALTER TABLE prescriptions ADD COLUMN is_active INTEGER DEFAULT 1');
  console.log('[Database] Migration to V2 (no changes yet)');
}

/**
 * Get current schema version
 */
export async function getSchemaVersion() {
  const db = await getDatabase();
  const result = await db.execute('PRAGMA user_version');
  return result.rows?.[0]?.user_version || 0;
}

/**
 * Set schema version
 */
export async function setSchemaVersion(version) {
  const db = await getDatabase();
  await db.execute(`PRAGMA user_version = ${version}`);
  console.log('[Database] Schema version set to:', version);
}

/**
 * Generate unique ID with optional prefix
 */
export function generateId(prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Get current Unix timestamp
 */
export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Execute a transaction (for batch operations)
 */
export async function executeTransaction(callback) {
  const db = await getDatabase();
  
  try {
    await db.execute('BEGIN TRANSACTION');
    const result = await callback(db);
    await db.execute('COMMIT');
    return result;
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('[Database] Transaction failed:', error);
    throw error;
  }
}

/**
 * Upsert helper - INSERT or UPDATE based on existence
 * Uses INSERT OR REPLACE which works for simple cases
 * For complex cases with foreign keys, use manual INSERT + UPDATE pattern
 */
export async function upsert(tableName, record, idField = 'id') {
  const db = await getDatabase();
  const id = record[idField];
  
  if (!id) {
    throw new Error(`Upsert requires ${idField} field`);
  }
  
  // Check if record exists
  const existsResult = await db.execute(
    `SELECT 1 FROM ${tableName} WHERE ${idField} = ? LIMIT 1`,
    [id]
  );
  
  const exists = existsResult.rows && existsResult.rows.length > 0;
  
  const now = getCurrentTimestamp();
  const recordWithTimestamps = {
    ...record,
    updated_at: now,
    ...(!exists && { created_at: now })
  };
  
  const columns = Object.keys(recordWithTimestamps);
  const values = columns.map(col => recordWithTimestamps[col]);
  
  if (exists) {
    // UPDATE
    const setClause = columns
      .filter(col => col !== idField)
      .map(col => `${col} = ?`)
      .join(', ');
    const updateValues = columns
      .filter(col => col !== idField)
      .map(col => recordWithTimestamps[col]);
    
    await db.execute(
      `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`,
      [...updateValues, id]
    );
  } else {
    // INSERT
    const placeholders = columns.map(() => '?').join(', ');
    await db.execute(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }
  
  return recordWithTimestamps;
}

/**
 * Batch upsert (wrapped in transaction)
 */
export async function batchUpsert(tableName, records, idField = 'id') {
  if (!records || records.length === 0) {
    return [];
  }
  
  return executeTransaction(async () => {
    const results = [];
    for (const record of records) {
      const result = await upsert(tableName, record, idField);
      results.push(result);
    }
    return results;
  });
}