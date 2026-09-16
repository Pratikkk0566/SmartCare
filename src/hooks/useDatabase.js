/**
 * useDatabase Hook
 * ----------------
 * React hook to ensure database is initialized and ready
 * Runs migrations on first app launch
 * 
 * Usage:
 *   const { isReady, error } = useDatabase();
 *   if (!isReady) return <LoadingScreen />;
 */

import { useEffect, useState } from 'react';
import { getDatabase, getSchemaVersion } from '../database/db.js';
import { runMigrations } from '../database/migration.js';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [schemaVersion, setSchemaVersion] = useState(0);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      console.log('[useDatabase] Initializing database...');
      
      // Initialize database (creates schema if needed)
      await getDatabase();
      
      // Check schema version
      const version = await getSchemaVersion();
      setSchemaVersion(version);
      console.log('[useDatabase] Database schema version:', version);
      
      // Run migrations (only runs if needed)
      const migrationResult = await runMigrations();
      
      if (migrationResult.success) {
        console.log('[useDatabase] Database ready');
        setIsReady(true);
      } else {
        console.error('[useDatabase] Migration failed:', migrationResult.error);
        setError(new Error(migrationResult.error || 'Migration failed'));
        // Still mark as ready since database exists, just migration failed
        setIsReady(true);
      }
      
    } catch (err) {
      console.error('[useDatabase] Database initialization failed:', err);
      setError(err);
      // Don't set ready to true if database completely failed
    }
  };

  return {
    isReady,
    error,
    schemaVersion,
    retry: initializeDatabase
  };
}

export default useDatabase;
