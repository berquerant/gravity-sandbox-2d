import { eventBus } from '../core/event-bus.js';
import { parseFlexibleNumber } from '../core/formatters.js';
import { registerAllSliderConfigs } from './slider-configs.js';


/**
 * Direct numeric input modal manager for sliders across the application.
 */
export function setupSliderModal(state) {
  const modal = document.getElementById('sliderInputModal');
  if (!modal) return null;

  const modalTitle = document.getElementById('sliderModalTitle');
  const modalIcon = document.getElementById('sliderModalIcon');
  const modalDesc = document.getElementById('sliderModalDesc');
  const modalRangeInfo = document.getElementById('sliderModalRangeInfo');
  const modalCurrentInfo = document.getElementById('sliderModalCurrentInfo');
  const modalInput = document.getElementById('sliderModalInput');
  const modalUnit = document.getElementById('sliderModalUnit');
  const modalError = document.getElementById('sliderModalError');

  const dualSection = document.getElementById('sliderModalDualSection');
  const dualLabel = document.getElementById('sliderModalDualLabel');
  const dualInput = document.getElementById('sliderModalDualInput');
  const dualUnit = document.getElementById('sliderModalDualUnit');
  const dualDesc = document.getElementById('sliderModalDualDesc');

  const presetsContainer = document.getElementById('sliderModalPresetsContainer');
  const presetsList = document.getElementById('sliderModalPresets');

  const btnClose = document.getElementById('btnCloseSliderModal');
  const btnCancel = document.getElementById('btnCancelSliderModal');
  const btnApply = document.getElementById('btnApplySliderModal');

  let activeConfig = null;
  let modalOpenTime = 0;

  function closeModal() {
    modal.classList.remove('active');
    modal.classList.add('opacity-0', 'pointer-events-none');
    activeConfig = null;
    if (modalError) modalError.classList.add('hidden');
  }

  function openModal(config) {
    activeConfig = config;
    modalOpenTime = performance.now();

    // Header & Description
    if (modalTitle) modalTitle.textContent = config.title || 'Direct Numeric Input';
    if (modalIcon) modalIcon.className = `fa-solid ${config.icon || 'fa-sliders'} text-sm`;
    if (modalDesc) modalDesc.textContent = config.desc || 'Enter an exact numerical value.';

    const currVal = typeof config.getCurrentValue === 'function' ? config.getCurrentValue() : (config.value || 0);

    // Range & Current
    if (modalRangeInfo) {
      if (typeof config.getRangeInfoText === 'function') {
        modalRangeInfo.textContent = config.getRangeInfoText();
      } else {
        modalRangeInfo.textContent = `Range: ${config.min} - ${config.max} (Step: ${config.step || 'any'})`;
      }
    }
    if (modalCurrentInfo) {
      if (typeof config.getCurrentInfoText === 'function') {
        modalCurrentInfo.textContent = config.getCurrentInfoText(currVal);
      } else {
        const displayVal = typeof config.formatDisplay === 'function' ? config.formatDisplay(currVal) : currVal;
        modalCurrentInfo.textContent = `Current: ${displayVal} ${config.unit || ''}`.trim();
      }
    }

    // Primary Input
    if (modalInput) {
      modalInput.min = config.min !== undefined ? config.min : '';
      modalInput.max = config.max !== undefined ? config.max : '';
      modalInput.step = config.step !== undefined ? config.step : 'any';
      modalInput.value = typeof config.formatInput === 'function' ? config.formatInput(currVal) : currVal;
    }
    if (modalUnit) {
      modalUnit.textContent = config.unit || '';
    }

    // Error Message Reset
    if (modalError) {
      modalError.classList.add('hidden');
      modalError.textContent = '';
    }

    // Dual Unit Section
    if (config.isDual && dualSection && dualInput) {
      dualSection.classList.remove('hidden');
      if (dualLabel) dualLabel.textContent = config.dualLabel || 'Physical Units:';
      if (dualDesc) dualDesc.textContent = config.dualDesc || 'Modifying either field synchronizes both.';
      if (dualUnit) dualUnit.textContent = config.dualUnit || '';
      const pToD = config.primaryToDual || config.pxToDual;
      if (pToD) {
        const dualVal = pToD(currVal);
        dualInput.value = typeof config.formatDual === 'function'
          ? config.formatDual(dualVal)
          : (Math.abs(dualVal) >= 1e4 || (Math.abs(dualVal) < 1e-2 && dualVal !== 0)
              ? dualVal.toExponential(3)
              : parseFloat(dualVal.toFixed(2)));
      } else {
        dualInput.value = currVal;
      }
    } else if (dualSection) {
      dualSection.classList.add('hidden');
    }

    // Presets
    if (presetsContainer && presetsList) {
      presetsList.innerHTML = '';
      if (Array.isArray(config.presets) && config.presets.length > 0) {
        presetsContainer.classList.remove('hidden');
        config.presets.forEach(p => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs mono text-cyan-300 border border-slate-700 hover:border-cyan-500/60 transition cursor-pointer';
          const label = typeof p === 'object' ? p.label : `${p} ${config.unit || ''}`.trim();
          const val = typeof p === 'object' ? p.value : p;
          btn.textContent = label;
          btn.addEventListener('click', () => {
            if (modalInput) {
              modalInput.value = typeof config.formatInput === 'function' ? config.formatInput(val) : val;
              if (config.isDual && dualInput) {
                const pToD = config.primaryToDual || config.pxToDual;
                if (pToD) {
                  const dualVal = pToD(val);
                  dualInput.value = typeof config.formatDual === 'function'
                    ? config.formatDual(dualVal)
                    : (Math.abs(dualVal) >= 1e4 || (Math.abs(dualVal) < 1e-2 && dualVal !== 0)
                        ? dualVal.toExponential(3)
                        : parseFloat(dualVal.toFixed(2)));
                }
              }
            }
          });
          presetsList.appendChild(btn);
        });
      } else {
        presetsContainer.classList.add('hidden');
      }
    }

    // Show modal & focus input
    modal.classList.add('active');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      if (modalInput) {
        modalInput.focus();
        modalInput.select();
      }
    }, 50);
  }

  function applyValue() {
    if (!activeConfig || !modalInput) return;

    if (activeConfig.isDual && dualInput && document.activeElement === dualInput) {
      const dToP = activeConfig.dualToPrimary || activeConfig.dualToPx;
      const dualVal = parseFlexibleNumber(dualInput.value);
      if (dualVal !== null && dToP) {
        const pVal = dToP(dualVal);
        modalInput.value = typeof activeConfig.formatInput === 'function'
          ? activeConfig.formatInput(pVal)
          : pVal;
      }
    }

    const rawVal = parseFlexibleNumber(modalInput.value);
    if (rawVal === null || isNaN(rawVal)) {
      if (modalError) {
        modalError.textContent = 'Please enter a valid numeric value (e.g. 5.972e24).';
        modalError.classList.remove('hidden');
      }
      return;
    }

    let finalVal = rawVal;
    if (activeConfig.min !== undefined && finalVal < activeConfig.min) {
      finalVal = activeConfig.min;
    }
    if (activeConfig.max !== undefined && finalVal > activeConfig.max) {
      finalVal = activeConfig.max;
    }

    if (typeof activeConfig.onApply === 'function') {
      activeConfig.onApply(finalVal);
    }

    const displayVal = typeof activeConfig.formatDisplay === 'function'
      ? activeConfig.formatDisplay(finalVal)
      : `${finalVal}${activeConfig.unit ? ` ${activeConfig.unit}` : ''}`;
    eventBus.emit('toast:show', `Updated ${activeConfig.title}: ${displayVal}`);
    closeModal();
  }

  // Dual Input Syncing
  if (modalInput && dualInput) {
    modalInput.addEventListener('input', () => {
      if (activeConfig && activeConfig.isDual) {
        const pToD = activeConfig.primaryToDual || activeConfig.pxToDual;
        if (pToD) {
          const primary = parseFlexibleNumber(modalInput.value);
          if (primary !== null) {
            const dual = pToD(primary);
            dualInput.value = typeof activeConfig.formatDual === 'function'
              ? activeConfig.formatDual(dual)
              : (Math.abs(dual) >= 1e4 || (Math.abs(dual) < 1e-2 && dual !== 0)
                  ? dual.toExponential(3)
                  : parseFloat(dual.toFixed(2)));
          }
        }
      }
    });

    dualInput.addEventListener('input', () => {
      if (activeConfig && activeConfig.isDual) {
        const dToP = activeConfig.dualToPrimary || activeConfig.dualToPx;
        if (dToP) {
          const dual = parseFlexibleNumber(dualInput.value);
          if (dual !== null) {
            const primary = dToP(dual);
            modalInput.value = typeof activeConfig.formatInput === 'function'
              ? activeConfig.formatInput(primary)
              : (Math.abs(primary) >= 1e4 || (Math.abs(primary) < 1e-2 && primary !== 0)
                  ? primary.toExponential(3)
                  : parseFloat(primary.toFixed(2)));
          }
        }
      }
    });
  }

  // Modal Controls
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  if (btnApply) btnApply.addEventListener('click', applyValue);

  // Close on backdrop click (ignore click within 400ms of open to prevent accidental closing)
  modal.addEventListener('click', (e) => {
    if (performance.now() - modalOpenTime < 400) return;
    if (e.target === modal) closeModal();
  });

  // Keyboard navigation: Enter to apply, Escape to close
  window.addEventListener('keydown', (e) => {
    if (!activeConfig || modal.classList.contains('pointer-events-none') || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Enter' && (document.activeElement === modalInput || document.activeElement === dualInput)) {
      e.preventDefault();
      applyValue();
    }
  });

  /**
   * Attaches click detection to range sliders so that a click (without dragging)
   * opens the input modal, while drag-scrubbing adjusts the slider smoothly without opening the modal.
   */
  function attachSliderClick(slider, onClick) {
    if (!slider) return;

    let startX = 0;
    let startY = 0;
    let isDown = false;
    let hasDragged = false;
    let downTime = 0;
    let lastTriggerTime = 0;

    function triggerModal() {
      const now = performance.now();
      if (now - lastTriggerTime < 350) return;
      lastTriggerTime = now;
      // Defer openModal by 40ms to let the browser's mouse/pointer event sequence complete
      // and prevent the modal backdrop from receiving the initial click event.
      setTimeout(() => {
        onClick();
      }, 40);
    }

    slider.addEventListener('pointerdown', (e) => {
      isDown = true;
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      downTime = performance.now();
    });

    slider.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 15) {
        hasDragged = true;
      }
    });

    slider.addEventListener('pointerup', () => {
      if (!isDown) return;
      isDown = false;
      const elapsed = performance.now() - downTime;
      // If released without significant dragging within 500ms, it is a click!
      if (!hasDragged && elapsed < 500) {
        triggerModal();
      }
    });

    slider.addEventListener('pointercancel', () => {
      isDown = false;
    });

    // Also listen to click as fallback (for keyboard, accessibility, or synthetic click)
    slider.addEventListener('click', () => {
      if (!hasDragged) {
        triggerModal();
      }
      hasDragged = false;
    });

    slider.addEventListener('dblclick', () => {
      triggerModal();
    });
  }

  // Register all slider trigger configurations
  registerAllSliderConfigs(state, openModal, attachSliderClick);

  return {
    openModal,
    closeModal
  };
}
