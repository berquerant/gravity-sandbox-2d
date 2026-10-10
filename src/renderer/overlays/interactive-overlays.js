import { predictTrajectory } from '../../physics/trajectory.js';
import { formatKmPerSec, computeCCWAngleDeg } from '../../core/formatters.js';
import { KMS_PER_PXS } from '../../core/constants.js';
import { drawDiskPlacementPreview } from './disk-preview.js';

export const VELOCITY_GIZMO_SCALE = 12;

/**
 * Renders active interactive placement overlays (launch trajectory prediction, preview dot, velocity vector).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 */
export function drawInteractions(ctx, camera, state) {
  if (state.mode === 'launch' && state.dragStartWorld && state.currentMouseWorld) {
    const startScreen = camera.worldToScreen(state.dragStartWorld.x, state.dragStartWorld.y);
    const currentScreen = camera.worldToScreen(state.currentMouseWorld.x, state.currentMouseWorld.y);

    const vx = (state.dragStartWorld.x - state.currentMouseWorld.x) * 0.05;
    const vy = (state.dragStartWorld.y - state.currentMouseWorld.y) * 0.05;

    const trajectory = predictTrajectory(state.dragStartWorld, { x: vx, y: vy }, state);
    if (trajectory.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const p0 = camera.worldToScreen(trajectory[0].x, trajectory[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let p = 1; p < trajectory.length; p++) {
        const pt = camera.worldToScreen(trajectory[p].x, trajectory[p].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(startScreen.x, startScreen.y);
    ctx.lineTo(currentScreen.x, currentScreen.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const previewRadius = state.newBody.radius * state.camera.zoom;
    ctx.beginPath();
    ctx.arc(startScreen.x, startScreen.y, Math.max(3, previewRadius), 0, Math.PI * 2);
    ctx.fillStyle = state.newBody.color;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = state.newBody.isNegative ? '#ec4899' : '#38bdf8';
    ctx.stroke();
  }

  // Disk placement preview (both hover expectation and active drag)
  if (state.mode === 'disk' && state.currentMouseWorld) {
    drawDiskPlacementPreview(ctx, camera, state);
  }

  // 2. Selection Box (when box-selecting in pan mode)
  if (state.selectionBox) {
    drawSelectionBox(ctx, state.selectionBox);
  }

  // 3. Selected Body Interactive Velocity Vector Gizmo (single selection)
  if (state.selectedBodyId && (!state.selectedBodyIds || state.selectedBodyIds.size <= 1)) {
    const b = state.bodies.find(x => x.id === state.selectedBodyId);
    if (b) {
      drawVelocityGizmo(ctx, camera, state, b);
    }
  }
}

/**
 * Renders marquee box-selection rectangle in pan mode.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {{startX: number, startY: number, currentX: number, currentY: number}} box
 */
export function drawSelectionBox(ctx, box) {
  const x = Math.min(box.startX, box.currentX);
  const y = Math.min(box.startY, box.currentY);
  const w = Math.abs(box.currentX - box.startX);
  const h = Math.abs(box.currentY - box.startY);

  ctx.save();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * Renders direct manipulation velocity vector gizmo (line, arrowhead, trajectory preview, and speed badge).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 * @param {Object} b - Target celestial body
 */
export function drawVelocityGizmo(ctx, camera, state, b) {
  const origin = camera.worldToScreen(b.pos.x, b.pos.y);
  const tipX = origin.x + b.vel.x * VELOCITY_GIZMO_SCALE;
  const tipY = origin.y + b.vel.y * VELOCITY_GIZMO_SCALE;
  const isDragging = state.isDraggingVelocityGizmo;
  const isHovered = state.hoveredVelocityGizmo;

  ctx.save();

  // If dragging velocity, show real-time projected trajectory for this body
  if (isDragging) {
    const trajectory = predictTrajectory(b.pos, b.vel, state, 150, 0.4);
    if (trajectory.length > 1) {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const p0 = camera.worldToScreen(trajectory[0].x, trajectory[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let p = 1; p < trajectory.length; p++) {
        const pt = camera.worldToScreen(trajectory[p].x, trajectory[p].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Velocity Vector Line
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = isDragging ? '#38bdf8' : (isHovered ? '#22d3ee' : 'rgba(56, 189, 248, 0.85)');
  ctx.lineWidth = isDragging ? 3 : 2;
  ctx.stroke();

  // Arrowhead
  const speed = Math.hypot(b.vel.x, b.vel.y);
  if (speed * VELOCITY_GIZMO_SCALE > 8) {
    const angle = Math.atan2(tipY - origin.y, tipX - origin.x);
    const arrowLen = isDragging ? 9 : 7;
    ctx.fillStyle = isDragging ? '#38bdf8' : '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - arrowLen * Math.cos(angle - Math.PI / 6),
      tipY - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      tipX - arrowLen * Math.cos(angle + Math.PI / 6),
      tipY - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  // Draggable Tip Handle
  ctx.beginPath();
  ctx.arc(tipX, tipY, isDragging ? 7.5 : (isHovered ? 6.5 : 5), 0, Math.PI * 2);
  ctx.fillStyle = isDragging ? '#06b6d4' : '#0284c7';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Outer halo when hovered or dragged
  if (isHovered || isDragging) {
    ctx.beginPath();
    ctx.arc(tipX, tipY, 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Velocity Tooltip Pill next to handle
  const deg = computeCCWAngleDeg(b.vel.x, b.vel.y);
  const speedKms = speed * KMS_PER_PXS;
  let cRatioStr = '';
  if (state.enableRelativity && state.speedOfLight > 0) {
    const beta = speed / state.speedOfLight;
    cRatioStr = ` (${(beta * 100).toFixed(0)}% c)`;
  }
  const labelText = `${formatKmPerSec(speedKms)}${cRatioStr} (${deg.toFixed(0)}°)`;
  ctx.font = '10px "JetBrains Mono", monospace';
  const textWidth = ctx.measureText(labelText).width;

  const pillX = tipX + 12;
  const pillY = tipY - 10;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillX - 4, pillY - 11, textWidth + 8, 16, 4);
  } else {
    ctx.rect(pillX - 4, pillY - 11, textWidth + 8, 16);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.fillText(labelText, pillX, pillY);

  ctx.restore();
}
