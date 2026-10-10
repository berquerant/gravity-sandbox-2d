import { calculateRadiusFromMass, formatKg, formatKm, computeCCWAngleDeg } from '../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../core/constants.js';
import { eventBus } from '../core/event-bus.js';
import { Body } from '../models/body.js';
import { getPrimaryStar, calculateSchwarzschildRadius, isBlackHole } from './celestial.js';

function getHorizonMetrics(b1, b2, state) {
  const rs1 = (state.enableRelativity && state.speedOfLight > 0)
    ? calculateSchwarzschildRadius(b1.mass, state.G, state.speedOfLight)
    : 0;
  const rs2 = (state.enableRelativity && state.speedOfLight > 0)
    ? calculateSchwarzschildRadius(b2.mass, state.G, state.speedOfLight)
    : 0;

  const hasHorizon = (rs1 > 0 || rs2 > 0);
  const captureThreshold = hasHorizon
    ? Math.max((b1.radius + b2.radius) * 0.85, Math.max(rs1 + b2.radius, rs2 + b1.radius))
    : (b1.radius + b2.radius) * 0.85;

  return { rs1, rs2, captureThreshold };
}

function determineDominantPair(b1, b2, i, j, state) {
  const b1IsBH = state.enableRelativity && isBlackHole(b1, state.G, state.speedOfLight);
  const b2IsBH = state.enableRelativity && isBlackHole(b2, state.G, state.speedOfLight);
  const hasBlackHole = b1IsBH || b2IsBH;

  let dominant, absorbed, dominantIdx, absorbedIdx;
  if (b1IsBH && !b2IsBH) {
    dominant = b1;
    absorbed = b2;
    dominantIdx = i;
    absorbedIdx = j;
  } else if (!b1IsBH && b2IsBH) {
    dominant = b2;
    absorbed = b1;
    dominantIdx = j;
    absorbedIdx = i;
  } else {
    dominant = Math.abs(b1.mass) >= Math.abs(b2.mass) ? b1 : b2;
    absorbed = dominant === b1 ? b2 : b1;
    dominantIdx = dominant === b1 ? i : j;
    absorbedIdx = dominant === b1 ? j : i;
  }
  return { dominant, absorbed, dominantIdx, absorbedIdx, hasBlackHole };
}

function resolveAnnihilation(state, b1, b2, i, j, toRemove, primary) {
  eventBus.emit('history:event', {
    type: 'Annihilation',
    title: `${b1.name} and ${b2.name} Mutual Annihilation`,
    description: `Mass neutralization (${b1.mass.toFixed(1)} + (${b2.mass.toFixed(1)}) ≈ 0)`,
    color: '#f43f5e'
  });
  archiveBody(state, b1, 'Annihilated in collision', primary);
  archiveBody(state, b2, 'Annihilated in collision', primary);
  toRemove.add(i);
  toRemove.add(j);
}

function updateCollisionVelocity(dominant, absorbed, totalMass, state) {
  if (absorbed.fixed) {
    dominant.fixed = true;
    dominant.vel.set(0, 0);
  } else if (!dominant.fixed) {
    dominant.vel.x = (dominant.mass * dominant.vel.x + absorbed.mass * absorbed.vel.x) / totalMass;
    dominant.vel.y = (dominant.mass * dominant.vel.y + absorbed.mass * absorbed.vel.y) / totalMass;

    const maxSpeed = (state.enableRelativity && state.speedOfLight > 0)
      ? state.speedOfLight * 0.9999
      : 5000;
    const currentSpeed = dominant.vel.mag();
    if (currentSpeed > maxSpeed && currentSpeed > 0) {
      dominant.vel.mult(maxSpeed / currentSpeed);
    }
  }
}

function computePostCollisionRadius(domOldMass, absOldMass, domOldRadius, absOldRadius, totalMass, newRs, isProductBH) {
  if ((domOldMass > 0 && absOldMass < 0) || (domOldMass < 0 && absOldMass > 0)) {
    return calculateRadiusFromMass(totalMass);
  }
  if (isProductBH) {
    return newRs;
  }
  const volRadius = Math.cbrt(Math.pow(domOldRadius, 3) + Math.pow(absOldRadius, 3));
  const massRadius = calculateRadiusFromMass(totalMass);
  return Math.min(48, Math.max(3, Math.round(Math.min(volRadius, massRadius * 1.15))));
}

