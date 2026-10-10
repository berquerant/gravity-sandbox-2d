import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { exportStateToJson, importStateFromJson } from '../../src/storage/index.js';
import { Body } from '../../src/models/body.js';

describe('Storage and State Serialization', () => {
  test('exportStateToJson produces valid JSON with bodies and settings', () => {
    const b1 = new Body({ id: 'sun', name: 'Sun', x: 0, y: 0, vx: 0, vy: 0, mass: 1000, radius: 20 });
    const state = {
      G: 1.5,
      collisions: true,
      enableRelativity: true,
      speedOfLight: 120,
      enableGravitationalWaves: true,
      timeScale: 2.0,
      trailLength: 50,
      showHillSphere: true,
      showDistanceLines: false,
      showBodyNames: true,
      bodies: [b1]
    };

    const json = exportStateToJson(state);
    const parsed = JSON.parse(json);

    assert.equal(parsed.version, '1.5');
    assert.equal(parsed.settings.G, 1.5);
    assert.equal(parsed.bodies.length, 1);
    assert.equal(parsed.bodies[0].name, 'Sun');
  });

  test('importStateFromJson sanitizes corrupted or NaN values gracefully', () => {
    const corruptedJson = JSON.stringify({
      version: '1.5',
      settings: {
        G: 'invalid', // should be ignored
        collisions: true,
        speedOfLight: -50 // non-positive, should be ignored
      },
      bodies: [
        { name: 'Corrupt1', x: 'invalid', y: null, mass: NaN, vx: undefined },
        null,
        { name: 'Valid1', x: 100, y: 200, mass: 50, radius: 10 }
      ]
    });

    const state = {
      G: 1.0,
      collisions: false,
      speedOfLight: 100,
      bodies: []
    };

    const success = importStateFromJson(corruptedJson, state);
    assert.equal(success, true);
    assert.equal(state.bodies.length, 2);

    const b0 = state.bodies[0];
    assert.equal(b0.name, 'Corrupt1');
    assert.equal(b0.pos.x, 0); // fallback to 0
    assert.equal(b0.pos.y, 0);
    assert.equal(b0.mass, 100); // fallback to 100

    const b1 = state.bodies[1];
    assert.equal(b1.name, 'Valid1');
    assert.equal(b1.pos.x, 100);
    assert.equal(b1.mass, 50);

    // Settings
    assert.equal(state.G, 1.0); // was invalid string, kept original
    assert.equal(state.collisions, true); // boolean updated
    assert.equal(state.speedOfLight, 100); // was negative, kept original
  });
});
