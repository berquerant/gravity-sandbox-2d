/**
 * Gravitational field heatmap and combined contour line (equipotential isoline) renderer.
 *
 * Supports two distinct physics modes:
 * 1. Inertial Frame (Combined Multi-Body Gravity):
 *    All celestial bodies' gravitational fields are superposed into a unified scalar field.
 *    Contours naturally form Roche lobes, saddle points at L1 Lagrange points,
 *    and shared outer equipotential envelopes enclosing multiple bodies.
 *
 * 2. Rotating Frame (L1-L5 Effective Potential / Roche Potential):
 *    Computes the dimensionless Circular Restricted Three-Body Problem (CRTBP) effective
 *    potential Omega(X, Y) combining gravitational attraction and co-rotating centrifugal force.
 *    In this mode, L4 and L5 appear as closed concentric equipotential islands (potential maxima),
 *    L1-L3 appear as saddle necks, and Trojan asteroid stability pockets are directly readable.
 *
 * Both overlays are drawn BEFORE bodies so they stay behind them visually.
 */

import { getPrimaryStar, getSecondaryBody, computeCoRotatingSystem, getOrbitingPlanets } from '../physics/celestial.js';

const GRID_COLS = 140;
const GRID_ROWS = 105;

// Dynamic range in decades (orders of magnitude) from system peak to zero-cutoff in inertial mode
const DYNAMIC_RANGE_DEC = 10.5;

// High-density contour levels across the [0, 1] normalized field scale (31 levels, ~2x field factor per step)
const CONTOUR_LEVELS = [
  0.05, 0.08, 0.11, 0.14, 0.17, 0.20, 0.23, 0.26, 0.29, 0.32,
  0.35, 0.38, 0.41, 0.44, 0.47, 0.50, 0.53, 0.56, 0.59, 0.62,
  0.65, 0.68, 0.71, 0.74, 0.77, 0.80, 0.83, 0.86, 0.89, 0.92, 0.95
];

// Reused vertex array for high-resolution sampling (GRID_COLS + 1) * (GRID_ROWS + 1)
let gridValues = null;

// Reused across frames to eliminate allocation overhead
let offscreenCanvas = null;
let offscreenCtx = null;
let imageData = null;

function ensureBuffers() {
  const numVerts = (GRID_COLS + 1) * (GRID_ROWS + 1);
  if (!gridValues || gridValues.length !== numVerts) {
    gridValues = new Float32Array(numVerts);
  }
  if (!offscreenCanvas || offscreenCanvas.width !== GRID_COLS) {
    if (typeof OffscreenCanvas !== 'undefined') {
      offscreenCanvas = new OffscreenCanvas(GRID_COLS, GRID_ROWS);
    } else if (typeof document !== 'undefined' && document.createElement) {
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = GRID_COLS;
      offscreenCanvas.height = GRID_ROWS;
    } else {
      return;
    }
    offscreenCtx = offscreenCanvas.getContext('2d');
    if (offscreenCtx) {
      imageData = offscreenCtx.createImageData(GRID_COLS, GRID_ROWS);
    }
  }
}

/**
 * Palette stops:
 * t = 0.00: Deep midnight indigo (subtle presence at outer periphery / L4-L5 peaks)
 * t = 0.12: Sapphire blue (clear visibility at outer planetary orbits and Roche necks)
 * t = 0.25: Electric cyan-blue
 * t = 0.40: Aqua cyan
 * t = 0.55: Emerald green
 * t = 0.70: Bright yellow
 * t = 0.85: Neon orange
 * t = 0.95: Crimson red
 * t = 1.00: White core
 */
const PALETTE_STOPS = [
  { t: 0.00, r:  15, g:  25, b:  95 },
  { t: 0.12, r:  30, g:  95, b: 255 },
  { t: 0.25, r:   0, g: 185, b: 255 },
  { t: 0.40, r:   0, g: 235, b: 195 },
  { t: 0.55, r:  50, g: 235, b:  85 },
  { t: 0.70, r: 245, g: 220, b:  25 },
  { t: 0.85, r: 255, g: 110, b:  20 },
  { t: 0.95, r: 255, g:  40, b:  60 },
  { t: 1.00, r: 255, g: 255, b: 255 }
];

