import { formatKm, formatKg, formatKmPerSec, computeCCWAngleDeg, formatSimTime, escapeHtml } from '../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../core/constants.js';
import {
  getPrimaryStar,
  calculateHillSphereRadius,
  findParentBody,
  findCapturedBodies,
  calculateSchwarzschildRadius,
  isBlackHole,
  calculateLorentzFactor,
  calculateRelativisticMass,
  calculateTimeDilation
} from '../physics/celestial.js';

/**
 * Initializes hover tooltip controller displaying physical, orbital, and relativistic metrics for hovered bodies.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} state - Global state store
 * @returns {{updateTooltip: Function}}
 */
export function setupTooltip(canvas, state) {
  const hoverTooltip = document.getElementById('hoverTooltip');
  const ttName = document.getElementById('ttName');
  const ttColorBadge = document.getElementById('ttColorBadge');
  const ttPrimaryBadge = document.getElementById('ttPrimaryBadge');
  const ttAge = document.getElementById('ttAge');
  const ttMass = document.getElementById('ttMass');
  const ttRadius = document.getElementById('ttRadius');
  const ttDistance = document.getElementById('ttDistance');
  const ttSpeed = document.getElementById('ttSpeed');
  const ttAngle = document.getElementById('ttAngle');
  const ttAbsorbCount = document.getElementById('ttAbsorbCount');
  const ttHillRadius = document.getElementById('ttHillRadius');
  const ttSchwarzschildRow = document.getElementById('ttSchwarzschildRow');
  const ttSchwarzschildRadius = document.getElementById('ttSchwarzschildRadius');
  const ttRelMassRow = document.getElementById('ttRelMassRow');
  const ttRelMass = document.getElementById('ttRelMass');
  const ttTimeRateRow = document.getElementById('ttTimeRateRow');
  const ttTimeRate = document.getElementById('ttTimeRate');
  const ttParentRow = document.getElementById('ttParentRow');
  const ttParentName = document.getElementById('ttParentName');
  const ttParentDistance = document.getElementById('ttParentDistance');
  const ttCapturedRow = document.getElementById('ttCapturedRow');
  const ttCapturedTitle = document.getElementById('ttCapturedTitle');
  const ttCapturedIcon = document.getElementById('ttCapturedIcon');
  const ttCapturedList = document.getElementById('ttCapturedList');

  function updateTooltip(b, mouseX, mouseY) {
    if (!b) {
      if (hoverTooltip) {
        hoverTooltip.classList.add('opacity-0');
        hoverTooltip.classList.remove('opacity-100');
      }
      state.hoveredBodyId = null;
      canvas.style.cursor = state.mode === 'pan' ? 'grab' : 'crosshair';
      return;
    }

    state.hoveredBodyId = b.id;
    canvas.style.cursor = 'pointer';

    const primary = getPrimaryStar(state.bodies);
    const isPrimary = (b === primary);

    updateTooltipCoreMetrics(b, primary, isPrimary);
    const parentHost = updateTooltipHierarchy(b, primary, isPrimary);
    updateTooltipRelativity(b, primary, isPrimary, parentHost);
    positionTooltip(mouseX, mouseY);
  }

  function updateTooltipCoreMetrics(b, primary, isPrimary) {
    if (ttName) ttName.textContent = b.name;
    if (ttColorBadge) ttColorBadge.style.backgroundColor = b.color;
    if (ttAge) ttAge.textContent = formatSimTime(state.elapsedTime - b.birthTime);
    if (ttMass) ttMass.textContent = formatKg(b.mass * KG_PER_MASS);
    if (ttRadius) ttRadius.textContent = formatKm(b.radius * KM_PER_PX);
    if (ttAbsorbCount) ttAbsorbCount.textContent = `${b.absorbCount || 0}`;

    if (ttSpeed && ttAngle) {
      const relOriginBody = state.relativeOriginBodyId
        ? state.bodies.find(x => x.id === state.relativeOriginBodyId)
        : null;

      let vx = b.vel.x;
      let vy = b.vel.y;
      let relLabel = '';

      if (relOriginBody && relOriginBody !== b) {
        vx -= relOriginBody.vel.x;
        vy -= relOriginBody.vel.y;
        relLabel = ' (rel)';
      }

      const spdPx = Math.hypot(vx, vy);
      const spdKms = spdPx * KMS_PER_PXS;
      const deg = computeCCWAngleDeg(vx, vy);
      let cRatioStr = '';
      if (state.enableRelativity && state.speedOfLight > 0) {
        const beta = spdPx / state.speedOfLight;
        cRatioStr = ` (${(beta * 100).toFixed(0)}% c)`;
      }
      ttSpeed.textContent = `${formatKmPerSec(spdKms)}${relLabel}${cRatioStr}`;
      ttAngle.textContent = `${deg.toFixed(1)}°${relLabel}`;
    }

    const hillRadiusPx = calculateHillSphereRadius(b, primary, state.bodies);
    if (ttHillRadius) {
      if (b.mass <= 0) {
        ttHillRadius.textContent = 'None (Anti-gravity)';
      } else if (isPrimary) {
        ttHillRadius.textContent = `${formatKm(hillRadiusPx * KM_PER_PX)} (Entire System)`;
      } else {
        ttHillRadius.textContent = formatKm(hillRadiusPx * KM_PER_PX);
      }
    }

    if (isPrimary) {
      if (ttPrimaryBadge) ttPrimaryBadge.classList.remove('hidden');
      if (ttDistance) ttDistance.textContent = '0 km (Primary itself)';
    } else {
      if (ttPrimaryBadge) ttPrimaryBadge.classList.add('hidden');
      if (ttDistance) {
        if (primary) {
          const distKm = b.pos.dist(primary.pos) * KM_PER_PX;
          ttDistance.textContent = formatKm(distKm);
        } else {
          ttDistance.textContent = 'None';
        }
      }
    }
  }

  function updateTooltipHierarchy(b, primary, isPrimary) {
    const parentHost = findParentBody(b, primary, state.bodies, state.G);
    if (parentHost && ttParentRow && ttParentName && ttParentDistance) {
      ttParentRow.classList.remove('hidden');
      ttParentName.textContent = parentHost.name;
      const pDistKm = b.pos.dist(parentHost.pos) * KM_PER_PX;
      ttParentDistance.textContent = formatKm(pDistKm);
    } else if (ttParentRow) {
      ttParentRow.classList.add('hidden');
    }

    const capturedSats = findCapturedBodies(b, primary, state.bodies, state.G);
    if (capturedSats.length > 0 && ttCapturedRow && ttCapturedList) {
      ttCapturedRow.classList.remove('hidden');
      if (ttCapturedTitle) {
        ttCapturedTitle.textContent = isPrimary ? 'Captured Orbiting Bodies:' : 'Captured Moons Distance:';
      }
      if (ttCapturedIcon) {
        ttCapturedIcon.className = isPrimary ? 'fa-solid fa-circle-nodes text-[10px]' : 'fa-solid fa-satellite text-[10px]';
      }
      ttCapturedList.innerHTML = capturedSats.map(c => `
        <div class="flex justify-between items-center text-slate-300">
          <span class="truncate max-w-[120px]">• ${escapeHtml(c.body.name)}</span>
          <span class="text-sky-300 font-semibold">${formatKm(c.dist * KM_PER_PX)}</span>
        </div>
      `).join('');
    } else if (ttCapturedRow) {
      ttCapturedRow.classList.add('hidden');
    }

    return parentHost;
  }

  function updateTooltipRelativity(b, primary, isPrimary, parentHost) {
    if (ttSchwarzschildRow && ttSchwarzschildRadius) {
      if (state.enableRelativity && state.speedOfLight > 0 && b.mass > 0) {
        const rs = calculateSchwarzschildRadius(b.mass, state.G, state.speedOfLight);
        const isBH = isBlackHole(b, state.G, state.speedOfLight);
        ttSchwarzschildRow.classList.remove('hidden');
        ttSchwarzschildRadius.textContent = isBH
          ? `${formatKm(rs * KM_PER_PX)} (Black Hole)`
          : formatKm(rs * KM_PER_PX);
      } else {
        ttSchwarzschildRow.classList.add('hidden');
      }
    }

    if (ttRelMassRow && ttRelMass) {
      if (state.enableRelativity && state.speedOfLight > 0) {
        ttRelMassRow.classList.remove('hidden');
        const spdPx = b.vel.mag();
        const gamma = calculateLorentzFactor(spdPx, state.speedOfLight);
        const relMass = calculateRelativisticMass(b.mass, spdPx, state.speedOfLight);
        const pct = (gamma - 1) * 100;
        const sign = pct >= 0 ? '+' : '';
        ttRelMass.textContent = `${formatKg(relMass * KG_PER_MASS)} (${sign}${pct.toFixed(1)}%)`;
      } else {
        ttRelMassRow.classList.add('hidden');
      }
    }

    if (ttTimeRateRow && ttTimeRate) {
      if (state.enableRelativity && state.speedOfLight > 0) {
        ttTimeRateRow.classList.remove('hidden');
        const spdPx = b.vel.mag();
        const gravSource = parentHost || (isPrimary ? null : primary);
        const gravDist = (gravSource && gravSource !== b) ? b.pos.dist(gravSource.pos) : Infinity;
        const gravMass = (gravSource && gravSource !== b) ? gravSource.mass : 0;
        const pot = (b.lastGravPotential !== undefined && b.lastGravPotential > 0) ? b.lastGravPotential : null;
        const dilation = calculateTimeDilation(spdPx, state.speedOfLight, gravDist, gravMass, state.G, pot);

        if (dilation.totalDilation <= 0) {
          ttTimeRate.textContent = '0.000x (Frozen)';
        } else {
          const diffPct = (dilation.totalDilation - 1) * 100;
          const sign = diffPct >= 0 ? '+' : '';
          ttTimeRate.textContent = `${dilation.totalDilation.toFixed(3)}x (${sign}${diffPct.toFixed(1)}%)`;
        }
      } else {
        ttTimeRateRow.classList.add('hidden');
      }
    }
  }

  function positionTooltip(mouseX, mouseY) {
    if (!hoverTooltip) return;
    const tooltipW = 288;
    const tooltipH = hoverTooltip.offsetHeight || 220;
    let left = mouseX + 16;
    let top = mouseY + 16;

    if (left + tooltipW > window.innerWidth - 12) {
      left = mouseX - tooltipW - 16;
    }
    if (top + tooltipH > window.innerHeight - 12) {
      top = mouseY - tooltipH - 16;
    }

    hoverTooltip.style.left = `${Math.max(12, left)}px`;
    hoverTooltip.style.top = `${Math.max(12, top)}px`;
    hoverTooltip.classList.remove('opacity-0');
    hoverTooltip.classList.add('opacity-100');
  }

  return { updateTooltip };
}
