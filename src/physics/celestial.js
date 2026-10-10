/**
 * Celestial mechanics: Primary star, Hill Sphere and gravitational capture analysis
 */

import { Body } from '../models/body.js';

/**
 * Finds the celestial body with the highest positive mass (primary star/black hole).
 * @param {Array<Body>} bodies
 * @returns {Body|null}
 */
export function getPrimaryStar(bodies) {
  if (!bodies || bodies.length === 0) return null;
  let primary = null;
  let maxMass = -Infinity;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.mass > maxMass) {
      maxMass = b.mass;
      primary = b;
    }
  }
  return primary;
}

/**
 * Calculates Hill Sphere radius rH = r * (m / 3M)^(1/3) representing gravitational dominance.
 * @param {Body} b - Secondary body
 * @param {Body|null} primary - Primary host star
 * @param {Array<Body>} [bodies=[]]
 * @returns {number} Radius in pixels
 */
export function calculateHillSphereRadius(b, primary, bodies = []) {
  if (!b || b.mass <= 0) return 0;
  if (!primary || b === primary) {
    const others = bodies.filter(x => x !== primary && x.mass > 0);
    if (others.length > 0) {
      let maxDist = 0;
      others.forEach(o => {
        const d = primary.pos.dist(o.pos);
        if (d > maxDist) maxDist = d;
      });
      return Math.max(300, maxDist * 1.35);
    }
    return 500;
  }

  const r = b.pos.dist(primary.pos);
  if (r <= 0.001 || primary.mass <= 0) return 0;
  const massRatio = Math.abs(b.mass) / (3 * primary.mass);
  return r * Math.cbrt(massRatio);
}

/**
 * Identifies the host parent body for childBody based on Hill sphere and negative relative orbital energy.
 * @param {Body} childBody
 * @param {Body|null} primary
 * @param {Array<Body>} bodies
 * @param {number} G
 * @returns {Body|null}
 */
export function findParentBody(childBody, primary, bodies, G) {
  if (!childBody || childBody.mass <= 0) return null;
  let bestParent = null;
  let minRatio = 1.0;

  for (let i = 0; i < bodies.length; i++) {
    const p = bodies[i];
    if (p === childBody || p === primary || p.mass <= childBody.mass || p.mass <= 0) continue;

    const rH = calculateHillSphereRadius(p, primary, bodies);
    if (rH <= 0) continue;

    const dist = childBody.pos.dist(p.pos);
    if (dist < rH) {
      const relVx = childBody.vel.x - p.vel.x;
      const relVy = childBody.vel.y - p.vel.y;
      const vRelSq = relVx * relVx + relVy * relVy;
      const eRel = 0.5 * vRelSq - (G * p.mass) / Math.max(dist, 1);

      if (eRel < 0 || dist < rH * 0.75) {
        const ratio = dist / rH;
        if (ratio < minRatio) {
          minRatio = ratio;
          bestParent = p;
        }
      }
    }
  }
  return bestParent;
}

/**
 * Discovers all direct orbiting satellites/moons captured within parentBody's Hill sphere.
 * @param {Body} parentBody
 * @param {Body|null} primary
 * @param {Array<Body>} [bodies=[]]
 * @param {number} [G=1]
 * @returns {Array<{body: Body, dist: number}>}
 */
export function findCapturedBodies(parentBody, primary, bodies = [], G = 1) {
  if (!parentBody || parentBody.mass <= 0) return [];
  const captured = [];
  const rH = calculateHillSphereRadius(parentBody, primary, bodies);
  if (rH <= 0) return [];

  const isPrimary = Boolean(primary && parentBody === primary);

  for (let i = 0; i < bodies.length; i++) {
    const c = bodies[i];
    if (c === parentBody || c.mass <= 0) continue;
    if (!isPrimary && (c === primary || c.mass >= parentBody.mass)) continue;

    const dist = c.pos.dist(parentBody.pos);
    if (dist < rH) {
      const relVx = c.vel.x - parentBody.vel.x;
      const relVy = c.vel.y - parentBody.vel.y;
      const vRelSq = relVx * relVx + relVy * relVy;
      const eRel = 0.5 * vRelSq - (G * parentBody.mass) / Math.max(dist, 1);

      if (eRel < 0 || dist < rH * 0.75) {
        const parent = findParentBody(c, primary, bodies, G);
        const isDirectChild = isPrimary ? (parent === null) : (parent === parentBody);
        if (isDirectChild) {
          captured.push({
            body: c,
            dist: dist
          });
        }
      }
    }
  }

  // Sort by distance from parent
  captured.sort((a, b) => a.dist - b.dist);

  return captured;
}

