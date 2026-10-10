import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vec2 } from '../../src/core/vec2.js';

describe('Vec2', () => {
  test('constructor and initialization', () => {
    const v1 = new Vec2();
    assert.equal(v1.x, 0);
    assert.equal(v1.y, 0);

    const v2 = new Vec2(3, -4);
    assert.equal(v2.x, 3);
    assert.equal(v2.y, -4);
  });

  test('set, add, sub chainable operations', () => {
    const v = new Vec2(1, 2);
    v.set(5, 10);
    assert.equal(v.x, 5);
    assert.equal(v.y, 10);

    v.add(new Vec2(2, 3));
    assert.equal(v.x, 7);
    assert.equal(v.y, 13);

    v.sub(new Vec2(4, 3));
    assert.equal(v.x, 3);
    assert.equal(v.y, 10);
  });

  test('mult and div operations', () => {
    const v = new Vec2(4, -6);
    v.mult(2);
    assert.equal(v.x, 8);
    assert.equal(v.y, -12);

    v.div(4);
    assert.equal(v.x, 2);
    assert.equal(v.y, -3);

    // div by zero should be no-op
    v.div(0);
    assert.equal(v.x, 2);
    assert.equal(v.y, -3);
  });

  test('magnitude and distance calculations', () => {
    const v = new Vec2(3, 4);
    assert.equal(v.magSq(), 25);
    assert.equal(v.mag(), 5);

    const a = new Vec2(0, 0);
    const b = new Vec2(6, 8);
    assert.equal(a.distSq(b), 100);
    assert.equal(a.dist(b), 10);
  });

  test('copy creates an independent instance', () => {
    const original = new Vec2(10, 20);
    const cloned = original.copy();

    assert.equal(cloned.x, 10);
    assert.equal(cloned.y, 20);

    cloned.x = 99;
    assert.equal(original.x, 10);
    assert.equal(cloned.x, 99);
  });
});
