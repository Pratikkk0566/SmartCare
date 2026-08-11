/**
 * Centralized date handling utilities
 * Provides consistent date formatting and parsing across the app
 */

/**
 * Date format constants
 */
export const DATE_FORMATS = {
  ISO: 'ISO', // 2026-08-11T00:00:00.000Z
  DISPLAY: 'DISPLAY', // 11 Aug 2026
  API: 'API', // DD-MM-YYYY
  SHORT: 'SHORT', // 11/08/26
  LONG: 'LONG', // Tuesday, August 11, 2026
  TIME_12: 'TIME_12', // 02:30 PM
  TIME_24: 'TIME_24', // 14:30
  DATETIME: 'DATETIME', // 11 Aug 2026, 02:30 PM
};

/**
 * Parse various date string formats to Date object
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export const parseDate = (dateInput) => {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  // Try parsing ISO format
  const isoDate = new Date(dateInput);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try parsing DD-MM-YYYY format
  const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateInput.match(ddmmyyyyPattern);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

/**
 * Format date to specified format
 * @param {string|Date} dateInput - Date to format
 * @param {string} format - Format type from DATE_FORMATS
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateInput, format = DATE_FORMATS.DISPLAY) => {
  const date = parseDate(dateInput);
  if (!date) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const pad = (num) => String(num).padStart(2, '0');

  switch (format) {
    case DATE_FORMATS.ISO:
      return date.toISOString();

    case DATE_FORMATS.DISPLAY:
      return `${day} ${months[month]} ${year}`;

    case DATE_FORMATS.API:
      return `${pad(day)}-${pad(month + 1)}-${year}`;

    case DATE_FORMATS.SHORT:
      return `${pad(day)}/${pad(month + 1)}/${String(year).slice(-2)}`;

    case DATE_FORMATS.LONG:
      return `${days[date.getDay()]}, ${fullMonths[month]} ${day}, ${year}`;

    case DATE_FORMATS.TIME_12:
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${pad(hours12)}:${pad(minutes)} ${period}`;

    case DATE_FORMATS.TIME_24:
      return `${pad(hours)}:${pad(minutes)}`;

    case DATE_FORMATS.DATETIME:
      const timePeriod = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${day} ${months[month]} ${year}, ${pad(displayHours)}:${pad(minutes)} ${timePeriod}`;

    default:
      return date.toLocaleDateString();
  }
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} dateInput - Date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return '';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  if (diffSec < 60) {
    return isPast ? 'Just now' : 'In a moment';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isPast 
      ? `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
      : `In ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return isPast
      ? `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
      : `In ${diffHour} hour${diffHour > 1 ? 's' : ''}`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return isPast
      ? `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
      : `In ${diffDay} day${diffDay > 1 ? 's' : ''}`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return isPast
      ? `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`
      : `In ${diffWeek} week${diffWeek > 1 ? 's' : ''}`;
  }

  return formatDate(date, DATE_FORMATS.DISPLAY);
};

/**
 * Check if date is today
 * @param {string|Date} dateInput - Date to check
 * @returns {boolean}
 */
export const isToday = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return false;

  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is tomorrow
 * @param {string|Date} dateInput - Date to check
 * @returns {boolean}
 */
export const isTomorrow = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * Check if date is in the past
 * @param {string|Date} dateInput - Date to check
 * @returns {boolean}
 */
export const isPast = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return false;
  return date.getTime() < new Date().getTime();
};

/**
 * Check if date is in the future
 * @param {string|Date} dateInput - Date to check
 * @returns {boolean}
 */
export const isFuture = (dateInput) => {
  const date = parseDate(dateInput);
  if (!date) return false;
  return date.getTime() > new Date().getTime();
};

/**
 * Get date range for API calls
 * @param {number} daysBack - Days to go back (default: 30)
 * @returns {{fromDate: string, toDate: string}} - Date range in API format
 */
export const getDateRange = (daysBack = 30) => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);

  return {
    fromDate: formatDate(fromDate, DATE_FORMATS.API),
    toDate: formatDate(toDate, DATE_FORMATS.API),
  };
};

/**
 * Constants for common date ranges
 */
export const COMMON_DATE_RANGES = {
  DEFAULT_FROM_DATE: '01-01-2020', // Replace hardcoded '2000-01-01'
  LAST_30_DAYS: getDateRange(30),
  LAST_90_DAYS: getDateRange(90),
  LAST_YEAR: getDateRange(365),
};

/**
 * Sort dates in ascending or descending order
 * @param {Array} dates - Array of date strings or Date objects
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} - Sorted array
 */
export const sortDates = (dates, order = 'asc') => {
  return dates.sort((a, b) => {
    const dateA = parseDate(a);
    const dateB = parseDate(b);
    
    if (!dateA || !dateB) return 0;
    
    const diff = dateA.getTime() - dateB.getTime();
    return order === 'asc' ? diff : -diff;
  });
};

/**
 * Add days to a date
 * @param {string|Date} dateInput - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date|null} - New date
 */
export const addDays = (dateInput, days) => {
  const date = parseDate(dateInput);
  if (!date) return null;
  
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * Get number of days between two dates
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number|null} - Number of days (absolute value)
 */
export const daysBetween = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return null;
  
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};
