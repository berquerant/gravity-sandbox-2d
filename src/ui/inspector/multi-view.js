import { formatKm, computeCCWAngleDeg, escapeHtml } from '../../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../../core/constants.js';
import { eventBus } from '../../core/event-bus.js';
import { drawVelocityVectorPad } from './vector-pad.js';
import { Camera } from '../../renderer/camera.js';

/**
 * Sets up batch multi-body selection inspector, aggregated statistics, and collective velocity joystick.
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @param {Object} elements - DOM element references
 * @param {Function} jumpToBody - Callback to focus target body
 * @param {Function} openInspector - Callback to open inspector for single body
 * @param {Function} closeInspector - Callback to close inspector panel
 * @returns {{updateMultiInspectorUI: Function, initMultiPad: Function}}
 */
export function setupMultiView(state, camera, elements, jumpToBody, openInspector, closeInspector) {
  const {
    multiCountLabel,
    multiTotalMass,
    multiAvgSpeed,
    multiLargestBody,
    multiFastestBody,
    multiBodiesList,
    multiListCount,
    btnMultiResetVelocity,
    multiVectorPadCanvas,
    editMultiSpeed,
    editMultiAngle,
    btnMultiDeleteBodies,
    btnMultiDeleteLabel
  } = elements;

  const multiVectorPadCtx = multiVectorPadCanvas ? multiVectorPadCanvas.getContext('2d') : null;
  let isDraggingMultiPad = false;
  let multiPadMaxSpeed = 20;
  let multiPadCurrentVel = { x: 0, y: 0 };

  function renderMultiVectorPad(vel) {
    multiPadMaxSpeed = drawVelocityVectorPad(multiVectorPadCtx, multiVectorPadCanvas, vel, isDraggingMultiPad);
  }

  function applyMultiVelocity(vx, vy) {
    if (!state.selectedBodyIds || state.selectedBodyIds.size === 0) return;
    multiPadCurrentVel = { x: vx, y: vy };
    state.bodies.forEach(b => {
      if (state.selectedBodyIds.has(b.id)) {
        b.vel.x = vx;
        b.vel.y = vy;
      }
    });

    const speed = Math.hypot(vx, vy);
    const speedKms = speed * KMS_PER_PXS;
    const deg = computeCCWAngleDeg(vx, vy);
    if (editMultiSpeed && document.activeElement !== editMultiSpeed) {
      editMultiSpeed.value = speedKms.toFixed(2);
    }
    if (editMultiAngle && document.activeElement !== editMultiAngle) {
      editMultiAngle.value = deg.toFixed(1);
    }
    renderMultiVectorPad(multiPadCurrentVel);
  }

  function handleMultiPadDrag(clientX, clientY) {
    if (!multiVectorPadCanvas) return;
    const rect = multiVectorPadCanvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;

    const maxR = 50;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const speedRatio = clampedDist / maxR;
    const speedPx = speedRatio * multiPadMaxSpeed;

    let vx = 0;
    let vy = 0;
    if (dist >= 2) {
      const angle = Math.atan2(dy, dx);
      vx = Math.cos(angle) * speedPx;
      vy = Math.sin(angle) * speedPx;
    }

    applyMultiVelocity(vx, vy);
  }

  function applyMultiVelocityFromInputs() {
    if (!editMultiSpeed || !editMultiAngle) return;
    const speedKms = Math.max(0, parseFloat(editMultiSpeed.value) || 0);
    const speed = speedKms / KMS_PER_PXS;
    let deg = parseFloat(editMultiAngle.value) || 0;
    deg = (deg % 360 + 360) % 360;

    const rad = deg * (Math.PI / 180);
    const vx = Math.cos(rad) * speed;
    const vy = -Math.sin(rad) * speed;

    applyMultiVelocity(vx, vy);
  }

  function updateMultiInspectorUI() {
    if (!state.selectedBodyIds || state.selectedBodyIds.size <= 1) return;
    const selectedBodies = state.bodies.filter(b => state.selectedBodyIds.has(b.id));

    if (selectedBodies.length === 0) {
      closeInspector();
      return;
    }
    if (selectedBodies.length === 1) {
      openInspector(selectedBodies[0]);
      return;
    }

    if (multiCountLabel) multiCountLabel.textContent = `Selected: ${selectedBodies.length} bodies`;
    if (multiListCount) multiListCount.textContent = `${selectedBodies.length}`;
    if (btnMultiDeleteLabel) btnMultiDeleteLabel.textContent = `Batch Delete (${selectedBodies.length} bodies)`;

    // Calculate aggregated metrics
    let totalMassVal = 0;
    let totalSpeedVal = 0;
    let largest = selectedBodies[0];
    let fastest = selectedBodies[0];

    selectedBodies.forEach(b => {
      totalMassVal += Math.abs(b.mass);
      const spd = b.vel.mag();
      totalSpeedVal += spd;
      if (Math.abs(b.mass) > Math.abs(largest.mass)) largest = b;
      if (spd > fastest.vel.mag()) fastest = b;
    });

    const avgSpeedKms = (totalSpeedVal / selectedBodies.length) * KMS_PER_PXS;
    if (multiTotalMass) multiTotalMass.textContent = (totalMassVal * KG_PER_MASS).toExponential(3) + ' kg';
    if (multiAvgSpeed) multiAvgSpeed.textContent = avgSpeedKms.toFixed(2) + ' km/s';
    if (multiLargestBody) multiLargestBody.textContent = `${largest.name} (${formatKm(largest.radius * KM_PER_PX)})`;
    if (multiFastestBody) multiFastestBody.textContent = `${fastest.name} (${(fastest.vel.mag() * KMS_PER_PXS).toFixed(1)} km/s)`;

    // Update list preview - Reconciled to preserve elements and clicks
    if (multiBodiesList) {
      const currentIds = new Set(selectedBodies.map(b => String(b.id)));
      const existingRows = Array.from(multiBodiesList.querySelectorAll('[data-body-id]'));
      existingRows.forEach(row => {
        if (!currentIds.has(row.dataset.bodyId)) {
          row.remove();
        }
      });

      selectedBodies.forEach(b => {
        const idStr = String(b.id);
        const speedStr = `${(b.vel.mag() * KMS_PER_PXS).toFixed(1)} km/s`;
        let row = multiBodiesList.querySelector(`[data-body-id="${idStr}"]`);
        if (row) {
          const spdEl = row.querySelector('.multi-speed');
          if (spdEl && spdEl.textContent !== speedStr) {
            spdEl.textContent = speedStr;
          }
          const nameEl = row.querySelector('.multi-name');
          if (nameEl && nameEl.textContent !== b.name) {
            nameEl.textContent = b.name;
          }
          const dotEl = row.querySelector('.multi-dot');
          if (dotEl && dotEl.style.backgroundColor !== b.color) {
            dotEl.style.backgroundColor = b.color;
          }
        } else {
          const div = document.createElement('div');
          div.className = 'flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-800/80 cursor-pointer transition group select-none';
          div.dataset.bodyId = idStr;
          div.title = `Click to inspect ${b.name}`;
          div.innerHTML = `
            <div class="flex items-center gap-1.5 truncate max-w-[130px] pointer-events-none">
              <span class="multi-dot w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${b.color};"></span>
              <span class="multi-name truncate font-medium text-slate-200 group-hover:text-cyan-300">${escapeHtml(b.name)}</span>
            </div>
            <div class="flex items-center gap-1.5 pointer-events-none">
              <span class="multi-speed mono text-[10px] text-cyan-300">${speedStr}</span>
              <i class="fa-solid fa-arrow-right text-[9px] text-slate-500 group-hover:text-cyan-300 transition"></i>
            </div>
          `;
          multiBodiesList.appendChild(div);
        }
      });
    }

    if (!isDraggingMultiPad) {
      renderMultiVectorPad(multiPadCurrentVel);
    }
  }

  function initMultiPad(bodyList) {
    let avgVx = 0;
    let avgVy = 0;
    bodyList.forEach(b => {
      avgVx += b.vel.x;
      avgVy += b.vel.y;
    });
    avgVx /= bodyList.length;
    avgVy /= bodyList.length;
    multiPadCurrentVel = { x: avgVx, y: avgVy };

    const speed = Math.hypot(avgVx, avgVy);
    const speedKms = speed * KMS_PER_PXS;
    const deg = computeCCWAngleDeg(avgVx, avgVy);
    if (editMultiSpeed) editMultiSpeed.value = speedKms.toFixed(2);
    if (editMultiAngle) editMultiAngle.value = deg.toFixed(1);

    renderMultiVectorPad(multiPadCurrentVel);
  }

  if (editMultiSpeed) editMultiSpeed.addEventListener('input', applyMultiVelocityFromInputs);
  if (editMultiAngle) editMultiAngle.addEventListener('input', applyMultiVelocityFromInputs);

  if (btnMultiResetVelocity) {
    btnMultiResetVelocity.addEventListener('click', () => {
      applyMultiVelocity(0, 0);
    });
  }

  if (btnMultiDeleteBodies) {
    btnMultiDeleteBodies.addEventListener('click', () => {
      if (!state.selectedBodyIds || state.selectedBodyIds.size === 0) return;
      const count = state.selectedBodyIds.size;
      const idsToDelete = new Set(state.selectedBodyIds);

      state.bodies = state.bodies.filter(b => {
        if (idsToDelete.has(b.id)) {
          if (state.trackedBodyId === b.id) {
            camera.stopTracking();
          }
          return false;
        }
        return true;
      });

      closeInspector();
      eventBus.emit('toast:show', `Batch deleted ${count} bodies`);
      eventBus.emit('bodies:updated');
    });
  }

  // Multi Vector Pad Drag Listeners
  if (multiVectorPadCanvas) {
    multiVectorPadCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDraggingMultiPad = true;
        handleMultiPadDrag(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingMultiPad) {
        handleMultiPadDrag(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingMultiPad) {
        isDraggingMultiPad = false;
        renderMultiVectorPad(multiPadCurrentVel);
      }
    });

    multiVectorPadCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDraggingMultiPad = true;
        handleMultiPadDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDraggingMultiPad && e.touches.length === 1) {
        e.preventDefault();
        handleMultiPadDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (isDraggingMultiPad) {
        isDraggingMultiPad = false;
        renderMultiVectorPad(multiPadCurrentVel);
      }
    });
  }

  if (multiBodiesList) {
    multiBodiesList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-body-id]');
      if (item && item.dataset.bodyId) {
        jumpToBody(item.dataset.bodyId);
      }
    });
  }

  return {
    updateMultiInspectorUI,
    initMultiPad
  };
}
