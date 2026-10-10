/**
 * Configures global keyboard event listeners for WASD view panning, zoom hotkeys, and playback toggle.
 * @param {Object} state - Global state store
 * @param {Object} camera - Viewport camera coordinator
 * @param {Function} togglePlayPause - Simulation pause/play callback
 */
export function setupKeyboardHandler(state, camera, togglePlayPause) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const panStep = 50;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      camera.pan(0, -panStep);
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      camera.pan(0, panStep);
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      camera.pan(-panStep, 0);
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      camera.pan(panStep, 0);
    } else if (e.code === 'KeyQ' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
      camera.applyZoom(0.85);
    } else if (e.code === 'KeyE' || e.code === 'Equal' || e.code === 'NumpadAdd') {
      camera.applyZoom(1.18);
    } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
      camera.reset();
    } else if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    }
  });

  window.addEventListener('blur', () => {
    state.isLeftPanning = false;
    state.isRightDragging = false;
    state.isSpraying = false;
    state.isDraggingVelocityGizmo = false;
    state.isBoxSelecting = false;
    state.selectionBox = null;
    state.boxSelectStart = null;
    state.panStartScreen = null;
    state.potentialClickedBody = null;
    state.dragStartWorld = null;
    state.currentMouseWorld = null;
  });
}