function emitCollisionHistory(dominant, absorbed, metrics) {
  const { domOldMass, absOldMass, totalMass, domOldRadius, newRadius, domOldRs, newRs, isGravitationalCollapse, isHorizonCapture } = metrics;
  const domOldKg = domOldMass * KG_PER_MASS;
  const absOldKg = absOldMass * KG_PER_MASS;
  const totalKg = totalMass * KG_PER_MASS;
  const domOldKm = domOldRadius * KM_PER_PX;
  const newKm = newRadius * KM_PER_PX;
  const radiusDiffKm = (newRadius - domOldRadius) * KM_PER_PX;
  const radiusDiffSign = radiusDiffKm >= 0 ? `+${formatKm(radiusDiffKm)}` : formatKm(radiusDiffKm);

  if (isGravitationalCollapse) {
    eventBus.emit('history:event', {
      type: 'Gravitational Collapse',
      title: `${dominant.name} collapsed into a Black Hole`,
      description: `Core exceeded Schwarzschild threshold: Mass ${formatKg(totalKg)} | Horizon rs: ${formatKm(newRs * KM_PER_PX)}`,
      color: '#a855f7'
    });
  } else if (isHorizonCapture) {
    eventBus.emit('history:event', {
      type: 'Event Horizon Capture',
      title: `${dominant.name} captured ${absorbed.name} into Event Horizon`,
      description: `Mass: ${formatKg(domOldKg)} + ${formatKg(absOldKg)} → ${formatKg(totalKg)} | Horizon rs: ${formatKm(domOldRs * KM_PER_PX)} → ${formatKm(newRs * KM_PER_PX)}`,
      color: '#a855f7'
    });
  } else {
    eventBus.emit('history:event', {
      type: 'Merge',
      title: `${dominant.name} absorbed ${absorbed.name} (Total absorbed: ${dominant.absorbCount})`,
      description: `Mass: ${formatKg(domOldKg)} + ${formatKg(absOldKg)} → ${formatKg(totalKg)} | Radius: ${formatKm(domOldKm)} → ${formatKm(newKm)} (${radiusDiffSign})`,
      color: '#fb923c'
    });
  }
}

function resolveBodyCollision(state, b1, b2, i, j, dist, rs1, rs2, toRemove, primary) {
  const { dominant, absorbed, dominantIdx, absorbedIdx, hasBlackHole } = determineDominantPair(b1, b2, i, j, state);
  const domOldMass = dominant.mass;
  const absOldMass = absorbed.mass;
  const domOldRadius = dominant.radius;
  const absOldRadius = absorbed.radius;
  const domOldRs = dominant === b1 ? rs1 : rs2;

  const totalMass = domOldMass + absOldMass;

  // Complete Annihilation (Positive + Negative mass offset to 0)
  if (Math.abs(totalMass) < 0.001) {
    resolveAnnihilation(state, b1, b2, i, j, toRemove, primary);
    return true;
  }

  // Inelastic momentum conservation
  updateCollisionVelocity(dominant, absorbed, totalMass, state);

  // Radius recalculation & Gravitational collapse
  const newRs = (state.enableRelativity && state.speedOfLight > 0 && totalMass > 0)
    ? calculateSchwarzschildRadius(totalMass, state.G, state.speedOfLight)
    : 0;

  const volRadius = Math.cbrt(Math.pow(domOldRadius, 3) + Math.pow(absOldRadius, 3));
  const isGravitationalCollapse = state.enableRelativity && !hasBlackHole && totalMass > 0 && newRs > 0 && newRs >= volRadius;
  const isProductBH = (hasBlackHole || isGravitationalCollapse) && totalMass > 0;

  const newRadius = computePostCollisionRadius(domOldMass, absOldMass, domOldRadius, absOldRadius, totalMass, newRs, isProductBH);
  if (isGravitationalCollapse) {
    dominant.color = '#020617';
  }

  dominant.radius = newRadius;
  dominant.mass = totalMass;
  dominant.absorbCount = (dominant.absorbCount || 0) + 1 + (absorbed.absorbCount || 0);

  const isHorizonCapture = state.enableRelativity && (hasBlackHole || (domOldRs > 0 && dist <= domOldRs + absOldRadius));
  const deathReason = (isHorizonCapture || isProductBH)
    ? `Captured past event horizon of ${dominant.name}`
    : `Absorbed into ${dominant.name}`;
  archiveBody(state, absorbed, deathReason, primary);
  toRemove.add(absorbedIdx);

  emitCollisionHistory(dominant, absorbed, {
    domOldMass,
    absOldMass,
    totalMass,
    domOldRadius,
    newRadius,
    domOldRs,
    newRs,
    isGravitationalCollapse,
    isHorizonCapture
  });

  return absorbedIdx === i;
}

