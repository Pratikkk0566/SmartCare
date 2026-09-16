/**
 * Simple Storage Hook
 * Replaces the complex SQLite hooks with a simple, focused approach
 */
import { useState, useEffect, useCallback } from 'react';
import { runMigrations } from '../database/migration.js';
import { getPatient } from '../database/patientStorage.js';
import { getPrescriptions } from '../database/prescriptionStorage.js';
import { getInvestigations } from '../database/investigationStorage.js';
import { getSelectedPatient } from '../storage/settingsStorage.js';

export function useSimpleStorage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const initialize = useCallback(async () => {
    try {
      console.log('[useSimpleStorage] Initializing...');
      
      // Run migrations
      const migrationResult = await runMigrations();
      setMigrationStatus(migrationResult);
      
      if (!migrationResult.success) {
        throw new Error(migrationResult.error || 'Migration failed');
      }
      
      setIsInitialized(true);
      console.log('[useSimpleStorage] Initialization complete');
      
    } catch (err) {
      console.error('[useSimpleStorage] Initialization failed:', err);
      setError(err);
    }
  }, []);
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  return {
    isInitialized,
    migrationStatus,
    error,
    retry: initialize
  };
}

// Hook for patient data
export function usePatientData(patientId) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadPatient = useCallback(async () => {
    if (!patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const patientData = await getPatient(patientId);
      setPatient(patientData);
      
    } catch (err) {
      console.error('[usePatientData] Failed to load patient:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);
  
  useEffect(() => {
    loadPatient();
  }, [loadPatient]);
  
  return { patient, loading, error, reload: loadPatient };
}

// Hook for prescriptions
export function usePrescriptions(patientId) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadPrescriptions = useCallback(async () => {
    if (!patientId) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await getPrescriptions(patientId);
      setPrescriptions(data);
      
    } catch (err) {
      console.error('[usePrescriptions] Failed to load prescriptions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);
  
  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);
  
  return { prescriptions, loading, error, reload: loadPrescriptions };
}

// Hook for investigations
export function useInvestigations(patientId) {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadInvestigations = useCallback(async () => {
    if (!patientId) {
      setInvestigations([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await getInvestigations(patientId);
      setInvestigations(data);
      
    } catch (err) {
      console.error('[useInvestigations] Failed to load investigations:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);
  
  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);
  
  return { investigations, loading, error, reload: loadInvestigations };
}

// Unified hook for current patient data
export function useCurrentPatientData() {
  const [currentPatientId, setCurrentPatientId] = useState(null);
  
  // Load selected patient ID
  useEffect(() => {
    getSelectedPatient().then(setCurrentPatientId);
  }, []);
  
  const { patient, loading: patientLoading, error: patientError } = usePatientData(currentPatientId);
  const { prescriptions, loading: prescriptionsLoading, error: prescriptionsError } = usePrescriptions(currentPatientId);
  const { investigations, loading: investigationsLoading, error: investigationsError } = useInvestigations(currentPatientId);
  
  const loading = patientLoading || prescriptionsLoading || investigationsLoading;
  const error = patientError || prescriptionsError || investigationsError;
  
  return {
    patientId: currentPatientId,
    patient,
    prescriptions,
    investigations,
    loading,
    error
  };
}