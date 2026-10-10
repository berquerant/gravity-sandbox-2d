import { eventBus } from '../../core/event-bus.js';
import { KMS_PER_PXS, KM_PER_PX } from '../../core/constants.js';
import { formatKm } from '../../core/formatters.js';

/**
 * Registers precision adjustment modal presets for disk creation parameters (body count, radius, jitter, speed).
 * @param {Object} state - Global state store
 * @param {Function} openModal - Open slider modal callback
 * @param {Function} attachSliderClick - Click listener attachment helper
 */
export function registerDiskSliderConfigs(state, openModal, attachSliderClick) {
  // 1. Disk Placement: Body Count (diskCountInput)
  const diskCountInput = document.getElementById('diskCountInput');
  const btnDiskCountEdit = document.getElementById('btnDiskCountEdit');
  const lblDiskCount = document.getElementById('lblDiskCount');
  const diskCountConfig = {
    title: 'Disk Body Count',
    icon: 'fa-circle-nodes',
    desc: 'Set total number of celestial bodies to spawn in the disk/ring formation.',
    min: 1,
    max: 500,
    step: 1,
    unit: 'bodies',
    getCurrentValue: () => state.diskPlacement?.count || 40,
    presets: [10, 20, 40, 60, 100, 200],
    onApply: (val) => {
      const count = Math.max(1, Math.min(500, Math.round(val)));
      if (!state.diskPlacement) state.diskPlacement = {};
      state.diskPlacement.count = count;
      if (diskCountInput) diskCountInput.value = count;
      const valEl = document.getElementById('diskCountVal');
      if (valEl) valEl.textContent = count;
      const badge = document.getElementById('diskSummaryBadge');
      if (badge) {
        badge.textContent = `${count} bodies @ ${state.diskPlacement.baseRadius || 200}px (${(state.diskPlacement.direction || 'ccw').toUpperCase()})`;
      }
      eventBus.emit('settings:updated');
    }
  };
  attachSliderClick(diskCountInput, () => openModal(diskCountConfig));
  if (btnDiskCountEdit) btnDiskCountEdit.addEventListener('click', () => openModal(diskCountConfig));
  if (lblDiskCount) lblDiskCount.addEventListener('click', () => openModal(diskCountConfig));

  // 2. Disk Placement: Base Distance (diskRadiusInput)
  const diskRadiusInput = document.getElementById('diskRadiusInput');
  const btnDiskRadiusEdit = document.getElementById('btnDiskRadiusEdit');
  const lblDiskRadius = document.getElementById('lblDiskRadius');
  const diskRadiusConfig = {
    title: 'Disk Base Distance',
    icon: 'fa-ruler-combined',
    desc: 'Set central orbital radius from the center star or cursor in km or pixels.',
    min: Math.round(10 * KM_PER_PX),
    max: Math.round(3000 * KM_PER_PX),
    step: 1,
    unit: 'km',
    isDual: true,
    dualUnit: 'px',
    dualLabel: 'Simulation Pixels (px):',
    dualDesc: '1 px ~= 1,281 km. Modifying either field synchronizes both.',
    getCurrentValue: () => (state.diskPlacement?.baseRadius || 200) * KM_PER_PX,
    primaryToDual: (km) => km / KM_PER_PX,
    dualToPrimary: (px) => px * KM_PER_PX,
    formatInput: (km) => Math.round(km),
    formatDual: (px) => Math.round(px),
    formatDisplay: (km) => formatKm(km),
    getCurrentInfoText: (km) => {
      const px = Math.round(km / KM_PER_PX);
      return `Current: ${formatKm(km)} (${px} px)`;
    },
    getRangeInfoText: () => `Range: ${formatKm(10 * KM_PER_PX)} - ${formatKm(3000 * KM_PER_PX)} (10 - 3,000 px)`,
    presets: [
      { label: '64,067 km (50 px)', value: 50 * KM_PER_PX },
      { label: '128,133 km (100 px)', value: 100 * KM_PER_PX },
      { label: '192,200 km (150 px)', value: 150 * KM_PER_PX },
      { label: '256,267 km (200 px)', value: 200 * KM_PER_PX },
      { label: '384,400 km (300 px)', value: 300 * KM_PER_PX },
      { label: '640,665 km (500 px)', value: 500 * KM_PER_PX }
    ],
    onApply: (kmVal) => {
      const px = Math.max(10, Math.min(3000, Math.round(kmVal / KM_PER_PX)));
      if (!state.diskPlacement) state.diskPlacement = {};
      state.diskPlacement.baseRadius = px;
      if (diskRadiusInput) diskRadiusInput.value = px;
      const valEl = document.getElementById('diskRadiusVal');
      if (valEl) {
        valEl.innerHTML = `${formatKm(px * KM_PER_PX)} <span class="text-[10px] text-slate-400 font-normal">(${px} px)</span>`;
      }
      const badge = document.getElementById('diskSummaryBadge');
      if (badge) {
        badge.textContent = `${state.diskPlacement.count || 40} bodies @ ${px}px (${(state.diskPlacement.direction || 'ccw').toUpperCase()})`;
      }
      eventBus.emit('settings:updated');
    }
  };
  attachSliderClick(diskRadiusInput, () => openModal(diskRadiusConfig));
  if (btnDiskRadiusEdit) btnDiskRadiusEdit.addEventListener('click', () => openModal(diskRadiusConfig));
  if (lblDiskRadius) lblDiskRadius.addEventListener('click', () => openModal(diskRadiusConfig));

  // 3. Disk Placement: Distance Jitter (diskRadiusJitterInput)
  const diskRadiusJitterInput = document.getElementById('diskRadiusJitterInput');
  const btnDiskRadiusJitterEdit = document.getElementById('btnDiskRadiusJitterEdit');
  const lblDiskRadiusJitter = document.getElementById('lblDiskRadiusJitter');
  const diskRadiusJitterConfig = {
    title: 'Distance Jitter (Dispersion)',
    icon: 'fa-arrows-left-right',
    desc: 'Radial dispersion spread percentage (+/-%). Higher values widen the torus / disk formation.',
    min: 0,
    max: 80,
    step: 1,
    unit: '%',
    getCurrentValue: () => (state.diskPlacement?.radiusJitterPct !== undefined ? state.diskPlacement.radiusJitterPct : 15),
    presets: [
      { label: '0% (Sharp Ring)', value: 0 },
      { label: '5%', value: 5 },
      { label: '10%', value: 10 },
      { label: '15%', value: 15 },
      { label: '25%', value: 25 },
      { label: '40%', value: 40 }
    ],
    onApply: (val) => {
      const pct = Math.max(0, Math.min(80, Math.round(val)));
      if (!state.diskPlacement) state.diskPlacement = {};
      state.diskPlacement.radiusJitterPct = pct;
      if (diskRadiusJitterInput) diskRadiusJitterInput.value = pct;
      const valEl = document.getElementById('diskRadiusJitterVal');
      if (valEl) valEl.textContent = `+/-${pct}%`;
      eventBus.emit('settings:updated');
    }
  };
  attachSliderClick(diskRadiusJitterInput, () => openModal(diskRadiusJitterConfig));
  if (btnDiskRadiusJitterEdit) btnDiskRadiusJitterEdit.addEventListener('click', () => openModal(diskRadiusJitterConfig));
  if (lblDiskRadiusJitter) lblDiskRadiusJitter.addEventListener('click', () => openModal(diskRadiusJitterConfig));

  // 4. Disk Placement: Base Speed (diskSpeedInput)
  const diskSpeedInput = document.getElementById('diskSpeedInput');
  const btnDiskSpeedEdit = document.getElementById('btnDiskSpeedEdit');
  const lblDiskSpeed = document.getElementById('lblDiskSpeed');
  const diskSpeedConfig = {
    title: 'Disk Base Orbital Speed',
    icon: 'fa-gauge-simple-high',
    desc: 'Base tangential orbital speed in km/s (or px/s). Used when Auto-Keplerian is off or when no central star is present.',
    min: 0,
    max: 50 * KMS_PER_PXS,
    step: 'any',
    unit: 'km/s',
    isDual: true,
    dualUnit: 'px/s',
    dualLabel: 'Simulation Speed (px/s):',
    dualDesc: '1 px/s = 5.5772 km/s. Modifying either field synchronizes both.',
    getCurrentValue: () => (state.diskPlacement?.baseSpeed !== undefined ? state.diskPlacement.baseSpeed : 5.0) * KMS_PER_PXS,
    primaryToDual: (kms) => kms / KMS_PER_PXS,
    dualToPrimary: (pxs) => pxs * KMS_PER_PXS,
    formatInput: (kms) => parseFloat(kms.toFixed(2)),
    formatDual: (pxs) => parseFloat(pxs.toFixed(2)),
    formatDisplay: (kms) => `${kms.toFixed(2)} km/s`,
    getCurrentInfoText: (kms) => {
      const pxs = kms / KMS_PER_PXS;
      return `Current: ${kms.toFixed(2)} km/s (${pxs.toFixed(2)} px/s)`;
    },
    getRangeInfoText: () => `Range: 0 - ${(50 * KMS_PER_PXS).toFixed(2)} km/s (0 - 50 px/s)`,
    presets: [
      { label: '0.00 km/s (0 px/s)', value: 0 },
      { label: '5.58 km/s (1 px/s)', value: 1.0 * KMS_PER_PXS },
      { label: '16.73 km/s (3 px/s)', value: 3.0 * KMS_PER_PXS },
      { label: '27.89 km/s (5 px/s)', value: 5.0 * KMS_PER_PXS },
      { label: '44.62 km/s (8 px/s)', value: 8.0 * KMS_PER_PXS },
      { label: '55.77 km/s (10 px/s)', value: 10.0 * KMS_PER_PXS }
    ],
    onApply: (kmsVal) => {
      const pxs = Math.max(0, Math.min(50, kmsVal / KMS_PER_PXS));
      if (!state.diskPlacement) state.diskPlacement = {};
      state.diskPlacement.baseSpeed = pxs;
      if (diskSpeedInput) diskSpeedInput.value = pxs;
      const valEl = document.getElementById('diskSpeedVal');
      if (valEl) {
        valEl.innerHTML = `${(pxs * KMS_PER_PXS).toFixed(2)} km/s <span class="text-[10px] text-slate-400 font-normal">(${pxs.toFixed(1)} px/s)</span>`;
      }
      eventBus.emit('settings:updated');
    }
  };
  attachSliderClick(diskSpeedInput, () => openModal(diskSpeedConfig));
  if (btnDiskSpeedEdit) btnDiskSpeedEdit.addEventListener('click', () => openModal(diskSpeedConfig));
  if (lblDiskSpeed) lblDiskSpeed.addEventListener('click', () => openModal(diskSpeedConfig));

  // 5. Disk Placement: Speed & Direction Jitter (diskSpeedJitterInput)
  const diskSpeedJitterInput = document.getElementById('diskSpeedJitterInput');
  const btnDiskSpeedJitterEdit = document.getElementById('btnDiskSpeedJitterEdit');
  const lblDiskSpeedJitter = document.getElementById('lblDiskSpeedJitter');
  const diskSpeedJitterConfig = {
    title: 'Speed & Direction Jitter',
    icon: 'fa-shuffle',
    desc: 'Variation percentage (+/-% ) applied to tangential speed and radial angle for eccentric dispersion.',
    min: 0,
    max: 80,
    step: 1,
    unit: '%',
    getCurrentValue: () => (state.diskPlacement?.speedJitterPct !== undefined ? state.diskPlacement.speedJitterPct : 10),
    presets: [
      { label: '0% (Circular)', value: 0 },
      { label: '5%', value: 5 },
      { label: '10%', value: 10 },
      { label: '15%', value: 15 },
      { label: '20%', value: 20 },
      { label: '30%', value: 30 }
    ],
    onApply: (val) => {
      const pct = Math.max(0, Math.min(80, Math.round(val)));
      if (!state.diskPlacement) state.diskPlacement = {};
      state.diskPlacement.speedJitterPct = pct;
      if (diskSpeedJitterInput) diskSpeedJitterInput.value = pct;
      const valEl = document.getElementById('diskSpeedJitterVal');
      if (valEl) valEl.textContent = `+/-${pct}%`;
      eventBus.emit('settings:updated');
    }
  };
  attachSliderClick(diskSpeedJitterInput, () => openModal(diskSpeedJitterConfig));
  if (btnDiskSpeedJitterEdit) btnDiskSpeedJitterEdit.addEventListener('click', () => openModal(diskSpeedJitterConfig));
  if (lblDiskSpeedJitter) lblDiskSpeedJitter.addEventListener('click', () => openModal(diskSpeedJitterConfig));
}
