import { computeGravitationalForces } from './forces.js';
import { handleCollisions } from './collision.js';

/**
 * Performs adaptive sub-step numerical integration for N-body gravity, kinematic update, and collision resolution.
 * @param {number} deltaTime - Frame delta time in seconds
 * @param {Object} state - Global simulation state store
 */
export function stepSimulation(deltaTime, state) {
  if (deltaTime <= 0) return;
  const subSteps = Math.max(2, Math.min(32, Math.ceil(state.timeScale * 0.8) + 2));
  const dt = (deltaTime * state.timeScale) / subSteps;

  for (let s = 0; s < subSteps; s++) {
    computeGravitationalForces(
      state.bodies,
      state.G,
      state.softening,
      state.enableRelativity,
      state.speedOfLight,
      state.enableGravitationalWaves
    );
    for (let i = 0; i < state.bodies.length; i++) {
      state.bodies[i].update(dt, state.trailLength, state.enableRelativity, state.speedOfLight);
    }
    handleCollisions(state);
  }

  state.elapsedTime += deltaTime * state.timeScale;
}
