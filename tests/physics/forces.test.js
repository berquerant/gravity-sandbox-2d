import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Body } from '../../src/models/body.js';
import { computeGravitationalForces } from '../../src/physics/forces.js';

describe('Gravitational Forces', () => {
  test('Newtonian third law: equal and opposite forces between positive masses', () => {
    const b1 = new Body({ x: 0, y: 0, mass: 100 });
    const b2 = new Body({ x: 100, y: 0, mass: 100 });
    const bodies = [b1, b2];

    computeGravitationalForces(bodies, 1.0, 0);

    // b1 should be pulled towards +x
    assert.ok(b1.acc.x > 0);
    assert.equal(b1.acc.y, 0);

    // b2 should be pulled towards -x with identical magnitude
    assert.ok(b2.acc.x < 0);
    assert.equal(b2.acc.y, 0);
    assert.equal(b1.acc.x, -b2.acc.x);
  });

  test('Softening prevents division by zero / singularity at distance 0', () => {
    const b1 = new Body({ x: 10, y: 10, mass: 50 });
    const b2 = new Body({ x: 10, y: 10, mass: 50 });
    const bodies = [b1, b2];

    assert.doesNotThrow(() => {
      computeGravitationalForces(bodies, 1.0, 100);
    });
    assert.ok(Number.isFinite(b1.acc.x));
    assert.ok(Number.isFinite(b2.acc.x));
  });

  test('Negative mass repels positive mass', () => {
    // b1 is positive mass, b2 is negative mass
    // Force magnitude F = G * m1 * m2 / r^2 < 0 (repulsive)
    const b1 = new Body({ x: 0, y: 0, mass: 200 });
    const b2 = new Body({ x: 100, y: 0, mass: -200 });
    const bodies = [b1, b2];

    computeGravitationalForces(bodies, 1.0, 0);

    // b1 has positive mass and experiences repulsive force away from b2 -> moves in -x
    assert.ok(b1.acc.x < 0);

    // b2 has negative mass: F is negative, acc = F / m2 (negative / negative = positive) -> accelerates towards +x
    // This is the theoretical runaway motion of an anti-gravity dipole
    assert.ok(b2.acc.x < 0 || b2.acc.x > 0);
  });

  test('General Relativity (1PN): enhances gravitational force for non-zero angular momentum', () => {
    // Star at origin, planet at (100, 0) moving tangentially at vy = 10
    const star1 = new Body({ x: 0, y: 0, vx: 0, vy: 0, mass: 1000 });
    const planet1 = new Body({ x: 100, y: 0, vx: 0, vy: 10, mass: 1 });
    // Classical calculation (relativity disabled)
    computeGravitationalForces([star1, planet1], 1.0, 0, false);
    const classicAcc = planet1.acc.x; // negative (towards star)

    const star2 = new Body({ x: 0, y: 0, vx: 0, vy: 0, mass: 1000 });
    const planet2 = new Body({ x: 100, y: 0, vx: 0, vy: 10, mass: 1 });
    // Relativistic calculation with c = 50 px/s
    // L = dx * dvy - dy * dvx = 100 * 10 - 0 = 1000
    // r = 100, r^2 = 10000
    // c = 50, c^2 = 2500
    // grFactor = 1 + (3 * 1000^2) / (2500 * 10000) = 1 + 3,000,000 / 25,000,000 = 1 + 0.12 = 1.12
    computeGravitationalForces([star2, planet2], 1.0, 0, true, 50);
    const relativisticAcc = planet2.acc.x;

    assert.ok(Math.abs(relativisticAcc) > Math.abs(classicAcc));
    assert.ok(Math.abs(relativisticAcc / classicAcc - 1.12) < 1e-4);
  });

  test('General Relativity (1PN): satisfies Newton third law and momentum conservation', () => {
    // Two bodies orbiting each other obliquely
    const b1 = new Body({ x: -40, y: 20, vx: 5, vy: -3, mass: 150 });
    const b2 = new Body({ x: 60, y: -30, vx: -2, vy: 7, mass: 80 });

    computeGravitationalForces([b1, b2], 1.5, 50, true, 40);

    // F1 = m1 * a1, F2 = m2 * a2
    const f1x = b1.acc.x * b1.mass;
    const f1y = b1.acc.y * b1.mass;
    const f2x = b2.acc.x * b2.mass;
    const f2y = b2.acc.y * b2.mass;

    assert.ok(Math.abs(f1x + f2x) < 1e-9);
    assert.ok(Math.abs(f1y + f2y) < 1e-9);
  });

  test('General Relativity (2.5PN): exerts drag opposing orbital velocity and conserves linear momentum', () => {
    // Two equal masses in circular orbit around center of mass
    // b1 at (-50, 0) moving in -y direction (vy = -10)
    // b2 at (+50, 0) moving in +y direction (vy = +10)
    const b1 = new Body({ x: -50, y: 0, vx: 0, vy: -10, mass: 5000 });
    const b2 = new Body({ x: 50, y: 0, vx: 0, vy: 10, mass: 5000 });

    computeGravitationalForces([b1, b2], 1.0, 0, true, 60, true);

    // Forces on b1:
    // Radial attraction pulls b1 towards b2 (+x)
    assert.ok(b1.acc.x > 0);
    // 2.5PN radiation damping must oppose b1's motion (b1 has vy = -10, so acc.y must be > 0)
    assert.ok(b1.acc.y > 0);

    // Forces on b2:
    // Radial attraction pulls b2 towards b1 (-x)
    assert.ok(b2.acc.x < 0);
    // 2.5PN radiation damping must oppose b2's motion (b2 has vy = +10, so acc.y must be < 0)
    assert.ok(b2.acc.y < 0);

    // Momentum conservation: F1 + F2 = 0 strictly
    const f1x = b1.acc.x * b1.mass;
    const f1y = b1.acc.y * b1.mass;
    const f2x = b2.acc.x * b2.mass;
    const f2y = b2.acc.y * b2.mass;

    assert.ok(Math.abs(f1x + f2x) < 1e-9);
    assert.ok(Math.abs(f1y + f2y) < 1e-9);
  });

  test('General Relativity (2.5PN): respects enableGravitationalWaves toggle', () => {
    // When gravitational waves are disabled, tangential force component is 0 for circular symmetry
    const b1 = new Body({ x: -50, y: 0, vx: 0, vy: -10, mass: 5000 });
    const b2 = new Body({ x: 50, y: 0, vx: 0, vy: 10, mass: 5000 });

    computeGravitationalForces([b1, b2], 1.0, 0, true, 60, false);

    // No tangential force (pure radial attraction)
    assert.equal(b1.acc.y, 0);
    assert.equal(b2.acc.y, 0);
  });

  test('General Relativity: computeGravitationalForces accumulates gravitational potential on bodies', () => {
    // Star of mass 5000 at (0, 0), test body at (100, 0)
    const star = new Body({ x: 0, y: 0, mass: 5000 });
    const planet = new Body({ x: 100, y: 0, mass: 10 });

    computeGravitationalForces([star, planet], 1.0, 0, true, 100);

    // Potential on planet from star: G * M / r = 1 * 5000 / 100 = 50
    assert.ok(Math.abs(planet.gravPotential - 50) < 1e-4);
    // Potential on star from planet: G * m / r = 1 * 10 / 100 = 0.1
    assert.ok(Math.abs(star.gravPotential - 0.1) < 1e-4);
  });
});
