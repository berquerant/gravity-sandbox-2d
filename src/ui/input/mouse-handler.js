import { VELOCITY_GIZMO_SCALE } from '../../renderer/overlay.js';
import { eventBus } from '../../core/event-bus.js';

/**
 * Binds mouse events (drag-pan, box-select, trajectory launch, continuous spray, disk placement, wheel zoom).
 * @param {HTMLCanvasElement} canvas - Target interaction canvas
 * @param {Object} state - Global state store
 * @param {Object} camera - Viewport camera coordinator
 * @param {Object} tooltip - Floating metrics tooltip controller
 * @param {Object} inspector - Body inspector controller
 * @param {Object} spawner - Body spawning module
 * @param {Object} hitTester - Hit testing module
 */
export function setupMouseHandler(canvas, state, camera, tooltip, inspector, spawner, hitTester) {
  const { createBodyAt, spawnDiskAt, getRandomSprayVelocity } = spawner;
  const { findBodyAtScreenPos, findBodiesInScreenRect, findVelocityGizmoHandleAtScreenPos } = hitTester;

  canvas.addEventListener('mousedown', (e) => {
    // 1. Right button in pan mode = Box selection
    if (e.button === 2 && state.mode === 'pan') {
      state.isBoxSelecting = true;
      state.boxSelectStart = { x: e.clientX, y: e.clientY };
      state.selectionBox = {
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
      };
      tooltip.updateTooltip(null);
      canvas.style.cursor = 'crosshair';
      return;
    }

    // 2. Middle button, Alt-drag, or Right button in other modes = Pan camera
    if (e.button === 1 || e.altKey || (e.button === 2 && state.mode !== 'pan')) {
      state.isRightDragging = true;
      state.lastMouseScreen = { x: e.clientX, y: e.clientY };
      camera.stopTracking();
      return;
    }

    if (e.button === 0) {
      // 1. Check if clicking on velocity gizmo handle of selected body
      const gizmoBody = findVelocityGizmoHandleAtScreenPos(camera, state, e.clientX, e.clientY);
      if (gizmoBody) {
        state.isDraggingVelocityGizmo = true;
        canvas.style.cursor = 'crosshair';
        return;
      }

      // 2. Pan mode interaction: Left-drag pans screen, clicking body opens inspector
      if (state.mode === 'pan') {
        const clickedBody = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
        state.isLeftPanning = true;
        state.panStartScreen = { x: e.clientX, y: e.clientY };
        state.lastMouseScreen = { x: e.clientX, y: e.clientY };
        state.potentialClickedBody = clickedBody;
        return;
      }

      // 3. Other modes: In disk mode, snap center to clicked body if any, or click position
      const clickedBody = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
      const world = camera.screenToWorld(e.clientX, e.clientY);

      if (state.mode === 'disk') {
        const center = clickedBody ? { x: clickedBody.pos.x, y: clickedBody.pos.y } : world;
        state.dragStartWorld = center;
        state.currentMouseWorld = world;
        return;
      }

      if (clickedBody) {
        inspector.openInspector(clickedBody);
        return;
      }

      if (state.mode === 'launch') {
        state.dragStartWorld = world;
        state.currentMouseWorld = world;
      } else if (state.mode === 'spray') {
        state.isSpraying = true;
        createBodyAt(state, world, getRandomSprayVelocity(state));
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    // 1. Dragging velocity gizmo
    if (state.isDraggingVelocityGizmo) {
      const b = state.bodies.find(x => x.id === state.selectedBodyId);
      if (b) {
        const origin = camera.worldToScreen(b.pos.x, b.pos.y);
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
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

    // 2. Box selecting in pan mode (via right-click drag)
    if (state.isBoxSelecting && state.boxSelectStart) {
      state.selectionBox = {
        startX: state.boxSelectStart.x,
        startY: state.boxSelectStart.y,
        currentX: e.clientX,
        currentY: e.clientY
      };
      tooltip.updateTooltip(null);
      canvas.style.cursor = 'crosshair';
      return;
    }

    // 3. Left-click dragging camera view in pan mode
    if (state.isLeftPanning && state.panStartScreen) {
      const movedDist = Math.hypot(e.clientX - state.panStartScreen.x, e.clientY - state.panStartScreen.y);
      if (movedDist > 3) {
        camera.stopTracking();
        canvas.style.cursor = 'grabbing';
      }
      const dx = e.clientX - state.lastMouseScreen.x;
      const dy = e.clientY - state.lastMouseScreen.y;
      state.camera.x -= dx / state.camera.zoom;
      state.camera.y -= dy / state.camera.zoom;
      state.lastMouseScreen = { x: e.clientX, y: e.clientY };
      tooltip.updateTooltip(null);
      return;
    }

    // 4. Middle/Alt/Right dragging camera view
    if (state.isRightDragging) {
      const dx = e.clientX - state.lastMouseScreen.x;
      const dy = e.clientY - state.lastMouseScreen.y;
      state.camera.x -= dx / state.camera.zoom;
      state.camera.y -= dy / state.camera.zoom;
      state.lastMouseScreen = { x: e.clientX, y: e.clientY };
      return;
    }

    // 5. Hovering velocity gizmo
    const isGizmoHovered = !!findVelocityGizmoHandleAtScreenPos(camera, state, e.clientX, e.clientY);
    state.hoveredVelocityGizmo = isGizmoHovered;
    if (isGizmoHovered) {
      canvas.style.cursor = 'grab';
      tooltip.updateTooltip(null);
      return;
    }

    const world = camera.screenToWorld(e.clientX, e.clientY);
    state.currentMouseWorld = world;

    if (state.mode === 'pan') {
      const hovered = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
      tooltip.updateTooltip(hovered, e.clientX, e.clientY);
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    } else if (state.mode === 'disk') {
      const hovered = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
      tooltip.updateTooltip(null);
      canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    } else {
      tooltip.updateTooltip(null);
      canvas.style.cursor = 'crosshair';
    }

    if (state.isSpraying && state.mode === 'spray') {
      createBodyAt(state, world, getRandomSprayVelocity(state));
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (state.isDraggingVelocityGizmo) {
      state.isDraggingVelocityGizmo = false;
      inspector.updateInspectorUI();
    }

    // Finish left-click pan or click-to-inspect in pan mode
    if (state.isLeftPanning) {
      state.isLeftPanning = false;
      const dragDist = state.panStartScreen
        ? Math.hypot(e.clientX - state.panStartScreen.x, e.clientY - state.panStartScreen.y)
        : 0;

      if (dragDist <= 5) {
        if (state.potentialClickedBody) {
          inspector.openInspector(state.potentialClickedBody);
        } else {
          inspector.closeInspector();
        }
      }
      state.panStartScreen = null;
      state.potentialClickedBody = null;
      if (state.mode === 'pan') {
        const hovered = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
      }
    }

    // Finish right-click box selection
    if (state.isBoxSelecting && state.boxSelectStart) {
      state.isBoxSelecting = false;
      const startX = state.boxSelectStart.x;
      const startY = state.boxSelectStart.y;
      const endX = e.clientX;
      const endY = e.clientY;
      const dragDist = Math.hypot(endX - startX, endY - startY);

      state.selectionBox = null;
      state.boxSelectStart = null;

      if (dragDist > 8) {
        // Enclosed bodies in the drag rectangle
        const selected = findBodiesInScreenRect(camera, state, startX, startY, endX, endY);
        if (selected.length > 1) {
          inspector.openMultiInspector(selected);
          eventBus.emit('toast:show', `Box-selected ${selected.length} bodies`);
        } else if (selected.length === 1) {
          inspector.openInspector(selected[0]);
        } else {
          inspector.closeInspector();
        }
      }
      if (state.mode === 'pan') {
        const hovered = findBodyAtScreenPos(camera, state, e.clientX, e.clientY);
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
      }
    }

    if (e.button === 2 || e.button === 1 || state.isRightDragging) {
      state.isRightDragging = false;
    }

    if (state.isSpraying) {
      state.isSpraying = false;
    }

    if (state.mode === 'launch' && state.dragStartWorld && state.currentMouseWorld) {
      const vx = (state.dragStartWorld.x - state.currentMouseWorld.x) * 0.05;
      const vy = (state.dragStartWorld.y - state.currentMouseWorld.y) * 0.05;
      createBodyAt(state, state.dragStartWorld, { x: vx, y: vy });

      state.dragStartWorld = null;
      state.currentMouseWorld = null;
    } else if (state.mode === 'disk' && state.dragStartWorld) {
      const mouseWorld = state.currentMouseWorld || state.dragStartWorld;
      const dragDist = Math.hypot(
        mouseWorld.x - state.dragStartWorld.x,
        mouseWorld.y - state.dragStartWorld.y
      );
      const effectiveRadius = dragDist > 15 ? dragDist : (state.diskPlacement?.baseRadius || 200);
      spawnDiskAt(state, state.dragStartWorld, effectiveRadius);

      state.dragStartWorld = null;
      if (!state.currentMouseWorld) {
        state.currentMouseWorld = mouseWorld;
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.updateTooltip(null);
    state.currentMouseWorld = null;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    let zoomFactor;
    if (e.ctrlKey) {
      // Trackpad pinch gesture
      zoomFactor = Math.exp(-e.deltaY * 0.01);
    } else {
      zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    }
    camera.applyZoom(zoomFactor, e.clientX, e.clientY);
  }, { passive: false });
}
