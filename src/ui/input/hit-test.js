import { VELOCITY_GIZMO_SCALE } from '../../renderer/overlay.js';

/**
 * Finds the celestial body located under the specified screen pointer position.
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global state store
 * @param {number} screenX - Cursor screen X
 * @param {number} screenY - Cursor screen Y
 * @returns {Object|null} Closest body or null
 */
export function findBodyAtScreenPos(camera, state, screenX, screenY) {
  const zoom = state.camera.zoom;
  let closest = null;
  let minScreenDist = Infinity;

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    const screenPos = camera.worldToScreen(b.pos.x, b.pos.y);
    const dist = Math.hypot(screenX - screenPos.x, screenY - screenPos.y);
    const hitRadius = Math.max(16, b.radius * zoom + 8);

    if (dist <= hitRadius && dist < minScreenDist) {
      minScreenDist = dist;
      closest = b;
    }
  }
  return closest;
}

/**
 * Finds all celestial bodies whose screen positions fall within the selection rectangle.
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global state store
 * @param {number} x1 - Rect corner 1 X
 * @param {number} y1 - Rect corner 1 Y
 * @param {number} x2 - Rect corner 2 X
 * @param {number} y2 - Rect corner 2 Y
 * @returns {Array<Object>} Enclosed bodies
 */
export function findBodiesInScreenRect(camera, state, x1, y1, x2, y2) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const results = [];

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    const screenPos = camera.worldToScreen(b.pos.x, b.pos.y);
    if (screenPos.x >= minX && screenPos.x <= maxX &&
        screenPos.y >= minY && screenPos.y <= maxY) {
      results.push(b);
    }
  }
  return results;
}

/**
 * Detects whether cursor is hovering over the tip of the velocity vector gizmo for selected body.
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global state store
 * @param {number} screenX - Cursor screen X
 * @param {number} screenY - Cursor screen Y
 * @returns {Object|null} Selected body if gizmo tip is hit, otherwise null
 */
export function findVelocityGizmoHandleAtScreenPos(camera, state, screenX, screenY) {
  if (!state.selectedBodyId || (state.selectedBodyIds && state.selectedBodyIds.size > 1)) return null;
  const b = state.bodies.find(x => x.id === state.selectedBodyId);
  if (!b) return null;

  const origin = camera.worldToScreen(b.pos.x, b.pos.y);
  const tipX = origin.x + b.vel.x * VELOCITY_GIZMO_SCALE;
  const tipY = origin.y + b.vel.y * VELOCITY_GIZMO_SCALE;
  const dist = Math.hypot(screenX - tipX, screenY - tipY);

  if (dist <= 16) {
    return b;
  }
  return null;
}
