/**
 * Pure 2D canvas drawing for the directional velocity vector pad with crosshairs and CCW degree indicators.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {{x: number, y: number}|null} vel - Velocity vector
 * @param {boolean} isDragging - Drag interaction state
 * @returns {number} Effective maximum speed scale
 */
export function drawVelocityVectorPad(ctx, canvas, vel, isDragging) {
  if (!ctx || !canvas) return 20;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = 50;

  ctx.clearRect(0, 0, w, h);

  const mag = vel ? Math.hypot(vel.x, vel.y) : 0;
  const maxSpeed = Math.max(20, Math.ceil(mag / 10) * 10);

  ctx.save();
  // Outer guide circle
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner 50% guide circle
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();
  ctx.setLineDash([]);

  // Degree indicators (Mathematical CCW: Right 0°, Up 90°, Left 180°, Down 270°)
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const padLabels = [
    { text: '0°', x: cx + maxR - 8, y: cy, w: 14, h: 10 },
    { text: '90°', x: cx, y: cy - maxR + 8, w: 16, h: 10 },
    { text: '180°', x: cx - maxR + 10, y: cy, w: 20, h: 10 },
    { text: '270°', x: cx, y: cy + maxR - 8, w: 20, h: 10 }
  ];

  padLabels.forEach(l => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.fillText(l.text, l.x, l.y);
  });

  // Center origin dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  if (vel) {
    let tipX = cx;
    let tipY = cy;
    if (mag > 0.0001) {
      tipX = cx + (vel.x / maxSpeed) * maxR;
      tipY = cy + (vel.y / maxSpeed) * maxR;
    }

    // Vector arrow line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vector Arrowhead
    if (mag > 0.2) {
      const angle = Math.atan2(tipY - cy, tipX - cx);
      const arrowLen = 6;
      ctx.fillStyle = '#22d3ee';
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

    // Drag Handle Knob
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Halo when actively dragging
    if (isDragging) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
  return maxSpeed;
}
