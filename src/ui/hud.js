import { formatSimTime, formatKmPerSec, computeScaleBarMetrics } from '../core/formatters.js';
import { KMS_PER_PXS } from '../core/constants.js';
import { getPrimaryStar } from '../physics/celestial.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Initializes HUD overlays (simulation time, body count, FPS, map scale ruler, tracking banner, playback and D-pad controls).
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @param {Function} stepOnce - Single physics step callback
 * @returns {{updateHUD: Function, setPlayPause: Function}}
 */
export function setupHUD(state, camera, stepOnce) {
  const simTimeDisplay = document.getElementById('simTimeDisplay');
  const bodyCountDisplay = document.getElementById('bodyCountDisplay');
  const fpsDisplay = document.getElementById('fpsDisplay');
  const primaryStarName = document.getElementById('primaryStarName');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
  const scaleRulerText = document.getElementById('scaleRulerText');
  const scaleRulerSubtext = document.getElementById('scaleRulerSubtext');

  // Tracking banner
  const trackingBanner = document.getElementById('trackingBanner');
  const trackingTargetName = document.getElementById('trackingTargetName');
  const trackingTargetSpeed = document.getElementById('trackingTargetSpeed');
  const btnStopTracking = document.getElementById('btnStopTracking');

  // Navigation controls
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const btnStep = document.getElementById('btnStep');
  const timeScale = document.getElementById('timeScale');
  const timeScaleLabel = document.getElementById('timeScaleLabel');
  const btnClear = document.getElementById('btnClear');

  // Bottom D-Pad & Zoom
  const btnPanUp = document.getElementById('btnPanUp');
  const btnPanDown = document.getElementById('btnPanDown');
  const btnPanLeft = document.getElementById('btnPanLeft');
  const btnPanRight = document.getElementById('btnPanRight');
  const btnResetView = document.getElementById('btnResetView');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');

  /**
   * Updates all active HUD metrics, scale bar measurements, and tracking tags for the current frame.
   */
  function updateHUD() {
    if (simTimeDisplay) simTimeDisplay.textContent = formatSimTime(state.elapsedTime);
    if (bodyCountDisplay) bodyCountDisplay.textContent = state.bodies.length;
    if (fpsDisplay) fpsDisplay.textContent = Math.round(state.fps);

    const primary = getPrimaryStar(state.bodies);
    if (primaryStarName) {
      primaryStarName.textContent = primary ? primary.name : 'None';
    }

    if (zoomLevelDisplay) {
      const zoomPct = state.camera.zoom * 100;
      if (zoomPct < 0.01) {
        zoomLevelDisplay.textContent = `${zoomPct.toFixed(4)}%`;
      } else if (zoomPct < 1) {
        zoomLevelDisplay.textContent = `${zoomPct.toFixed(2)}%`;
      } else {
        zoomLevelDisplay.textContent = `${Math.round(zoomPct)}%`;
      }
    }

    if (scaleRulerText || scaleRulerSubtext) {
      const metrics = computeScaleBarMetrics(100, state.camera.zoom);
      if (scaleRulerText) scaleRulerText.textContent = metrics.label;
      if (scaleRulerSubtext) scaleRulerSubtext.textContent = metrics.subLabel;
    }

    if (state.trackedBodyId && trackingTargetSpeed) {
      const target = state.bodies.find(b => b.id === state.trackedBodyId);
      if (target) {
        const spdKms = target.vel.mag() * KMS_PER_PXS;
        trackingTargetSpeed.textContent = `(${formatKmPerSec(spdKms)})`;
      } else {
        trackingTargetSpeed.textContent = '';
      }
    }
  }

  /**
   * Sets simulation playback state and updates play/pause button styling and icons.
   * @param {boolean} paused
   */
  function setPlayPause(paused) {
    state.isPaused = paused;
    if (playIcon) {
      if (state.isPaused) {
        playIcon.className = 'fa-solid fa-play text-xs text-white';
        btnPlayPause.classList.replace('bg-cyan-600', 'bg-amber-600');
        btnPlayPause.classList.replace('hover:bg-cyan-500', 'hover:bg-amber-500');
      } else {
        playIcon.className = 'fa-solid fa-pause text-xs text-white';
        btnPlayPause.classList.replace('bg-amber-600', 'bg-cyan-600');
        btnPlayPause.classList.replace('hover:bg-amber-500', 'hover:bg-cyan-500');
      }
    }
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      setPlayPause(!state.isPaused);
    });
  }

  if (btnStep) {
    btnStep.addEventListener('click', () => {
      if (!state.isPaused) setPlayPause(true);
      stepOnce();
    });
  }

  if (timeScale) {
    timeScale.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      state.timeScale = v;
      if (timeScaleLabel) {
        timeScaleLabel.textContent = v >= 1 ? `${v.toFixed(1)}x` : `${parseFloat(v.toFixed(4))}x`;
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all celestial bodies?')) {
        camera.stopTracking();
        state.elapsedTime = 0;
        state.bodies = [];
        state.archivedBodies = [];
        state.selectedBodyId = null;
        eventBus.emit('bodies:cleared');
        eventBus.emit('toast:show', 'Cleared all celestial bodies');
      }
    });
  }

  // D-Pad
  const PAN_STEP = 50;
  if (btnPanUp) btnPanUp.addEventListener('click', () => camera.pan(0, -PAN_STEP));
  if (btnPanDown) btnPanDown.addEventListener('click', () => camera.pan(0, PAN_STEP));
  if (btnPanLeft) btnPanLeft.addEventListener('click', () => camera.pan(-PAN_STEP, 0));
  if (btnPanRight) btnPanRight.addEventListener('click', () => camera.pan(PAN_STEP, 0));
  if (btnResetView) btnResetView.addEventListener('click', () => camera.reset());

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => camera.applyZoom(1.25));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => camera.applyZoom(0.8));

  const btnToggleRelativeOrigin = document.getElementById('btnToggleRelativeOrigin');
  const btnToggleRelativeOriginLabel = document.getElementById('btnToggleRelativeOriginLabel');

  function updateRelativeOriginBannerUI() {
    if (!btnToggleRelativeOrigin || !btnToggleRelativeOriginLabel) return;
    const isRelOrigin = (state.relativeOriginBodyId && state.relativeOriginBodyId === state.trackedBodyId);
    if (isRelOrigin) {
      btnToggleRelativeOrigin.className = 'ml-1 text-white px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-[11px] font-semibold border border-cyan-400 transition flex items-center gap-1 shadow';
      btnToggleRelativeOriginLabel.textContent = 'Origin Fixed (Release)';
    } else {
      btnToggleRelativeOrigin.className = 'ml-1 text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold border border-slate-700 transition flex items-center gap-1';
      btnToggleRelativeOriginLabel.textContent = 'Fix as Origin';
    }
  }

  // Tracking banner events
  eventBus.on('camera:track', (target) => {
    if (trackingBanner && target) {
      trackingTargetName.textContent = target.name || 'Body';
      if (trackingTargetSpeed) {
        const spdKms = target.vel.mag() * KMS_PER_PXS;
        trackingTargetSpeed.textContent = `(${formatKmPerSec(spdKms)})`;
      }
      trackingBanner.classList.remove('hidden');
      updateRelativeOriginBannerUI();
    }
  });

  eventBus.on('camera:untrack', () => {
    if (trackingBanner) {
      trackingBanner.classList.add('hidden');
      if (trackingTargetSpeed) trackingTargetSpeed.textContent = '';
      updateRelativeOriginBannerUI();
    }
  });

  eventBus.on('relativeOrigin:changed', () => {
    updateRelativeOriginBannerUI();
  });

  if (btnToggleRelativeOrigin) {
    btnToggleRelativeOrigin.addEventListener('click', () => {
      if (!state.trackedBodyId) return;
      if (state.relativeOriginBodyId === state.trackedBodyId) {
        state.relativeOriginBodyId = null;
        eventBus.emit('toast:show', 'Released relative origin frame');
      } else {
        state.relativeOriginBodyId = state.trackedBodyId;
        const target = state.bodies.find(b => b.id === state.trackedBodyId);
        const name = target ? target.name : 'Body';
        eventBus.emit('toast:show', `Switched to relative coordinate frame with origin at "${name}"`);
      }
      eventBus.emit('relativeOrigin:changed', state.relativeOriginBodyId);
    });
  }

  if (btnStopTracking) {
    btnStopTracking.addEventListener('click', () => {
      camera.stopTracking();
    });
  }

  return { updateHUD, setPlayPause };
}
