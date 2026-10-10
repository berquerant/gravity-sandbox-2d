import { Body } from '../models/body.js';

/**
 * Gravitational force computation with softening factor, 1PN precession, and 2.5PN gravitational wave damping.
 * Accumulates pairwise forces directly onto body instances via bi.applyForce() and resets gravPotential.
 * @param {Array<Body>} bodies - Array of active celestial bodies
 * @param {number} G - Gravitational constant
 * @param {number} softening - Softening factor squared to prevent division-by-zero singularities
 * @param {boolean} [enableRelativity=false] - Whether relativistic corrections are active
 * @param {number} [speedOfLight=100] - Speed of light c in pixels/second
 * @param {boolean} [enableGravitationalWaves=true] - Whether 2.5PN radiation reaction damping is enabled
 */
export function computeGravitationalForces(
  bodies,
  G,
  softening,
  enableRelativity = false,
  speedOfLight = 100,
  enableGravitationalWaves = true
) {
  const len = bodies.length;
  const epsSq = softening;
  const cSq = speedOfLight * speedOfLight;
  const c5 = (enableRelativity && enableGravitationalWaves && cSq > 0) ? (cSq * cSq * speedOfLight) : 0;

  if (enableRelativity && cSq > 0) {
    for (let i = 0; i < len; i++) {
      bodies[i].gravPotential = 0;
    }
  }

  for (let i = 0; i < len; i++) {
    const bi = bodies[i];
    for (let j = i + 1; j < len; j++) {
      const bj = bodies[j];

      const dx = bj.pos.x - bi.pos.x;
      const dy = bj.pos.y - bi.pos.y;
      const rSq = dx * dx + dy * dy + epsSq;
      const dist = Math.sqrt(rSq);

      // Accumulate gravitational potential for General Relativistic time dilation
      if (enableRelativity && cSq > 0) {
        if (bj.mass > 0) bi.gravPotential += (G * bj.mass) / dist;
        if (bi.mass > 0) bj.gravPotential += (G * bi.mass) / dist;
      }

      let forceMag = (G * bi.mass * bj.mass) / rSq;
      const dvx = bj.vel.x - bi.vel.x;
      const dvy = bj.vel.y - bi.vel.y;

      // 1PN General Relativity correction for perihelion precession (Schwarzschild effect)
      // Multiplier: 1 + 3 * L^2 / (c^2 * r^2) where L = |r x v| (specific relative angular momentum)
      if (enableRelativity && cSq > 0) {
        const L = dx * dvy - dy * dvx;
        const grFactor = 1 + (3 * L * L) / (cSq * rSq);
        forceMag *= grFactor;
      }

      const fx = forceMag * (dx / dist);
      const fy = forceMag * (dy / dist);

      let f25x = 0;
      let f25y = 0;

      // 2.5PN Gravitational wave radiation reaction damping (Burke-Thorne / Damour-Deruelle)
      // Causes binary orbits to lose orbital energy and angular momentum, inspiraling until merger
      if (enableRelativity && enableGravitationalWaves && cSq > 0 && bi.mass > 0 && bj.mass > 0) {
        const totalM = bi.mass + bj.mass;
        const mu = (bi.mass * bj.mass) / totalM;
        const vSq = dvx * dvx + dvy * dvy;
        const rDotV = (dx * dvx + dy * dvy) / dist;
        const gmOverR = (G * totalM) / dist;

        const coeff = (1.6 * G * G * mu * mu * totalM) / (c5 * dist * dist * dist);
        const termV = vSq + 9 * gmOverR;
        const termR = (3 * vSq + 17 * gmOverR) * (rDotV / dist);

        f25x = coeff * (termV * dvx - termR * dx);
        f25y = coeff * (termV * dvy - termR * dy);
      }

      const totalFx = fx + f25x;
      const totalFy = fy + f25y;

      bi.applyForce({ x: totalFx, y: totalFy });
      bj.applyForce({ x: -totalFx, y: -totalFy });
    }
  }
}
