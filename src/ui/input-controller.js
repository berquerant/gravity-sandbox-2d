import { eventBus } from '../core/event-bus.js';
import * as spawner from './input/spawner.js';
import * as hitTester from './input/hit-test.js';
import { setupMouseHandler } from './input/mouse-handler.js';
import { setupTouchHandler } from './input/touch-handler.js';
import { setupKeyboardHandler } from './input/keyboard-handler.js';
import { Camera } from '../renderer/camera.js';

/**
 * Dispatches and configures mouse, touch gestures, and keyboard hotkeys.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @param {Object} tooltip
 * @param {Object} inspector
 * @param {Function} togglePlayPause
 * @returns {Object} Input helpers
 */
export function setupInputController(canvas, state, camera, tooltip, inspector, togglePlayPause) {
  setupMouseHandler(canvas, state, camera, tooltip, inspector, spawner, hitTester);
  setupTouchHandler(canvas, state, camera, inspector, spawner, hitTester);
  setupKeyboardHandler(state, camera, togglePlayPause);

  eventBus.on('tooltip:hide', () => tooltip.updateTooltip(null));

  return {
    createBodyAt: (worldPos, vel) => spawner.createBodyAt(state, worldPos, vel),
    findBodyAtScreenPos: (screenX, screenY) => hitTester.findBodyAtScreenPos(camera, state, screenX, screenY)
  };
}
