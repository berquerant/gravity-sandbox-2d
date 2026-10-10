import { formatKm, formatKmPerSec } from '../../core/formatters.js';
import { KMS_PER_PXS, KM_PER_PX } from '../../core/constants.js';

/**
 * Updates disk parameter values, inputs, and direction buttons in the side panel.
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function updateDiskParametersUI(state, elements) {
  if (!state.diskPlacement) return;
  const cfg = state.diskPlacement;
  const {
    diskCountVal,
    diskCountInput,
    diskRadiusVal,
    diskRadiusInput,
    diskRadiusJitterVal,
    diskRadiusJitterInput,
    diskSpeedVal,
    diskSpeedInput,
    diskSpeedJitterVal,
    diskSpeedJitterInput,
    chkDiskAutoKeplerian,
    btnDiskDirCCW,
    btnDiskDirCW,
    diskSummaryBadge
  } = elements;

  if (diskCountVal) diskCountVal.textContent = cfg.count;
  if (diskCountInput) diskCountInput.value = cfg.count;

  if (diskRadiusVal) {
    diskRadiusVal.innerHTML = `${formatKm(cfg.baseRadius * KM_PER_PX)} <span class="text-[10px] text-slate-400 font-normal">(${cfg.baseRadius} px)</span>`;
  }
  if (diskRadiusInput) diskRadiusInput.value = cfg.baseRadius;

  if (diskRadiusJitterVal) diskRadiusJitterVal.textContent = `+/-${cfg.radiusJitterPct}%`;
  if (diskRadiusJitterInput) diskRadiusJitterInput.value = cfg.radiusJitterPct;

  if (diskSpeedVal) {
    diskSpeedVal.innerHTML = `${formatKmPerSec(cfg.baseSpeed * KMS_PER_PXS)} <span class="text-[10px] text-slate-400 font-normal">(${cfg.baseSpeed.toFixed(1)} px/s)</span>`;
  }
  if (diskSpeedInput) diskSpeedInput.value = cfg.baseSpeed;

  if (diskSpeedJitterVal) diskSpeedJitterVal.textContent = `+/-${cfg.speedJitterPct}%`;
  if (diskSpeedJitterInput) diskSpeedJitterInput.value = cfg.speedJitterPct;

  if (chkDiskAutoKeplerian) chkDiskAutoKeplerian.checked = Boolean(cfg.autoKeplerian);

  if (btnDiskDirCCW && btnDiskDirCW) {
    if (cfg.direction === 'ccw') {
      btnDiskDirCCW.className = 'flex-1 py-1 text-[11px] font-medium rounded transition bg-cyan-600 text-white flex items-center justify-center gap-1';
      btnDiskDirCW.className = 'flex-1 py-1 text-[11px] font-medium rounded transition text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1';
    } else {
      btnDiskDirCW.className = 'flex-1 py-1 text-[11px] font-medium rounded transition bg-cyan-600 text-white flex items-center justify-center gap-1';
      btnDiskDirCCW.className = 'flex-1 py-1 text-[11px] font-medium rounded transition text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1';
    }
  }

  if (diskSummaryBadge) {
    diskSummaryBadge.textContent = `${cfg.count} bodies @ ${cfg.baseRadius}px (${cfg.direction.toUpperCase()})`;
  }
}

/**
 * Initializes listeners for circumstellar disk creation parameters (body count, radius, jitter, Keplerian toggle).
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function setupDiskControls(state, elements) {
  const {
    diskCountInput,
    diskRadiusInput,
    diskRadiusJitterInput,
    diskSpeedInput,
    diskSpeedJitterInput,
    btnDiskDirCCW,
    btnDiskDirCW,
    chkDiskAutoKeplerian
  } = elements;

  if (diskCountInput) {
    diskCountInput.addEventListener('input', (e) => {
      state.diskPlacement.count = parseInt(e.target.value) || 40;
      updateDiskParametersUI(state, elements);
    });
  }
  if (diskRadiusInput) {
    diskRadiusInput.addEventListener('input', (e) => {
      state.diskPlacement.baseRadius = parseFloat(e.target.value) || 200;
      updateDiskParametersUI(state, elements);
    });
  }
  if (diskRadiusJitterInput) {
    diskRadiusJitterInput.addEventListener('input', (e) => {
      state.diskPlacement.radiusJitterPct = parseFloat(e.target.value) || 0;
      updateDiskParametersUI(state, elements);
    });
  }
  if (diskSpeedInput) {
    diskSpeedInput.addEventListener('input', (e) => {
      state.diskPlacement.baseSpeed = parseFloat(e.target.value) || 0;
      updateDiskParametersUI(state, elements);
    });
  }
  if (diskSpeedJitterInput) {
    diskSpeedJitterInput.addEventListener('input', (e) => {
      state.diskPlacement.speedJitterPct = parseFloat(e.target.value) || 0;
      updateDiskParametersUI(state, elements);
    });
  }
  if (btnDiskDirCCW) {
    btnDiskDirCCW.addEventListener('click', () => {
      state.diskPlacement.direction = 'ccw';
      updateDiskParametersUI(state, elements);
    });
  }
  if (btnDiskDirCW) {
    btnDiskDirCW.addEventListener('click', () => {
      state.diskPlacement.direction = 'cw';
      updateDiskParametersUI(state, elements);
    });
  }
  if (chkDiskAutoKeplerian) {
    chkDiskAutoKeplerian.addEventListener('change', (e) => {
      state.diskPlacement.autoKeplerian = e.target.checked;
    });
  }

  return {
    updateDiskParametersUI: () => updateDiskParametersUI(state, elements)
  };
}
