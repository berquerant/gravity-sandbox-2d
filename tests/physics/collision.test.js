import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Body } from '../../src/models/body.js';
import { handleCollisions } from '../../src/physics/collision.js';
import { isBlackHole } from '../../src/physics/celestial.js';

describe('Collisions and Annihilation', () => {
  test('Completely inelastic collision preserves linear momentum', () => {
    // b1: mass 200, vel (2, 0) -> momentum = 400
    // b2: mass 100, vel (-1, 0) -> momentum = -100
    // Total mass = 300, expected velocity = (400 - 100) / 300 = 1.0
    const b1 = new Body({ id: 'b1', name: 'Dom', x: 0, y: 0, vx: 2, vy: 0, mass: 200, radius: 10 });
    const b2 = new Body({ id: 'b2', name: 'Abs', x: 5, y: 0, vx: -1, vy: 0, mass: 100, radius: 8 });

    const mockState = {
      collisions: true,
      bodies: [b1, b2],
      archivedBodies: [],
      elapsedTime: 10
    };

    handleCollisions(mockState);

    // One body remains (dominant absorbed the other)
    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.equal(survivor.id, 'b1');
    assert.equal(survivor.mass, 300);
    assert.equal(survivor.absorbCount, 1);
    assert.ok(Math.abs(survivor.vel.x - 1.0) < 0.001);
    assert.equal(survivor.vel.y, 0);

    // The absorbed body was archived
    assert.equal(mockState.archivedBodies.length, 1);
    assert.equal(mockState.archivedBodies[0].id, 'b2');
    assert.equal(mockState.archivedBodies[0].isAlive, false);
  });

  test('Equal positive and negative mass collision results in total mutual annihilation', () => {
    // b1: mass 150
    // b2: mass -150
    // total mass = 0 -> Annihilation
    const b1 = new Body({ id: 'pos', name: 'Pos', x: 0, y: 0, mass: 150, radius: 10 });
    const b2 = new Body({ id: 'neg', name: 'Neg', x: 5, y: 0, mass: -150, radius: 10 });

    const mockState = {
      collisions: true,
      bodies: [b1, b2],
      archivedBodies: [],
      elapsedTime: 5
    };

    handleCollisions(mockState);

    // Both bodies should be removed from active bodies
    assert.equal(mockState.bodies.length, 0);
    // Both should be archived with death reason
    assert.equal(mockState.archivedBodies.length, 2);
    assert.ok(mockState.archivedBodies.some(b => b.id === 'pos'));
    assert.ok(mockState.archivedBodies.some(b => b.id === 'neg'));
  });

  test('No collision when distance exceeds touch radius', () => {
    const b1 = new Body({ x: 0, y: 0, radius: 5 });
    const b2 = new Body({ x: 100, y: 100, radius: 5 });

    const mockState = {
      collisions: true,
      bodies: [b1, b2],
      archivedBodies: [],
      elapsedTime: 0
    };

    handleCollisions(mockState);
    assert.equal(mockState.bodies.length, 2);
    assert.equal(mockState.archivedBodies.length, 0);
  });

  test('Relativistic Event Horizon captures bodies crossing Schwarzschild radius', () => {
    // Black hole: mass 32000, c = 80, G = 1 -> rs = 2*1*32000 / 6400 = 10 px
    // Probe: mass 100, radius 2
    // Probe placed at x = 11 px (within rs + r_probe = 12 px)
    const bh = new Body({ id: 'bh', name: 'BlackHole', x: 0, y: 0, vx: 0, vy: 0, mass: 32000, radius: 10 });
    const probe = new Body({ id: 'probe', name: 'Probe', x: 11, y: 0, vx: 5, vy: 0, mass: 100, radius: 2 });

    const mockState = {
      collisions: true,
      enableRelativity: true,
      speedOfLight: 80,
      G: 1.0,
      bodies: [bh, probe],
      archivedBodies: [],
      elapsedTime: 10
    };

    handleCollisions(mockState);

    // Probe captured into black hole
    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.equal(survivor.id, 'bh');
    assert.equal(survivor.mass, 32100);
    assert.equal(survivor.absorbCount, 1);

    // Schwarzschild radius expands linearly with additional mass (2 * 1 * 32100 / 6400 = 10.03125)
    assert.ok(Math.abs(survivor.radius - 10.03125) < 1e-4);

    // Probe archived with event horizon capture note
    assert.equal(mockState.archivedBodies.length, 1);
    assert.equal(mockState.archivedBodies[0].id, 'probe');
    assert.ok(mockState.archivedBodies[0].deathReason.includes('event horizon'));
  });

  test('Black hole swallows larger mass normal star and retains black hole identity', () => {
    // Star: mass 5000, radius 25
    // Black hole: mass 2000, radius 4.44 (c = 30, G = 1 -> rs = 2 * 2000 / 900 = 4.444)
    const star = new Body({ id: 'star', name: 'Giant Star', x: 0, y: 0, mass: 5000, radius: 25 });
    const bh = new Body({ id: 'bh', name: 'Singularity', x: 10, y: 0, mass: 2000, radius: 4.4 });

    const mockState = {
      collisions: true,
      enableRelativity: true,
      speedOfLight: 30,
      G: 1.0,
      bodies: [star, bh],
      archivedBodies: [],
      elapsedTime: 15
    };

    handleCollisions(mockState);

    // Black hole must survive and swallow the giant star even though star mass > bh mass
    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.equal(survivor.id, 'bh');
    assert.equal(survivor.mass, 7000);

    // New Schwarzschild radius: 2 * 1 * 7000 / 900 = 15.5555...
    const expectedRs = (2 * 1 * 7000) / 900;
    assert.ok(Math.abs(survivor.radius - expectedRs) < 1e-4);
    assert.equal(isBlackHole(survivor, mockState.G, mockState.speedOfLight), true);

    // Star is archived
    assert.equal(mockState.archivedBodies.length, 1);
    assert.equal(mockState.archivedBodies[0].id, 'star');
    assert.ok(mockState.archivedBodies[0].deathReason.includes('event horizon'));
  });

  test('Binary black hole merger obeys linear Schwarzschild radius addition', () => {
    // Two equal mass black holes: M1 = 4500, M2 = 4500 (c = 30, G = 1 -> rs = 2 * 4500 / 900 = 10)
    const bh1 = new Body({ id: 'bh1', name: 'BH 1', x: -5, y: 0, mass: 4500, radius: 10 });
    const bh2 = new Body({ id: 'bh2', name: 'BH 2', x: 5, y: 0, mass: 4500, radius: 10 });

    const mockState = {
      collisions: true,
      enableRelativity: true,
      speedOfLight: 30,
      G: 1.0,
      bodies: [bh1, bh2],
      archivedBodies: [],
      elapsedTime: 20
    };

    handleCollisions(mockState);

    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.equal(survivor.mass, 9000);

    // New rs = 2 * 9000 / 900 = 20 (exact linear addition 10 + 10)
    assert.equal(survivor.radius, 20);
    assert.equal(isBlackHole(survivor, mockState.G, mockState.speedOfLight), true);
  });

  test('Dense stars colliding collapse into a black hole when Schwarzschild radius exceeds volume radius', () => {
    // Two compact stars: mass 2000 each, radius 6 each (c = 30, G = 1 -> individual rs = 4.444 < 6, so neither is a black hole)
    // Combined volume radius = cbrt(6^3 + 6^3) = cbrt(432) ~= 7.5595
    // Total mass = 4000 -> combined rs = 2 * 4000 / 900 = 8.8888 > 7.5595 (exceeds volume radius -> collapse!)
    const s1 = new Body({ id: 's1', name: 'Dense Star 1', x: 0, y: 0, mass: 2000, radius: 6, color: '#f59e0b' });
    const s2 = new Body({ id: 's2', name: 'Dense Star 2', x: 5, y: 0, mass: 2000, radius: 6, color: '#f59e0b' });

    const mockState = {
      collisions: true,
      enableRelativity: true,
      speedOfLight: 30,
      G: 1.0,
      bodies: [s1, s2],
      archivedBodies: [],
      elapsedTime: 25
    };

    handleCollisions(mockState);

    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.equal(survivor.mass, 4000);

    const expectedRs = (2 * 1 * 4000) / 900;
    assert.ok(Math.abs(survivor.radius - expectedRs) < 1e-4);
    assert.equal(survivor.color, '#020617');
    assert.equal(isBlackHole(survivor, mockState.G, mockState.speedOfLight), true);
  });

  test('Near-zero mass difference collision clamps runaway velocity', () => {
    // b1: mass 100.005, vel (10, 0) -> momentum ~ 1000
    // b2: mass -100.0, vel (0, 0)
    // total mass = 0.005 (> 0.001 threshold)
    // without clamping, velocity would explode to 1000 / 0.005 = 200,000 px/s
    const b1 = new Body({ id: 'b1', name: 'Pos', x: 0, y: 0, vx: 10, vy: 0, mass: 100.005, radius: 8 });
    const b2 = new Body({ id: 'b2', name: 'Neg', x: 2, y: 0, vx: 0, vy: 0, mass: -100.0, radius: 8 });

    const mockState = {
      collisions: true,
      enableRelativity: true,
      speedOfLight: 150,
      G: 1.0,
      bodies: [b1, b2],
      archivedBodies: [],
      elapsedTime: 10
    };

    handleCollisions(mockState);

    assert.equal(mockState.bodies.length, 1);
    const survivor = mockState.bodies[0];
    assert.ok(survivor.vel.mag() < mockState.speedOfLight);
    assert.ok(survivor.vel.mag() <= mockState.speedOfLight * 0.9999 + 1e-6);
  });

  test('Closes inspector and clears selectedBodyId if selected body is destroyed', async () => {
    const { eventBus } = await import('../../src/core/event-bus.js');
    const b1 = new Body({ id: 'dom', name: 'Dom', x: 0, y: 0, mass: 500, radius: 15 });
    const b2 = new Body({ id: 'victim', name: 'Victim', x: 2, y: 0, mass: 50, radius: 5 });

    let inspectorClosed = false;
    eventBus.on('inspector:close', () => { inspectorClosed = true; });

    const mockState = {
      collisions: true,
      bodies: [b1, b2],
      archivedBodies: [],
      elapsedTime: 10,
      selectedBodyId: 'victim'
    };

    handleCollisions(mockState);

    assert.equal(mockState.bodies.length, 1);
    assert.equal(mockState.selectedBodyId, null);
    assert.equal(inspectorClosed, true);
  });
});
