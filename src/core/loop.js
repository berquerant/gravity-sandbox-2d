import { stepSimulation } from '../physics/engine.js';

/**
 * Manages the main requestAnimationFrame simulation loop, adaptive delta time, and FPS calculation.
 */
export class GameLoop {
  /**
   * @param {Object} options
   * @param {Object} options.state - Global state store
   * @param {Object} options.camera - Camera viewport controller
   * @param {Object} options.renderer - Canvas rendering coordinator
   * @param {Object} [options.hud] - HUD controller
   * @param {Object} options.inspector - Inspector drawer controller
   */
  constructor({ state, camera, renderer, hud, inspector }) {
    this.state = state;
    this.camera = camera;
    this.renderer = renderer;
    this.hud = hud;
    this.inspector = inspector;

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.animationFrameId = null;

    this.tick = this.tick.bind(this);
  }

  /**
   * Starts the animation frame loop.
   */
  start() {
    this.lastTime = performance.now();
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Stops the animation frame loop.
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Steps the physics simulation forward by a single discrete time step (1/60s).
   */
  stepOnce() {
    stepSimulation(1 / 60, this.state);
    this.camera.updateTracking();
    this.renderer.render();
    this.hud.updateHUD();
    this.inspector.updateInspectorUI();
  }

  /**
   * Internal animation frame tick callback.
   * @param {number} currentTime - Timestamp provided by requestAnimationFrame
   */
  tick(currentTime) {
    this.animationFrameId = requestAnimationFrame(this.tick);

    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to prevent physics explosion after tab switch
    if (deltaTime > 0.1) deltaTime = 0.1;

    // FPS calculation
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 500) {
      this.state.fps = (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    try {
      // Step physics if running
      if (!this.state.isPaused) {
        stepSimulation(deltaTime, this.state);
      }

      // Update camera tracking
      this.camera.updateTracking();

      // Render frame
      this.renderer.render();

      // Update HUD & active inspector
      this.hud.updateHUD();
      this.inspector.updateInspectorUI();
    } catch (err) {
      console.error('Simulation loop frame error:', err);
    }
  }
}
