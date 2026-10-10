import { Vec2 } from '../core/vec2.js';

/**
 * Predicts the projected orbital trajectory of a body launched from startPos with startVel.
 * Performs forward Euler integration taking into account N-body gravity, 1PN/2.5PN relativity, and negative mass.
 * @param {{x: number, y: number}} startPos - Starting position in world space
 * @param {{x: number, y: number}} startVel - Starting velocity vector
 * @param {Object} state - Global simulation state store
 * @param {number} [steps=180] - Number of discrete trajectory prediction steps
 * @param {number} [dt=0.4] - Integration time step in seconds
 * @returns {Array<{x: number, y: number}>} Array of predicted trajectory points
 */
export function predictTrajectory(startPos, startVel, state, steps = 180, dt = 0.4) {
  if (!startPos || !startVel) return [];

  let simPos = new Vec2(startPos.x, startPos.y);
  let simVel = new Vec2(startVel.x, startVel.y);
  const m1 = state.newBody.isNegative ? -state.newBody.mass : state.newBody.mass;
  const points = [];
  const enableGR = state.enableRelativity;
  const cSq = (state.speedOfLight || 100) * (state.speedOfLight || 100);

  for (let s = 0; s < steps; s++) {
    let ax = 0;
    let ay = 0;

    for (let i = 0; i < state.bodies.length; i++) {
      const b = state.bodies[i];
      const dx = b.pos.x - simPos.x;
      const dy = b.pos.y - simPos.y;
      const rSq = dx * dx + dy * dy + state.softening;
      const dist = Math.sqrt(rSq);
      let force = (state.G * b.mass) / rSq;

      if (enableGR && cSq > 0) {
        const dvx = b.vel.x - simVel.x;
        const dvy = b.vel.y - simVel.y;
        const L = dx * dvy - dy * dvx;
        const grFactor = 1 + (3 * L * L) / (cSq * rSq);
        force *= grFactor;

        // 2.5PN Gravitational Wave radiation reaction acceleration
        if (state.enableGravitationalWaves && b.mass > 0 && m1 > 0) {
          const c5 = cSq * cSq * (state.speedOfLight || 100);
          const totalM = m1 + b.mass;
          const mu = (m1 * b.mass) / totalM;
          const vSq = dvx * dvx + dvy * dvy;
          const rDotV = (dx * dvx + dy * dvy) / dist;
          const gmOverR = (state.G * totalM) / dist;

          const coeffA = (1.6 * state.G * state.G * mu * b.mass) / (c5 * dist * dist * dist);
          const termV = vSq + 9 * gmOverR;
          const termR = (3 * vSq + 17 * gmOverR) * (rDotV / dist);

          ax += coeffA * (termV * dvx - termR * dx);
          ay += coeffA * (termV * dvy - termR * dy);
        }
      }

      ax += force * (dx / dist);
      ay += force * (dy / dist);
    }

    if (m1 < 0) {
      ax = -ax;
      ay = -ay;
    }

    if (enableGR && cSq > 0) {
      const vSq = simVel.x * simVel.x + simVel.y * simVel.y;
      const betaSq = Math.min(0.999999, vSq / cSq);
      const gamma = 1 / Math.sqrt(1 - betaSq);
      const ux = gamma * simVel.x + ax * dt;
      const uy = gamma * simVel.y + ay * dt;
      const uSq = ux * ux + uy * uy;
      const newGamma = Math.sqrt(1 + uSq / cSq);
      simVel.x = ux / newGamma;
      simVel.y = uy / newGamma;
    } else {
      simVel.x += ax * dt;
      simVel.y += ay * dt;
    }
    simPos.x += simVel.x * dt;
    simPos.y += simVel.y * dt;

    points.push({ x: simPos.x, y: simPos.y });

    // Stop if colliding with any body
    for (let i = 0; i < state.bodies.length; i++) {
      const b = state.bodies[i];
      if (simPos.dist(b.pos) < b.radius) {
        return points;
      }
    }
  }

  return points;
}
