import { formatKmPerSec } from '../../core/formatters.js';
import { KMS_PER_PXS } from '../../core/constants.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * Formats speed of light readout in km/s and px/s.
 * @param {Object} elements - DOM element references
 * @param {number} cPx - Speed of light in px/s
 */
export function updateSpeedOfLightDisplay(elements, cPx) {
  const { cVal } = elements;
  if (!cVal) return;
  const cKms = cPx * KMS_PER_PXS;
  cVal.innerHTML = `${formatKmPerSec(cKms)} <span class="text-[10px] text-slate-400 font-normal">(${cPx} px/s)</span>`;
}

/**
 * Initializes listeners for physics parameters (G, collisions, trails, relativity, gravitational waves, equipotentials).
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 */
export function setupPhysicsControls(state, elements) {
  const {
    spraySpeedInput,
    spraySpeedVal,
    gravConstant,
    gVal,
    chkCollisions,
    chkTrails,
    trailLengthInput,
    trailLengthVal,
    chkRelativity,
    relativitySettings,
    speedOfLightInput,
    chkGravitationalWaves,
    chkHillSphere,
    chkShowDistanceLines,
    chkShowBodyNames,
    chkGravityField,
    chkGravityContours,
    chkEffectivePotential,
    presetSelect,
    btnReloadPreset
  } = elements;

  if (spraySpeedInput) {
    spraySpeedInput.addEventListener('input', (e) => {
      const pxs = parseFloat(e.target.value);
      state.spraySpeed = pxs;
      if (spraySpeedVal) spraySpeedVal.textContent = `${(pxs * KMS_PER_PXS).toFixed(2)} km/s`;
    });
  }

  if (gravConstant) {
    gravConstant.addEventListener('input', (e) => {
      state.G = parseFloat(e.target.value);
      if (gVal) gVal.textContent = state.G.toFixed(1);
    });
  }

  if (chkCollisions) {
    chkCollisions.addEventListener('change', (e) => {
      state.collisions = e.target.checked;
    });
  }

  if (chkTrails) {
    chkTrails.addEventListener('change', (e) => {
      state.showTrails = e.target.checked;
      if (!state.showTrails) {
        state.bodies.forEach(b => b.trail = []);
      }
    });
  }

  if (trailLengthInput) {
    trailLengthInput.addEventListener('input', (e) => {
      state.trailLength = parseInt(e.target.value);
      if (trailLengthVal) trailLengthVal.textContent = state.trailLength;
    });
  }

  if (chkRelativity) {
    chkRelativity.addEventListener('change', (e) => {
      state.enableRelativity = e.target.checked;
      if (relativitySettings) {
        if (state.enableRelativity) {
          relativitySettings.classList.remove('hidden');
        } else {
          relativitySettings.classList.add('hidden');
        }
      }
      eventBus.emit('toast:show', state.enableRelativity ? 'General Relativity (1PN) Enabled' : 'General Relativity Disabled');
    });
  }

  if (speedOfLightInput) {
    speedOfLightInput.addEventListener('input', (e) => {
      state.speedOfLight = parseFloat(e.target.value);
      updateSpeedOfLightDisplay(elements, state.speedOfLight);
    });
  }

  if (chkGravitationalWaves) {
    chkGravitationalWaves.addEventListener('change', (e) => {
      state.enableGravitationalWaves = e.target.checked;
      eventBus.emit('toast:show', state.enableGravitationalWaves ? 'Gravitational Waves (2.5PN) Enabled' : 'Gravitational Waves Disabled');
    });
  }

  if (chkHillSphere) {
    chkHillSphere.addEventListener('change', (e) => {
      state.showHillSphere = e.target.checked;
      eventBus.emit('toast:show', e.target.checked ? 'Show Hill Sphere' : 'Hide Hill Sphere');
    });
  }

  if (chkShowDistanceLines) {
    chkShowDistanceLines.addEventListener('change', (e) => {
      state.showDistanceLines = e.target.checked;
    });
  }

  if (chkShowBodyNames) {
    chkShowBodyNames.addEventListener('change', (e) => {
      state.showBodyNames = e.target.checked;
      eventBus.emit('toast:show', e.target.checked ? 'Show Body Names' : 'Hide Body Names');
    });
  }

  if (chkGravityField) {
    chkGravityField.addEventListener('change', (e) => {
      state.showGravityField = e.target.checked;
      eventBus.emit('toast:show', e.target.checked ? 'Gravity Field Heatmap ON' : 'Gravity Field Heatmap OFF');
    });
  }

  if (chkGravityContours) {
    chkGravityContours.addEventListener('change', (e) => {
      state.showGravityContours = e.target.checked;
      eventBus.emit('toast:show', e.target.checked ? 'Gravity Contours ON' : 'Gravity Contours OFF');
    });
  }

  if (chkEffectivePotential) {
    chkEffectivePotential.addEventListener('change', (e) => {
      state.effectivePotentialMode = e.target.checked;
      if (e.target.checked && !state.showGravityContours) {
        state.showGravityContours = true;
        if (chkGravityContours) chkGravityContours.checked = true;
      }
      eventBus.emit('toast:show', e.target.checked ? 'Rotating Frame Potential (L1-L5) ON' : 'Rotating Frame Potential OFF');
    });
  }

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      state.currentPreset = val;
      eventBus.emit('preset:select', val);
      presetSelect.selectedIndex = 0;
    });
  }

  if (btnReloadPreset) {
    btnReloadPreset.addEventListener('click', () => {
      const preset = state.currentPreset || 'solar';
      eventBus.emit('preset:select', preset);
      eventBus.emit('toast:show', `Reloaded preset: ${preset}`);
    });
  }

  return {
    updateSpeedOfLightDisplay: (cPx) => updateSpeedOfLightDisplay(elements, cPx)
  };
}