/**
 * Calculates Schwarzschild event horizon radius rs = 2GM / c^2.
 * @param {number} mass
 * @param {number} [G=1]
 * @param {number} [speedOfLight=100]
 * @returns {number}
 */
export function calculateSchwarzschildRadius(mass, G = 1, speedOfLight = 100) {
  if (mass <= 0 || !speedOfLight || speedOfLight <= 0) return 0;
  return (2 * G * mass) / (speedOfLight * speedOfLight);
}

/**
 * Checks whether a body's physical radius has collapsed inside its Schwarzschild horizon.
 * @param {Body} body
 * @param {number} [G=1]
 * @param {number} [speedOfLight=100]
 * @returns {boolean}
 */
export function isBlackHole(body, G = 1, speedOfLight = 100) {
  if (!body || body.mass <= 0 || !speedOfLight || speedOfLight <= 0) return false;
  const rs = calculateSchwarzschildRadius(body.mass, G, speedOfLight);
  return body.radius <= rs * 1.05;
}

/**
 * Calculates relativistic Lorentz factor gamma = 1 / sqrt(1 - v^2/c^2).
 * @param {number} speed
 * @param {number} [speedOfLight=100]
 * @returns {number}
 */
export function calculateLorentzFactor(speed, speedOfLight = 100) {
  if (!speedOfLight || speedOfLight <= 0 || speed <= 0) return 1.0;
  const beta = speed / speedOfLight;
  const betaSq = Math.min(0.999999, beta * beta);
  return 1 / Math.sqrt(1 - betaSq);
}

/**
 * Calculates relativistic effective inertial mass m_rel = gamma * m_rest.
 * @param {number} restMass
 * @param {number} speed
 * @param {number} [speedOfLight=100]
 * @returns {number}
 */
export function calculateRelativisticMass(restMass, speed, speedOfLight = 100) {
  if (restMass === 0) return 0;
  const gamma = calculateLorentzFactor(speed, speedOfLight);
  return restMass * gamma;
}

/**
 * Calculates combined kinematic and gravitational time dilation factor.
 * @param {number} speed
 * @param {number} [speedOfLight=100]
 * @param {number} [primaryDistance=Infinity]
 * @param {number} [primaryMass=0]
 * @param {number} [G=1]
 * @param {number|null} [gravPotential=null]
 * @returns {{gamma: number, beta: number, kinematicDilation: number, gravDilation: number, totalDilation: number}}
 */
export function calculateTimeDilation(speed, speedOfLight = 100, primaryDistance = Infinity, primaryMass = 0, G = 1, gravPotential = null) {
  if (!speedOfLight || speedOfLight <= 0) {
    return {
      gamma: 1.0,
      beta: 0.0,
      kinematicDilation: 1.0,
      gravDilation: 1.0,
      totalDilation: 1.0
    };
  }

  const beta = speed / speedOfLight;
  const betaSq = Math.min(0.999999, beta * beta);
  const gamma = 1 / Math.sqrt(1 - betaSq);
  const kinematicDilation = Math.sqrt(1 - betaSq);
  const cSq = speedOfLight * speedOfLight;

  let gravDilation = 1.0;
  if (gravPotential !== null && Number.isFinite(gravPotential) && gravPotential >= 0) {
    gravDilation = Math.sqrt(Math.max(0, 1 - (2 * gravPotential) / cSq));
  } else if (primaryMass > 0 && Number.isFinite(primaryDistance) && primaryDistance > 0) {
    const rs = calculateSchwarzschildRadius(primaryMass, G, speedOfLight);
    if (primaryDistance <= rs) {
      gravDilation = 0.0;
    } else {
      gravDilation = Math.sqrt(1 - rs / primaryDistance);
    }
  }

  const totalDilation = Math.max(0, kinematicDilation * gravDilation);

  return {
    gamma,
    beta,
    kinematicDilation,
    gravDilation,
    totalDilation
  };
}

/**
 * Finds the second most massive positive-mass body in the system.
 * @param {Array<Body>} bodies
 * @param {Body|null} primary
 * @returns {Body|null}
 */
