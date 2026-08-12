/**
 * Color helper utilities for dynamic styling
 * Prefer using these over inline style objects
 */

/**
 * Add alpha/opacity to hex color
 * @param {string} hex - Hex color (#RRGGBB or #RGB)
 * @param {number} alpha - Opacity (0-1)
 * @returns {string} - Hex color with alpha (#RRGGBBAA)
 */
export const withAlpha = (hex, alpha) => {
  if (!hex) return hex;
  
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  
  // Convert alpha to hex (0-255)
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  
  return `#${fullHex}${alphaHex}`;
};

/**
 * Create light background variant of color (20% opacity)
 * @param {string} color - Base color
 * @returns {string} - Color with 20% opacity
 */
export const createLightBg = (color) => withAlpha(color, 0.2);

/**
 * Create icon background style object
 * @param {string} color - Icon color
 * @param {number} size - Icon container size (default: 40)
 * @returns {object} - Style object with backgroundColor and borderRadius
 */
export const createIconBg = (color, size = 40) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  backgroundColor: createLightBg(color),
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Get status-based colors
 * @param {string} status - Status type (active, pending, completed, cancelled, etc.)
 * @returns {object} - { bg, text, icon } colors
 */
export const getStatusColors = (status) => {
  const statusMap = {
    active: { bg: '#F0FDF4', text: '#22C55E', icon: '#22C55E' },
    pending: { bg: '#FFFBEB', text: '#F59E0B', icon: '#F59E0B' },
    completed: { bg: '#F0EEFF', text: '#6C63FF', icon: '#6C63FF' },
    cancelled: { bg: '#FFF1F1', text: '#EF4444', icon: '#EF4444' },
    inactive: { bg: '#F8FAFC', text: '#94A3B8', icon: '#94A3B8' },
    scheduled: { bg: '#EFF6FF', text: '#3B82F6', icon: '#3B82F6' },
    overdue: { bg: '#FFF1F1', text: '#EF4444', icon: '#EF4444' },
  };
  
  return statusMap[status] || statusMap.inactive;
};

/**
 * Create HSL color string
 * @param {number} hue - Hue (0-360)
 * @param {number} saturation - Saturation (0-100)
 * @param {number} lightness - Lightness (0-100)
 * @param {number} alpha - Alpha (0-1, optional)
 * @returns {string} - HSL/HSLA string
 */
export const hsl = (hue, saturation, lightness, alpha) => {
  if (alpha !== undefined) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Create RGB color string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @param {number} alpha - Alpha (0-1, optional)
 * @returns {string} - RGB/RGBA string
 */
export const rgb = (r, g, b, alpha) => {
  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
};
