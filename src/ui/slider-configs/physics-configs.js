import { KMS_PER_PXS } from '../../core/constants.js';

/**
 * Registers precision adjustment modal presets for simulation physics (time scale, G, trail length, speed of light).
 * @param {Object} state - Global state store
 * @param {Function} openModal - Open slider modal callback
 * @param {Function} attachSliderClick - Click listener attachment helper
 */
export function registerPhysicsSliderConfigs(state, openModal, attachSliderClick) {
  // 1. Simulation Speed (timeScale)
  const timeScale = document.getElementById('timeScale');
  const btnTimeScaleEdit = document.getElementById('btnTimeScaleEdit');
  const timeScaleConfig = {
    title: 'Simulation Speed',
    icon: 'fa-gauge-high',
    desc: 'Adjust the multiplier for celestial simulation clock speed. Supports ultra-slow motion (e.g. 0.001x).',
    min: 0.0001,
    max: 100,
    step: 'any',
    unit: 'x',
    getCurrentValue: () => state.timeScale,
    formatDisplay: (val) => val >= 1 ? `${val.toFixed(1)}x` : `${parseFloat(val.toFixed(4))}x`,
    presets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0, 100.0],
    onApply: (val) => {
      state.timeScale = val;
      if (timeScale) timeScale.value = Math.min(100, Math.max(0.0001, val));
      const lbl = document.getElementById('timeScaleLabel');
      if (lbl) lbl.textContent = val >= 1 ? `${val.toFixed(1)}x` : `${parseFloat(val.toFixed(4))}x`;
    }
  };
  attachSliderClick(timeScale, () => openModal(timeScaleConfig));
  if (btnTimeScaleEdit) btnTimeScaleEdit.addEventListener('click', () => openModal(timeScaleConfig));

  // 2. Gravitational Constant (gravConstant)
  const gravConstant = document.getElementById('gravConstant');
  const btnGEdit = document.getElementById('btnGEdit');
  const lblGravConstant = document.getElementById('lblGravConstant');
  const gConfig = {
    title: 'Gravitational Constant (G)',
    icon: 'fa-magnet',
    desc: 'Global gravitational coupling constant determining attraction strength.',
    min: 0.01,
    max: 20.0,
    step: 0.1,
    unit: 'G',
    getCurrentValue: () => state.G,
    presets: [0.1, 0.5, 1.0, 2.0, 5.0],
    onApply: (val) => {
      state.G = val;
      if (gravConstant) gravConstant.value = Math.min(5.0, Math.max(0.1, val));
      const lbl = document.getElementById('gVal');
      if (lbl) lbl.textContent = val.toFixed(1);
    }
  };
  attachSliderClick(gravConstant, () => openModal(gConfig));
  if (btnGEdit) btnGEdit.addEventListener('click', () => openModal(gConfig));
  if (lblGravConstant) lblGravConstant.addEventListener('click', () => openModal(gConfig));

  // 3. Orbital Trail Length (trailLengthInput)
  const trailLengthInput = document.getElementById('trailLengthInput');
  const btnTrailLengthEdit = document.getElementById('btnTrailLengthEdit');
  const lblTrailLength = document.getElementById('lblTrailLength');
  const trailConfig = {
    title: 'Orbital Trail Length',
    icon: 'fa-route',
    desc: 'Number of recorded historical trajectory points rendered per celestial body.',
    min: 10,
    max: 50000,
    step: 100,
    unit: 'points',
    getCurrentValue: () => state.trailLength,
    presets: [200, 500, 1000, 2500, 5000, 10000],
    onApply: (val) => {
      const pts = Math.round(val);
      state.trailLength = pts;
      if (trailLengthInput) trailLengthInput.value = Math.min(10000, Math.max(100, pts));
      const lbl = document.getElementById('trailLengthVal');
      if (lbl) lbl.textContent = pts;
      for (const b of state.bodies) {
        if (b.trail && b.trail.length > pts) {
          b.trail = b.trail.slice(-pts);
        }
      }
    }
  };
  attachSliderClick(trailLengthInput, () => openModal(trailConfig));
  if (btnTrailLengthEdit) btnTrailLengthEdit.addEventListener('click', () => openModal(trailConfig));
  if (lblTrailLength) lblTrailLength.addEventListener('click', () => openModal(trailConfig));

  // 4. Speed of Light (speedOfLightInput)
  const speedOfLightInput = document.getElementById('speedOfLightInput');
  const btnSpeedOfLightEdit = document.getElementById('btnSpeedOfLightEdit');
  const lblSpeedOfLight = document.getElementById('lblSpeedOfLight');
  const speedOfLightConfig = {
    title: 'Speed of Light (c)',
    icon: 'fa-bolt',
    desc: 'Finite cosmic speed limit governing 1PN precession, event horizons, and gravitational waves.',
    min: 5,
    max: 2000,
    step: 1,
    unit: 'px/s',
    getCurrentValue: () => state.speedOfLight,
    isDual: true,
    dualUnit: 'km/s',
    dualLabel: 'Physical Speed (km/s):',
    dualDesc: '1 px/s = 5.5772 km/s. Modifying either field synchronizes both.',
    pxToDual: (px) => px * KMS_PER_PXS,
    dualToPx: (kms) => kms / KMS_PER_PXS,
    presets: [
      { label: '50 px/s (278.9 km/s)', value: 50 },
      { label: '100 px/s (557.7 km/s)', value: 100 },
      { label: '200 px/s (1,115.4 km/s)', value: 200 },
      { label: '300 px/s (1,673.2 km/s)', value: 300 }
    ],
    onApply: (val) => {
      state.speedOfLight = val;
      if (speedOfLightInput) speedOfLightInput.value = Math.min(500, Math.max(20, val));
      const lbl = document.getElementById('cVal');
      if (lbl) {
        const cKms = (val * KMS_PER_PXS).toFixed(2);
        lbl.innerHTML = `${cKms} km/s <span class="text-[10px] text-slate-400 font-normal">(${Math.round(val)} px/s)</span>`;
      }
    }
  };
  attachSliderClick(speedOfLightInput, () => openModal(speedOfLightConfig));
  if (btnSpeedOfLightEdit) btnSpeedOfLightEdit.addEventListener('click', () => openModal(speedOfLightConfig));
  if (lblSpeedOfLight) lblSpeedOfLight.addEventListener('click', () => openModal(speedOfLightConfig));
}
