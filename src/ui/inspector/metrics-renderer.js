import { formatKm, formatKg, formatSimTime, computeCCWAngleDeg, escapeHtml } from '../../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../../core/constants.js';
import { Body } from '../../models/body.js';
import {
  calculateHillSphereRadius,
  findParentBody,
  findCapturedBodies,
  calculateSchwarzschildRadius,
  isBlackHole,
  calculateLorentzFactor,
  calculateRelativisticMass,
  calculateTimeDilation
} from '../../physics/celestial.js';

/**
 * Renders age, absorption count, coordinate velocity, mass, and Hill radius in the inspector.
 * @param {Object} state
 * @param {Object} elements
 * @param {Body} b
 * @param {Body|null} primary
 * @param {boolean} isPrimary
 */
export function renderInspectorBasicMetrics(state, elements, b, primary, isPrimary) {
  const {
    inspAge,
    inspAbsorbCount,
    editBodySpeed,
    editBodyAngle,
    editBodyMass,
    inspHillRadius
  } = elements;

  const coordAge = state.elapsedTime - b.birthTime;
  if (inspAge) inspAge.textContent = formatSimTime(coordAge);
  if (inspAbsorbCount) inspAbsorbCount.textContent = `${b.absorbCount || 0}`;

  if (editBodySpeed && editBodyAngle) {
    if (document.activeElement !== editBodySpeed && document.activeElement !== editBodyAngle) {
      const currentSpdKms = b.vel.mag() * KMS_PER_PXS;
      const currentDeg = computeCCWAngleDeg(b.vel.x, b.vel.y);
      editBodySpeed.value = currentSpdKms.toFixed(2);
      editBodyAngle.value = currentDeg.toFixed(1);
    }
  }

  if (editBodyMass && document.activeElement !== editBodyMass) {
    editBodyMass.value = (b.mass * KG_PER_MASS).toExponential(4);
  }

  const hillRPx = calculateHillSphereRadius(b, primary, state.bodies);
  if (inspHillRadius) {
    if (b.mass <= 0) {
      inspHillRadius.textContent = 'None (Anti-gravity)';
    } else if (isPrimary) {
      inspHillRadius.textContent = `${formatKm(hillRPx * KM_PER_PX)} (Entire System)`;
    } else {
      inspHillRadius.textContent = formatKm(hillRPx * KM_PER_PX);
    }
  }
}

/**
 * Renders hierarchical relations (primary star distance, host parent, captured satellites/moons).
 * @param {Object} state
 * @param {Object} elements
 * @param {Body} b
 * @param {Body|null} primary
 * @param {boolean} isPrimary
 * @returns {Body|null} Parent host body
 */
