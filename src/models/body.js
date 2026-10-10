import { Vec2 } from '../core/vec2.js';
import { DEFAULT_TRAIL_LENGTH } from '../core/constants.js';

let globalBodyCounter = 1;

/**
 * Resets the internal auto-incrementing ID generator counter.
 * @param {number} [value=1]
 */
export function resetBodyCounter(value = 1) {
  globalBodyCounter = value;
}

/**
 * Represents a celestial body with physical, orbital, and relativistic properties.
 */
export class Body {
  /**
   * @param {Object} [options]
   * @param {string|null} [options.id]
   * @param {string} [options.name]
   * @param {number} [options.x=0]
   * @param {number} [options.y=0]
   * @param {number} [options.vx=0]
   * @param {number} [options.vy=0]
   * @param {number} [options.mass=100]
   * @param {number} [options.radius=8]
   * @param {string} [options.color='#38bdf8']
   * @param {boolean} [options.fixed=false]
   * @param {number} [options.birthTime=0]
   * @param {number} [options.properTime=0]
   * @param {number} [options.absorbCount=0]
   * @param {Array<{x: number, y: number}>} [options.trail=[]]
   */
  constructor({
    id = null,
    name = '',
    x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    mass = 100,
    radius = 8,
    color = '#38bdf8',
    fixed = false,
    birthTime = 0,
    properTime = 0,
    absorbCount = 0,
    trail = []
  } = {}) {
    this.id = id || `ast-${globalBodyCounter++}`;
    const autoNum = this.id.replace('ast-', '');
    this.name = name || `#${autoNum}`;
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(vx, vy);
    this.acc = new Vec2(0, 0);
    this.mass = mass;
    this.radius = radius;
    this.color = color;
    this.fixed = fixed;
    this.birthTime = birthTime !== undefined ? birthTime : 0;
    this.properTime = properTime !== undefined ? properTime : 0;
    this.gravPotential = 0;
    this.lastGravPotential = 0;
    this.absorbCount = absorbCount || 0;
    this.trail = trail ? [...trail] : [];
    this.stepCounter = 0;
  }

  /**
   * Applies an external force vector to accumulate acceleration according to Newton's second law (a = F / m).
   * Fixed anchors ignore external forces.
   * @param {{x: number, y: number}} force - Force vector in simulation units
   */
  applyForce(force) {
    if (this.fixed) return;
    if (this.mass !== 0) {
      this.acc.x += force.x / this.mass;
      this.acc.y += force.y / this.mass;
    }
  }

  /**
   * Integrates velocity, position, proper time dilation, and historical trail trajectory over dt.
   * Supports Special Relativity (relativistic momentum clamping speed < c) and General Relativity (gravitational dilation).
   * @param {number} dt - Sub-step delta time in seconds
   * @param {number} [maxTrailLength=DEFAULT_TRAIL_LENGTH] - Max trail points to retain
   * @param {boolean} [enableRelativity=false] - Whether relativistic mechanics are active
   * @param {number} [speedOfLight=100] - Speed of light c in pixels/second
   */
  update(dt, maxTrailLength = DEFAULT_TRAIL_LENGTH, enableRelativity = false, speedOfLight = 100) {
    const c = speedOfLight;
    const cSq = c * c;

    if (this.fixed) {
      this.vel.set(0, 0);
      this.acc.set(0, 0);
      const gravFactor = (enableRelativity && cSq > 0)
        ? Math.sqrt(Math.max(0, 1 - (2 * (this.gravPotential || 0)) / cSq))
        : 1.0;
      this.properTime += dt * gravFactor;
      this.lastGravPotential = this.gravPotential || 0;
      this.gravPotential = 0;
      return;
    }

    if (enableRelativity && speedOfLight > 0) {
      // Special Relativistic momentum update: p = gamma * m * v, dp/dt = F = m * a
      const vSq = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
      const betaSq = Math.min(0.999999, vSq / cSq);
      const gamma = 1 / Math.sqrt(1 - betaSq);

      // u = gamma * v (proper velocity / momentum per unit mass)
      const ux = gamma * this.vel.x + this.acc.x * dt;
      const uy = gamma * this.vel.y + this.acc.y * dt;
      const uSq = ux * ux + uy * uy;

      // Recover new coordinate velocity: v = u / sqrt(1 + u^2 / c^2) < c
      const newGamma = Math.sqrt(1 + uSq / cSq);
      this.vel.x = ux / newGamma;
      this.vel.y = uy / newGamma;

      const vSqNew = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
      const betaSqNew = Math.min(0.999999, vSqNew / cSq);
      const kinematicFactor = Math.sqrt(1 - betaSqNew);
      const gravFactor = Math.sqrt(Math.max(0, 1 - (2 * (this.gravPotential || 0)) / cSq));

      this.properTime += dt * kinematicFactor * gravFactor;
      this.lastGravPotential = this.gravPotential || 0;
      this.gravPotential = 0;
    } else {
      this.vel.x += this.acc.x * dt;
      this.vel.y += this.acc.y * dt;
      this.properTime += dt;
      this.lastGravPotential = 0;
      this.gravPotential = 0;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.acc.set(0, 0);

    this.stepCounter++;
    if (this.stepCounter % 2 === 0) {
      this.trail.push({ x: this.pos.x, y: this.pos.y });
      if (this.trail.length > maxTrailLength) {
        this.trail.splice(0, this.trail.length - maxTrailLength);
      }
    }
  }

  /**
   * Serializes the celestial body to a JSON-compatible object for storage.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      x: this.pos.x,
      y: this.pos.y,
      vx: this.vel.x,
      vy: this.vel.y,
      mass: this.mass,
      radius: this.radius,
      color: this.color,
      fixed: this.fixed,
      birthTime: this.birthTime,
      properTime: this.properTime,
      absorbCount: this.absorbCount
    };
  }
}
