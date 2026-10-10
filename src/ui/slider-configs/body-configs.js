import { KMS_PER_PXS, KM_PER_PX, KG_PER_MASS } from '../../core/constants.js';
import { formatKm, formatKg, calculateRadiusFromMass } from '../../core/formatters.js';

/**
 * Registers precision adjustment modal presets for body attributes (spray dispersion, mass, radius).
 * @param {Object} state - Global state store
 * @param {Function} openModal - Open slider modal callback
 * @param {Function} attachSliderClick - Click listener attachment helper
 */
export function registerBodySliderConfigs(state, openModal, attachSliderClick) {
  // 1. Spray Dispersion Velocity (spraySpeedInput)
  const spraySpeedInput = document.getElementById('spraySpeedInput');
  const btnSpraySpeedEdit = document.getElementById('btnSpraySpeedEdit');
  const lblSpraySpeed = document.getElementById('lblSpraySpeed');
  const sprayConfig = {
    title: 'Spray Dispersion Velocity',
    icon: 'fa-wind',
    desc: 'Set initial random ejection velocity spread for spray placement mode. Accepts scientific notation.',
    min: 0.0,
    max: 5.0 * KMS_PER_PXS,
    step: 'any',
    unit: 'km/s',
    isDual: true,
    dualUnit: 'px/s',
    dualLabel: 'Simulation Speed (px/s):',
    dualDesc: '1 px/s = 5.5772 km/s. Modifying either field synchronizes both.',
    getCurrentValue: () => (state.spraySpeed !== undefined ? state.spraySpeed : 0.3) * KMS_PER_PXS,
    primaryToDual: (kms) => kms / KMS_PER_PXS,
    dualToPrimary: (pxs) => pxs * KMS_PER_PXS,
    formatInput: (kms) => parseFloat(kms.toFixed(4)),
    formatDual: (pxs) => parseFloat(pxs.toFixed(4)),
    formatDisplay: (kms) => `${kms.toFixed(2)} km/s`,
    getCurrentInfoText: (kms) => {
      const pxs = kms / KMS_PER_PXS;
      return `Current: ${kms.toFixed(2)} km/s (${pxs.toFixed(3)} px/s)`;
    },
    getRangeInfoText: () => `Range: 0 - ${(5.0 * KMS_PER_PXS).toFixed(2)} km/s (0 - 5.0 px/s)`,
    presets: [
      { label: '0.00 km/s (0.0 px/s) - Zero Drift', value: 0.0 },
      { label: '0.28 km/s (0.05 px/s) - Ultra Gentle', value: 0.05 * KMS_PER_PXS },
      { label: '0.56 km/s (0.1 px/s) - Gentle Float', value: 0.1 * KMS_PER_PXS },
      { label: '1.12 km/s (0.2 px/s) - Soft Dispersion', value: 0.2 * KMS_PER_PXS },
      { label: '1.67 km/s (0.3 px/s) - Default Spray', value: 0.3 * KMS_PER_PXS },
      { label: '2.79 km/s (0.5 px/s) - Moderate Blast', value: 0.5 * KMS_PER_PXS },
      { label: '4.18 km/s (0.75 px/s) - Energetic Ejection', value: 0.75 * KMS_PER_PXS },
      { label: '5.58 km/s (1.0 px/s) - High Speed', value: 1.0 * KMS_PER_PXS },
      { label: '8.37 km/s (1.5 px/s) - Rapid Stream', value: 1.5 * KMS_PER_PXS },
      { label: '11.15 km/s (2.0 px/s) - Nova Burst', value: 2.0 * KMS_PER_PXS },
      { label: '16.73 km/s (3.0 px/s) - Relativistic Jet', value: 3.0 * KMS_PER_PXS },
      { label: '27.89 km/s (5.0 px/s) - Max Escape Speed', value: 5.0 * KMS_PER_PXS }
    ],
    onApply: (kmsVal) => {
      const pxs = kmsVal / KMS_PER_PXS;
      state.spraySpeed = pxs;
      if (spraySpeedInput) spraySpeedInput.value = Math.min(1.5, Math.max(0, pxs));
      const lbl = document.getElementById('spraySpeedVal');
      if (lbl) lbl.textContent = `${kmsVal.toFixed(2)} km/s`;
    }
  };
  attachSliderClick(spraySpeedInput, () => openModal(sprayConfig));
  if (btnSpraySpeedEdit) btnSpraySpeedEdit.addEventListener('click', () => openModal(sprayConfig));
  if (lblSpraySpeed) lblSpraySpeed.addEventListener('click', () => openModal(sprayConfig));

  // 2. Placement Body Mass (massRange)
  const massRange = document.getElementById('massRange');
  const btnMassEdit = document.getElementById('btnMassEdit');
  const lblMassTitle = document.getElementById('lblMassTitle');
  const massConfig = {
    title: 'Placement Body Mass',
    icon: 'fa-weight-hanging',
    desc: 'Set mass for new celestial bodies in kg. Negative values exert gravitational repulsion. Accepts scientific notation (e.g. 5.972e24).',
    min: -50000 * KG_PER_MASS,
    max: 50000 * KG_PER_MASS,
    step: 'any',
    unit: 'kg',
    isDual: true,
    dualUnit: 'units',
    dualLabel: 'Simulation Mass Units:',
    dualDesc: '1 unit = 5.9722e+23 kg (Earth = 10 units = 5.9722e+24 kg). Modifying either field synchronizes both.',
    getCurrentValue: () => {
      const isNeg = state.newBody?.isNegative;
      const m = state.newBody?.mass !== undefined ? state.newBody.mass : 100;
      return (isNeg ? -m : m) * KG_PER_MASS;
    },
    primaryToDual: (kg) => kg / KG_PER_MASS,
    dualToPrimary: (units) => units * KG_PER_MASS,
    formatInput: (kg) => Math.abs(kg) >= 1e4 || (Math.abs(kg) < 1 && kg !== 0) ? kg.toExponential(4) : parseFloat(kg.toFixed(2)),
    formatDual: (units) => Math.abs(units) >= 1e4 || (Math.abs(units) < 1 && units !== 0) ? units.toExponential(4) : parseFloat(units.toFixed(2)),
    formatDisplay: (kg) => formatKg(kg),
    getCurrentInfoText: (kg) => {
      const units = kg / KG_PER_MASS;
      const signStr = units < 0 ? '-' : '';
      const absUnits = Math.abs(units);
      const unitsStr = absUnits >= 1000 ? absUnits.toExponential(2) : absUnits.toFixed(1);
      return `Current: ${formatKg(kg)} (${signStr}${unitsStr} units)`;
    },
    getRangeInfoText: () => 'Range: +/-2.99e+28 kg (+/-50,000 units)',
    presets: [
      { label: 'Ceres / Moon (5.97e+22 kg = 0.1 u)', value: 0.1 * KG_PER_MASS },
      { label: 'Asteroid / Minor (5.97e+23 kg = 1 u)', value: 1 * KG_PER_MASS },
      { label: 'Terrestrial / Earth (5.97e+24 kg = 10 u)', value: 10 * KG_PER_MASS },
      { label: 'Super-Earth (5.97e+25 kg = 100 u)', value: 100 * KG_PER_MASS },
      { label: 'Gas Giant (2.99e+26 kg = 500 u)', value: 500 * KG_PER_MASS },
      { label: 'Dwarf Star (5.97e+26 kg = 1,000 u)', value: 1000 * KG_PER_MASS },
      { label: 'Main Sequence Star (1.49e+27 kg = 2,500 u)', value: 2500 * KG_PER_MASS },
      { label: 'Massive Core (5.97e+27 kg = 10,000 u)', value: 10000 * KG_PER_MASS },
      { label: 'Negative Light (-5.97e+24 kg = -10 u)', value: -10 * KG_PER_MASS },
      { label: 'Negative Dipole (-1.79e+26 kg = -300 u)', value: -300 * KG_PER_MASS },
      { label: 'Negative Giant (-1.49e+27 kg = -2,500 u)', value: -2500 * KG_PER_MASS }
    ],
    onApply: (kgVal) => {
      const units = kgVal / KG_PER_MASS;
      const isNeg = units < 0;
      const absVal = Math.abs(units) || 0.001;
      state.newBody.isNegative = isNeg;
      state.newBody.mass = absVal;

      const chkNegative = document.getElementById('chkNegativeMass');
      if (chkNegative) chkNegative.checked = isNeg;

      const massRangeEl = document.getElementById('massRange');
      if (massRangeEl) massRangeEl.value = Math.min(5000, Math.max(1, absVal));

      const massValEl = document.getElementById('massVal');
      if (massValEl) {
        const totalKg = (isNeg ? -absVal : absVal) * KG_PER_MASS;
        const signStr = isNeg ? '-' : '';
        const unitsStr = absVal >= 1000 ? absVal.toExponential(2) : absVal.toFixed(0);
        massValEl.innerHTML = `${formatKg(totalKg)} <span class="text-[10px] text-slate-400 font-normal">(${signStr}${unitsStr} units)</span>`;
      }

      if (state.newBody.autoRadius) {
        const r = calculateRadiusFromMass(absVal);
        state.newBody.radius = r;
        const radiusInputEl = document.getElementById('radiusInput');
        if (radiusInputEl) radiusInputEl.value = Math.min(60, Math.max(2, r));
        const radiusValEl = document.getElementById('radiusVal');
        if (radiusValEl) {
          radiusValEl.innerHTML = `${formatKm(r * KM_PER_PX)} <span class="text-[10px] text-slate-400 font-normal">(${r} px)</span>`;
        }
      }

      const bodyColorPicker = document.getElementById('bodyColorPicker');
      const bodyColorHex = document.getElementById('bodyColorHex');
      if (isNeg) {
        state.newBody.color = '#ec4899';
        if (bodyColorPicker) bodyColorPicker.value = '#ec4899';
        if (bodyColorHex) bodyColorHex.textContent = '#ec4899';
      } else if (state.newBody.color === '#ec4899') {
        state.newBody.color = '#38bdf8';
        if (bodyColorPicker) bodyColorPicker.value = '#38bdf8';
        if (bodyColorHex) bodyColorHex.textContent = '#38bdf8';
      }
    }
  };
  attachSliderClick(massRange, () => openModal(massConfig));
  if (btnMassEdit) btnMassEdit.addEventListener('click', () => openModal(massConfig));
  if (lblMassTitle) lblMassTitle.addEventListener('click', () => openModal(massConfig));

  // 3. Placement Body Radius (radiusInput)
  const radiusInput = document.getElementById('radiusInput');
  const btnRadiusEdit = document.getElementById('btnRadiusEdit');
  const lblRadiusTitle = document.getElementById('lblRadiusTitle');
  const radiusConfig = {
    title: 'Placement Body Radius',
    icon: 'fa-circle-dot',
    desc: 'Set visual and collision radius for newly created celestial bodies in km. Accepts scientific notation (e.g. 1.03e4).',
    min: Math.round(1 * KM_PER_PX),
    max: Math.round(200 * KM_PER_PX),
    step: 1,
    unit: 'km',
    isDual: true,
    dualUnit: 'px',
    dualLabel: 'Simulation Pixels:',
    dualDesc: '1 px ~= 1,281 km (Earth-Moon distance = 300 px = 384,400 km). Modifying either field synchronizes both.',
    getCurrentValue: () => (state.newBody?.radius || 8) * KM_PER_PX,
    primaryToDual: (km) => km / KM_PER_PX,
    dualToPrimary: (px) => px * KM_PER_PX,
    formatInput: (km) => Math.round(km),
    formatDual: (px) => Math.round(px),
    formatDisplay: (km) => formatKm(km),
    getCurrentInfoText: (km) => {
      const px = Math.round(km / KM_PER_PX);
      return `Current: ${formatKm(km)} (${px} px)`;
    },
    getRangeInfoText: () => `Range: ${formatKm(1 * KM_PER_PX)} - ${formatKm(200 * KM_PER_PX)} (1 - 200 px)`,
    presets: [
      { label: '5,125 km (4 px)', value: 4 * KM_PER_PX },
      { label: '10,251 km (8 px)', value: 8 * KM_PER_PX },
      { label: '15,376 km (12 px)', value: 12 * KM_PER_PX },
      { label: '25,627 km (20 px)', value: 20 * KM_PER_PX },
      { label: '51,253 km (40 px)', value: 40 * KM_PER_PX },
      { label: '102,507 km (80 px)', value: 80 * KM_PER_PX }
    ],
    onApply: (kmVal) => {
      const px = Math.round(kmVal / KM_PER_PX);
      const r = Math.max(1, px);
      if (state.newBody) {
        state.newBody.radius = r;
        state.newBody.autoRadius = false;
      }
      if (radiusInput) radiusInput.value = Math.min(60, Math.max(2, r));
      const lbl = document.getElementById('radiusVal');
      if (lbl) lbl.innerHTML = `${formatKm(r * KM_PER_PX)} <span class="text-[10px] text-slate-400 font-normal">(${r} px)</span>`;
      const chkAuto = document.getElementById('chkAutoRadius');
      if (chkAuto) chkAuto.checked = false;
    }
  };
  attachSliderClick(radiusInput, () => openModal(radiusConfig));
  if (btnRadiusEdit) btnRadiusEdit.addEventListener('click', () => openModal(radiusConfig));
  if (lblRadiusTitle) lblRadiusTitle.addEventListener('click', () => openModal(radiusConfig));

  // 4. Inspector Selected Body Radius (editBodyRadius)
  const editBodyRadius = document.getElementById('editBodyRadius');
  const btnEditBodyRadiusEdit = document.getElementById('btnEditBodyRadiusEdit');
  const lblEditBodyRadius = document.getElementById('lblEditBodyRadius');
  const editRadiusConfig = {
    title: 'Selected Body Radius',
    icon: 'fa-circle',
    desc: 'Set collision radius for the currently inspected celestial body in km. Accepts scientific notation.',
    min: Math.round(1 * KM_PER_PX),
    max: Math.round(500 * KM_PER_PX),
    step: 1,
    unit: 'km',
    isDual: true,
    dualUnit: 'px',
    dualLabel: 'Simulation Pixels:',
    dualDesc: '1 px ~= 1,281 km. Modifying either field synchronizes both.',
    getCurrentValue: () => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      return b ? b.radius * KM_PER_PX : 8 * KM_PER_PX;
    },
    primaryToDual: (km) => km / KM_PER_PX,
    dualToPrimary: (px) => px * KM_PER_PX,
    formatInput: (km) => Math.round(km),
    formatDual: (px) => Math.round(px),
    formatDisplay: (km) => formatKm(km),
    getCurrentInfoText: (km) => {
      const px = Math.round(km / KM_PER_PX);
      return `Current: ${formatKm(km)} (${px} px)`;
    },
    getRangeInfoText: () => `Range: ${formatKm(1 * KM_PER_PX)} - ${formatKm(500 * KM_PER_PX)} (1 - 500 px)`,
    presets: [
      { label: '5,125 km (4 px)', value: 4 * KM_PER_PX },
      { label: '10,251 km (8 px)', value: 8 * KM_PER_PX },
      { label: '19,220 km (15 px)', value: 15 * KM_PER_PX },
      { label: '38,440 km (30 px)', value: 30 * KM_PER_PX },
      { label: '76,880 km (60 px)', value: 60 * KM_PER_PX },
      { label: '128,133 km (100 px)', value: 100 * KM_PER_PX }
    ],
    onApply: (kmVal) => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        const r = Math.max(1, Math.round(kmVal / KM_PER_PX));
        b.radius = r;
        if (editBodyRadius) editBodyRadius.value = Math.min(80, Math.max(2, r));
        const lbl = document.getElementById('editBodyRadiusVal');
        if (lbl) lbl.textContent = formatKm(r * KM_PER_PX);
      }
    }
  };
  attachSliderClick(editBodyRadius, () => openModal(editRadiusConfig));
  if (btnEditBodyRadiusEdit) btnEditBodyRadiusEdit.addEventListener('click', () => openModal(editRadiusConfig));
  if (lblEditBodyRadius) lblEditBodyRadius.addEventListener('click', () => openModal(editRadiusConfig));
}
