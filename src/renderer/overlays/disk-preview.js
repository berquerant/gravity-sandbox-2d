import { formatKm, formatKmPerSec } from '../../core/formatters.js';
import { KMS_PER_PXS, KM_PER_PX } from '../../core/constants.js';

/**
 * Detects whether cursor is hovering over or dragging from a central host star for disk placement.
 * @param {Object} state - Global state store
 * @param {Object} camera - Viewport camera coordinator
 * @param {{x: number, y: number}} mouseScreen - Mouse pointer coordinates in screen space
 * @param {boolean} isDragging - Whether dragging is actively underway
 * @param {number} zoom - Viewport zoom factor
 * @returns {Object|null} Target star body or null
 */
export function findDiskTargetStar(state, camera, mouseScreen, isDragging, zoom) {
  if (isDragging) {
    return state.bodies.find(b =>
      b.mass > 0 && Math.hypot(b.pos.x - state.dragStartWorld.x, b.pos.y - state.dragStartWorld.y) < Math.max(15, b.radius + 5)
    ) || null;
  }
  let minStarDist = Infinity;
  let targetStar = null;
  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (b.mass <= 0) continue;
    const bScreen = camera.worldToScreen(b.pos.x, b.pos.y);
    const d = Math.hypot(mouseScreen.x - bScreen.x, mouseScreen.y - bScreen.y);
    const hitRadius = Math.max(22, b.radius * zoom + 12);
    if (d <= hitRadius && d < minStarDist) {
      minStarDist = d;
      targetStar = b;
    }
  }
  return targetStar;
}

/**
 * Renders the semi-transparent annular torus shading and dashed radial boundaries.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {{x: number, y: number}} centerScreen - Center coordinates in screen space
 * @param {number} rMin - Inner radius in screen pixels
 * @param {number} rMax - Outer radius in screen pixels
 * @param {boolean} isDragging - Dragging state
 * @param {Object|null} targetStar - Snapped target star body
 */
