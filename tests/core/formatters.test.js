import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCCWAngleDeg,
  formatKm,
  formatKg,
  formatKmPerSec,
  formatSimTime,
  calculateRadiusFromMass,
  computeScaleBarMetrics,
  parseFlexibleNumber,
  escapeHtml,
  hexToRgba
} from '../../src/core/formatters.js';

describe('Formatters & Mathematical Helpers', () => {
  describe('computeCCWAngleDeg', () => {
    test('standard cartesian quadrant directions with inverted screen Y', () => {
      // Right (+x, vy=0) -> 0deg
      assert.equal(computeCCWAngleDeg(10, 0), 0);

      // Up (+x=0, -vy=up => vy < 0) -> 90deg
      assert.equal(computeCCWAngleDeg(0, -10), 90);

      // Left (-x, vy=0) -> 180deg
      assert.equal(computeCCWAngleDeg(-10, 0), 180);

      // Down (+x=0, vy > 0 => -vy=-10) -> 270deg
      assert.equal(computeCCWAngleDeg(0, 10), 270);

      // 45 degrees (Right & Up)
      const deg45 = computeCCWAngleDeg(10, -10);
      assert.equal(Math.round(deg45), 45);
    });
  });

  describe('formatKm', () => {
    test('AU conversion for astronomical distances', () => {
      const oneAU = 1.4959787e8;
      const res = formatKm(oneAU);
      assert.ok(res.includes('1.000 AU'));
    });

    test('Millions of km', () => {
      const res = formatKm(5.5e6);
      assert.ok(res.includes('5.500e+6 km'));
    });

    test('Thousands of km', () => {
      assert.equal(formatKm(1280), '1,280 km');
    });

    test('Small km', () => {
      assert.equal(formatKm(45.67), '45.7 km');
    });
  });

  describe('computeScaleBarMetrics', () => {
    test('standard default zoom (100% zoom, 100px line segment)', () => {
      const res = computeScaleBarMetrics(100, 1.0);
      assert.equal(res.screenPx, 100);
      assert.equal(res.worldPx, 100);
      assert.equal(res.label, '128,133 km');
      assert.equal(res.subLabel, '100 px');
    });

    test('solar system astronomical zoom (0.0016 zoom)', () => {
      const res = computeScaleBarMetrics(100, 0.0016);
      assert.equal(res.worldPx, 62500);
      assert.ok(res.label.includes('AU'));
      assert.equal(res.label, '0.535 AU');
      assert.ok(res.subLabel.includes('km'));
      assert.ok(res.subLabel.includes('px'));
    });

    test('deep space / galaxy scale zoom (0.00001 zoom)', () => {
      const res = computeScaleBarMetrics(100, 0.00001);
      assert.ok(res.label.includes('AU'));
      assert.equal(res.label, '85.7 AU');
      assert.ok(res.subLabel.includes('km'));
    });

    test('zoomed in scale (10x zoom)', () => {
      const res = computeScaleBarMetrics(100, 10.0);
      assert.equal(res.worldPx, 10);
      assert.equal(res.label, '12,813 km');
      assert.equal(res.subLabel, '10 px');
    });

    test('extreme close-up scale (< 1,000 km)', () => {
      const res = computeScaleBarMetrics(100, 200.0);
      assert.equal(res.worldPx, 0.5);
      assert.equal(res.label, '640.7 km');
      assert.equal(res.subLabel, '0.5 px');
    });

    test('gracefully handles non-positive or invalid zoom fallback', () => {
      const resZero = computeScaleBarMetrics(100, 0);
      assert.equal(resZero.worldPx, 100);
      assert.equal(resZero.label, '128,133 km');

      const resNaN = computeScaleBarMetrics(100, NaN);
      assert.equal(resNaN.worldPx, 100);

      const resNull = computeScaleBarMetrics(100, null);
      assert.equal(resNull.worldPx, 100);
    });
  });

  describe('formatSimTime', () => {
    test('seconds', () => {
      assert.equal(formatSimTime(42.5), '42.5s');
    });

    test('minutes and seconds', () => {
      assert.equal(formatSimTime(125), '2m 5s');
    });

    test('days', () => {
      assert.ok(formatSimTime(86400 * 3.5).includes('3.5d'));
    });

    test('years', () => {
      assert.ok(formatSimTime(86400 * 365.25 * 2).includes('2.00y'));
    });
  });

  describe('calculateRadiusFromMass', () => {
    test('clamps between 3 and 60 px and scales by cubic root of mass', () => {
      assert.equal(calculateRadiusFromMass(1), 3); // min clamp
      assert.equal(calculateRadiusFromMass(-1), 3); // handles negative mass
      assert.equal(calculateRadiusFromMass(1000), 25); // cbrt(1000) * 2.5 = 10 * 2.5 = 25
      assert.equal(calculateRadiusFromMass(1000000), 60); // max clamp
    });
  });

  describe('formatKg and formatKmPerSec', () => {
    test('formatKg uses exponential notation', () => {
      assert.equal(formatKg(5.972e24), '5.972e+24 kg');
    });

    test('formatKmPerSec formats to 2 decimal places', () => {
      assert.equal(formatKmPerSec(29.7834), '29.78 km/s');
    });
  });

  describe('parseFlexibleNumber', () => {
    test('returns plain float as-is', () => {
      assert.equal(parseFlexibleNumber(3.14), 3.14);
      assert.equal(parseFlexibleNumber('3.14'), 3.14);
      assert.equal(parseFlexibleNumber('-0.001'), -0.001);
    });

    test('parses standard e-notation', () => {
      assert.equal(parseFlexibleNumber('5.972e24'), 5.972e24);
      assert.equal(parseFlexibleNumber('5.972e+24'), 5.972e24);
      assert.equal(parseFlexibleNumber('1e-3'), 1e-3);
      assert.equal(parseFlexibleNumber('-1.2e6'), -1.2e6);
    });

    test('parses x10^ power product notation', () => {
      assert.equal(parseFlexibleNumber('5.972 x 10^24'), 5.972e24);
      assert.equal(parseFlexibleNumber('5.972*10^24'), 5.972e24);
      assert.equal(parseFlexibleNumber('10^6'), 1e6);
      assert.equal(parseFlexibleNumber('-3 x 10^5'), -3e5);
    });

    test('strips trailing unit strings', () => {
      const val = parseFlexibleNumber('5.972e24 kg');
      assert.ok(Math.abs(val - 5.972e24) < 1e15);
    });

    test('ignores formatting commas', () => {
      assert.equal(parseFlexibleNumber('1,000,000'), 1000000);
    });

    test('returns null for invalid input', () => {
      assert.equal(parseFlexibleNumber('abc'), null);
      assert.equal(parseFlexibleNumber(''), null);
      assert.equal(parseFlexibleNumber(null), null);
      assert.equal(parseFlexibleNumber(undefined), null);
      assert.equal(parseFlexibleNumber(Infinity), null);
      assert.equal(parseFlexibleNumber(NaN), null);
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      const input = '<script>alert("XSS" & \'test\')</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot; &amp; &#39;test&#39;)&lt;/script&gt;';
      assert.equal(escapeHtml(input), expected);
    });

    test('handles null, undefined, or numbers safely', () => {
      assert.equal(escapeHtml(null), '');
      assert.equal(escapeHtml(undefined), '');
      assert.equal(escapeHtml(123), '123');
      assert.equal(escapeHtml('Clean text'), 'Clean text');
    });
  });

  describe('hexToRgba', () => {
    test('converts 6-digit hex colors to rgba', () => {
      assert.equal(hexToRgba('#38bdf8', 0.5), 'rgba(56, 189, 248, 0.5)');
      assert.equal(hexToRgba('#000000', 1.0), 'rgba(0, 0, 0, 1)');
      assert.equal(hexToRgba('#ffffff', 0), 'rgba(255, 255, 255, 0)');
    });

    test('converts 3-digit shorthand hex colors to rgba correctly', () => {
      assert.equal(hexToRgba('#fff', 0.8), 'rgba(255, 255, 255, 0.8)');
      assert.equal(hexToRgba('#f00', 1), 'rgba(255, 0, 0, 1)');
      assert.equal(hexToRgba('#0f0', 0.2), 'rgba(0, 255, 0, 0.2)');
    });

    test('passes through non-hex colors or fallbacks safely', () => {
      assert.equal(hexToRgba('rgb(10, 20, 30)', 0.5), 'rgb(10, 20, 30)');
      assert.equal(hexToRgba(null, 0.5), 'rgba(255, 255, 255, 0.5)');
    });
  });
});

