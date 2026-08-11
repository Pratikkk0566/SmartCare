/**
 * Centralized API helper utilities
 * Provides consistent header building, error handling, and retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys constants
 */
export const STORAGE_KEYS = {
  PATIENT_ID: 'patientId',
  CLINIC_ID: 'clinicId',
  USER_ID: 'userId',
  BRANCH_ID: 'branchId',
  AUTH_TOKEN: 'authToken',
  USER_PROFILE: 'userProfile',
};

/**
 * API status codes
 */
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Build standardized headers for API requests
 * @returns {Promise<Object>} - Headers object
 */
export const buildApiHeaders = async () => {
  try {
    const [patientId, clinicId, userId, branchId, authToken] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.PATIENT_ID),
      AsyncStorage.getItem(STORAGE_KEYS.CLINIC_ID),
      AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.getItem(STORAGE_KEYS.BRANCH_ID),
      AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
    ]);

    return {
      'patientId': patientId || '',
      'CLINICID': clinicId || '',
      'UserId': userId || '',
      'branch_id': branchId || '',
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
  } catch (error) {
    logError('Failed to build API headers', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

/**
 * Error types for better error handling
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  SERVER: 'SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * Parse error response and return standardized error object
 * @param {Error} error - Error object
 * @param {Response} response - Fetch response object
 * @returns {Object} - Standardized error object
 */
export const parseApiError = (error, response = null) => {
  // Network error
  if (error.message === 'Network request failed' || !navigator.onLine) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: 'No internet connection. Please check your network.',
      userMessage: 'Unable to connect. Please check your internet connection and try again.',
    };
  }

  // Timeout error
  if (error.name === 'AbortError') {
    return {
      type: ERROR_TYPES.TIMEOUT,
      message: 'Request timed out',
      userMessage: 'The request took too long. Please try again.',
    };
  }

  // HTTP status errors
  if (response) {
    const status = response.status;

    if (status === API_STATUS.UNAUTHORIZED || status === API_STATUS.FORBIDDEN) {
      return {
        type: ERROR_TYPES.UNAUTHORIZED,
        message: 'Unauthorized access',
        userMessage: 'Your session has expired. Please login again.',
        status,
      };
    }

    if (status === API_STATUS.BAD_REQUEST) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: 'Invalid request',
        userMessage: 'Invalid data provided. Please check your input.',
        status,
      };
    }

    if (status >= 500) {
      return {
        type: ERROR_TYPES.SERVER,
        message: 'Server error',
        userMessage: 'Server is experiencing issues. Please try again later.',
        status,
      };
    }
  }

  // Unknown error
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error.message || 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again.',
  };
};

/**
 * Make API request with retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @param {number} timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<Object>} - API response
 */
export const fetchWithRetry = async (url, options = {}, maxRetries = 2, timeout = 30000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}`);
        throw Object.assign(error, { response, errorData });
      }

      return await response.json();

    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) or auth errors
      if (error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: wait before retrying
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Log error (can be extended to send to analytics)
 * @param {string} context - Error context
 * @param {Error} error - Error object
 * @param {Object} metadata - Additional metadata
 */
export const logError = (context, error, metadata = {}) => {
  if (__DEV__) {
    console.error(`[${context}]`, error, metadata);
  }

  // TODO: Send to crash analytics in production
  // analytics.logError(context, error, metadata);
};

/**
 * Log API call (can be extended to send to analytics)
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {number} duration - Request duration in ms
 * @param {boolean} success - Whether request was successful
 */
export const logApiCall = (endpoint, method, duration, success) => {
  if (__DEV__) {
    console.log(`[API] ${method} ${endpoint} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  // TODO: Send to analytics in production
  // analytics.logEvent('api_call', { endpoint, method, duration, success });
};

/**
 * Check if error is a network error
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return (
    error.message === 'Network request failed' ||
    error.type === ERROR_TYPES.NETWORK ||
    !navigator.onLine
  );
};

/**
 * Check if error requires re-authentication
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export const requiresAuth = (error) => {
  return (
    error.type === ERROR_TYPES.UNAUTHORIZED ||
    (error.response && 
      (error.response.status === API_STATUS.UNAUTHORIZED || 
       error.response.status === API_STATUS.FORBIDDEN))
  );
};

/**
 * Format error message for display to user
 * @param {Error} error - Error object
 * @returns {string} - User-friendly error message
 */
export const formatErrorMessage = (error) => {
  const parsedError = parseApiError(error, error.response);
  return parsedError.userMessage || 'Something went wrong. Please try again.';
};

/**
 * Validate response data structure
 * @param {Object} data - Response data
 * @param {Array<string>} requiredFields - Required field names
 * @returns {boolean}
 */
export const validateResponse = (data, requiredFields = []) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  return requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null;
  });
};

/**
 * Cache manager for API responses
 */
const cache = new Map();
const cacheTimestamps = new Map();

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @param {number} maxAge - Max age in ms (default: 5 minutes)
 * @returns {any|null} - Cached data or null
 */
export const getCachedData = (key, maxAge = 5 * 60 * 1000) => {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp || Date.now() - timestamp > maxAge) {
    cache.delete(key);
    cacheTimestamps.delete(key);
    return null;
  }
  return cache.get(key);
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedData = (key, data) => {
  cache.set(key, data);
  cacheTimestamps.set(key, Date.now());
};

/**
 * Clear all cached data
 */
export const clearCache = () => {
  cache.clear();
  cacheTimestamps.clear();
};

/**
 * Clear specific cached data
 * @param {string} key - Cache key
 */
export const clearCachedData = (key) => {
  cache.delete(key);
  cacheTimestamps.delete(key);
};