export function drawTorusShadingAndBorders(ctx, centerScreen, rMin, rMax, isDragging, targetStar) {
  const baseColor = targetStar ? '34, 211, 238' : '56, 189, 248';
  if (Number.isFinite(rMin) && Number.isFinite(rMax) && rMax > rMin && rMin > 0) {
    const grad = ctx.createRadialGradient(
      centerScreen.x, centerScreen.y, rMin,
      centerScreen.x, centerScreen.y, rMax
    );
    const peakAlpha = isDragging ? 0.22 : 0.15;
    grad.addColorStop(0, `rgba(${baseColor}, 0.02)`);
    grad.addColorStop(0.5, `rgba(${baseColor}, ${peakAlpha})`);
    grad.addColorStop(1, `rgba(${baseColor}, 0.02)`);

    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, rMax, 0, Math.PI * 2, false);
    ctx.arc(centerScreen.x, centerScreen.y, rMin, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(${baseColor}, 0.35)`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);

  ctx.beginPath();
  ctx.arc(centerScreen.x, centerScreen.y, rMin, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerScreen.x, centerScreen.y, rMax, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Renders the circular orbit guide line, origin crosshair/star highlight, and drag radius vector.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {{x: number, y: number}} centerScreen - Center in screen coordinates
 * @param {{x: number, y: number}} mouseScreen - Mouse in screen coordinates
 * @param {number} screenR - Nominal orbit radius in screen pixels
 * @param {boolean} isDragging - Dragging state
 * @param {Object|null} targetStar - Target star body
 * @param {number} dragDist - Drag distance in pixels
 * @param {number} zoom - Viewport zoom factor
 */
export function drawDiskCenterAndGuides(ctx, centerScreen, mouseScreen, screenR, isDragging, targetStar, dragDist, zoom) {
  // Base orbit center path
  ctx.strokeStyle = targetStar ? '#22d3ee' : '#38bdf8';
  ctx.lineWidth = isDragging ? 1.8 : 1.4;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(centerScreen.x, centerScreen.y, screenR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center marker or star snap highlight
  if (targetStar) {
    const starR = Math.max(12, targetStar.radius * zoom + 5);
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, starR, 0, Math.PI * 2);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerScreen.x - 7, centerScreen.y);
    ctx.lineTo(centerScreen.x + 7, centerScreen.y);
    ctx.moveTo(centerScreen.x, centerScreen.y - 7);
    ctx.lineTo(centerScreen.x, centerScreen.y + 7);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Connecting drag line if actively dragging
  if (dragDist > 15) {
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, centerScreen.y);
    ctx.lineTo(mouseScreen.x, mouseScreen.y);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * Renders tangential orbital directional arrows around the disk preview ring.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {{x: number, y: number}} centerScreen - Center in screen space
 * @param {number} screenR - Nominal orbit radius in screen pixels
 * @param {boolean} isCW - Whether direction is clockwise
 * @param {string} color - Hex/RGB arrow color
 */
export function drawDiskDirectionArrows(ctx, centerScreen, screenR, isCW, color) {
  const numArrows = 8;
  const arrowLen = 6;
  ctx.fillStyle = color;
  for (let i = 0; i < numArrows; i++) {
    const theta = (i / numArrows) * Math.PI * 2;
    const ax = centerScreen.x + screenR * Math.cos(theta);
    const ay = centerScreen.y + screenR * Math.sin(theta);
    const phi = isCW ? (theta - Math.PI / 2) : (theta + Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - arrowLen * Math.cos(phi - Math.PI / 6),
      ay - arrowLen * Math.sin(phi - Math.PI / 6)
    );
    ctx.lineTo(
      ax - arrowLen * Math.cos(phi + Math.PI / 6),
      ay - arrowLen * Math.sin(phi + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Renders floating badge displaying real-time disk parameters (body count, radius, jitter, speed).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {{x: number, y: number}} mouseScreen - Mouse screen position
 * @param {string} labelText - Formatted metric string
 * @param {Object|null} targetStar - Snapped target star body
 */
export function drawDiskMetricPill(ctx, mouseScreen, labelText, targetStar) {
  ctx.font = '11px "JetBrains Mono", monospace';
  const textWidth = ctx.measureText(labelText).width;
  const pillX = mouseScreen.x + 14;
  const pillY = mouseScreen.y - 12;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = targetStar ? 'rgba(34, 211, 238, 0.6)' : 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillX - 5, pillY - 12, textWidth + 10, 18, 4);
  } else {
    ctx.rect(pillX - 5, pillY - 12, textWidth + 10, 18);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = targetStar ? '#22d3ee' : '#38bdf8';
  ctx.fillText(labelText, pillX, pillY);
}

/**
 * Calculates disk origin coordinates and effective orbital radius from hover/drag interaction.
 * @param {Object} state - Global state store
 * @param {Object|null} targetStar - Snapped target star body
 * @param {boolean} isDragging - Dragging state
 * @returns {{centerWorld: {x: number, y: number}, radius: number, dragDist: number}|null}
 */
export function computeDiskCenterAndRadius(state, targetStar, isDragging) {
  const centerWorld = isDragging
    ? state.dragStartWorld
    : (targetStar ? { x: targetStar.pos.x, y: targetStar.pos.y } : state.currentMouseWorld);
  if (!centerWorld || !Number.isFinite(centerWorld.x) || !Number.isFinite(centerWorld.y)) {
    return null;
  }

  let radius = Number(state.diskPlacement?.baseRadius) || 200;
  if (radius < 5) radius = 5;
  let dragDist = 0;
  if (isDragging && state.dragStartWorld && state.currentMouseWorld) {
    dragDist = Math.hypot(
      state.currentMouseWorld.x - state.dragStartWorld.x,
      state.currentMouseWorld.y - state.dragStartWorld.y
    );
    if (dragDist > 15) {
      radius = dragDist;
    }
  }
  return { centerWorld, radius, dragDist };
}

/**
 * Formats user-readable summary text for disk preview pill.
 * @param {Object} state - Global state store
 * @param {number} radius - Orbit radius in pixels
 * @param {Object|null} targetStar - Snapped target star body
 * @param {number} jitter - Jitter ratio
 * @param {boolean} isCW - Whether direction is clockwise
 * @returns {string} Formatted summary text
 */
export function computeDiskMetricsAndLabel(state, radius, targetStar, jitter, isCW) {
  const count = state.diskPlacement?.count || 40;
  const dirLabel = isCW ? 'CW' : 'CCW';
  let speedText = '';
  if (state.diskPlacement?.autoKeplerian && targetStar && targetStar.mass > 0) {
    const vK = Math.sqrt((state.G * targetStar.mass) / radius) * KMS_PER_PXS;
    speedText = `Keplerian (${formatKmPerSec(vK)})`;
  } else {
    const spdKms = (state.diskPlacement?.baseSpeed || 0) * KMS_PER_PXS;
    speedText = formatKmPerSec(spdKms);
  }

  const targetPrefix = targetStar ? `[${targetStar.name}] ` : '';
  const jitterStr = jitter > 0 ? ` (+/-${state.diskPlacement?.radiusJitterPct}%)` : '';
  return `${targetPrefix}Torus: ${count} bodies | R: ${formatKm(radius * KM_PER_PX)}${jitterStr} | ${dirLabel} | ${speedText}`;
}

/**
 * Renders real-time protoplanetary accretion disk placement preview (torus volume, direction arrows, and metrics).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 */
export function drawDiskPlacementPreview(ctx, camera, state) {
  if (!state.currentMouseWorld) return;

  const isDragging = Boolean(state.dragStartWorld);
  const zoom = Number.isFinite(state.camera?.zoom) && state.camera.zoom > 0 ? state.camera.zoom : 1.0;
  const mouseScreen = camera.worldToScreen(state.currentMouseWorld.x, state.currentMouseWorld.y);

  // 1. Target star detection (under dragStart or under hovering cursor)
  const targetStar = findDiskTargetStar(state, camera, mouseScreen, isDragging, zoom);

  // 2. Center and effective radius
  const diskGeo = computeDiskCenterAndRadius(state, targetStar, isDragging);
  if (!diskGeo) return;
  const { centerWorld, radius, dragDist } = diskGeo;
  const centerScreen = camera.worldToScreen(centerWorld.x, centerWorld.y);

  // 3. Torus dimensions: cross-sectional half-width from jitter or body radius
  const jitter = Math.max(0, Math.min(0.8, (state.diskPlacement?.radiusJitterPct ?? 15) / 100));
  const bodyR = state.newBody?.radius || 8;
  const halfWidth = Math.max(bodyR, radius * jitter);
  const rInnerWorld = Math.max(5, radius - halfWidth);
  const rOuterWorld = radius + halfWidth;

  const screenR = radius * zoom;
  const rMin = Math.max(0.1, rInnerWorld * zoom);
  const rMax = Math.max(rMin + 1, rOuterWorld * zoom);

  ctx.save();

  // 4. Shaded Torus and boundary rings
  drawTorusShadingAndBorders(ctx, centerScreen, rMin, rMax, isDragging, targetStar);

  // 5. Base orbit center path, markers, and drag line
  drawDiskCenterAndGuides(ctx, centerScreen, mouseScreen, screenR, isDragging, targetStar, dragDist, zoom);

  // 6. Direction arrows along orbit
  const isCW = state.diskPlacement?.direction === 'cw';
  drawDiskDirectionArrows(ctx, centerScreen, screenR, isCW, targetStar ? '#22d3ee' : '#38bdf8');

  // 7. Metric label pill
  const labelText = computeDiskMetricsAndLabel(state, radius, targetStar, jitter, isCW);
  drawDiskMetricPill(ctx, mouseScreen, labelText, targetStar);

  ctx.restore();
}
