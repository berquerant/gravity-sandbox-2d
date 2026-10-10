import { Body } from '../models/body.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Loads classic and chaotic N-body presets (Three-body chaotic orbit, negative mass dipole, colliding galaxies).
 * @param {string} name - Preset scenario key
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 */
export function loadNBodyPreset(name, state, camera) {
  if (name === 'threebody') {
    const v = 2.8;
    state.bodies.push(new Body({
      name: 'Body A', x: -180, y: 0, vx: 0, vy: -v, mass: 800, radius: 12, color: '#38bdf8'
    }));
    state.bodies.push(new Body({
      name: 'Body B', x: 180, y: 0, vx: 0, vy: v, mass: 800, radius: 12, color: '#ec4899'
    }));
    state.bodies.push(new Body({
      name: 'Body C', x: 0, y: 0, vx: -v * 0.8, vy: 0, mass: 800, radius: 12, color: '#34d399'
    }));
    eventBus.emit('toast:show', 'Loaded Three-Body chaotic orbit model');
  } else if (name === 'negative_runaway') {
    const dist = 60;
    state.bodies.push(new Body({
      name: 'Positive Mass', x: -dist / 2, y: 0, vx: 0, vy: 0, mass: 400, radius: 10, color: '#38bdf8'
    }));
    state.bodies.push(new Body({
      name: 'Negative Mass', x: dist / 2, y: 0, vx: 0, vy: 0, mass: -400, radius: 10, color: '#ec4899'
    }));
    eventBus.emit('toast:show', 'Loaded Negative Mass: Self-accelerating dipole');
  } else if (name === 'galaxy') {
    const coreSpeed = 0.9 + Math.random() * 0.5;
    const impactY = 0.2 + (Math.random() - 0.5) * 0.5;

    const g1X = -260 + (Math.random() - 0.5) * 60;
    const g1Y = -110 + (Math.random() - 0.5) * 60;
    const g2X = 260 + (Math.random() - 0.5) * 60;
    const g2Y = 110 + (Math.random() - 0.5) * 60;

    createGalaxyCluster(state, g1X, g1Y, coreSpeed, impactY, '#38bdf8', 55, 1);
    createGalaxyCluster(state, g2X, g2Y, -coreSpeed, -impactY, '#ec4899', 55, Math.random() > 0.5 ? 1 : -1);

    state.trailLength = 800;
    eventBus.emit('toast:show', 'Loaded Galaxy Collision model');
  } else if (name === 'spray_playground') {
    state.bodies.push(new Body({
      name: 'Gravity Core', x: 0, y: 0, vx: 0, vy: 0, mass: 12000, radius: 28, color: '#8b5cf6', fixed: true
    }));
    eventBus.emit('mode:change', 'spray');
    eventBus.emit('toast:show', 'Spray Playground: Try spraying particles around the core');
  }
}

/**
 * Generates a rotating galactic disk cluster with a massive central core and orbiting stars.
 * @param {Object} state - Global state store
 * @param {number} centerX - Cluster center X position
 * @param {number} centerY - Cluster center Y position
 * @param {number} vX - System bulk drift velocity X
 * @param {number} vY - System bulk drift velocity Y
 * @param {string} color - Theme color for stars
 * @param {number} count - Number of orbiting stars to generate
 * @param {number} [spinDir=1] - Spin rotation direction: +1 for CCW, -1 for CW
 */
export function createGalaxyCluster(state, centerX, centerY, vX, vY, color, count, spinDir = 1) {
  state.bodies.push(new Body({
    name: 'Galactic Core',
    x: centerX,
    y: centerY,
    vx: vX,
    vy: vY,
    mass: 4200,
    radius: 14,
    color: color,
    fixed: false
  }));

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 190;
    const baseSpeed = Math.sqrt((state.G * 4200) / dist);
    const speedMultiplier = 0.88 + Math.random() * 0.24;
    const actualSpeed = baseSpeed * speedMultiplier;

    const tangentAngle = angle + (Math.PI / 2) * spinDir;
    const perturbedAngle = tangentAngle + (Math.random() - 0.5) * 0.35;
    const radialJitter = (Math.random() - 0.5) * (baseSpeed * 0.15);

    const px = centerX + Math.cos(angle) * dist;
    const py = centerY + Math.sin(angle) * dist;
    const vx = vX + Math.cos(perturbedAngle) * actualSpeed + Math.cos(angle) * radialJitter;
    const vy = vY + Math.sin(perturbedAngle) * actualSpeed + Math.sin(angle) * radialJitter;

    const m = 0.7 + Math.random() * 0.9;
    const r = Math.max(1.8, Math.min(3.2, 1.8 + Math.random() * 1.2));

    state.bodies.push(new Body({
      x: px,
      y: py,
      vx: vx,
      vy: vy,
      mass: m,
      radius: r,
      color: color
    }));
  }
}
