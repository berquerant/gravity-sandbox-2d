import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Body } from '../../src/models/body.js';
import {
  getPrimaryStar,
  calculateHillSphereRadius,
  findParentBody,
  findCapturedBodies,
  calculateSchwarzschildRadius,
  isBlackHole,
  calculateLorentzFactor,
  calculateRelativisticMass,
  calculateTimeDilation,
  getSecondaryBody,
  computeCoRotatingSystem,
  getOrbitingPlanets,
  createDiskBodies
} from '../../src/physics/celestial.js';

describe('Celestial Mechanics', () => {
  describe('getPrimaryStar', () => {
    test('returns null for empty bodies list', () => {
      assert.equal(getPrimaryStar([]), null);
    });

    test('finds body with highest positive mass', () => {
      const sun = new Body({ name: 'Sun', mass: 10000 });
      const earth = new Body({ name: 'Earth', mass: 100 });
      const asteroid = new Body({ name: 'Asteroid', mass: 1 });

      const primary = getPrimaryStar([earth, sun, asteroid]);
      assert.equal(primary, sun);
    });
  });

  describe('calculateHillSphereRadius', () => {
    test('Hill sphere radius scales with orbital distance and cubic root of mass ratio', () => {
      const sun = new Body({ mass: 10000, x: 0, y: 0 });
      const earth = new Body({ mass: 100, x: 300, y: 0 });

      const rH = calculateHillSphereRadius(earth, sun, [sun, earth]);

      // rH = r * (m / (3 * M))^(1/3)
      // r = 300, m = 100, M = 10000
      // ratio = 100 / 30000 = 1 / 300 ~ 0.003333
      // cbrt(0.003333) ~ 0.14938
      // rH ~ 300 * 0.14938 ~ 44.81 px
      const expected = 300 * Math.cbrt(100 / 30000);
      assert.ok(Math.abs(rH - expected) < 0.01);
    });

    test('Hill sphere is zero for non-positive mass', () => {
      const sun = new Body({ mass: 10000 });
      const neg = new Body({ mass: -50, x: 100, y: 0 });
      assert.equal(calculateHillSphereRadius(neg, sun, [sun, neg]), 0);
    });
  });

  describe('Parent and satellite capture detection', () => {
    test('Identifies Earth as Moon parent when Moon is within Hill sphere with negative relative energy', () => {
      const G = 1.0;
      const sun = new Body({ name: 'Sun', mass: 10000, x: 0, y: 0, vx: 0, vy: 0 });
      const earth = new Body({ name: 'Earth', mass: 300, x: 500, y: 0, vx: 0, vy: 4.47 });
      // Moon placed 15 px from Earth (well within Earth's Hill sphere rH ~ 500 * cbrt(300/30000) ~ 500 * 0.1 = 50px)
      // and orbital speed around Earth: v = sqrt(G*M/r) = sqrt(1 * 300 / 15) = sqrt(20) ~ 4.47 + 4.472
      const moon = new Body({ name: 'Moon', mass: 1, x: 515, y: 0, vx: 0, vy: 4.47 + 4.472 });

      const bodies = [sun, earth, moon];

      const parentOfMoon = findParentBody(moon, sun, bodies, G);
      assert.equal(parentOfMoon, earth);

      const capturedByEarth = findCapturedBodies(earth, sun, bodies, G);
      assert.equal(capturedByEarth.length, 1);
      assert.equal(capturedByEarth[0].body, moon);
    });

    test('Identifies direct orbiting bodies for primary star while excluding sub-satellites', () => {
      const G = 1.0;
      const sun = new Body({ name: 'Sun', mass: 10000, x: 0, y: 0, vx: 0, vy: 0 });
      const earth = new Body({ name: 'Earth', mass: 300, x: 500, y: 0, vx: 0, vy: 4.47 });
      const moon = new Body({ name: 'Moon', mass: 1, x: 515, y: 0, vx: 0, vy: 4.47 + 4.472 });
      const mars = new Body({ name: 'Mars', mass: 100, x: 750, y: 0, vx: 0, vy: 3.65 });

      const bodies = [sun, earth, moon, mars];

      const capturedBySun = findCapturedBodies(sun, sun, bodies, G);
      assert.equal(capturedBySun.length, 2);
      assert.equal(capturedBySun[0].body, earth);
      assert.equal(capturedBySun[1].body, mars);
    });
  });

  describe('calculateSchwarzschildRadius and isBlackHole', () => {
    test('Calculates Schwarzschild radius rs = 2*G*M / c^2', () => {
      // M = 5000, G = 1, c = 100
      // rs = 2 * 1 * 5000 / 10000 = 1.0 px
      const rs1 = calculateSchwarzschildRadius(5000, 1.0, 100);
      assert.equal(rs1, 1.0);

      // M = 32000, G = 1, c = 80
      // rs = 2 * 1 * 32000 / 6400 = 10.0 px
      const rs2 = calculateSchwarzschildRadius(32000, 1.0, 80);
      assert.equal(rs2, 10.0);
    });

    test('Returns 0 for non-positive mass or speed of light', () => {
      assert.equal(calculateSchwarzschildRadius(0, 1.0, 100), 0);
      assert.equal(calculateSchwarzschildRadius(-100, 1.0, 100), 0);
      assert.equal(calculateSchwarzschildRadius(100, 1.0, 0), 0);
      assert.equal(calculateSchwarzschildRadius(100, 1.0, -50), 0);
    });

    test('Correctly identifies black holes based on physical radius versus rs', () => {
      // rs = 2 * 1 * 32000 / 6400 = 10.0 px
      const bh = new Body({ mass: 32000, radius: 10 });
      const normalStar = new Body({ mass: 32000, radius: 25 });
      const negMass = new Body({ mass: -100, radius: 5 });

      assert.equal(isBlackHole(bh, 1.0, 80), true);
      assert.equal(isBlackHole(normalStar, 1.0, 80), false);
      assert.equal(isBlackHole(negMass, 1.0, 80), false);
    });
  });

  describe('Relativistic Metrics & Time Dilation', () => {
    test('calculateLorentzFactor correctly calculates gamma = 1 / sqrt(1 - v^2/c^2)', () => {
      const c = 100;
      assert.equal(calculateLorentzFactor(0, c), 1.0);
      // v = 60, beta = 0.6, gamma = 1 / 0.8 = 1.25
      const gamma06 = calculateLorentzFactor(60, c);
      assert.ok(Math.abs(gamma06 - 1.25) < 1e-5);

      // v = 80, beta = 0.8, gamma = 1 / 0.6 = 1.6666667
      const gamma08 = calculateLorentzFactor(80, c);
      assert.ok(Math.abs(gamma08 - (1 / 0.6)) < 1e-5);

      // zero or negative light speed fallback
      assert.equal(calculateLorentzFactor(50, 0), 1.0);
      assert.equal(calculateLorentzFactor(50, -10), 1.0);
    });

    test('calculateRelativisticMass scales rest mass by gamma and preserves sign', () => {
      const c = 100;
      // positive mass
      const mRel = calculateRelativisticMass(100, 60, c);
      assert.ok(Math.abs(mRel - 125) < 1e-4);

      // negative mass (anti-gravity)
      const mNegRel = calculateRelativisticMass(-50, 60, c);
      assert.ok(Math.abs(mNegRel - (-62.5)) < 1e-4);

      // zero mass
      assert.equal(calculateRelativisticMass(0, 60, c), 0);
    });

    test('calculateTimeDilation combines kinematic and gravitational time dilation', () => {
      const c = 100;
      const G = 1.0;
      const M = 5000;
      // rs = 2 * G * M / c^2 = 2 * 1 * 5000 / 10000 = 1.0 px
      // v = 60 => beta = 0.6, kinematicDilation = sqrt(1 - 0.36) = 0.8
      // r = 2.0 px => gravDilation = sqrt(1 - 1.0 / 2.0) = sqrt(0.5) ~ 0.7071068
      const dilation = calculateTimeDilation(60, c, 2.0, M, G);

      assert.ok(Math.abs(dilation.beta - 0.6) < 1e-5);
      assert.ok(Math.abs(dilation.gamma - 1.25) < 1e-5);
      assert.ok(Math.abs(dilation.kinematicDilation - 0.8) < 1e-5);
      assert.ok(Math.abs(dilation.gravDilation - Math.sqrt(0.5)) < 1e-5);
      assert.ok(Math.abs(dilation.totalDilation - (0.8 * Math.sqrt(0.5))) < 1e-5);
    });

    test('calculateTimeDilation freezes time when inside or on event horizon (r <= rs)', () => {
      const c = 100;
      const G = 1.0;
      const M = 5000; // rs = 1.0 px
      const dilation = calculateTimeDilation(50, c, 0.9, M, G);

      assert.equal(dilation.gravDilation, 0.0);
      assert.equal(dilation.totalDilation, 0.0);
    });
  });

  describe('Co-rotating system & Lagrange points', () => {
    test('getSecondaryBody identifies the second most massive body', () => {
      const sun = new Body({ name: 'Sun', mass: 10000 });
      const jupiter = new Body({ name: 'Jupiter', mass: 300 });
      const earth = new Body({ name: 'Earth', mass: 10 });
      const asteroid = new Body({ name: 'Asteroid', mass: 0.1 });

      const secondary = getSecondaryBody([asteroid, earth, sun, jupiter], sun);
      assert.equal(secondary, jupiter);
    });

    test('computeCoRotatingSystem calculates barycenter, mu, and equilateral L4/L5 points', () => {
      const sun = new Body({ name: 'Sun', mass: 1000, x: 0, y: 0 });
      const jup = new Body({ name: 'Jupiter', mass: 100, x: 600, y: 0 });

      const coRot = computeCoRotatingSystem(sun, jup);
      assert.ok(coRot !== null);
      assert.equal(coRot.R, 600);
      // Barycenter X = (0 * 1000 + 600 * 100) / 1100 = 60000 / 1100 ~ 54.545
      assert.ok(Math.abs(coRot.baryX - 54.545) < 0.01);
      assert.equal(coRot.baryY, 0);

      // Verify L4 and L5 form equilateral triangles with Sun (0, 0) and Jupiter (600, 0)
      const l4 = coRot.lagrangePoints.find(p => p.name === 'L4');
      const l5 = coRot.lagrangePoints.find(p => p.name === 'L5');
      assert.ok(l4 && l5);

      // L4 at (300, 600 * sqrt(3)/2 ~ 519.615)
      assert.ok(Math.abs(l4.pos.x - 300) < 0.01);
      assert.ok(Math.abs(l4.pos.y - (600 * Math.sqrt(3) * 0.5)) < 0.01);

      // L5 at (300, -519.615)
      assert.ok(Math.abs(l5.pos.x - 300) < 0.01);
      assert.ok(Math.abs(l5.pos.y - (-600 * Math.sqrt(3) * 0.5)) < 0.01);
    });

    test('getOrbitingPlanets extracts direct planets, excludes sub-satellites, and sorts by radius', () => {
      const sun = new Body({ name: 'Sun', mass: 100000, x: 0, y: 0 });
      const earth = new Body({ name: 'Earth', mass: 100, x: 1000, y: 0 });
      const moon = new Body({ name: 'Moon', mass: 1, x: 1020, y: 0 }); // Inside Earth Hill sphere (rH ~ 69)
      const mars = new Body({ name: 'Mars', mass: 50, x: 1500, y: 0 });
      const tinyDust = new Body({ name: 'Dust', mass: 0.000001, x: 500, y: 0 });

      const bodies = [sun, earth, moon, mars, tinyDust];
      const planets = getOrbitingPlanets(bodies, sun, 1.0);

      assert.equal(planets.length, 2); // Earth and Mars (Moon is satellite, Dust filtered)
      assert.equal(planets[0].name, 'Earth');
      assert.equal(planets[1].name, 'Mars');
      assert.equal(planets[0].R, 1000);
      assert.equal(planets[1].R, 1500);

      // Verify CRTBP parameters
      assert.ok(planets[0].mu > 0);
      assert.ok(planets[0].omegaL4 < 1.5);
      assert.equal(planets[0].ux, 1);
      assert.equal(planets[0].uy, 0);
      assert.equal(planets[0].vx, 0);
      assert.equal(planets[0].vy, 1);
    });
  });

  describe('createDiskBodies', () => {
    test('creates requested number of bodies with assigned properties', () => {
      const bodies = createDiskBodies({
        center: { x: 100, y: 200 },
        radius: 150,
        count: 25,
        radiusJitterPct: 0,
        baseSpeed: 5,
        speedJitterPct: 0,
        direction: 'ccw',
        autoKeplerian: false,
        bodyMass: 2.5,
        bodyRadius: 4,
        bodyColor: '#38bdf8'
      });

      assert.equal(bodies.length, 25);
      for (const b of bodies) {
        assert.equal(b.mass, 2.5);
        assert.equal(b.radius, 4);
        assert.equal(b.color, '#38bdf8');
        const dist = Math.hypot(b.pos.x - 100, b.pos.y - 200);
        assert.ok(Math.abs(dist - 150) < 1e-4);
        const spd = Math.hypot(b.vel.x, b.vel.y);
        assert.ok(Math.abs(spd - 5) < 1e-4);
      }
    });

    test('respects radius jitter within configured bounds', () => {
      const bodies = createDiskBodies({
        center: { x: 0, y: 0 },
        radius: 200,
        count: 50,
        radiusJitterPct: 20, // +/-20% -> [160, 240]
        baseSpeed: 4,
        speedJitterPct: 0,
        direction: 'ccw',
        autoKeplerian: false
      });

      assert.equal(bodies.length, 50);
      for (const b of bodies) {
        const dist = Math.hypot(b.pos.x, b.pos.y);
        assert.ok(dist >= 159.9 && dist <= 240.1);
      }
    });

    test('reverses orbital velocity between CCW and CW', () => {
      const ccwBodies = createDiskBodies({
        center: { x: 0, y: 0 },
        radius: 100,
        count: 1,
        radiusJitterPct: 0,
        baseSpeed: 10,
        speedJitterPct: 0,
        direction: 'ccw',
        autoKeplerian: false
      });

      const cwBodies = createDiskBodies({
        center: { x: 0, y: 0 },
        radius: 100,
        count: 1,
        radiusJitterPct: 0,
        baseSpeed: 10,
        speedJitterPct: 0,
        direction: 'cw',
        autoKeplerian: false
      });

      assert.ok(Math.abs(ccwBodies[0].vel.x + cwBodies[0].vel.x) < 1e-4);
      assert.ok(Math.abs(ccwBodies[0].vel.y + cwBodies[0].vel.y) < 1e-4);
    });

    test('computes auto-Keplerian velocity around central star and inherits its velocity', () => {
      const star = new Body({
        name: 'Sun',
        mass: 10000,
        x: 50,
        y: -50,
        vx: 2,
        vy: -1
      });
      const G = 1.0;
      const R = 400;
      // Keplerian speed v = sqrt(G * M / R) = sqrt(1 * 10000 / 400) = sqrt(25) = 5.0
      const bodies = createDiskBodies({
        center: { x: 50, y: -50 },
        radius: R,
        count: 10,
        radiusJitterPct: 0,
        baseSpeed: 0,
        speedJitterPct: 0,
        direction: 'ccw',
        autoKeplerian: true,
        G,
        existingBodies: [star]
      });

      assert.equal(bodies.length, 10);
      for (const b of bodies) {
        const relVx = b.vel.x - star.vel.x;
        const relVy = b.vel.y - star.vel.y;
        const orbitalSpeed = Math.hypot(relVx, relVy);
        assert.ok(Math.abs(orbitalSpeed - 5.0) < 1e-4);
      }
    });
  });
});
