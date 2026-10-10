import { loadSolarSystemPreset } from './solar-system.js';
import { loadNBodyPreset } from './n-body.js';
import { loadRelativisticPreset } from './relativistic.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Dispatches and initializes astronomical scenario presets (Solar System, chaotic N-body, or Relativistic setups).
 * @param {string} name - Preset scenario key
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 */
export function loadPreset(name, state, camera) {
  state.elapsedTime = 0;
  state.bodies = [];
  state.archivedBodies = [];
  camera.reset();

  if (name === 'earth_moon' || name === 'trojans' || name === 'solar') {
    loadSolarSystemPreset(name, state, camera);
  } else if (
    name === 'threebody' ||
    name === 'negative_runaway' ||
    name === 'galaxy' ||
    name === 'spray_playground'
  ) {
    loadNBodyPreset(name, state, camera);
  } else if (
    name === 'galactic_center' ||
    name === 'einstein_rosette' ||
    name === 'black_hole_capture' ||
    name === 'binary_merger' ||
    name === 'protoplanetary_disk'
  ) {
    loadRelativisticPreset(name, state, camera);
  }

  eventBus.emit('preset:loaded', name);
}
