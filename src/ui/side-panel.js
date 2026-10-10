import { eventBus } from '../core/event-bus.js';
import { KMS_PER_PXS } from '../core/constants.js';
import { setupDiskControls } from './side-panel/disk-controls.js';
import { setupBodyControls } from './side-panel/body-controls.js';
import { setupPhysicsControls } from './side-panel/physics-controls.js';
import { setupModeController } from './side-panel/mode-controller.js';

/**
 * Coordinates right drawer controls (placement mode, physics toggles, body attributes, and accretion disk generator).
 * @param {Object} state - Global state store
 * @returns {{syncSettingsToUI: Function}}
 */
export function setupSidePanel(state) {
  const elements = {
    sidePanel: document.getElementById('sidePanel'),
    btnToggleSidePanel: document.getElementById('btnToggleSidePanel'),
    btnClosePanel: document.getElementById('btnClosePanel'),

    modeLaunch: document.getElementById('modeLaunch'),
    modeSpray: document.getElementById('modeSpray'),
    modeDisk: document.getElementById('modeDisk'),
    modePan: document.getElementById('modePan'),
    modeDesc: document.getElementById('modeDesc'),
    spraySpeedContainer: document.getElementById('spraySpeedContainer'),
    spraySpeedInput: document.getElementById('spraySpeedInput'),
    spraySpeedVal: document.getElementById('spraySpeedVal'),
    diskParametersSection: document.getElementById('diskParametersSection'),
    diskSummaryBadge: document.getElementById('diskSummaryBadge'),
    diskCountInput: document.getElementById('diskCountInput'),
    diskCountVal: document.getElementById('diskCountVal'),
    diskRadiusInput: document.getElementById('diskRadiusInput'),
    diskRadiusVal: document.getElementById('diskRadiusVal'),
    diskRadiusJitterInput: document.getElementById('diskRadiusJitterInput'),
    diskRadiusJitterVal: document.getElementById('diskRadiusJitterVal'),
    diskSpeedInput: document.getElementById('diskSpeedInput'),
    diskSpeedVal: document.getElementById('diskSpeedVal'),
    diskSpeedJitterInput: document.getElementById('diskSpeedJitterInput'),
    diskSpeedJitterVal: document.getElementById('diskSpeedJitterVal'),
    btnDiskDirCCW: document.getElementById('btnDiskDirCCW'),
    btnDiskDirCW: document.getElementById('btnDiskDirCW'),
    chkDiskAutoKeplerian: document.getElementById('chkDiskAutoKeplerian'),
    bodyPlacementSection: document.getElementById('bodyPlacementSection'),
    physicsVisualizationSection: document.getElementById('physicsVisualizationSection'),
    panModeNotice: document.getElementById('panModeNotice'),
    panelHeaderTitle: document.getElementById('panelHeaderTitle'),
    panelHeaderIcon: document.getElementById('panelHeaderIcon'),

    massRange: document.getElementById('massRange'),
    massVal: document.getElementById('massVal'),
    chkNegativeMass: document.getElementById('chkNegativeMass'),
    radiusInput: document.getElementById('radiusInput'),
    radiusVal: document.getElementById('radiusVal'),
    chkAutoRadius: document.getElementById('chkAutoRadius'),
    chkFixed: document.getElementById('chkFixed'),
    bodyColorPicker: document.getElementById('bodyColorPicker'),
    bodyColorHex: document.getElementById('bodyColorHex'),

    gravConstant: document.getElementById('gravConstant'),
    gVal: document.getElementById('gVal'),
    chkCollisions: document.getElementById('chkCollisions'),
    chkTrails: document.getElementById('chkTrails'),
    trailLengthInput: document.getElementById('trailLengthInput'),
    trailLengthVal: document.getElementById('trailLengthVal'),
    chkRelativity: document.getElementById('chkRelativity'),
    relativitySettings: document.getElementById('relativitySettings'),
    speedOfLightInput: document.getElementById('speedOfLightInput'),
    cVal: document.getElementById('cVal'),
    chkGravitationalWaves: document.getElementById('chkGravitationalWaves'),
    chkHillSphere: document.getElementById('chkHillSphere'),
    chkShowDistanceLines: document.getElementById('chkShowDistanceLines'),
    chkShowBodyNames: document.getElementById('chkShowBodyNames'),
    chkGravityField: document.getElementById('chkGravityField'),
    chkGravityContours: document.getElementById('chkGravityContours'),
    chkEffectivePotential: document.getElementById('chkEffectivePotential'),
    presetSelect: document.getElementById('presetSelect'),
    btnReloadPreset: document.getElementById('btnReloadPreset')
  };

  const diskController = setupDiskControls(state, elements);
  const bodyController = setupBodyControls(state, elements);
  const physicsController = setupPhysicsControls(state, elements);
  const modeController = setupModeController(state, elements, diskController);

  function syncSettingsToUI() {
    if (elements.gravConstant) elements.gravConstant.value = state.G;
    if (elements.gVal) elements.gVal.textContent = state.G.toFixed(1);
    if (elements.chkCollisions) elements.chkCollisions.checked = state.collisions;
    if (elements.chkTrails) elements.chkTrails.checked = state.showTrails;
    if (elements.trailLengthInput) elements.trailLengthInput.value = state.trailLength;
    if (elements.trailLengthVal) elements.trailLengthVal.textContent = state.trailLength;
    if (elements.chkRelativity) elements.chkRelativity.checked = Boolean(state.enableRelativity);
    if (elements.relativitySettings) {
      if (state.enableRelativity) {
        elements.relativitySettings.classList.remove('hidden');
      } else {
        elements.relativitySettings.classList.add('hidden');
      }
    }
    if (elements.speedOfLightInput) elements.speedOfLightInput.value = state.speedOfLight;
    physicsController.updateSpeedOfLightDisplay(state.speedOfLight);
    if (elements.chkGravitationalWaves) elements.chkGravitationalWaves.checked = Boolean(state.enableGravitationalWaves);
    if (elements.chkHillSphere) elements.chkHillSphere.checked = state.showHillSphere;
    if (elements.chkShowDistanceLines) elements.chkShowDistanceLines.checked = state.showDistanceLines;
    if (elements.chkShowBodyNames) elements.chkShowBodyNames.checked = state.showBodyNames;
    if (elements.chkGravityField) elements.chkGravityField.checked = Boolean(state.showGravityField);
    if (elements.chkGravityContours) elements.chkGravityContours.checked = Boolean(state.showGravityContours);
    if (elements.chkEffectivePotential) elements.chkEffectivePotential.checked = Boolean(state.effectivePotentialMode);
    if (elements.massRange) elements.massRange.value = Math.min(5000, state.newBody.mass);
    bodyController.updateMassDisplay();
    if (elements.radiusInput) elements.radiusInput.value = Math.min(60, Math.max(2, state.newBody.radius));
    bodyController.updateRadiusDisplay();
    if (elements.chkNegativeMass) elements.chkNegativeMass.checked = Boolean(state.newBody.isNegative);
    if (elements.chkAutoRadius) elements.chkAutoRadius.checked = Boolean(state.newBody.autoRadius);
    const sprayPxs = state.spraySpeed !== undefined ? state.spraySpeed : 0.3;
    if (elements.spraySpeedInput) elements.spraySpeedInput.value = Math.min(1.5, Math.max(0, sprayPxs));
    if (elements.spraySpeedVal) elements.spraySpeedVal.textContent = `${(sprayPxs * KMS_PER_PXS).toFixed(2)} km/s`;
    diskController.updateDiskParametersUI();
  }

  eventBus.on('sidepanel:close', () => modeController.setSidePanelOpen(false));
  eventBus.on('mode:change', (m) => modeController.setOperationMode(m));
  eventBus.on('settings:updated', syncSettingsToUI);

  return {
    setSidePanelOpen: modeController.setSidePanelOpen,
    setOperationMode: modeController.setOperationMode,
    syncSettingsToUI
  };
}