/**
 * Detects and resolves completely inelastic mergers, annihilation, and event horizon captures.
 * @param {Object} state - Global simulation state store
 */
export function handleCollisions(state) {
  if (!state.collisions) return;

  const bodies = state.bodies;
  const toRemove = new Set();
  const primary = getPrimaryStar(bodies);

  for (let i = 0; i < bodies.length; i++) {
    if (toRemove.has(i)) continue;
    const b1 = bodies[i];

    for (let j = i + 1; j < bodies.length; j++) {
      if (toRemove.has(j)) continue;
      const b2 = bodies[j];

      const dist = b1.pos.dist(b2.pos);
      const { rs1, rs2, captureThreshold } = getHorizonMetrics(b1, b2, state);

      if (dist < captureThreshold) {
        const shouldBreak = resolveBodyCollision(state, b1, b2, i, j, dist, rs1, rs2, toRemove, primary);
        if (shouldBreak) break;
      }
    }
  }

  if (toRemove.size > 0) {
    const removedBodies = state.bodies.filter((_, idx) => toRemove.has(idx));
    state.bodies = state.bodies.filter((_, idx) => !toRemove.has(idx));

    // Close inspector if the selected body was destroyed in collision
    if (state.selectedBodyId && removedBodies.some(b => b.id === state.selectedBodyId)) {
      state.selectedBodyId = null;
      eventBus.emit('inspector:close');
    }
    if (state.selectedBodyIds && state.selectedBodyIds.size > 0) {
      removedBodies.forEach(b => state.selectedBodyIds.delete(b.id));
      if (state.selectedBodyIds.size === 0) {
        eventBus.emit('inspector:close');
      }
    }

    eventBus.emit('bodies:collided', { count: toRemove.size });
  }
}

/**
 * Archives a destroyed, swallowed, or annihilated body into state.archivedBodies for historical tracking.
 * @param {Object} state - Global state store
 * @param {Body} b - Destroyed body instance
 * @param {string} [reason='Destroyed'] - Human-readable cause of death
 * @param {Body|null} [primary=null] - Primary reference star for orbital distance calculation
 */
export function archiveBody(state, b, reason = 'Destroyed', primary = null) {
  const distFromPrimaryPx = primary && primary !== b ? b.pos.dist(primary.pos) : 0;
  const speedKms = b.vel.mag() * KMS_PER_PXS;
  const angleDeg = computeCCWAngleDeg(b.vel.x, b.vel.y);

  state.archivedBodies.unshift({
    id: b.id,
    name: b.name,
    color: b.color,
    massKg: b.mass * KG_PER_MASS,
    radiusKm: b.radius * KM_PER_PX,
    speedKms: speedKms,
    angleDeg: angleDeg,
    birthTime: b.birthTime,
    deathTime: state.elapsedTime,
    age: state.elapsedTime - b.birthTime,
    absorbCount: b.absorbCount || 0,
    distToPrimaryKm: distFromPrimaryPx * KM_PER_PX,
    isAlive: false,
    deathReason: reason,
    pos: b.pos.copy()
  });

  if (state.archivedBodies.length > 500) {
    state.archivedBodies.pop();
  }
  eventBus.emit('body:archived');
}
