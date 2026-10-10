import { calculateSchwarzschildRadius, isBlackHole } from '../physics/celestial.js';
import { hexToRgba } from '../core/formatters.js';

/**
 * Renders celestial body cores, relativistic accretion disks, glowing atmospheres, orbital trails, and labels.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {HTMLCanvasElement} canvas - Target rendering canvas
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} state - Global simulation state store
 * @param {Object|null} primary - Most massive positive-mass reference star
 */
export function drawBodies(ctx, canvas, camera, state, primary) {
  const zoom = state.camera.zoom;

  for (let i = 0; i < state.bodies.length; i++) {
    const b = state.bodies[i];
    const screen = camera.worldToScreen(b.pos.x, b.pos.y);
    const screenRadius = Math.max(1.5, b.radius * zoom);

    const absM = Math.abs(b.mass);
    const massGlowScale = Math.min(8.0, 1.8 + Math.log10(Math.max(1, absM)) * 1.5);
    const glowRad = screenRadius * massGlowScale;

    // Viewport frustum culling
    if (
      screen.x + glowRad < -100 ||
      screen.x - glowRad > canvas.width + 100 ||
      screen.y + glowRad < -100 ||
      screen.y - glowRad > canvas.height + 100
    ) {
      continue;
    }

    // Draw Trails (either relative to tracked origin body, or absolute in world space)
    if (state.showTrails && b.trail.length > 1) {
      const relOriginBody = state.relativeOriginBodyId
        ? state.bodies.find(x => x.id === state.relativeOriginBodyId)
        : null;

      // If this body IS the relative origin body itself, its relative position is always (0,0) (stationary center)
      if (relOriginBody && b === relOriginBody) {
        // Center marker or no trail needed since relative position is fixed at origin
      } else {
        ctx.beginPath();
        const originTrail = relOriginBody ? relOriginBody.trail : null;
        const originLen = originTrail ? originTrail.length : 0;
        const bLen = b.trail.length;

        // Function to resolve point in world space for trail index t
        const getScreenPt = (t) => {
          if (!relOriginBody || !originTrail || originLen === 0) {
            return camera.worldToScreen(b.trail[t].x, b.trail[t].y);
          }
          // Align by timestamp index from the end (most recent points)
          const offsetFromEnd = bLen - 1 - t;
          const origIdx = originLen - 1 - offsetFromEnd;
          if (origIdx >= 0 && origIdx < originLen) {
            // Relative displacement from origin body at that time step
            const relX = b.trail[t].x - originTrail[origIdx].x;
            const relY = b.trail[t].y - originTrail[origIdx].y;
            // Map relative coordinate centered on origin body's current screen position
            return camera.worldToScreen(relOriginBody.pos.x + relX, relOriginBody.pos.y + relY);
          }
          // Fallback to relative to current origin position if history is shorter
          const relX = b.trail[t].x - relOriginBody.pos.x;
          const relY = b.trail[t].y - relOriginBody.pos.y;
          return camera.worldToScreen(relOriginBody.pos.x + relX, relOriginBody.pos.y + relY);
        };

        const first = getScreenPt(0);
        ctx.moveTo(first.x, first.y);
        for (let t = 1; t < bLen; t++) {
          const pt = getScreenPt(t);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = relOriginBody ? 0.45 : 0.28;
        ctx.lineWidth = Math.max(1, (relOriginBody ? 1.8 : 1.5) * zoom);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }

    const rs = (state.enableRelativity && state.speedOfLight > 0)
      ? calculateSchwarzschildRadius(b.mass, state.G, state.speedOfLight)
      : 0;
    const isBH = state.enableRelativity && isBlackHole(b, state.G, state.speedOfLight);

    if (isBH) {
      // Black hole accretion disk and relativistic halo
      const diskRad = Math.max(screenRadius * 3.2, 14);
      const bhGradient = ctx.createRadialGradient(
        screen.x, screen.y, screenRadius * 0.9,
        screen.x, screen.y, diskRad
      );
      bhGradient.addColorStop(0, 'rgba(251, 146, 60, 0.85)'); // incandescent photon ring / accretion inner edge
      bhGradient.addColorStop(0.3, 'rgba(192, 132, 252, 0.45)'); // relativistic accretion disk
      bhGradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.15)'); // outer gravitational halo
      bhGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = bhGradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, diskRad, 0, Math.PI * 2);
      ctx.fill();

      // Pitch-black event horizon core
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#020617';
      ctx.fill();

      // Photon sphere boundary
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = Math.max(1.2, 1.5 * zoom);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Dynamic Glow scaled by mass
      const gradient = ctx.createRadialGradient(
        screen.x, screen.y, screenRadius * 0.2,
        screen.x, screen.y, glowRad
      );

      const glowIntensity = Math.min(0.9, 0.35 + Math.log10(Math.max(1, absM)) * 0.15);

      if (b.mass < 0) {
        gradient.addColorStop(0, b.color);
        gradient.addColorStop(0.3, `rgba(236, 72, 153, ${glowIntensity})`);
        gradient.addColorStop(0.7, `rgba(244, 63, 94, ${glowIntensity * 0.35})`);
        gradient.addColorStop(1, 'transparent');
      } else {
        gradient.addColorStop(0, b.color);
        gradient.addColorStop(0.35, hexToRgba(b.color, glowIntensity));
        gradient.addColorStop(0.75, hexToRgba(b.color, 0.133));
        gradient.addColorStop(1, 'transparent');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, glowRad, 0, Math.PI * 2);
      ctx.fill();

      // Physical Body
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Interior Schwarzschild event horizon for massive stars
      if (state.enableRelativity && rs > 0 && rs * zoom >= 2.0 && rs < b.radius) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, rs * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Selected body indicator (single or multi-selection)
    const isSelected = (state.selectedBodyId === b.id) || (state.selectedBodyIds && state.selectedBodyIds.has(b.id));
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hovered body indicator
    if (state.hoveredBodyId === b.id && !isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Primary star marker
    if (b === primary) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      if (zoom > 0.08) {
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('★ Primary', screen.x, screen.y - screenRadius - 8);
      }
    }

    // Fixed Anchor or Negative Mass symbol
    if (b.fixed) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screen.x - screenRadius * 0.5, screen.y);
      ctx.lineTo(screen.x + screenRadius * 0.5, screen.y);
      ctx.moveTo(screen.x, screen.y - screenRadius * 0.5);
      ctx.lineTo(screen.x, screen.y + screenRadius * 0.5);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    } else if (b.mass < 0) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screen.x - screenRadius * 0.5, screen.y);
      ctx.lineTo(screen.x + screenRadius * 0.5, screen.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label with Name & optional absorption crown
    if (state.showBodyNames && b.name && zoom > 0.08) {
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      const absorbBadge = b.absorbCount > 0 ? ` (+${b.absorbCount})` : '';
      const bhBadge = isBH ? ' 🕳' : '';
      ctx.fillText(`${b.name}${absorbBadge}${bhBadge}`, screen.x, screen.y + screenRadius + 12);
    }
  }
}