/**
 * Write a heatmap RGBA pixel into the pixel array.
 */
function writePixel(pixels, idx, t) {
  if (t <= 0) {
    pixels[idx]     = 0;
    pixels[idx + 1] = 0;
    pixels[idx + 2] = 0;
    pixels[idx + 3] = 0;
    return;
  }

  const clamped = Math.min(1.0, t);
  let lower = PALETTE_STOPS[0];
  let upper = PALETTE_STOPS[PALETTE_STOPS.length - 1];

  for (let i = 0; i < PALETTE_STOPS.length - 1; i++) {
    if (clamped >= PALETTE_STOPS[i].t && clamped <= PALETTE_STOPS[i + 1].t) {
      lower = PALETTE_STOPS[i];
      upper = PALETTE_STOPS[i + 1];
      break;
    }
  }

  const span = upper.t - lower.t || 1;
  const f = (clamped - lower.t) / span;

  pixels[idx]     = Math.round(lower.r + (upper.r - lower.r) * f);
  pixels[idx + 1] = Math.round(lower.g + (upper.g - lower.g) * f);
  pixels[idx + 2] = Math.round(lower.b + (upper.b - lower.b) * f);

  const alpha = Math.min(0.65, 0.18 + clamped * 0.47);
  pixels[idx + 3] = Math.round(alpha * 255);
}

/**
 * Draw true combined contour isolines across the unified scalar field via high-resolution Marching Squares.
 */
function drawCombinedContours(ctx, W, H, isHeatmapActive) {
  const stepX = W / GRID_COLS;
  const stepY = H / GRID_ROWS;
  const stride = GRID_COLS + 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let k = 0; k < CONTOUR_LEVELS.length; k++) {
    const T = CONTOUR_LEVELS[k];
    const isMajor = (k % 5 === 0);

    ctx.beginPath();
    let hasPaths = false;

    for (let r = 0; r < GRID_ROWS; r++) {
      const rowOffset = r * stride;
      const nextRowOffset = (r + 1) * stride;
      const y0 = r * stepY;
      const y1 = (r + 1) * stepY;

      for (let c = 0; c < GRID_COLS; c++) {
        const v0 = gridValues[rowOffset + c];         // Top-Left
        const v1 = gridValues[rowOffset + c + 1];     // Top-Right
        const v2 = gridValues[nextRowOffset + c + 1]; // Bottom-Right
        const v3 = gridValues[nextRowOffset + c];     // Bottom-Left

        let cellCase = 0;
        if (v0 >= T) cellCase |= 1;
        if (v1 >= T) cellCase |= 2;
        if (v2 >= T) cellCase |= 4;
        if (v3 >= T) cellCase |= 8;

        if (cellCase === 0 || cellCase === 15) continue;

        const x0 = c * stepX;
        const x1 = (c + 1) * stepX;

        // Sub-cell linear interpolation for edge intersections
        const tTop = (T - v0) / (v1 - v0 || 1e-9);
        const ptTopX = x0 + tTop * stepX;
        const ptTopY = y0;

        const tRight = (T - v1) / (v2 - v1 || 1e-9);
        const ptRightX = x1;
        const ptRightY = y0 + tRight * stepY;

        const tBottom = (T - v3) / (v2 - v3 || 1e-9);
        const ptBottomX = x0 + tBottom * stepX;
        const ptBottomY = y1;

        const tLeft = (T - v0) / (v3 - v0 || 1e-9);
        const ptLeftX = x0;
        const ptLeftY = y0 + tLeft * stepY;

        switch (cellCase) {
          case 1:
          case 14:
            ctx.moveTo(ptLeftX, ptLeftY);
            ctx.lineTo(ptTopX, ptTopY);
            break;
          case 2:
          case 13:
            ctx.moveTo(ptTopX, ptTopY);
            ctx.lineTo(ptRightX, ptRightY);
            break;
          case 3:
          case 12:
            ctx.moveTo(ptLeftX, ptLeftY);
            ctx.lineTo(ptRightX, ptRightY);
            break;
          case 4:
          case 11:
            ctx.moveTo(ptRightX, ptRightY);
            ctx.lineTo(ptBottomX, ptBottomY);
            break;
          case 5: { // Saddle point at L1 / binary neck
            const vMid = (v0 + v1 + v2 + v3) * 0.25;
            if (vMid >= T) {
              ctx.moveTo(ptLeftX, ptLeftY);
              ctx.lineTo(ptBottomX, ptBottomY);
              ctx.moveTo(ptTopX, ptTopY);
              ctx.lineTo(ptRightX, ptRightY);
            } else {
              ctx.moveTo(ptLeftX, ptLeftY);
              ctx.lineTo(ptTopX, ptTopY);
              ctx.moveTo(ptRightX, ptRightY);
              ctx.lineTo(ptBottomX, ptBottomY);
            }
            break;
          }
          case 6:
          case 9:
            ctx.moveTo(ptTopX, ptTopY);
            ctx.lineTo(ptBottomX, ptBottomY);
            break;
          case 7:
          case 8:
            ctx.moveTo(ptLeftX, ptLeftY);
            ctx.lineTo(ptBottomX, ptBottomY);
            break;
          case 10: { // Saddle point at L1 / binary neck
            const vMid = (v0 + v1 + v2 + v3) * 0.25;
            if (vMid >= T) {
              ctx.moveTo(ptLeftX, ptLeftY);
              ctx.lineTo(ptTopX, ptTopY);
              ctx.moveTo(ptRightX, ptRightY);
              ctx.lineTo(ptBottomX, ptBottomY);
            } else {
              ctx.moveTo(ptLeftX, ptLeftY);
              ctx.lineTo(ptBottomX, ptBottomY);
              ctx.moveTo(ptTopX, ptTopY);
              ctx.lineTo(ptRightX, ptRightY);
            }
            break;
          }
        }
        hasPaths = true;
      }
    }

    if (hasPaths) {
      if (isHeatmapActive) {
        ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.48)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = isMajor ? 1.3 : 0.7;
      } else {
        ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.80)' : 'rgba(56, 189, 248, 0.30)';
        ctx.lineWidth = isMajor ? 1.3 : 0.7;
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw the gravitational field heatmap and/or combined contour isolines onto the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement}        canvas
 * @param {Camera}                   camera
 * @param {object}                   state
 */
