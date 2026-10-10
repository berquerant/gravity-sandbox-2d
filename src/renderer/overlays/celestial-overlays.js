import { calculateHillSphereRadius } from '../../physics/celestial.js';

/**
 * Renders gravitational dominance Hill sphere boundaries and radial gradients around celestial bodies.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {HTMLCanvasElement} canvas - Target rendering canvas
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 * @param {Object|null} primary - Primary host star
 */
export function drawHillSpheres(ctx, canvas, camera, state, primary) {
  if (!state.showHillSphere || state.bodies.length < 1) return;

  const zoom = state.camera.zoom;
  ctx.save();

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (b.mass <= 0) continue;

    const hillRadius = calculateHillSphereRadius(b, primary, state.bodies);
    if (hillRadius < 5) continue;

    const screenPos = camera.worldToScreen(b.pos.x, b.pos.y);
    const screenR = hillRadius * zoom;

    if (
      screenPos.x + screenR < -50 || screenPos.x - screenR > canvas.width + 50 ||
      screenPos.y + screenR < -50 || screenPos.y - screenR > canvas.height + 50
    ) continue;

    const isPrimary = (b === primary);
    const grad = ctx.createRadialGradient(
      screenPos.x, screenPos.y, b.radius * zoom,
      screenPos.x, screenPos.y, screenR
    );

    if (isPrimary) {
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.01)');
      grad.addColorStop(0.85, 'rgba(251, 191, 36, 0.04)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.16)');
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    } else {
      grad.addColorStop(0, 'rgba(52, 211, 153, 0.02)');
      grad.addColorStop(0.85, 'rgba(52, 211, 153, 0.06)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenR, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = isPrimary ? 2 : 1.2;
    ctx.setLineDash(isPrimary ? [8, 5] : [4, 4]);
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, screenR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * Draws connecting dashed reference lines from each satellite body to the central primary host star.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 * @param {Object|null} primary - Primary host star
 */
export function drawDistanceLines(ctx, camera, state, primary) {
  if (!state.showDistanceLines || !primary || state.bodies.length < 2) return;

  const pScreen = camera.worldToScreen(primary.pos.x, primary.pos.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    if (b === primary) continue;

    const bScreen = camera.worldToScreen(b.pos.x, b.pos.y);
    ctx.beginPath();
    ctx.moveTo(pScreen.x, pScreen.y);
    ctx.lineTo(bScreen.x, bScreen.y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Visualizes space-time metric perturbation ripples radiating outward at the speed of light from massive binary pairs.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {HTMLCanvasElement} canvas - Target rendering canvas
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 */
export function drawGravitationalWaves(ctx, canvas, camera, state) {
  if (!state.enableRelativity || !state.enableGravitationalWaves || state.bodies.length < 2) return;

  const zoom = state.camera.zoom;
  const c = state.speedOfLight || 100;
  const t = state.elapsedTime;
  const len = state.bodies.length;

  ctx.save();

  for (let i = 0; i < len; i++) {
    const b1 = state.bodies[i];
    if (b1.mass <= 0) continue;

    for (let j = i + 1; j < len; j++) {
      const b2 = state.bodies[j];
      if (b2.mass <= 0) continue;

      const dx = b2.pos.x - b1.pos.x;
      const dy = b2.pos.y - b1.pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 450 || dist < 1) continue;

      const totalM = b1.mass + b2.mass;
      if (totalM < 1000) continue;

      const cx = (b1.pos.x * b1.mass + b2.pos.x * b2.mass) / totalM;
      const cy = (b1.pos.y * b1.mass + b2.pos.y * b2.mass) / totalM;
      const centerScreen = camera.worldToScreen(cx, cy);

      if (
        centerScreen.x < -300 || centerScreen.x > canvas.width + 300 ||
        centerScreen.y < -300 || centerScreen.y > canvas.height + 300
      ) continue;

      const dvx = b2.vel.x - b1.vel.x;
      const dvy = b2.vel.y - b1.vel.y;
      const vRel = Math.hypot(dvx, dvy);
      const lambda = Math.max(25, (Math.PI * dist * c) / Math.max(1, vRel));

      const compactness = Math.min(1.0, (state.G * totalM) / (c * c * Math.max(dist, 10)));
      const baseAlpha = Math.min(0.4, compactness * 0.85);

      if (baseAlpha < 0.02) continue;

      const phase = (t * c) % lambda;
      ctx.lineWidth = Math.max(1, 1.2 * zoom);
      ctx.setLineDash([6, 6]);

      for (let w = 1; w <= 4; w++) {
        const waveRadius = (w * lambda - phase) * zoom;
        if (waveRadius <= (dist * 0.5 * zoom)) continue;
        if (waveRadius > 600) continue;

        const waveAlpha = baseAlpha * (1 - waveRadius / 600);
        ctx.strokeStyle = `rgba(168, 85, 247, ${waveAlpha.toFixed(3)})`;

        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}
