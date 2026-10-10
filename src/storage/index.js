import { Body } from '../models/body.js';
import { eventBus } from '../core/event-bus.js';

const STORAGE_KEY_PREFIX = 'gravity_2d_slot_';

/**
 * Saves current bodies state to a localStorage slot (1-3).
 * @param {number|string} slot
 * @param {Object} state
 * @returns {boolean} Success status
 */
export function saveToSlot(slot, state) {
  try {
    const data = state.bodies.map(b => b.toJSON());
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, JSON.stringify(data));
    eventBus.emit('toast:show', `Saved to Slot ${slot} (${state.bodies.length} bodies)`);
    return true;
  } catch (err) {
    console.error('Failed to save slot:', err);
    eventBus.emit('toast:show', 'Failed to save');
    return false;
  }
}

/**
 * Loads and restores bodies state from a localStorage slot.
 * @param {number|string} slot
 * @param {Object} state
 * @returns {boolean} Success status
 */
export function loadFromSlot(slot, state) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
    if (!raw) {
      eventBus.emit('toast:show', `No data found in Slot ${slot}`);
      return false;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      state.bodies = data.map(item => new Body(item));
      eventBus.emit('bodies:loaded', state.bodies.length);
      eventBus.emit('toast:show', `Restored from Slot ${slot} (${state.bodies.length} bodies)`);
      return true;
    }
  } catch (err) {
    console.error('Failed to load slot:', err);
    eventBus.emit('toast:show', 'Failed to load');
  }
  return false;
}

/**
 * Serializes current simulation settings and celestial bodies into formatted JSON.
 * @param {Object} state
 * @returns {string} JSON string
 */
export function exportStateToJson(state) {
  const data = {
    version: '1.5',
    timestamp: Date.now(),
    settings: {
      G: state.G,
      collisions: state.collisions,
      enableRelativity: state.enableRelativity,
      speedOfLight: state.speedOfLight,
      enableGravitationalWaves: state.enableGravitationalWaves,
      timeScale: state.timeScale,
      trailLength: state.trailLength,
      showHillSphere: state.showHillSphere,
      showDistanceLines: state.showDistanceLines,
      showBodyNames: state.showBodyNames
    },
    bodies: state.bodies.map(b => b.toJSON())
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Parses and validates an exported JSON string, safely restoring state settings and bodies.
 * @param {string} jsonString
 * @param {Object} state
 * @returns {boolean} Success status
 */
export function importStateFromJson(jsonString, state) {
  try {
    const data = JSON.parse(jsonString.trim());
    if (data.bodies && Array.isArray(data.bodies)) {
      const validBodies = data.bodies
        .filter(item => item && typeof item === 'object')
        .map(item => new Body({
          ...item,
          x: Number.isFinite(item.x) ? item.x : 0,
          y: Number.isFinite(item.y) ? item.y : 0,
          vx: Number.isFinite(item.vx) ? item.vx : 0,
          vy: Number.isFinite(item.vy) ? item.vy : 0,
          mass: Number.isFinite(item.mass) ? item.mass : 100,
          radius: (Number.isFinite(item.radius) && item.radius > 0) ? item.radius : 8
        }));
      state.bodies = validBodies;
      if (data.settings) {
        if (Number.isFinite(data.settings.G)) state.G = data.settings.G;
        if (typeof data.settings.collisions === 'boolean') state.collisions = data.settings.collisions;
        if (typeof data.settings.enableRelativity === 'boolean') state.enableRelativity = data.settings.enableRelativity;
        if (Number.isFinite(data.settings.speedOfLight) && data.settings.speedOfLight > 0) state.speedOfLight = data.settings.speedOfLight;
        if (typeof data.settings.enableGravitationalWaves === 'boolean') state.enableGravitationalWaves = data.settings.enableGravitationalWaves;
        if (Number.isFinite(data.settings.trailLength) && data.settings.trailLength >= 0) state.trailLength = data.settings.trailLength;
        if (typeof data.settings.showHillSphere === 'boolean') state.showHillSphere = data.settings.showHillSphere;
        if (typeof data.settings.showDistanceLines === 'boolean') state.showDistanceLines = data.settings.showDistanceLines;
        if (typeof data.settings.showBodyNames === 'boolean') state.showBodyNames = data.settings.showBodyNames;
      }
      eventBus.emit('bodies:loaded', state.bodies.length);
      eventBus.emit('settings:updated');
      eventBus.emit('toast:show', `Restored ${state.bodies.length} bodies`);
      return true;
    } else {
      eventBus.emit('toast:show', 'Invalid JSON format');
    }
  } catch (err) {
    console.error('JSON Import Error:', err);
    eventBus.emit('toast:show', 'Failed to parse JSON');
  }
  return false;
}