export function drawGravityField(ctx, canvas, camera, state) {
  const showHeatmap = Boolean(state.showGravityField);
  const showContours = Boolean(state.showGravityContours);
  const isEffectivePotential = Boolean(state.effectivePotentialMode);

  if (!showHeatmap && !showContours) return;
  const bodies = state.bodies;
  if (!bodies || bodies.length === 0) return;

  ensureBuffers();

  const G = state.G;
  const W = canvas.width;
  const H = canvas.height;
  const stepX = W / GRID_COLS;
  const stepY = H / GRID_ROWS;
  const stride = GRID_COLS + 1;
  const soft = 100;

  // Check if co-rotating frame mode is active with valid primary and orbiting planets
  let planets = null;
  if (isEffectivePotential && bodies.length >= 2) {
    const primary = getPrimaryStar(bodies);
    if (primary) {
      planets = getOrbitingPlanets(bodies, primary, G);
    }
  }

  if (planets && planets.length > 0) {
    // -------------------------------------------------------------
    // MODE A: Generalized Multi-Body Co-Rotating Effective Potential
    // -------------------------------------------------------------
    const primary = getPrimaryStar(bodies);
    const primaryPosX = primary.pos.x;
    const primaryPosY = primary.pos.y;
    const isSingle = (planets.length === 1);

    for (let r = 0; r <= GRID_ROWS; r++) {
      const sy = r * stepY;
      const rowOffset = r * stride;
      for (let c = 0; c <= GRID_COLS; c++) {
        const sx = c * stepX;
        const { x: wx, y: wy } = camera.screenToWorld(sx, sy);

        const px = wx - primaryPosX;
        const py = wy - primaryPosY;
        const dist = Math.hypot(px, py) + 1e-4;
        const logDist = Math.log(dist);

        let t = 0;

        if (isSingle) {
          const p = planets[0];
          const X = (px * p.ux + py * p.uy) * p.invR;
          const Y = (px * p.vx + py * p.vy) * p.invR;
          const softDim = soft * (p.invR * p.invR);

          const r1 = Math.sqrt(X * X + Y * Y + softDim);
          const r2 = Math.sqrt((X - 1) * (X - 1) + Y * Y + softDim);
          const dBarySq = (X - p.mu) * (X - p.mu) + Y * Y;

          const omegaVal = (1 - p.mu) / r1 + p.mu / r2 + 0.5 * dBarySq;
          const deltaOmega = Math.max(0, omegaVal - p.omegaL4);
          t = Math.min(1.0, Math.sqrt(deltaOmega / 1.5));
        } else {
          let totalW = 0;
          let totalVal = 0;

          for (let i = 0; i < planets.length; i++) {
            const p = planets[i];
            const dLog = Math.abs(logDist - p.logR);
            const w = 1.0 / (dLog * dLog * dLog * dLog + 0.001);

            const X = (px * p.ux + py * p.uy) * p.invR;
            const Y = (px * p.vx + py * p.vy) * p.invR;
            const softDim = soft * (p.invR * p.invR);

            const r1 = Math.sqrt(X * X + Y * Y + softDim);
            const r2 = Math.sqrt((X - 1) * (X - 1) + Y * Y + softDim);
            const dBarySq = (X - p.mu) * (X - p.mu) + Y * Y;

            const omegaVal = (1 - p.mu) / r1 + p.mu / r2 + 0.5 * dBarySq;
            const deltaOmega = Math.max(0, omegaVal - p.omegaL4);
            const val = Math.min(1.0, Math.sqrt(deltaOmega / 1.5));

            totalW += w;
            totalVal += w * val;
          }

          t = totalVal / totalW;
        }

        gridValues[rowOffset + c] = t;
      }
    }
  } else {
    // -------------------------------------------------------------
    // MODE B: Inertial Combined Gravitational Field
    // -------------------------------------------------------------
    let gRefMax = 1e-4;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const rEff = Math.max(b.radius || 8, 10);
      const gBody = (G * Math.abs(b.mass)) / (rEff * rEff);
      if (gBody > gRefMax) gRefMax = gBody;
    }

    const logRefMax = Math.log10(gRefMax);
    const logRefMin = logRefMax - DYNAMIC_RANGE_DEC;

    // Filter significant mass contributors to maintain high FPS in heavy fields
    const significantBodies = [];
    const minMassThreshold = gRefMax * 1e-9;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (Math.abs(b.mass) >= minMassThreshold) {
        significantBodies.push(b);
      }
    }
    const activeBodies = significantBodies.length > 0 ? significantBodies : bodies;

    for (let r = 0; r <= GRID_ROWS; r++) {
      const sy = r * stepY;
      const rowOffset = r * stride;
      for (let c = 0; c <= GRID_COLS; c++) {
        const sx = c * stepX;
        const { x: wx, y: wy } = camera.screenToWorld(sx, sy);

        let strength = 0;
        for (let i = 0; i < activeBodies.length; i++) {
          const b = activeBodies[i];
          const dx = b.pos.x - wx;
          const dy = b.pos.y - wy;
          const r2 = dx * dx + dy * dy + soft;
          strength += (G * Math.abs(b.mass)) / r2;
        }

        let t = 0;
        if (strength > 0) {
          const logVal = Math.log10(strength);
          if (logVal > logRefMin) {
            t = (logVal - logRefMin) / DYNAMIC_RANGE_DEC;
          }
        }
        gridValues[rowOffset + c] = t;
      }
    }
  }

  // 1. Render Heatmap if enabled
  if (showHeatmap) {
    const pixels = imageData.data;
    let pIdx = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
      const rowOffset = r * stride;
      const nextRowOffset = (r + 1) * stride;
      for (let c = 0; c < GRID_COLS; c++) {
        const tCell = (
          gridValues[rowOffset + c] +
          gridValues[rowOffset + c + 1] +
          gridValues[nextRowOffset + c] +
          gridValues[nextRowOffset + c + 1]
        ) * 0.25;

        writePixel(pixels, pIdx, tCell);
        pIdx += 4;
      }
    }

    offscreenCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreenCanvas, 0, 0, W, H);
    ctx.restore();
  }

  // 2. Render Contours if enabled
  if (showContours) {
    drawCombinedContours(ctx, W, H, showHeatmap);
  }
}
