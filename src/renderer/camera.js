import { eventBus } from '../core/event-bus.js';
import { Body } from '../models/body.js';

/**
 * Manages 2D canvas viewport transformations, zooming, panning, and target body tracking.
 */
export class Camera {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} state - Global state store
   */
  constructor(canvas, state) {
    this.canvas = canvas;
    this.state = state;
  }

  get zoom() {
    return this.state.camera.zoom;
  }

  get x() {
    return this.state.camera.x;
  }

  get y() {
    return this.state.camera.y;
  }

  /**
   * Transforms world coordinates into screen canvas coordinates.
   * @param {number} wx - World X
   * @param {number} wy - World Y
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(wx, wy) {
    const sx = (wx - this.state.camera.x) * this.state.camera.zoom + this.canvas.width / 2;
    const sy = (wy - this.state.camera.y) * this.state.camera.zoom + this.canvas.height / 2;
    return { x: sx, y: sy };
  }

  /**
   * Transforms screen canvas coordinates into world coordinates.
   * @param {number} sx - Screen X
   * @param {number} sy - Screen Y
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(sx, sy) {
    const wx = (sx - this.canvas.width / 2) / this.state.camera.zoom + this.state.camera.x;
    const wy = (sy - this.canvas.height / 2) / this.state.camera.zoom + this.state.camera.y;
    return { x: wx, y: wy };
  }

  /**
   * Pans the camera view by a delta offset in screen pixels.
   * @param {number} dx
   * @param {number} dy
   */
  pan(dx, dy) {
    if (this.state.trackedBodyId) {
      this.stopTracking();
    }
    const safeZoom = Math.max(0.00001, this.state.camera.zoom || 1.0);
    this.state.camera.x += (Number(dx) || 0) / safeZoom;
    this.state.camera.y += (Number(dy) || 0) / safeZoom;
  }

  /**
   * Multiplies current zoom level by factor centered on given screen coordinates.
   * @param {number} factor - Scale multiplier
   * @param {number} [clientX] - Screen center anchor X
   * @param {number} [clientY] - Screen center anchor Y
   */
  applyZoom(factor, clientX = this.canvas.width / 2, clientY = this.canvas.height / 2) {
    const numFactor = Number(factor);
    if (!Number.isFinite(numFactor) || numFactor <= 0) return;

    const oldZoom = Math.max(0.00001, Math.min(20, Number(this.state.camera.zoom) || 1.0));
    const newZoom = Math.max(0.00001, Math.min(20, oldZoom * numFactor));
    if (Math.abs(oldZoom - newZoom) < 1e-7) return;

    const cx = (typeof clientX === 'number' && Number.isFinite(clientX)) ? clientX : this.canvas.width / 2;
    const cy = (typeof clientY === 'number' && Number.isFinite(clientY)) ? clientY : this.canvas.height / 2;

    // Zoom centered on cursor position
    const wx = (cx - this.canvas.width / 2) / oldZoom + this.state.camera.x;
    const wy = (cy - this.canvas.height / 2) / oldZoom + this.state.camera.y;

    this.state.camera.zoom = newZoom;
    this.state.camera.x = wx - (cx - this.canvas.width / 2) / newZoom;
    this.state.camera.y = wy - (cy - this.canvas.height / 2) / newZoom;

    eventBus.emit('camera:zoom', newZoom);
  }

  /**
   * Sets the camera to continuously track a target celestial body at viewport center.
   * @param {Body} b - Target celestial body to follow
   */
  startTracking(b) {
    if (!b) return;
    this.state.trackedBodyId = b.id;
    this.state.camera.x = b.pos.x;
    this.state.camera.y = b.pos.y;
    eventBus.emit('camera:track', b);
  }

  /**
   * Stops tracking any celestial body.
   */
  stopTracking() {
    if (!this.state.trackedBodyId) return;
    this.state.trackedBodyId = null;
    this.state.relativeOriginBodyId = null;
    eventBus.emit('camera:untrack');
  }

  /**
   * Updates camera position to follow the tracked body on each frame.
   */
  updateTracking() {
    if (this.state.trackedBodyId) {
      const target = this.state.bodies.find(b => b.id === this.state.trackedBodyId);
      if (target) {
        this.state.camera.x = target.pos.x;
        this.state.camera.y = target.pos.y;
      } else {
        this.stopTracking();
      }
    }
  }

  /**
   * Resets camera position, tracking, and zoom back to default origin (0, 0) at 1.0x.
   */
  reset() {
    this.stopTracking();
    this.state.relativeOriginBodyId = null;
    this.state.camera.x = 0;
    this.state.camera.y = 0;
    this.state.camera.zoom = 1.0;
    eventBus.emit('camera:zoom', 1.0);
  }
}
