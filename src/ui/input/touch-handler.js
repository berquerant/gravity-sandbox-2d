import { VELOCITY_GIZMO_SCALE } from '../../renderer/overlay.js';

/**
 * Configures touch gestures (pinch-to-zoom multi-touch, single-touch pan, placement, gizmo dragging).
 * @param {HTMLCanvasElement} canvas - Target interaction canvas
 * @param {Object} state - Global state store
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} inspector - Body inspector controller
 * @param {Object} spawner - Body spawning module
 * @param {Object} hitTester - Hit testing module
 */
export function setupTouchHandler(canvas, state, camera, inspector, spawner, hitTester) {
  const { createBodyAt, spawnDiskAt, getRandomSprayVelocity } = spawner;
  const { findBodyAtScreenPos, findVelocityGizmoHandleAtScreenPos } = hitTester;

  let lastTouchDist = 0;
  let touchPanStart = null;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];

      // 1. Check if touching velocity gizmo handle
      const gizmoBody = findVelocityGizmoHandleAtScreenPos(camera, state, t.clientX, t.clientY);
      if (gizmoBody) {
        state.isDraggingVelocityGizmo = true;
        return;
      }

      const touchedBody = findBodyAtScreenPos(camera, state, t.clientX, t.clientY);
      const world = camera.screenToWorld(t.clientX, t.clientY);

      if (state.mode === 'disk') {
        const center = touchedBody ? { x: touchedBody.pos.x, y: touchedBody.pos.y } : world;
        state.dragStartWorld = center;
        state.currentMouseWorld = world;
        return;
      }

      if (touchedBody) {
        inspector.openInspector(touchedBody);
        return;
      }

      if (state.mode === 'pan') {
        state.isRightDragging = true;
        state.lastMouseScreen = { x: t.clientX, y: t.clientY };
        camera.stopTracking();
        return;
      }

      if (state.mode === 'launch') {
        state.dragStartWorld = world;
        state.currentMouseWorld = world;
      } else if (state.mode === 'spray') {
        state.isSpraying = true;
        createBodyAt(state, world, getRandomSprayVelocity(state));
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
      touchPanStart = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];

      // Dragging velocity gizmo
      if (state.isDraggingVelocityGizmo) {
        const b = state.bodies.find(x => x.id === state.selectedBodyId);
        if (b) {
          const origin = camera.worldToScreen(b.pos.x, b.pos.y);
          const dx = t.clientX - origin.x;
          const dy = t.clientY - origin.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 3) {
            b.vel.set(0, 0);
          } else {
            let vx = dx / VELOCITY_GIZMO_SCALE;
            let vy = dy / VELOCITY_GIZMO_SCALE;
            if (state.enableRelativity && state.speedOfLight > 0) {
              const spd = Math.hypot(vx, vy);
              if (spd >= state.speedOfLight) {
                const factor = (state.speedOfLight * 0.9999) / spd;
                vx *= factor;
                vy *= factor;
              }
            }
            b.vel.x = vx;
            b.vel.y = vy;
          }
          inspector.updateInspectorUI();
        }
        return;
      }

      if (state.isRightDragging) {
        const dx = t.clientX - state.lastMouseScreen.x;
        const dy = t.clientY - state.lastMouseScreen.y;
        state.camera.x -= dx / state.camera.zoom;
        state.camera.y -= dy / state.camera.zoom;
        state.lastMouseScreen = { x: t.clientX, y: t.clientY };
        return;
      }
      const world = camera.screenToWorld(t.clientX, t.clientY);
      state.currentMouseWorld = world;
      if (state.isSpraying && state.mode === 'spray') {
        createBodyAt(state, world, getRandomSprayVelocity(state));
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };

      if (touchPanStart) {
        state.camera.x -= (center.x - touchPanStart.x) / state.camera.zoom;
        state.camera.y -= (center.y - touchPanStart.y) / state.camera.zoom;
        touchPanStart = center;
      }

      if (lastTouchDist > 0 && currentDist > 0) {
        const factor = currentDist / lastTouchDist;
        camera.applyZoom(factor, center.x, center.y);
      }
      lastTouchDist = currentDist;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    if (state.isDraggingVelocityGizmo) {
      state.isDraggingVelocityGizmo = false;
      inspector.updateInspectorUI();
    }
    if (state.isRightDragging) state.isRightDragging = false;
    if (state.isSpraying) state.isSpraying = false;
    if (state.mode === 'launch' && state.dragStartWorld && state.currentMouseWorld) {
      const vx = (state.dragStartWorld.x - state.currentMouseWorld.x) * 0.05;
      const vy = (state.dragStartWorld.y - state.currentMouseWorld.y) * 0.05;
      createBodyAt(state, state.dragStartWorld, { x: vx, y: vy });
      state.dragStartWorld = null;
      state.currentMouseWorld = null;
    } else if (state.mode === 'disk' && state.dragStartWorld && state.currentMouseWorld) {
      const dragDist = Math.hypot(
        state.currentMouseWorld.x - state.dragStartWorld.x,
        state.currentMouseWorld.y - state.dragStartWorld.y
      );
      const effectiveRadius = dragDist > 15 ? dragDist : (state.diskPlacement?.baseRadius || 200);
      spawnDiskAt(state, state.dragStartWorld, effectiveRadius);
      state.dragStartWorld = null;
      state.currentMouseWorld = null;
    }
    lastTouchDist = 0;
  });
}
