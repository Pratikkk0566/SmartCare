/**
 * SQLite Initialization Hook
 * -------------------------
 * React hook to initialize SQLite database and handle migration on app startup.
 * 
 * DEPRECATED: This hook is deprecated in favor of the Phase 2-10 architecture.
 * Database initialization now happens through:
 * - useDatabase() hook (Phase 3)
 * - SqliteStorageService (Phase 3)
 * - db.js getDatabase() singleton (Phase 2)
 * 
 * This file is kept for reference but should NOT be used.
 * TODO: Remove after confirming Phase 2-10 architecture is stable.
 */

import { useEffect, useState } from 'react';
// DISABLED: Old Database.js system conflicts with new db.js
// import { Database } from '../database/Database';
import { getDatabase } from '../database/db'; // Use new Phase 2 architecture
import { runMigrations } from '../database/migration'; // Use new Phase 2 migrations

export function useSQLiteInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    initializeSQLite();
  }, []);

  const initializeSQLite = async () => {
    try {
      console.log('[SQLiteInit] Initializing SQLite database (Phase 2-10 architecture)...');
      
      // UPDATED: Use new Phase 2 database initialization
      await getDatabase();
      console.log('[SQLiteInit] Database initialized successfully');

      // UPDATED: Use new Phase 2 migration system
      console.log('[SQLiteInit] Running data migration...');
      const migrationResult = await runMigrations();
      setMigrationStatus(migrationResult);
      
      if (!migrationResult.success && !migrationResult.alreadyCompleted) {
        console.error('[SQLiteInit] Migration failed:', migrationResult.error);
      } else {
        console.log('[SQLiteInit] Migration completed successfully');
      }

      setIsInitialized(true);
      
    } catch (err) {
      console.error('[SQLiteInit] Initialization failed:', err);
      setError(err);
    }
  };

  return {
    isInitialized,
    error,
    migrationStatus,
    retry: initializeSQLite
  };
}

export default useSQLiteInit;