export function getSecondaryBody(bodies, primary) {
  if (!bodies || bodies.length < 2 || !primary) return null;
  let secondary = null;
  let maxMass = -Infinity;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b === primary || b.mass <= 0) continue;
    if (b.mass > maxMass) {
      maxMass = b.mass;
      secondary = b;
    }
  }
  return secondary;
}

/**
 * Computes circular restricted 3-body problem (CRTBP) parameters and Lagrange points L1-L5.
 * @param {Body} primary
 * @param {Body} secondary
 * @returns {{primary: Body, secondary: Body, m1: number, m2: number, totalM: number, mu: number, R: number, baryX: number, baryY: number, ux: number, uy: number, vx: number, vy: number, lagrangePoints: Array<{name: string, pos: {x: number, y: number}}>}|null}
 */
export function computeCoRotatingSystem(primary, secondary) {
  if (!primary || !secondary) return null;
  const m1 = Math.abs(primary.mass);
  const m2 = Math.abs(secondary.mass);
  const totalM = m1 + m2;
  if (totalM <= 0) return null;

  const mu = m2 / totalM;

  const dx = secondary.pos.x - primary.pos.x;
  const dy = secondary.pos.y - primary.pos.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  if (R < 1e-4) return null;

  const baryX = (primary.pos.x * m1 + secondary.pos.x * m2) / totalM;
  const baryY = (primary.pos.y * m1 + secondary.pos.y * m2) / totalM;

  const ux = dx / R;
  const uy = dy / R;
  const vx = -uy;
  const vy = ux;

  const rH = R * Math.cbrt(mu / 3);
  const l1World = { x: secondary.pos.x - ux * rH, y: secondary.pos.y - uy * rH };
  const l2World = { x: secondary.pos.x + ux * rH, y: secondary.pos.y + uy * rH };
  const l3World = {
    x: primary.pos.x - ux * (R * (1 + (5 / 12) * mu)),
    y: primary.pos.y - uy * (R * (1 + (5 / 12) * mu))
  };

  const halfR = R * 0.5;
  const hL45 = R * (Math.sqrt(3) * 0.5);
  const l4World = {
    x: primary.pos.x + ux * halfR + vx * hL45,
    y: primary.pos.y + uy * halfR + vy * hL45
  };
  const l5World = {
    x: primary.pos.x + ux * halfR - vx * hL45,
    y: primary.pos.y + uy * halfR - vy * hL45
  };

  return {
    primary,
    secondary,
    m1,
    m2,
    totalM,
    mu,
    R,
    baryX,
    baryY,
    ux, uy, vx, vy,
    lagrangePoints: [
      { name: 'L1', pos: l1World }, { name: 'L2', pos: l2World }, { name: 'L3', pos: l3World },
      { name: 'L4', pos: l4World }, { name: 'L5', pos: l5World }
    ]
  };
}

/**
 * Identifies direct major orbiting planets around primary body, excluding sub-satellites.
 * @param {Array<Body>} bodies
 * @param {Body} primary
 * @param {number} [G=1]
 * @returns {Array<{body: Body, name: string, R: number, logR: number, invR: number, mu: number, ux: number, uy: number, vx: number, vy: number, omegaL4: number}>}
 */
export function getOrbitingPlanets(bodies, primary, G = 1) {
  if (!bodies || bodies.length < 2 || !primary || primary.mass <= 0) return [];

  const candidates = [];
  let maxMass = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b === primary || b.mass <= 0) continue;
    if (b.mass > maxMass) maxMass = b.mass;

    // Check if body is a direct orbiter of primary, not a sub-satellite
    const parent = findParentBody(b, primary, bodies, G);
    if (!parent || parent === primary) {
      candidates.push(b);
    }
  }

  if (candidates.length === 0) return [];

  // Filter out tiny dust / background asteroids (mass threshold 1e-4 of max secondary or 1e-8 of primary)
  const massThreshold = Math.max(maxMass * 1e-4, primary.mass * 1e-8);
  const majorPlanets = candidates.filter(b => b.mass >= massThreshold);
  let activePlanets = majorPlanets.length > 0 ? majorPlanets : candidates;

  if (activePlanets.length > 16) {
    activePlanets = activePlanets.slice().sort((a, b) => b.mass - a.mass).slice(0, 16);
  }

  const result = [];
  const m1 = primary.mass;

  for (let i = 0; i < activePlanets.length; i++) {
    const p = activePlanets[i];
    const dx = p.pos.x - primary.pos.x;
    const dy = p.pos.y - primary.pos.y;
    const R = Math.hypot(dx, dy);
    if (R < 1e-3) continue;

    const m2 = p.mass;
    const totalM = m1 + m2;
    const mu = m2 / totalM;
    const invR = 1 / R;

    const ux = (dx * invR) || 0;
    const uy = (dy * invR) || 0;
    const vx = (-uy) || 0;
    const vy = ux || 0;

    const omegaL4 = 1.5 - 0.5 * mu * (1 - mu);
    const logR = Math.log(R);

    result.push({ body: p, name: p.name, R, logR, invR, mu, ux, uy, vx, vy, omegaL4 });
  }

  result.sort((a, b) => a.R - b.R);
  return result;
}

