import { Body } from '../../models/body.js';
import { eventBus } from '../../core/event-bus.js';
import { createDiskBodies } from '../../physics/celestial.js';

/**
 * Generates an isotropic randomized spray particle velocity vector scaled by state.spraySpeed.
 * @param {Object} state - Global state store
 * @returns {{x: number, y: number}} Velocity vector
 */
export function getRandomSprayVelocity(state) {
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.2 + Math.random() * 0.8) * state.spraySpeed;
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

/**
 * Instantiates and adds a new celestial body to the universe at the specified world position.
 * Clamps initial velocity below the speed of light if relativity is active.
 * @param {Object} state - Global state store
 * @param {{x: number, y: number}} worldPos - Spawn world coordinates
 * @param {{x: number, y: number}} [vel={x:0, y:0}] - Initial velocity vector
 * @returns {Body} The created body instance
 */
export function createBodyAt(state, worldPos, vel = { x: 0, y: 0 }) {
  let finalVx = vel.x;
  let finalVy = vel.y;
  if (state.enableRelativity && state.speedOfLight > 0) {
    const spd = Math.hypot(vel.x, vel.y);
    if (spd >= state.speedOfLight) {
      const factor = (state.speedOfLight * 0.9999) / spd;
      finalVx *= factor;
      finalVy *= factor;
    }
  }

  const massVal = state.newBody.isNegative ? -state.newBody.mass : state.newBody.mass;
  const body = new Body({
    x: worldPos.x,
    y: worldPos.y,
    vx: finalVx,
    vy: finalVy,
    mass: massVal,
    radius: state.newBody.radius,
    color: state.newBody.color,
    fixed: state.newBody.fixed,
    birthTime: state.elapsedTime
  });
  state.bodies.push(body);

  eventBus.emit('history:event', {
    type: 'Create',
    title: `New Body: ${body.name}`,
    description: `Mass: ${massVal.toFixed(1)} | Radius: ${body.radius}px | Initial Vel: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)})`,
    color: body.color
  });

  eventBus.emit('bodies:updated');
  return body;
}

/**
 * Spawns an entire Keplerian or manual circumstellar disk of bodies around centerWorldPos.
 * @param {Object} state - Global state store
 * @param {{x: number, y: number}} centerWorldPos - Disk center coordinates
 * @param {number} [radius] - Override radius
 * @returns {Array<Body>} Spawned bodies
 */
export function spawnDiskAt(state, centerWorldPos, radius) {
  const cfg = state.diskPlacement || {};
  const bodyMass = state.newBody.isNegative ? -state.newBody.mass : state.newBody.mass;
  const newBodies = createDiskBodies({
    center: centerWorldPos,
    radius: radius || cfg.baseRadius,
    count: cfg.count,
    radiusJitterPct: cfg.radiusJitterPct,
    baseSpeed: cfg.baseSpeed,
    speedJitterPct: cfg.speedJitterPct,
    direction: cfg.direction,
    autoKeplerian: cfg.autoKeplerian,
    bodyMass: bodyMass,
    bodyRadius: state.newBody.radius,
    bodyColor: state.newBody.color,
    G: state.G,
    existingBodies: state.bodies,
    speedOfLight: state.speedOfLight,
    enableRelativity: state.enableRelativity,
    elapsedTime: state.elapsedTime
  });

  state.bodies.push(...newBodies);

  eventBus.emit('history:event', {
    type: 'Create',
    title: `Placed Disk of ${newBodies.length} Bodies`,
    description: `Center: (${centerWorldPos.x.toFixed(0)}, ${centerWorldPos.y.toFixed(0)}) | Radius: ${(radius || cfg.baseRadius).toFixed(0)}px | Spin: ${(cfg.direction || 'ccw').toUpperCase()}`,
    color: state.newBody.color
  });

  eventBus.emit('bodies:updated');
  eventBus.emit('toast:show', `Placed disk of ${newBodies.length} bodies`);
  return newBodies;
}
