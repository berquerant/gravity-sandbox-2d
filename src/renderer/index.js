import { getPrimaryStar } from '../physics/celestial.js';
import { drawBackground } from './scene.js';
import { drawHillSpheres, drawDistanceLines, drawGravitationalWaves, drawInteractions } from './overlay.js';
import { drawBodies } from './body-renderer.js';
import { drawGravityField } from './gravity-field.js';
import { Camera } from './camera.js';

/**
 * Coordinates canvas rendering pipeline (background, gravity fields, celestial overlays, bodies, UI interactions).
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Camera} camera - Viewport camera coordinator
   * @param {Object} state - Global state store
   */
  constructor(canvas, camera, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.state = state;
  }

  /**
   * Synchronizes canvas backing pixel resolution with the current window dimensions.
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Executes the full per-frame canvas rendering pipeline in layered z-order.
   */
  render() {
    const primary = getPrimaryStar(this.state.bodies);

    // 1. Scene & background
    drawBackground(this.ctx, this.canvas, this.camera, this.state, primary);

    // 2. Gravitational field heatmap (optional overlay, drawn before bodies)
    drawGravityField(this.ctx, this.canvas, this.camera, this.state);

    // 3. Hill spheres (behind bodies)
    drawHillSpheres(this.ctx, this.canvas, this.camera, this.state, primary);

    // 4. Distance lines to primary
    drawDistanceLines(this.ctx, this.camera, this.state, primary);

    // 5. Space-time gravitational wave ripples
    drawGravitationalWaves(this.ctx, this.canvas, this.camera, this.state);

    // 6. Bodies and trails
    drawBodies(this.ctx, this.canvas, this.camera, this.state, primary);

    // 7. Interactions & trajectory preview
    drawInteractions(this.ctx, this.camera, this.state);
  }
}
