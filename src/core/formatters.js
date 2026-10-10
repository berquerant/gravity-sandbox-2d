/**
 * Unit formatters and numerical conversion helpers
 */

/**
 * Formats a distance in kilometers into a human-readable string (AU, scientific, or comma-separated).
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatKm(km) {
  const absKm = Math.abs(km);
  if (absKm >= 1.4959787e8) {
    const au = km / 1.4959787e8;
    return `${au.toFixed(3)} AU (${km.toExponential(2)} km)`;
  } else if (absKm >= 1e6) {
    return `${km.toExponential(3)} km`;
  } else if (absKm >= 1000) {
    return `${Math.round(km).toLocaleString()} km`;
  } else {
    return `${km.toFixed(1)} km`;
  }
}

/**
 * Formats mass in kilograms using scientific exponential notation.
 * @param {number} kg - Mass in kilograms
 * @returns {string} Formatted mass string
 */
export function formatKg(kg) {
  return `${kg.toExponential(3)} kg`;
}

/**
 * Formats speed in km/s with two decimal places.
 * @param {number} kms - Speed in kilometers per second
 * @returns {string} Formatted speed string
 */
export function formatKmPerSec(kms) {
  return `${kms.toFixed(2)} km/s`;
}

/**
 * Mathematical Angle: Right is 0°, increases counter-clockwise, range is [0°, 360°)
 * In canvas screen coords, +y is down. So -vy is up (counter-clockwise from +x)
 */
export function computeCCWAngleDeg(vx, vy) {
  const rad = Math.atan2(-vy, vx);
  let deg = rad * (180 / Math.PI);
  deg = (deg % 360 + 360) % 360;
  return deg;
}

/**
 * Formats elapsed simulation time in seconds into seconds, minutes, days, or years.
 * @param {number} seconds - Elapsed simulation time in seconds
 * @returns {string} Formatted duration string
 */
export function formatSimTime(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const days = seconds / 86400;
  if (days >= 365.25) {
    const years = days / 365.25;
    return `${years.toFixed(2)}y (${Math.floor(days)}d)`;
  } else if (days >= 1.0) {
    return `${days.toFixed(1)}d (${Math.floor(seconds)}s)`;
  }
  const mins = Math.floor(seconds / 60);
  const remSecs = Math.floor(seconds % 60);
  return `${mins}m ${remSecs}s`;
}

/**
 * Computes an aesthetic display radius for a body proportional to the cube root of its mass.
 * @param {number} mass - Mass in simulation units
 * @returns {number} Clamped display radius in screen pixels
 */
export function calculateRadiusFromMass(mass) {
  const absM = Math.abs(mass);
  return Math.min(60, Math.max(3, Math.round(Math.pow(absM, 1 / 3) * 2.5)));
}

/**
 * Calculates physical map scale metrics represented by a screen line segment of length screenPx.
 * 1 px = 1,281.333 km (KM_PER_PX). 1 AU = 116,751 px ≈ 1.4959787e+8 km.
 */
export function computeScaleBarMetrics(screenPx, zoom) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1.0;
  const worldPx = screenPx / safeZoom;
  const km = worldPx * (384400 / 300);
  const AU_KM = 1.4959787e8;
  const au = km / AU_KM;

  let label = '';
  let subLabel = '';

  if (au >= 0.05) {
    label = `${au >= 10 ? au.toFixed(1) : au.toFixed(3)} AU`;
    const kmStr = km >= 1e9 ? km.toExponential(2) : Math.round(km).toLocaleString();
    const pxStr = Math.round(worldPx).toLocaleString();
    subLabel = `${kmStr} km (${pxStr} px)`;
  } else if (km >= 1e6) {
    label = `${km.toExponential(3)} km`;
    const pxStr = Math.round(worldPx).toLocaleString();
    subLabel = `${pxStr} px (${au.toFixed(4)} AU)`;
  } else if (km >= 1000) {
    label = `${Math.round(km).toLocaleString()} km`;
    const pxStr = Math.round(worldPx).toLocaleString();
    subLabel = `${pxStr} px`;
  } else {
    label = `${km.toFixed(1)} km`;
    subLabel = `${worldPx.toFixed(1)} px`;
  }

  return {
    screenPx,
    worldPx,
    km,
    au,
    label,
    subLabel
  };
}

/**
 * Flexible numeric parser supporting standard decimals, exponential scientific notation (1e24, 1e-3),
 * products with powers of 10 (5.972 x 10^24, 10^24), optional units, and commas.
 * Returns null if input cannot be parsed into a finite number.
 */
export function parseFlexibleNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (!input || typeof input !== 'string') return null;

  let str = input.trim();
  // Strip trailing unit strings like "kg", "km", "px", "units", etc.
  str = str.replace(/[a-df-zA-DF-Z\s]+$/, '').trim();
  // Remove formatting commas
  str = str.replace(/,/g, '');

  // Handle forms like 5.97 x 10^24, 5.97*10^24, 10^24, -10^24
  const scientificMatch = str.match(/^([+-]?\d*(?:\.\d+)?)\s*(?:[x*]|times)?\s*10\s*\^\s*([+-]?\d+)$/i);
  if (scientificMatch) {
    const mantissaStr = scientificMatch[1];
    const exp = parseInt(scientificMatch[2], 10);
    const mantissa = mantissaStr === '' || mantissaStr === '+' ? 1 : mantissaStr === '-' ? -1 : parseFloat(mantissaStr);
    if (!isNaN(mantissa) && !isNaN(exp)) {
      const val = mantissa * Math.pow(10, exp);
      return Number.isFinite(val) ? val : null;
    }
  }

  // Handle standard e-notation: 5.97e24, 5.97e+24, -1.2e-3, or plain floats
  const num = parseFloat(str);
  return (Number.isFinite(num)) ? num : null;
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts a hex color (#fff, #ffffff, #ffffffff) or standard color to an rgba(...) string.
 * Ensures compatibility with canvas and DOM styling when applying alpha transparency.
 */
export function hexToRgba(color, alpha = 1.0) {
  if (typeof color !== 'string') return `rgba(255, 255, 255, ${alpha})`;
  const c = color.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return color;
}
