import { formatKm, computeCCWAngleDeg, parseFlexibleNumber } from '../../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../../core/constants.js';
import { getPrimaryStar } from '../../physics/celestial.js';
import { eventBus } from '../../core/event-bus.js';
import { drawVelocityVectorPad } from './vector-pad.js';
import { Camera } from '../../renderer/camera.js';
import {
  renderInspectorBasicMetrics,
  renderInspectorHierarchy,
  renderInspectorRelativity
} from './metrics-renderer.js';

/**
 * Sets up single-body editing controls, velocity vector pad, tracking buttons, and metric observers.
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @param {Object} elements - DOM element references
 * @param {Function} jumpToBody - Callback to focus and inspect target body
 * @param {Function} closeInspector - Callback to close inspector panel
 * @returns {{updateSingleInspectorUI: Function, populateSingleView: Function, updateTrackButtonState: Function}}
 */
export function setupSingleView(state, camera, elements, jumpToBody, closeInspector) {
  const {
    btnTrackBody,
    btnTrackBodyLabel,
    btnToggleRelativeOriginInsp,
    btnToggleRelativeOriginInspLabel,
    editBodyName,
    editBodyColor,
    editBodyColorHex,
    editBodyMass,
    editBodyRadius,
    editBodyRadiusVal,
    editBodySpeed,
    editBodyAngle,
    vectorPadCanvas,
    btnResetVelocity,
    btnDeleteBody,
    inspId,
    inspCapturedList,
    inspParentRow,
    inspPrimaryRow
  } = elements;

  const vectorPadCtx = vectorPadCanvas ? vectorPadCanvas.getContext('2d') : null;
  let isDraggingPad = false;
  let padMaxSpeed = 20;

  function renderVectorPad(b) {
    padMaxSpeed = drawVelocityVectorPad(vectorPadCtx, vectorPadCanvas, b ? b.vel : null, isDraggingPad);
  }

  function handlePadDrag(clientX, clientY) {
    if (!vectorPadCanvas) return;
    const b = state.bodies.find(x => x.id === state.selectedBodyId);
    if (!b) return;

    const rect = vectorPadCanvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;

    const maxR = 50;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const speedRatio = clampedDist / maxR;
    let speedPx = speedRatio * padMaxSpeed;

    if (state.enableRelativity && state.speedOfLight > 0) {
      speedPx = Math.min(speedPx, state.speedOfLight * 0.9999);
    }

    if (dist < 2) {
      b.vel.set(0, 0);
    } else {
      const angle = Math.atan2(dy, dx);
      b.vel.x = Math.cos(angle) * speedPx;
      b.vel.y = Math.sin(angle) * speedPx;
    }

    renderVectorPad(b);

    const currentSpdKms = b.vel.mag() * KMS_PER_PXS;
    const currentDeg = computeCCWAngleDeg(b.vel.x, b.vel.y);
    if (editBodySpeed) editBodySpeed.value = currentSpdKms.toFixed(2);
    if (editBodyAngle) editBodyAngle.value = currentDeg.toFixed(1);
  }

  function applyVelocityChanges() {
    const b = state.bodies.find(x => x.id === state.selectedBodyId);
    if (!b || !editBodySpeed || !editBodyAngle) return;
    const speedKms = Math.max(0, parseFloat(editBodySpeed.value) || 0);
    let speedPx = speedKms / KMS_PER_PXS;

    if (state.enableRelativity && state.speedOfLight > 0) {
      const maxSpdPx = state.speedOfLight * 0.9999;
      if (speedPx > maxSpdPx) {
        speedPx = maxSpdPx;
        editBodySpeed.value = (speedPx * KMS_PER_PXS).toFixed(2);
        eventBus.emit('toast:show', `Speed clamped to < c (${(maxSpdPx * KMS_PER_PXS).toFixed(1)} km/s)`);
      }
    }

    let deg = parseFloat(editBodyAngle.value) || 0;
    deg = (deg % 360 + 360) % 360;

    const rad = deg * (Math.PI / 180);
    b.vel.x = Math.cos(rad) * speedPx;
    b.vel.y = -Math.sin(rad) * speedPx;

    renderVectorPad(b);
  }

  function updateTrackButtonState() {
    if (btnTrackBody && btnTrackBodyLabel) {
      const isTracking = (state.selectedBodyId && state.trackedBodyId === state.selectedBodyId);
      if (isTracking) {
        btnTrackBody.className = 'py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-cyan-600 border-cyan-400 text-white shadow';
        btnTrackBodyLabel.textContent = '★ Tracking (Release)';
      } else {
        btnTrackBody.className = 'py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-800 border-slate-700 text-slate-200 hover:border-cyan-500';
        btnTrackBodyLabel.textContent = 'Track at Center';
      }
    }

    if (btnToggleRelativeOriginInsp && btnToggleRelativeOriginInspLabel) {
      const isRelOrigin = (state.selectedBodyId && state.relativeOriginBodyId === state.selectedBodyId);
      if (isRelOrigin) {
        btnToggleRelativeOriginInsp.className = 'py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-sky-600 border-sky-400 text-white shadow';
        btnToggleRelativeOriginInspLabel.textContent = '★ Origin Fixed (Release)';
      } else {
        btnToggleRelativeOriginInsp.className = 'py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-800 border-slate-700 text-slate-200 hover:border-cyan-500';
        btnToggleRelativeOriginInspLabel.textContent = 'Fix as Origin';
      }
    }
  }

  function updateSingleInspectorUI() {
    if (!state.selectedBodyId) return;
    const b = state.bodies.find(x => x.id === state.selectedBodyId);
    if (!b) {
      closeInspector();
      return;
    }

    const primary = getPrimaryStar(state.bodies);
    const isPrimary = (b === primary);

    renderInspectorBasicMetrics(state, elements, b, primary, isPrimary);
    const parentHost = renderInspectorHierarchy(state, elements, b, primary, isPrimary);
    renderInspectorRelativity(state, elements, b, primary, isPrimary, parentHost);

    if (!isDraggingPad) {
      renderVectorPad(b);
    }
  }

  function populateSingleView(b) {
    if (editBodyName) editBodyName.value = b.name;
    if (editBodyColor) editBodyColor.value = b.color;
    if (editBodyColorHex) editBodyColorHex.textContent = b.color;
    if (editBodyMass) editBodyMass.value = (b.mass * KG_PER_MASS).toExponential(4);
    if (editBodyRadius) editBodyRadius.value = Math.round(b.radius);
    if (editBodyRadiusVal) editBodyRadiusVal.textContent = formatKm(b.radius * KM_PER_PX);
    if (inspId) inspId.textContent = b.id;

    const spdKms = b.vel.mag() * KMS_PER_PXS;
    const deg = computeCCWAngleDeg(b.vel.x, b.vel.y);
    if (editBodySpeed) editBodySpeed.value = spdKms.toFixed(2);
    if (editBodyAngle) editBodyAngle.value = deg.toFixed(1);

    updateTrackButtonState();
  }

  // Single view listeners
  if (btnTrackBody) {
    btnTrackBody.addEventListener('click', () => {
      if (!state.selectedBodyId) return;
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (!b) return;

      if (state.trackedBodyId === b.id) {
        camera.stopTracking();
      } else {
        camera.startTracking(b);
      }
      updateTrackButtonState();
    });
  }

  if (btnToggleRelativeOriginInsp) {
    btnToggleRelativeOriginInsp.addEventListener('click', () => {
      if (!state.selectedBodyId) return;
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (!b) return;

      if (state.relativeOriginBodyId === b.id) {
        state.relativeOriginBodyId = null;
        eventBus.emit('toast:show', 'Released relative origin frame');
      } else {
        if (state.trackedBodyId !== b.id) {
          camera.startTracking(b);
        }
        state.relativeOriginBodyId = b.id;
        eventBus.emit('toast:show', `Switched to relative coordinate frame with origin at "${b.name}"`);
      }
      updateTrackButtonState();
      eventBus.emit('relativeOrigin:changed', state.relativeOriginBodyId);
    });
  }

  if (editBodyName) {
    editBodyName.addEventListener('input', (e) => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) b.name = e.target.value.trim() || 'Body';
    });
  }

  if (editBodyColor) {
    editBodyColor.addEventListener('input', (e) => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        b.color = e.target.value;
        if (editBodyColorHex) editBodyColorHex.textContent = e.target.value;
      }
    });
  }

  if (editBodyMass) {
    editBodyMass.addEventListener('change', (e) => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        const valKg = parseFlexibleNumber(e.target.value);
        if (valKg !== null) {
          b.mass = valKg / KG_PER_MASS;
        }
      }
    });
  }

  if (editBodyRadius) {
    editBodyRadius.addEventListener('input', (e) => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        const rPx = parseInt(e.target.value);
        b.radius = rPx;
        if (editBodyRadiusVal) editBodyRadiusVal.textContent = formatKm(rPx * KM_PER_PX);
      }
    });
  }

  if (editBodySpeed) editBodySpeed.addEventListener('input', applyVelocityChanges);
  if (editBodyAngle) editBodyAngle.addEventListener('input', applyVelocityChanges);

  if (btnResetVelocity) {
    btnResetVelocity.addEventListener('click', () => {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        b.vel.set(0, 0);
        if (editBodySpeed) editBodySpeed.value = '0.00';
        if (editBodyAngle) editBodyAngle.value = '0.0';
        renderVectorPad(b);
      }
    });
  }

  if (vectorPadCanvas) {
    vectorPadCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDraggingPad = true;
        handlePadDrag(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingPad) {
        handlePadDrag(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingPad) {
        isDraggingPad = false;
        const b = state.bodies.find(x => x.id === state.selectedBodyId);
        if (b) renderVectorPad(b);
      }
    });

    vectorPadCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDraggingPad = true;
        handlePadDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDraggingPad && e.touches.length === 1) {
        e.preventDefault();
        handlePadDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (isDraggingPad) {
        isDraggingPad = false;
        const b = state.bodies.find(x => x.id === state.selectedBodyId);
        if (b) renderVectorPad(b);
      }
    });
  }

  if (btnDeleteBody) {
    btnDeleteBody.addEventListener('click', () => {
      if (!state.selectedBodyId) return;
      const idx = state.bodies.findIndex(x => x.id === state.selectedBodyId);
      if (idx !== -1) {
        const removed = state.bodies.splice(idx, 1)[0];
        if (state.trackedBodyId === removed.id) {
          camera.stopTracking();
        }
        closeInspector();
        eventBus.emit('toast:show', `Deleted ${removed.name}`);
        eventBus.emit('bodies:updated');
      }
    });
  }

  if (inspCapturedList) {
    inspCapturedList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-body-id]');
      if (item && item.dataset.bodyId) {
        jumpToBody(item.dataset.bodyId);
      }
    });
  }

  if (inspParentRow) {
    inspParentRow.addEventListener('click', () => {
      if (inspParentRow.dataset.bodyId) {
        jumpToBody(inspParentRow.dataset.bodyId);
      }
    });
  }

  if (inspPrimaryRow) {
    inspPrimaryRow.addEventListener('click', () => {
      if (inspPrimaryRow.dataset.bodyId) {
        jumpToBody(inspPrimaryRow.dataset.bodyId);
      }
    });
  }

  return {
    updateSingleInspectorUI,
    updateTrackButtonState,
    populateSingleView,
    renderVectorPad
  };
}