/**
 * Generates celestial bodies in a disk/ring formation with Keplerian orbital velocity.
 * @param {Object} options - Formation configuration
 * @returns {Array<Body>} Generated bodies
 */
export function createDiskBodies({
  center,
  radius,
  count = 40,
  radiusJitterPct = 15,
  baseSpeed = 5.0,
  speedJitterPct = 10,
  direction = 'ccw',
  autoKeplerian = true,
  bodyMass = 10,
  bodyRadius = 8,
  bodyColor = '#38bdf8',
  G = 1.0,
  existingBodies = [],
  speedOfLight = 100,
  enableRelativity = false,
  elapsedTime = 0
}) {
  const N = Math.max(1, Math.min(500, count));
  const baseR = Math.max(5, radius || 200);
  const rJitter = Math.max(0, Math.min(100, radiusJitterPct)) / 100;
  const vJitter = Math.max(0, Math.min(100, speedJitterPct)) / 100;
  const spinDir = direction === 'cw' ? -1 : 1;

  // Detect if placed on or near an existing massive center star
  let centerBody = null;
  let minCenterDist = Infinity;
  for (let i = 0; i < existingBodies.length; i++) {
    const b = existingBodies[i];
    if (b.mass <= 0) continue;
    const d = Math.hypot(b.pos.x - center.x, b.pos.y - center.y);
    if (d <= Math.max(b.radius + 20, baseR * 0.6) && d < minCenterDist) {
      minCenterDist = d;
      centerBody = b;
    }
  }

  const result = [];

  for (let i = 0; i < N; i++) {
    const baseTheta = (Math.PI * 2 * i) / N;
    const dTheta = (rJitter > 0 || vJitter > 0) && N > 1
      ? (Math.random() - 0.5) * (Math.PI * 2 / N) * 0.8
      : 0;
    const theta = baseTheta + dTheta;

    const dr = (Math.random() - 0.5) * 2 * rJitter * baseR;
    const r = Math.max(5, baseR + dr);

    let vOrbit = baseSpeed;
    if (autoKeplerian && centerBody && centerBody.mass > 0) {
      vOrbit = Math.sqrt((G * centerBody.mass) / r);
    }

    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const tanX = -sinT * spinDir;
    const tanY = cosT * spinDir;

    const speedFactor = 1.0 + (Math.random() - 0.5) * 2 * vJitter;
    const radialJitter = (Math.random() - 0.5) * 2 * (vJitter * 0.25) * vOrbit;

    let vx = tanX * (vOrbit * speedFactor) + cosT * radialJitter;
    let vy = tanY * (vOrbit * speedFactor) + sinT * radialJitter;

    if (centerBody) {
      vx += centerBody.vel.x;
      vy += centerBody.vel.y;
    }

    if (enableRelativity && speedOfLight > 0) {
      const spd = Math.hypot(vx, vy);
      if (spd >= speedOfLight) {
        const factor = (speedOfLight * 0.9999) / spd;
        vx *= factor;
        vy *= factor;
      }
    }

    const px = center.x + cosT * r;
    const py = center.y + sinT * r;

    result.push(new Body({
      name: `Disk Body ${i + 1}`,
      x: px,
      y: py,
      vx,
      vy,
      mass: bodyMass,
      radius: bodyRadius,
      color: bodyColor,
      fixed: false,
      birthTime: elapsedTime
    }));
  }

  return result;
}

