import { state } from './state/store.js';
import { eventBus } from './core/event-bus.js';
import { Camera } from './renderer/camera.js';
import { Renderer } from './renderer/index.js';
import { GameLoop } from './core/loop.js';
import { setupToast } from './ui/toast.js';
import { setupHUD } from './ui/hud.js';
import { setupTooltip } from './ui/tooltip.js';
import { setupInspector } from './ui/inspector.js';
import { setupBodyCatalog } from './ui/body-catalog.js';
import { setupHistoryDrawer } from './ui/history-drawer.js';
import { setupTimeSkipModal } from './ui/time-skip-modal.js';
import { setupSaveModal } from './ui/save-modal.js';
import { setupSliderModal } from './ui/slider-modal.js';
import { setupSidePanel } from './ui/side-panel.js';
import { setupInputController } from './ui/input-controller.js';
import { loadPreset } from './presets/index.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('simCanvas');

  // Initialize camera and renderer
  const camera = new Camera(canvas, state);
  const renderer = new Renderer(canvas, camera, state);

  /** Resizes the canvas buffer to match window dimensions on layout changes. */
  function resizeCanvas() {
    renderer.resize();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize UI components
  setupToast();
  const tooltip = setupTooltip(canvas, state);
  const inspector = setupInspector(state, camera);
  const bodyCatalog = setupBodyCatalog(state, camera);
  setupHistoryDrawer(state);
  setupTimeSkipModal(state);
  setupSaveModal(state);
  setupSliderModal(state);
  const sidePanel = setupSidePanel(state);

  // Initialize game loop
  const loop = new GameLoop({
    state,
    camera,
    renderer,
    hud: null,
    inspector
  });

  const hud = setupHUD(state, camera, () => loop.stepOnce());
  loop.hud = hud;

  /** Toggles simulation playback paused/running state. */
  function togglePlayPause() {
    hud.setPlayPause(!state.isPaused);
  }

  // Initialize input controller
  setupInputController(canvas, state, camera, tooltip, inspector, togglePlayPause);

  // Preset loading event listener
  eventBus.on('preset:select', (presetName) => {
    state.currentPreset = presetName;
    loadPreset(presetName, state, camera);
    bodyCatalog.updateBodyListUI();
    sidePanel.syncSettingsToUI();
  });

  // Start simulation loop
  loop.start();

  // Load default preset (solar)
  state.currentPreset = 'solar';
  loadPreset('solar', state, camera);
  bodyCatalog.updateBodyListUI();
  sidePanel.syncSettingsToUI();
});
