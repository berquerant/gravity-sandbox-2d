/**
 * Simulation scale and physical conversion constants
 * 
 * Reference: Earth-Moon distance = 300 px = 384,400 km
 * 1 AU = 116,751 px
 */
export const KM_PER_PX = 384400 / 300; // 1,281.333... km per simulation px
export const KG_PER_MASS = 5.9722e23;   // 1 simulation mass unit = 5.9722 × 10^23 kg (Earth mass 10.0 = 5.9722 × 10^24 kg)
export const KMS_PER_PXS = 5.5772;      // 1 px/s = 5.5772 km/s (Earth orbital speed = 5.34 px/s = 29.78 km/s)

export const DEFAULT_G = 1.0;
export const DEFAULT_SOFTENING = 120;
export const DEFAULT_TRAIL_LENGTH = 1000;
export const MAX_ARCHIVED_BODIES = 500;
export const DEFAULT_RELATIVITY = false;
export const DEFAULT_SPEED_OF_LIGHT = 100; // In simulation px/s
export const DEFAULT_ENABLE_GRAVITATIONAL_WAVES = true;

