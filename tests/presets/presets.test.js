import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadPreset } from '../../src/presets/index.js';
import { computeGravitationalForces } from '../../src/physics/forces.js';
import { handleCollisions } from '../../src/physics/collision.js';

describe('Preset Scenarios', () => {
  function createMockContext() {
    const mockCamera = {
      resetCalls: 0,
      reset() {
        this.resetCalls++;
      }
    };

    const mockState = {
      bodies: [],
      archivedBodies: [],
      camera: { x: 0, y: 0, zoom: 1 },
      G: 1.0,
      timeScale: 1.0,
      softening: 120,
      collisions: true,
      enableRelativity: false,
      enableGravitationalWaves: false,
      speedOfLight: 100,
      trailLength: 1000,
      showTrails: true,
      elapsedTime: 0
    };

    return { mockState, mockCamera };
  }

  test('protoplanetary_disk loads Proto-Sun and planetesimals with balanced momentum', () => {
    const { mockState, mockCamera } = createMockContext();

    loadPreset('protoplanetary_disk', mockState, mockCamera);

    assert.equal(mockCamera.resetCalls, 1);
    assert.equal(mockState.bodies.length, 96); // 1 Proto-Sun + 95 planetesimals

    const protoSun = mockState.bodies.find(b => b.name === 'Proto-Sun');
    assert.ok(protoSun, 'Proto-Sun must be created');
    assert.equal(protoSun.mass, 3600);
    assert.equal(protoSun.radius, 22);
    assert.equal(protoSun.color, '#fbbf24');
    assert.equal(protoSun.fixed, false);

    const planetesimals = mockState.bodies.filter(b => b.name !== 'Proto-Sun');
    assert.equal(planetesimals.length, 95);

    // Verify all planetesimals have positive mass, radius, and within disk bounds
    for (const p of planetesimals) {
      assert.ok(p.mass >= 0.8 && p.mass <= 2.6, `Planetesimal mass ${p.mass} within bounds`);
      assert.ok(p.radius >= 2.2, `Planetesimal radius ${p.radius} >= 2.2`);
      const dist = Math.hypot(p.pos.x, p.pos.y);
      assert.ok(dist >= 60 && dist <= 550, `Distance ${dist} within accretion disk bounds`);
    }

    // Verify total linear momentum is balanced (center of mass rest frame)
    let totalPx = 0;
    let totalPy = 0;
    for (const b of mockState.bodies) {
      totalPx += b.mass * b.vel.x;
      totalPy += b.mass * b.vel.y;
    }
    assert.ok(Math.abs(totalPx) < 1e-4, `Total Px ${totalPx} balanced to zero`);
    assert.ok(Math.abs(totalPy) < 1e-4, `Total Py ${totalPy} balanced to zero`);
  });

  test('protoplanetary_disk generates randomized procedural layouts across loads', () => {
    const ctx1 = createMockContext();
    const ctx2 = createMockContext();

    loadPreset('protoplanetary_disk', ctx1.mockState, ctx1.mockCamera);
    loadPreset('protoplanetary_disk', ctx2.mockState, ctx2.mockCamera);

    // Ensure positions of planetesimals differ due to procedural randomness
    const p1 = ctx1.mockState.bodies[1];
    const p2 = ctx2.mockState.bodies[1];

    const isDifferent = p1.pos.x !== p2.pos.x || p1.pos.y !== p2.pos.y || p1.mass !== p2.mass;
    assert.ok(isDifferent, 'Subsequent preset loads must have randomized procedural configurations');
  });

  test('protoplanetary_disk integrates and resolves mergers cleanly', () => {
    const { mockState, mockCamera } = createMockContext();

    loadPreset('protoplanetary_disk', mockState, mockCamera);
    const initialCount = mockState.bodies.length;

    // Simulate 200 physics integration sub-steps
    const dt = 0.2;
    for (let step = 0; step < 200; step++) {
      computeGravitationalForces(mockState.bodies, mockState.G, mockState.softening);
      for (const b of mockState.bodies) {
        b.update(dt, mockState.trailLength, false);
      }
      handleCollisions(mockState);
    }

    // Bodies must remain valid, finite numbers with no NaNs
    for (const b of mockState.bodies) {
      assert.ok(Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y));
      assert.ok(Number.isFinite(b.vel.x) && Number.isFinite(b.vel.y));
      assert.ok(Number.isFinite(b.mass) && b.mass > 0);
    }

    // System must conserve positive total mass
    const totalMass = mockState.bodies.reduce((sum, b) => sum + b.mass, 0);
    assert.ok(totalMass > 3600, 'Total mass must include Proto-Sun and disk');
    assert.ok(mockState.bodies.length <= initialCount, 'Mergers must reduce or maintain active body count');
  });
});
