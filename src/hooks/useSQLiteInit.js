/**
 * SQLite Initialization Hook
 * -------------------------
 * React hook to initialize SQLite database and handle migration on app startup.
 */

import { useEffect, useState } from 'react';
import { Database } from '../database/Database';
import { prescriptionMigrationService } from '../services/PrescriptionMigrationService';

export function useSQLiteInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  useEffect(() => {
    initializeSQLite();
  }, []);

  const initializeSQLite = async () => {
    try {
      console.log('[SQLiteInit] Initializing SQLite database...');
      
      // Initialize database
      await Database.init();
      console.log('[SQLiteInit] Database initialized successfully');

      // Check migration status
      const migrationCompleted = await prescriptionMigrationService.isMigrationCompleted();
      
      if (!migrationCompleted) {
        console.log('[SQLiteInit] Running data migration...');
        const migrationResult = await prescriptionMigrationService.performMigration();
        setMigrationStatus(migrationResult);
        
        if (!migrationResult.success) {
          console.error('[SQLiteInit] Migration failed:', migrationResult.error);
        } else {
          console.log('[SQLiteInit] Migration completed successfully');
        }
      } else {
        console.log('[SQLiteInit] Migration already completed');
        setMigrationStatus({ success: true, alreadyCompleted: true });
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