export function renderInspectorHierarchy(state, elements, b, primary, isPrimary) {
  const {
    inspPrimaryBadge,
    inspDistancePrimary,
    inspPrimaryRow,
    inspPrimaryArrow,
    inspParentRow,
    inspParentName,
    inspParentDistance,
    inspCapturedRow,
    inspCapturedTitle,
    inspCapturedIcon,
    inspCapturedList
  } = elements;

  if (isPrimary) {
    if (inspPrimaryBadge) inspPrimaryBadge.classList.remove('hidden');
    if (inspDistancePrimary) inspDistancePrimary.textContent = '0 km (Primary itself)';
    if (inspPrimaryRow) {
      inspPrimaryRow.classList.remove('cursor-pointer', 'hover:bg-slate-800/70');
      inspPrimaryRow.removeAttribute('title');
      delete inspPrimaryRow.dataset.bodyId;
    }
    if (inspPrimaryArrow) inspPrimaryArrow.classList.add('hidden');
  } else {
    if (inspPrimaryBadge) inspPrimaryBadge.classList.add('hidden');
    if (inspDistancePrimary) {
      if (primary) {
        const distKm = b.pos.dist(primary.pos) * KM_PER_PX;
        inspDistancePrimary.textContent = formatKm(distKm);
        if (inspPrimaryRow) {
          inspPrimaryRow.classList.add('cursor-pointer', 'hover:bg-slate-800/70');
          inspPrimaryRow.dataset.bodyId = primary.id;
          inspPrimaryRow.title = `Click to inspect primary (${primary.name})`;
        }
        if (inspPrimaryArrow) inspPrimaryArrow.classList.remove('hidden');
      } else {
        inspDistancePrimary.textContent = 'None';
        if (inspPrimaryRow) {
          inspPrimaryRow.classList.remove('cursor-pointer', 'hover:bg-slate-800/70');
          inspPrimaryRow.removeAttribute('title');
          delete inspPrimaryRow.dataset.bodyId;
        }
        if (inspPrimaryArrow) inspPrimaryArrow.classList.add('hidden');
      }
    }
  }

  // Parent body
  const parentHost = findParentBody(b, primary, state.bodies, state.G);
  if (parentHost && inspParentRow && inspParentName && inspParentDistance) {
    inspParentRow.classList.remove('hidden');
    inspParentRow.dataset.bodyId = parentHost.id;
    inspParentRow.title = `Click to inspect ${parentHost.name}`;
    inspParentName.textContent = parentHost.name;
    const pDistKm = b.pos.dist(parentHost.pos) * KM_PER_PX;
    inspParentDistance.textContent = formatKm(pDistKm);
  } else if (inspParentRow) {
    inspParentRow.classList.add('hidden');
    delete inspParentRow.dataset.bodyId;
    inspParentRow.removeAttribute('title');
  }

  // Captured bodies - Reconciled DOM
  const capturedSats = findCapturedBodies(b, primary, state.bodies, state.G);
  if (capturedSats.length > 0 && inspCapturedRow && inspCapturedList) {
    inspCapturedRow.classList.remove('hidden');
    if (inspCapturedTitle) {
      inspCapturedTitle.textContent = isPrimary ? 'Captured Orbiting Bodies:' : 'Captured Moons Distance:';
    }
    if (inspCapturedIcon) {
      inspCapturedIcon.className = isPrimary ? 'fa-solid fa-circle-nodes text-[10px]' : 'fa-solid fa-satellite text-[10px]';
    }

    const currentIds = new Set(capturedSats.map(c => String(c.body.id)));
    const existingRows = Array.from(inspCapturedList.querySelectorAll('[data-body-id]'));

    existingRows.forEach(row => {
      if (!currentIds.has(row.dataset.bodyId)) {
        row.remove();
      }
    });

    capturedSats.forEach(c => {
      const idStr = String(c.body.id);
      const distKmStr = formatKm(c.dist * KM_PER_PX);
      let row = inspCapturedList.querySelector(`[data-body-id="${idStr}"]`);

      if (row) {
        const distEl = row.querySelector('.captured-dist');
        if (distEl && distEl.textContent !== distKmStr) {
          distEl.textContent = distKmStr;
        }
        const nameEl = row.querySelector('.captured-name');
        if (nameEl && nameEl.textContent !== c.body.name + ':') {
          nameEl.textContent = c.body.name + ':';
        }
        const dotEl = row.querySelector('.captured-dot');
        if (dotEl && dotEl.style.backgroundColor !== c.body.color) {
          dotEl.style.backgroundColor = c.body.color;
        }
      } else {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-slate-300 hover:bg-slate-800/80 p-1 -mx-1 rounded cursor-pointer transition group select-none';
        div.dataset.bodyId = idStr;
        div.title = `Click to inspect ${c.body.name}`;
        div.innerHTML = `
          <span class="flex items-center gap-1.5 truncate max-w-[140px] pointer-events-none">
            <span class="captured-dot w-2 h-2 rounded-full inline-block flex-shrink-0" style="background-color: ${c.body.color};"></span>
            <span class="captured-name truncate group-hover:text-cyan-300 font-medium">${escapeHtml(c.body.name)}:</span>
          </span>
          <div class="flex items-center gap-1.5 flex-shrink-0 pointer-events-none">
            <span class="captured-dist mono text-sky-300 font-bold">${distKmStr}</span>
            <i class="fa-solid fa-arrow-right text-[9px] text-slate-500 group-hover:text-cyan-300 transition"></i>
          </div>
        `;
        inspCapturedList.appendChild(div);
      }
    });
  } else if (inspCapturedRow) {
    inspCapturedRow.classList.add('hidden');
    if (inspCapturedList) inspCapturedList.innerHTML = '';
  }

  return parentHost;
}

/**
 * Renders Special and General Relativistic metrics (proper age, Lorentz factor, relativistic mass, Schwarzschild radius, dilation card).
 * @param {Object} state
 * @param {Object} elements
 * @param {Body} b
 * @param {Body|null} primary
 * @param {boolean} isPrimary
 * @param {Body|null} parentHost
 */
