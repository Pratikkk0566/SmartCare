/**
 * SQLite Data Hook
 * ---------------
 * React hook for unified data access using SQLite
 * Fetches data from API and stores in SQLite for offline access
 */

import { useState, useEffect, useCallback } from 'react';
import { sqliteDataService } from '../services/SQLiteDataService';

export function useSQLiteData() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [initError, setInitError] = useState(null);

  // Initialize SQLite on mount
  useEffect(() => {
    async function initializeDataService() {
      try {
        console.log('[SQLiteData Hook] Initializing SQLite...');
        await sqliteDataService.init();
        console.log('[SQLiteData Hook] ✅ SQLite initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('[SQLiteData Hook] ❌ Initialization failed:', error);
        setInitError(error.message);
      }
    }

    initializeDataService();
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // DATA ACCESS METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get investigations
   */
  const getInvestigations = useCallback(async (patientId = null) => {
    if (!isInitialized) {
      console.log('[SQLiteData Hook] Not initialized yet, returning empty array');
      return [];
    }
    
    try {
      return await sqliteDataService.getInvestigations(patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error getting investigations:', error);
      return [];
    }
  }, [isInitialized]);

  /**
   * Save investigations
   */
  const saveInvestigations = useCallback(async (investigations, patientId = null) => {
    if (!isInitialized) {
      console.log('[SQLiteData Hook] Not initialized yet');
      return;
    }
    
    try {
      return await sqliteDataService.saveInvestigations(investigations, patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error saving investigations:', error);
      throw error;
    }
  }, [isInitialized]);

  /**
   * Get profile
   */
  const getProfile = useCallback(async (patientId = null) => {
    if (!isInitialized) return null;
    
    try {
      return await sqliteDataService.getProfile(patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error getting profile:', error);
      return null;
    }
  }, [isInitialized]);

  /**
   * Save profile
   */
  const saveProfile = useCallback(async (profileData) => {
    if (!isInitialized) return;
    
    try {
      return await sqliteDataService.saveProfile(profileData);
    } catch (error) {
      console.error('[SQLiteData Hook] Error saving profile:', error);
      throw error;
    }
  }, [isInitialized]);

  /**
   * Get prescriptions
   */
  const getPrescriptions = useCallback(async (patientId = null) => {
    if (!isInitialized) return [];
    
    try {
      return await sqliteDataService.getPrescriptions(patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error getting prescriptions:', error);
      return [];
    }
  }, [isInitialized]);

  /**
   * Get today's medication schedule
   */
  const getTodaysSchedule = useCallback(async (patientId = null) => {
    if (!isInitialized) return [];
    
    try {
      return await sqliteDataService.getTodaysSchedule(patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error getting schedule:', error);
      return [];
    }
  }, [isInitialized]);

  /**
   * Get patient dashboard statistics
   */
  const getDashboardStats = useCallback(async (patientId = null) => {
    if (!isInitialized) return { investigations: 0, prescriptions: 0, activePrescriptions: 0, todaysDoses: 0 };
    
    try {
      return await sqliteDataService.getPatientDashboardStats(patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error getting stats:', error);
      return { investigations: 0, prescriptions: 0, activePrescriptions: 0, todaysDoses: 0 };
    }
  }, [isInitialized]);

  /**
   * Set current active patient
   */
  const setActivePatient = useCallback((patientId) => {
    setCurrentPatientId(patientId);
    sqliteDataService.setCurrentPatient(patientId);
  }, []);

  /**
   * Search investigations
   */
  const searchInvestigations = useCallback(async (query, patientId = null) => {
    if (!isInitialized) return [];
    
    try {
      return await sqliteDataService.searchInvestigations(query, patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error searching investigations:', error);
      return [];
    }
  }, [isInitialized]);

  /**
   * Filter investigations by category
   */
  const getInvestigationsByCategory = useCallback(async (category, patientId = null) => {
    if (!isInitialized) return [];
    
    try {
      return await sqliteDataService.getInvestigationsByCategory(category, patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error filtering by category:', error);
      return [];
    }
  }, [isInitialized]);

  /**
   * Filter investigations by date range
   */
  const getInvestigationsByDateRange = useCallback(async (startDate, endDate, patientId = null) => {
    if (!isInitialized) return [];
    
    try {
      return await sqliteDataService.getInvestigationsByDateRange(startDate, endDate, patientId);
    } catch (error) {
      console.error('[SQLiteData Hook] Error filtering by date:', error);
      return [];
    }
  }, [isInitialized]);

  return {
    // Status
    isInitialized,
    initError,
    currentPatientId,
    
    // Data methods
    getInvestigations,
    saveInvestigations,
    getProfile,
    saveProfile,
    getPrescriptions,
    getTodaysSchedule,
    getDashboardStats,
    searchInvestigations,
    getInvestigationsByCategory,
    getInvestigationsByDateRange,
    
    // Patient management
    setActivePatient,
  };
}

export default useSQLiteData;