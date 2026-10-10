import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Body, resetBodyCounter } from '../../src/models/body.js';

describe('Body Model', () => {
  test('default attributes and auto naming', () => {
    resetBodyCounter(10);
    const b = new Body({ x: 100, y: 200 });

    assert.equal(b.id, 'ast-10');
    assert.equal(b.name, '#10');
    assert.equal(b.pos.x, 100);
    assert.equal(b.pos.y, 200);
    assert.equal(b.mass, 100);
    assert.equal(b.fixed, false);
    assert.equal(b.absorbCount, 0);
  });

  test('applyForce accelerates according to F = ma', () => {
    const b = new Body({ mass: 50, vx: 0, vy: 0 });
    b.applyForce({ x: 100, y: -50 });

    assert.equal(b.acc.x, 2); // 100 / 50 = 2
    assert.equal(b.acc.y, -1); // -50 / 50 = -1

    b.update(1);
    assert.equal(b.vel.x, 2);
    assert.equal(b.vel.y, -1);
    assert.equal(b.pos.x, 2);
    assert.equal(b.pos.y, -1);
    assert.equal(b.acc.x, 0); // acc should be reset after update
  });

  test('fixed anchor ignores forces and stays stationary', () => {
    const b = new Body({ mass: 1000, fixed: true, x: 50, y: 50 });
    b.applyForce({ x: 5000, y: 5000 });
    b.update(1);

    assert.equal(b.acc.x, 0);
    assert.equal(b.vel.x, 0);
    assert.equal(b.pos.x, 50);
    assert.equal(b.pos.y, 50);
  });

  test('trail array records every second step and enforces limit', () => {
    const b = new Body();
    for (let i = 0; i < 20; i++) {
      b.update(0.1, 5); // limit max trail to 5 points
    }

    assert.equal(b.trail.length, 5);
  });

  test('toJSON serializes required state attributes', () => {
    const b = new Body({
      id: 'ast-custom',
      name: 'TestPlanet',
      x: 10,
      y: 20,
      vx: 1.5,
      vy: -2.5,
      mass: 500,
      radius: 12,
      color: '#fbbf24',
      fixed: true,
      absorbCount: 3
    });

    const json = b.toJSON();
    assert.equal(json.id, 'ast-custom');
    assert.equal(json.name, 'TestPlanet');
    assert.equal(json.x, 10);
    assert.equal(json.y, 20);
    assert.equal(json.vx, 1.5);
    assert.equal(json.vy, -2.5);
    assert.equal(json.mass, 500);
    assert.equal(json.radius, 12);
    assert.equal(json.color, '#fbbf24');
    assert.equal(json.fixed, true);
    assert.equal(json.absorbCount, 3);
  });

  test('Special Relativity: speed asymptotically approaches c and strictly remains below c under extreme acceleration', () => {
    const c = 100;
    const b = new Body({ mass: 1, vx: 0, vy: 0 });

    // Apply massive force in x direction for 500 steps
    for (let i = 0; i < 500; i++) {
      b.applyForce({ x: 10000, y: 0 });
      b.update(1.0, 100, true, c);
      assert.ok(b.vel.x < c, `Speed ${b.vel.x} exceeded light speed ${c}`);
      assert.ok(b.vel.x > 0);
    }

    // Velocity should be extremely close to c but strictly < c
    assert.ok(b.vel.x > c * 0.999);
    assert.ok(b.vel.x < c);
  });

  test('Special Relativity: behaves identically to Newtonian update when speed is small (v << c)', () => {
    const c = 500;
    const bClassic = new Body({ mass: 10, vx: 2, vy: 1 });
    const bRel = new Body({ mass: 10, vx: 2, vy: 1 });

    bClassic.applyForce({ x: 5, y: -2 });
    bClassic.update(0.1, 100, false);

    bRel.applyForce({ x: 5, y: -2 });
    bRel.update(0.1, 100, true, c);

    // Difference between classical and relativistic should be < 1e-4 for v << c
    assert.ok(Math.abs(bClassic.vel.x - bRel.vel.x) < 1e-4);
    assert.ok(Math.abs(bClassic.vel.y - bRel.vel.y) < 1e-4);
  });

  test('Special Relativity: properTime accumulates slower for high-speed bodies (time dilation)', () => {
    const c = 100;
    // Body moving at v = 60 px/s (beta = 0.6)
    const bRel = new Body({ vx: 60, vy: 0 });
    const bClassic = new Body({ vx: 60, vy: 0 });

    const dt = 1.0;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      bRel.update(dt, 100, true, c);
      bClassic.update(dt, 100, false);
    }

    // Classical proper time accumulates 1.0 * 10 = 10.0
    assert.equal(bClassic.properTime, 10.0);

    // Relativistic proper time accumulates dt * sqrt(1 - 0.36) = dt * 0.8 = 8.0
    assert.ok(Math.abs(bRel.properTime - 8.0) < 1e-4);
    assert.ok(bRel.properTime < bClassic.properTime);

    // Serialized in toJSON
    assert.ok(Math.abs(bRel.toJSON().properTime - 8.0) < 1e-4);
  });

  test('General Relativity: stationary body in gravitational field experiences gravitational time dilation', () => {
    const c = 100;
    const cSq = c * c;
    const b = new Body({ vx: 0, vy: 0 });

    // 2*Phi / c^2 = 0.36 => sqrt(1 - 0.36) = 0.8
    b.gravPotential = 0.36 * cSq * 0.5;

    const dt = 1.0;
    b.update(dt, 100, true, c);

    assert.ok(Math.abs(b.properTime - 0.8) < 1e-4);
    assert.equal(b.lastGravPotential, 0.36 * cSq * 0.5);
    assert.equal(b.gravPotential, 0);
  });

  test('General Relativity: fixed anchor in gravitational field experiences time dilation', () => {
    const c = 100;
    const cSq = c * c;
    const fixedBody = new Body({ fixed: true, x: 10, y: 10 });

    // 2*Phi / c^2 = 0.5 => sqrt(0.5) ≈ 0.7071
    fixedBody.gravPotential = 0.5 * cSq * 0.5;

    const dt = 2.0;
    fixedBody.update(dt, 100, true, c);

    assert.ok(Math.abs(fixedBody.properTime - (2.0 * Math.sqrt(0.5))) < 1e-4);
    assert.equal(fixedBody.pos.x, 10);
    assert.equal(fixedBody.pos.y, 10);
  });

  test('General Relativity: time freezes inside or at event horizon (2*Phi / c^2 >= 1)', () => {
    const c = 100;
    const cSq = c * c;
    const b = new Body({ vx: 0, vy: 0 });

    // 2*Phi / c^2 = 1.2 >= 1
    b.gravPotential = 1.2 * cSq * 0.5;
    b.update(1.0, 100, true, c);

    assert.equal(b.properTime, 0.0);
  });
});
