import { Camera } from './camera.js';
import { Body } from '../models/body.js';

/**
 * Renders universe background, dynamic world coordinate grid, origin crosshairs, and primary star glow.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {HTMLCanvasElement} canvas - Target rendering canvas
 * @param {Camera} camera - Viewport camera coordinator
 * @param {Object} state - Global state store
 * @param {Body|null} primary - Primary central star
 */
export function drawBackground(ctx, canvas, camera, state, primary) {
  // Clear screen
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid in world coordinates
  const zoom = state.camera.zoom;
  let gridSize = 100;
  if (zoom < 0.001) gridSize = 500000;
  else if (zoom < 0.01) gridSize = 50000;
  else if (zoom < 0.05) gridSize = 10000;
  else if (zoom < 0.2) gridSize = 1000;
  else if (zoom < 0.5) gridSize = 400;

  const topLeft = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(canvas.width, canvas.height);

  // Determine origin point (relative origin body or universe origin (0,0))
  let originX = 0;
  let originY = 0;
  if (state.relativeOriginBodyId) {
    const originBody = state.bodies.find(b => b.id === state.relativeOriginBodyId);
    if (originBody) {
      originX = originBody.pos.x;
      originY = originBody.pos.y;
    }
  }

  const startX = Math.floor((topLeft.x - originX) / gridSize) * gridSize + originX;
  const endX = Math.ceil((bottomRight.x - originX) / gridSize) * gridSize + originX;
  const startY = Math.floor((topLeft.y - originY) / gridSize) * gridSize + originY;
  const endY = Math.ceil((bottomRight.y - originY) / gridSize) * gridSize + originY;

  ctx.save();
  ctx.strokeStyle = state.relativeOriginBodyId ? 'rgba(56, 189, 248, 0.04)' : 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = startX; x <= endX; x += gridSize) {
    const s1 = camera.worldToScreen(x, topLeft.y);
    const s2 = camera.worldToScreen(x, bottomRight.y);
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    const s1 = camera.worldToScreen(topLeft.x, y);
    const s2 = camera.worldToScreen(bottomRight.x, y);
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
  }
  ctx.stroke();

  // Primary Crosshair Axis through origin
  const sOrigin = camera.worldToScreen(originX, originY);
  ctx.beginPath();
  ctx.moveTo(0, sOrigin.y);
  ctx.lineTo(canvas.width, sOrigin.y);
  ctx.moveTo(sOrigin.x, 0);
  ctx.lineTo(sOrigin.x, canvas.height);
  ctx.strokeStyle = state.relativeOriginBodyId ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtle primary star illumination glow
  if (primary) {
    const sPrimary = camera.worldToScreen(primary.pos.x, primary.pos.y);
    const glowRadius = Math.max(120, primary.radius * zoom * 6);
    const grad = ctx.createRadialGradient(sPrimary.x, sPrimary.y, 0, sPrimary.x, sPrimary.y, glowRadius);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.08)');
    grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sPrimary.x, sPrimary.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