export function renderInspectorRelativity(state, elements, b, primary, isPrimary, parentHost) {
  const {
    inspProperAgeRow,
    inspProperAge,
    inspTimeDilationLag,
    inspRelSpeedRatio,
    inspRelMassRow,
    inspRelMassVal,
    inspBlackHoleBadge,
    inspSchwarzschildRow,
    inspSchwarzschildRadius,
    inspRelativityCard,
    inspTimeDilationRate,
    inspKinematicDilation,
    inspGravDilation
  } = elements;

  const coordAge = state.elapsedTime - b.birthTime;

  if (inspProperAgeRow && inspProperAge && inspTimeDilationLag) {
    if (state.enableRelativity && state.speedOfLight > 0) {
      inspProperAgeRow.classList.remove('hidden');
      const pTime = b.properTime !== undefined ? b.properTime : coordAge;
      inspProperAge.textContent = formatSimTime(pTime);
      const lag = coordAge - pTime;
      if (Math.abs(lag) >= 0.05) {
        inspTimeDilationLag.textContent = `(-${formatSimTime(lag)})`;
        inspTimeDilationLag.classList.remove('hidden');
      } else {
        inspTimeDilationLag.textContent = '(±0s)';
        inspTimeDilationLag.classList.remove('hidden');
      }
    } else {
      inspProperAgeRow.classList.add('hidden');
    }
  }

  if (inspRelSpeedRatio) {
    if (state.enableRelativity && state.speedOfLight > 0) {
      const spdPx = b.vel.mag();
      const beta = spdPx / state.speedOfLight;
      const betaClamped = Math.min(0.999999, beta);
      const gamma = 1 / Math.sqrt(1 - betaClamped * betaClamped);
      inspRelSpeedRatio.textContent = `${(beta * 100).toFixed(0)}% c (γ=${gamma.toFixed(2)})`;
      inspRelSpeedRatio.classList.remove('hidden');
    } else {
      inspRelSpeedRatio.classList.add('hidden');
    }
  }

  if (inspRelMassRow && inspRelMassVal) {
    if (state.enableRelativity && state.speedOfLight > 0) {
      inspRelMassRow.classList.remove('hidden');
      const spdPx = b.vel.mag();
      const gamma = calculateLorentzFactor(spdPx, state.speedOfLight);
      const relMass = calculateRelativisticMass(b.mass, spdPx, state.speedOfLight);
      const pctIncrease = (gamma - 1) * 100;
      const sign = pctIncrease >= 0 ? '+' : '';
      inspRelMassVal.textContent = `${formatKg(relMass * KG_PER_MASS)} (${sign}${pctIncrease.toFixed(2)}%)`;
    } else {
      inspRelMassRow.classList.add('hidden');
    }
  }

  const rs = (state.enableRelativity && state.speedOfLight > 0)
    ? calculateSchwarzschildRadius(b.mass, state.G, state.speedOfLight)
    : 0;
  const isBH = state.enableRelativity && isBlackHole(b, state.G, state.speedOfLight);

  if (inspBlackHoleBadge) {
    if (isBH) {
      inspBlackHoleBadge.classList.remove('hidden');
    } else {
      inspBlackHoleBadge.classList.add('hidden');
    }
  }

  if (inspSchwarzschildRow && inspSchwarzschildRadius) {
    if (state.enableRelativity && state.speedOfLight > 0 && b.mass > 0) {
      inspSchwarzschildRow.classList.remove('hidden');
      const rsKm = rs * KM_PER_PX;
      const bhNote = isBH ? ' (Collapsed)' : '';
      inspSchwarzschildRadius.textContent = `${formatKm(rsKm)} (${rs.toFixed(1)} px)${bhNote}`;
    } else {
      inspSchwarzschildRow.classList.add('hidden');
    }
  }

  // Relativistic Time Flow Card
  if (inspRelativityCard && inspTimeDilationRate && inspKinematicDilation && inspGravDilation) {
    if (state.enableRelativity && state.speedOfLight > 0) {
      inspRelativityCard.classList.remove('hidden');
      const spdPx = b.vel.mag();
      const gravSource = parentHost || (isPrimary ? null : primary);
      const gravDist = (gravSource && gravSource !== b) ? b.pos.dist(gravSource.pos) : Infinity;
      const gravMass = (gravSource && gravSource !== b) ? gravSource.mass : 0;
      const pot = (b.lastGravPotential !== undefined && b.lastGravPotential > 0) ? b.lastGravPotential : null;
      const dilation = calculateTimeDilation(spdPx, state.speedOfLight, gravDist, gravMass, state.G, pot);

      if (dilation.totalDilation <= 0) {
        inspTimeDilationRate.textContent = '0.0000x (Frozen)';
      } else {
        const diffPct = (dilation.totalDilation - 1) * 100;
        const sign = diffPct >= 0 ? '+' : '';
        inspTimeDilationRate.textContent = `${dilation.totalDilation.toFixed(4)}x (${sign}${diffPct.toFixed(2)}%)`;
      }

      inspKinematicDilation.textContent = `${dilation.kinematicDilation.toFixed(4)}x (γ=${dilation.gamma.toFixed(3)})`;
      inspGravDilation.textContent = `${dilation.gravDilation.toFixed(4)}x`;
    } else {
      inspRelativityCard.classList.add('hidden');
    }
  }
}
