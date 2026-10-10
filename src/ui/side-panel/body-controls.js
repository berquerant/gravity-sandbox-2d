import { calculateRadiusFromMass, formatKm, formatKg } from '../../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS } from '../../core/constants.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * Updates mass numeric and physical unit readout in the side panel.
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function updateMassDisplay(state, elements) {
  const { massVal } = elements;
  if (!massVal) return;
  const num = state.newBody.mass || 100;
  const isNeg = state.newBody.isNegative;
  const totalKg = (isNeg ? -num : num) * KG_PER_MASS;
  const signStr = isNeg ? '-' : '';
  const unitsStr = num >= 1000 ? num.toExponential(2) : num.toFixed(0);
  massVal.innerHTML = `${formatKg(totalKg)} <span class="text-[10px] text-slate-400 font-normal">(${signStr}${unitsStr} units)</span>`;
}

/**
 * Updates radius kilometer and pixel readout in the side panel.
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function updateRadiusDisplay(state, elements) {
  const { radiusVal } = elements;
  if (!radiusVal) return;
  const r = state.newBody.radius || 8;
  radiusVal.innerHTML = `${formatKm(r * KM_PER_PX)} <span class="text-[10px] text-slate-400 font-normal">(${r} px)</span>`;
}

/**
 * Synchronizes mass input slider and recalculates auto-radius if enabled.
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 * @param {number|string} val - Mass value
 */
export function syncMassValues(state, elements, val) {
  const { massRange, radiusInput } = elements;
  const num = Math.abs(parseFloat(val) || 1);
  state.newBody.mass = num;
  if (massRange) massRange.value = Math.min(5000, num);
  updateMassDisplay(state, elements);

  if (state.newBody.autoRadius) {
    const r = calculateRadiusFromMass(num);
    state.newBody.radius = r;
    if (radiusInput) radiusInput.value = Math.min(60, Math.max(2, r));
    updateRadiusDisplay(state, elements);
  }
}

/**
 * Switches color palette between negative mass (pink/magenta) and normal mass (cyan).
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function updateColorThemeForNegativeMass(state, elements) {
  const { bodyColorPicker, bodyColorHex } = elements;
  if (state.newBody.isNegative) {
    state.newBody.color = '#ec4899';
    if (bodyColorPicker) bodyColorPicker.value = '#ec4899';
    if (bodyColorHex) bodyColorHex.textContent = '#ec4899';
    eventBus.emit('toast:show', 'Negative mass (anti-gravity repulsion) selected');
  } else {
    state.newBody.color = '#38bdf8';
    if (bodyColorPicker) bodyColorPicker.value = '#38bdf8';
    if (bodyColorHex) bodyColorHex.textContent = '#38bdf8';
  }
  updateMassDisplay(state, elements);
}

/**
 * Initializes listeners for new body parameter controls (mass, radius, negative mass, color).
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function setupBodyControls(state, elements) {
  const {
    massRange,
    chkNegativeMass,
    radiusInput,
    chkAutoRadius,
    chkFixed,
    bodyColorPicker,
    bodyColorHex
  } = elements;

  if (massRange) {
    massRange.addEventListener('input', (e) => syncMassValues(state, elements, e.target.value));
  }

  if (chkNegativeMass) {
    chkNegativeMass.addEventListener('change', (e) => {
      state.newBody.isNegative = e.target.checked;
      updateColorThemeForNegativeMass(state, elements);
    });
  }

  document.querySelectorAll('.quick-mass').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = parseFloat(btn.dataset.mass);
      state.newBody.isNegative = m < 0;
      if (chkNegativeMass) chkNegativeMass.checked = m < 0;
      updateColorThemeForNegativeMass(state, elements);
      syncMassValues(state, elements, Math.abs(m));
    });
  });

  if (radiusInput) {
    radiusInput.addEventListener('input', (e) => {
      state.newBody.radius = parseInt(e.target.value);
      updateRadiusDisplay(state, elements);
      if (chkAutoRadius) chkAutoRadius.checked = false;
      state.newBody.autoRadius = false;
    });
  }

  if (chkAutoRadius) {
    chkAutoRadius.addEventListener('change', (e) => {
      state.newBody.autoRadius = e.target.checked;
      if (e.target.checked) syncMassValues(state, elements, state.newBody.mass);
    });
  }

  if (chkFixed) {
    chkFixed.addEventListener('change', (e) => {
      state.newBody.fixed = e.target.checked;
    });
  }

  if (bodyColorPicker) {
    bodyColorPicker.addEventListener('input', (e) => {
      state.newBody.color = e.target.value;
      if (bodyColorHex) bodyColorHex.textContent = e.target.value;
    });
  }

  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.color;
      state.newBody.color = c;
      if (bodyColorPicker) bodyColorPicker.value = c;
      if (bodyColorHex) bodyColorHex.textContent = c;
    });
  });

  return {
    updateMassDisplay: () => updateMassDisplay(state, elements),
    updateRadiusDisplay: () => updateRadiusDisplay(state, elements),
    syncMassValues: (val) => syncMassValues(state, elements, val),
    updateColorThemeForNegativeMass: () => updateColorThemeForNegativeMass(state, elements)
  };
}
