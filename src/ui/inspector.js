import { eventBus } from '../core/event-bus.js';
import { setupSingleView } from './inspector/single-view.js';
import { setupMultiView } from './inspector/multi-view.js';
import { Camera } from '../renderer/camera.js';

/**
 * Coordinates the inspector side drawer for inspecting and editing single bodies or batch multi-selections.
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @returns {Object} Inspector API methods
 */
export function setupInspector(state, camera) {
  const elements = {
    inspectorPanel: document.getElementById('inspectorPanel'),
    btnCloseInspector: document.getElementById('btnCloseInspector'),
    inspHeaderTitle: document.getElementById('inspHeaderTitle'),
    inspHeaderIcon: document.getElementById('inspHeaderIcon'),

    inspectorSingleView: document.getElementById('inspectorSingleView'),
    inspectorMultiView: document.getElementById('inspectorMultiView'),

    // Single view elements
    btnTrackBody: document.getElementById('btnTrackBody'),
    btnTrackBodyLabel: document.getElementById('btnTrackBodyLabel'),
    btnToggleRelativeOriginInsp: document.getElementById('btnToggleRelativeOriginInsp'),
    btnToggleRelativeOriginInspLabel: document.getElementById('btnToggleRelativeOriginInspLabel'),
    editBodyName: document.getElementById('editBodyName'),
    editBodyColor: document.getElementById('editBodyColor'),
    editBodyColorHex: document.getElementById('editBodyColorHex'),
    editBodyMass: document.getElementById('editBodyMass'),
    editBodyRadius: document.getElementById('editBodyRadius'),
    editBodyRadiusVal: document.getElementById('editBodyRadiusVal'),
    editBodySpeed: document.getElementById('editBodySpeed'),
    editBodyAngle: document.getElementById('editBodyAngle'),
    inspRelSpeedRatio: document.getElementById('inspRelSpeedRatio'),
    vectorPadCanvas: document.getElementById('vectorPadCanvas'),
    btnResetVelocity: document.getElementById('btnResetVelocity'),
    btnDeleteBody: document.getElementById('btnDeleteBody'),

    // Multi view elements
    multiCountLabel: document.getElementById('multiCountLabel'),
    multiTotalMass: document.getElementById('multiTotalMass'),
    multiAvgSpeed: document.getElementById('multiAvgSpeed'),
    multiLargestBody: document.getElementById('multiLargestBody'),
    multiFastestBody: document.getElementById('multiFastestBody'),
    multiBodiesList: document.getElementById('multiBodiesList'),
    multiListCount: document.getElementById('multiListCount'),
    btnMultiResetVelocity: document.getElementById('btnMultiResetVelocity'),
    multiVectorPadCanvas: document.getElementById('multiVectorPadCanvas'),
    editMultiSpeed: document.getElementById('editMultiSpeed'),
    editMultiAngle: document.getElementById('editMultiAngle'),
    btnMultiDeleteBodies: document.getElementById('btnMultiDeleteBodies'),
    btnMultiDeleteLabel: document.getElementById('btnMultiDeleteLabel'),

    // Metrics & Badges
    inspId: document.getElementById('inspId'),
    inspAge: document.getElementById('inspAge'),
    inspAbsorbCount: document.getElementById('inspAbsorbCount'),
    inspPrimaryBadge: document.getElementById('inspPrimaryBadge'),
    inspBlackHoleBadge: document.getElementById('inspBlackHoleBadge'),
    inspPrimaryRow: document.getElementById('inspPrimaryRow'),
    inspPrimaryArrow: document.getElementById('inspPrimaryArrow'),
    inspDistancePrimary: document.getElementById('inspDistancePrimary'),
    inspHillRadius: document.getElementById('inspHillRadius'),
    inspSchwarzschildRow: document.getElementById('inspSchwarzschildRow'),
    inspSchwarzschildRadius: document.getElementById('inspSchwarzschildRadius'),
    inspParentRow: document.getElementById('inspParentRow'),
    inspParentName: document.getElementById('inspParentName'),
    inspParentDistance: document.getElementById('inspParentDistance'),
    inspCapturedRow: document.getElementById('inspCapturedRow'),
    inspCapturedTitle: document.getElementById('inspCapturedTitle'),
    inspCapturedIcon: document.getElementById('inspCapturedIcon'),
    inspCapturedList: document.getElementById('inspCapturedList'),
    inspRelMassRow: document.getElementById('inspRelMassRow'),
    inspRelMassVal: document.getElementById('inspRelMassVal'),
    inspProperAgeRow: document.getElementById('inspProperAgeRow'),
    inspProperAge: document.getElementById('inspProperAge'),
    inspTimeDilationLag: document.getElementById('inspTimeDilationLag'),
    inspRelativityCard: document.getElementById('inspRelativityCard'),
    inspTimeDilationRate: document.getElementById('inspTimeDilationRate'),
    inspKinematicDilation: document.getElementById('inspKinematicDilation'),
    inspGravDilation: document.getElementById('inspGravDilation')
  };

  function jumpToBody(bodyId) {
    if (bodyId == null) return;
    const target = state.bodies.find(x => String(x.id) === String(bodyId));
    if (target) {
      openInspector(target);
      eventBus.emit('body:selected', target);
    }
  }

  function closeInspector() {
    state.selectedBodyId = null;
    if (state.selectedBodyIds) {
      state.selectedBodyIds.clear();
    }
    if (elements.inspectorPanel) {
      elements.inspectorPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-x-6');
    }
  }

  const singleView = setupSingleView(state, camera, elements, jumpToBody, closeInspector);
  const multiView = setupMultiView(state, camera, elements, jumpToBody, openInspector, closeInspector);

  function openInspector(b) {
    if (!b) return;
    state.selectedBodyId = b.id;
    if (state.selectedBodyIds) {
      state.selectedBodyIds.clear();
      state.selectedBodyIds.add(b.id);
    }
    if (elements.inspCapturedList) {
      elements.inspCapturedList.innerHTML = '';
    }
    eventBus.emit('sidepanel:close');

    if (elements.inspHeaderTitle) elements.inspHeaderTitle.textContent = 'Edit Body';
    if (elements.inspHeaderIcon) elements.inspHeaderIcon.className = 'fa-solid fa-pen-to-square text-cyan-400';
    if (elements.inspectorSingleView) elements.inspectorSingleView.classList.remove('hidden');
    if (elements.inspectorMultiView) elements.inspectorMultiView.classList.add('hidden');

    singleView.populateSingleView(b);

    if (elements.inspectorPanel) {
      elements.inspectorPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-6');
    }
    updateInspectorUI();
  }

  function openMultiInspector(bodyList) {
    if (!bodyList || bodyList.length === 0) {
      closeInspector();
      return;
    }
    if (bodyList.length === 1) {
      openInspector(bodyList[0]);
      return;
    }

    state.selectedBodyId = null;
    if (state.selectedBodyIds) {
      state.selectedBodyIds.clear();
      bodyList.forEach(b => state.selectedBodyIds.add(b.id));
    }
    eventBus.emit('sidepanel:close');

    if (elements.inspHeaderTitle) elements.inspHeaderTitle.textContent = `Batch Edit (${bodyList.length} bodies)`;
    if (elements.inspHeaderIcon) elements.inspHeaderIcon.className = 'fa-solid fa-object-group text-cyan-400';
    if (elements.inspectorSingleView) elements.inspectorSingleView.classList.add('hidden');
    if (elements.inspectorMultiView) elements.inspectorMultiView.classList.remove('hidden');
    if (elements.inspPrimaryBadge) elements.inspPrimaryBadge.classList.add('hidden');
    if (elements.inspBlackHoleBadge) elements.inspBlackHoleBadge.classList.add('hidden');
    if (elements.inspSchwarzschildRow) elements.inspSchwarzschildRow.classList.add('hidden');
    if (elements.inspRelMassRow) elements.inspRelMassRow.classList.add('hidden');
    if (elements.inspProperAgeRow) elements.inspProperAgeRow.classList.add('hidden');
    if (elements.inspRelativityCard) elements.inspRelativityCard.classList.add('hidden');

    multiView.initMultiPad(bodyList);

    if (elements.inspectorPanel) {
      elements.inspectorPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-6');
    }
    updateInspectorUI();
  }

  function updateInspectorUI() {
    if (state.selectedBodyIds && state.selectedBodyIds.size > 1) {
      multiView.updateMultiInspectorUI();
      return;
    }
    singleView.updateSingleInspectorUI();
  }

  if (elements.btnCloseInspector) {
    elements.btnCloseInspector.addEventListener('click', closeInspector);
  }

  eventBus.on('body:selected', (b) => openInspector(b));
  eventBus.on('bodies:multi-selected', (bodyList) => openMultiInspector(bodyList));
  eventBus.on('inspector:close', closeInspector);
  eventBus.on('relativeOrigin:changed', () => singleView.updateTrackButtonState());
  eventBus.on('camera:untrack', () => singleView.updateTrackButtonState());
  eventBus.on('camera:track', () => singleView.updateTrackButtonState());

  return {
    openInspector,
    openMultiInspector,
    closeInspector,
    updateInspectorUI,
    updateTrackButtonState: singleView.updateTrackButtonState
  };
}
