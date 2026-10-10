import {
  DEFAULT_G,
  DEFAULT_SOFTENING,
  DEFAULT_TRAIL_LENGTH,
  MAX_ARCHIVED_BODIES,
  DEFAULT_RELATIVITY,
  DEFAULT_SPEED_OF_LIGHT,
  DEFAULT_ENABLE_GRAVITATIONAL_WAVES
} from '../core/constants.js';
import { eventBus } from '../core/event-bus.js';

export const state = {
  bodies: [],
  archivedBodies: [],
  G: DEFAULT_G,
  timeScale: 1.0,
  isPaused: false,
  softening: DEFAULT_SOFTENING,
  collisions: true,
  enableRelativity: DEFAULT_RELATIVITY,
  speedOfLight: DEFAULT_SPEED_OF_LIGHT,
  enableGravitationalWaves: DEFAULT_ENABLE_GRAVITATIONAL_WAVES,
  showTrails: true,
  trailLength: DEFAULT_TRAIL_LENGTH,
  showHillSphere: true,
  showDistanceLines: true,
  showBodyNames: true,
  showGravityField: false,
  showGravityContours: false,
  effectivePotentialMode: false,
  mode: 'pan', // 'pan' | 'launch' | 'spray' | 'disk'
  currentPreset: 'solar',
  spraySpeed: 0.3,
  diskPlacement: {
    count: 40,
    baseRadius: 200,
    radiusJitterPct: 15,
    baseSpeed: 5.0,
    speedJitterPct: 10,
    direction: 'ccw', // 'ccw' | 'cw'
    autoKeplerian: true
  },
  elapsedTime: 0,
  historyEvents: [],
  selectedBodyId: null,
  selectedBodyIds: new Set(),
  selectionBox: null,
  hoveredBodyId: null,
  trackedBodyId: null,
  relativeOriginBodyId: null,
  isSidePanelOpen: false,

  // Body list sorting state
  bodyListSortKey: 'absorb',
  bodyListSortAsc: false,
  isBodyListOpen: false,

  newBody: {
    mass: 100,
    isNegative: false,
    radius: 8,
    autoRadius: true,
    fixed: false,
    color: '#38bdf8'
  },

  camera: {
    x: 0,
    y: 0,
    zoom: 1.0
  },

  dragStartWorld: null,
  currentMouseWorld: null,
  lastMouseScreen: { x: 0, y: 0 },
  isDragging: false,
  dragMode: null,
  sprayIntervalId: null,
  fps: 60
};

/**
 * Records a new event in the chronological simulation event log and trims older entries beyond 200.
 * @param {string} type - Event category (e.g., 'Creation', 'Merge', 'Annihilation')
 * @param {string} title - Brief headline
 * @param {string} description - Detailed event narrative with metrics
 * @param {string} [color='#38bdf8'] - Badge highlight color
 */
export function addHistoryEvent(type, title, description, color = '#38bdf8') {
  const eventItem = {
    id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    time: state.elapsedTime,
    type,
    title,
    description,
    color
  };
  state.historyEvents.unshift(eventItem);
  if (state.historyEvents.length > 200) {
    state.historyEvents.pop();
  }
  eventBus.emit('history:updated', eventItem);
}

/**
 * Empties all recorded historical events from the simulation log.
 */
export function clearHistoryEvents() {
  state.historyEvents = [];
  eventBus.emit('history:updated');
}

/**
 * Removes all active bodies, cleared selections, tracking states, and coordinate origins.
 */
export function clearBodies() {
  state.bodies = [];
  state.archivedBodies = [];
  state.selectedBodyId = null;
  state.selectedBodyIds.clear();
  state.selectionBox = null;
  state.trackedBodyId = null;
  state.relativeOriginBodyId = null;
  eventBus.emit('bodies:cleared');
}

/**
 * Pushes a destroyed or annihilated body into the historical archive with retention limit.
 * @param {Object} archived - Archived body summary record
 */
export function addArchivedBody(archived) {
  state.archivedBodies.unshift(archived);
  if (state.archivedBodies.length > MAX_ARCHIVED_BODIES) {
    state.archivedBodies.pop();
  }
  eventBus.emit('body:archived', archived);
}

/**
 * Clears all archived body records from historical memory.
 */
export function clearArchivedBodies() {
  state.archivedBodies = [];
  eventBus.emit('archived:cleared');
}
