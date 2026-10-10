import { computeGravitationalForces } from '../physics/forces.js';
import { handleCollisions } from '../physics/collision.js';
import { eventBus } from '../core/event-bus.js';

/**
 * Initializes headless high-speed numerical integration time skip modal controller.
 * @param {Object} state - Global state store
 */
export function setupTimeSkipModal(state) {
  const timeSkipModal = document.getElementById('timeSkipModal');
  const btnOpenTimeSkip = document.getElementById('btnOpenTimeSkip');
  const btnCloseTimeSkip = document.getElementById('btnCloseTimeSkip');
  const btnExecuteSkip = document.getElementById('btnExecuteSkip');
  const skipTimeSecondsInput = document.getElementById('skipTimeSecondsInput');

  function openModal() {
    if (timeSkipModal) timeSkipModal.classList.remove('opacity-0', 'pointer-events-none');
  }

  function closeModal() {
    if (timeSkipModal) timeSkipModal.classList.add('opacity-0', 'pointer-events-none');
  }

  if (btnOpenTimeSkip) btnOpenTimeSkip.addEventListener('click', openModal);
  if (btnCloseTimeSkip) btnCloseTimeSkip.addEventListener('click', closeModal);

  document.querySelectorAll('.btn-quick-skip').forEach(btn => {
    btn.addEventListener('click', () => {
      if (skipTimeSecondsInput) skipTimeSecondsInput.value = btn.dataset.skip;
    });
  });

  if (btnExecuteSkip) {
    btnExecuteSkip.addEventListener('click', () => {
      const skipSeconds = Math.max(1, Math.min(50000, parseFloat(skipTimeSecondsInput ? skipTimeSecondsInput.value : 300) || 300));
      closeModal();

      // Cap maximum simulation steps to prevent freezing main thread
      const maxSteps = 3000;
      let totalSteps = Math.floor(skipSeconds / 0.25);
      let dt = 0.25;
      if (totalSteps > maxSteps) {
        totalSteps = maxSteps;
        dt = skipSeconds / totalSteps;
      }
      const startTime = performance.now();

      for (let i = 0; i < totalSteps; i++) {
        computeGravitationalForces(
          state.bodies,
          state.G,
          state.softening,
          state.enableRelativity,
          state.speedOfLight,
          state.enableGravitationalWaves
        );
        for (let j = 0; j < state.bodies.length; j++) {
          state.bodies[j].update(dt, state.trailLength, state.enableRelativity, state.speedOfLight);
        }
        handleCollisions(state);
      }

      state.elapsedTime += skipSeconds;
      const calcDuration = (performance.now() - startTime).toFixed(1);

      eventBus.emit('history:event', {
        type: 'Time Skip',
        title: `+${skipSeconds}s calculation skip completed`,
        description: `Computation time: ${calcDuration}ms | Remaining bodies: ${state.bodies.length}`,
        color: '#818cf8'
      });
      eventBus.emit('toast:show', `Skipped ${skipSeconds}s (${calcDuration}ms)`);
      eventBus.emit('bodies:updated');
    });
  }

  return { openModal, closeModal };
}
