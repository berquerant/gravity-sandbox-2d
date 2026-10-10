import { eventBus } from '../../core/event-bus.js';

/**
 * Coordinates mode switching (launch, spray, disk, pan) and section visibility in the right panel.
 * @param {Object} state - Global state store
 * @param {Object} elements - DOM element references
 * @param {Object} diskController - Disk controls coordinator
 */
export function setupModeController(state, elements, diskController) {
  const {
    sidePanel,
    btnToggleSidePanel,
    btnClosePanel,
    modeLaunch,
    modeSpray,
    modeDisk,
    modePan,
    modeDesc,
    panelHeaderTitle,
    panelHeaderIcon,
    bodyPlacementSection,
    diskParametersSection,
    spraySpeedContainer,
    panModeNotice,
    physicsVisualizationSection
  } = elements;

  function setSidePanelOpen(open) {
    state.isSidePanelOpen = open;
    if (sidePanel && btnToggleSidePanel) {
      if (open) {
        sidePanel.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
        btnToggleSidePanel.classList.remove('bg-cyan-600', 'border-cyan-400');
        btnToggleSidePanel.classList.add('bg-cyan-500', 'ring-2', 'ring-cyan-300');
        eventBus.emit('inspector:close');
      } else {
        sidePanel.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
        btnToggleSidePanel.classList.remove('bg-cyan-500', 'ring-2', 'ring-cyan-300');
        btnToggleSidePanel.classList.add('bg-cyan-600', 'border-cyan-400');
      }
    }
  }

  function resetModeButtons() {
    [modeLaunch, modeSpray, modeDisk, modePan].forEach(btn => {
      if (btn) {
        btn.className = 'mode-btn flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg border text-xs font-medium transition bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700';
      }
    });
  }

  const MODE_CONFIGS = {
    launch: {
      btn: modeLaunch,
      desc: 'Drag to draw velocity vector and release to launch.',
      title: 'Launch Parameters',
      icon: 'fa-solid fa-location-arrow text-cyan-400',
      showPlacement: true,
      showDisk: false,
      showSpray: false,
      showPanNotice: false,
      showPhysicsVis: false,
      hideTooltip: true
    },
    spray: {
      btn: modeSpray,
      desc: 'Drag on canvas to spray stream of particles with random velocity.',
      title: 'Spray Parameters',
      icon: 'fa-solid fa-spray-can text-cyan-400',
      showPlacement: true,
      showDisk: false,
      showSpray: true,
      showPanNotice: false,
      showPhysicsVis: false,
      hideTooltip: true
    },
    disk: {
      btn: modeDisk,
      desc: 'Click or drag on canvas to place disk / ring of orbiting bodies.',
      title: 'Disk / Ring Parameters',
      icon: 'fa-solid fa-circle-notch text-cyan-400',
      showPlacement: true,
      showDisk: true,
      showSpray: false,
      showPanNotice: false,
      showPhysicsVis: false,
      hideTooltip: true,
      onActivate: () => diskController?.updateDiskParametersUI()
    },
    pan: {
      btn: modePan,
      desc: 'Left-drag to pan screen (click body to inspect). Right-drag to box-select multiple bodies.',
      title: 'Visualization & Physics',
      icon: 'fa-solid fa-sliders text-cyan-400',
      showPlacement: false,
      showDisk: false,
      showSpray: false,
      showPanNotice: true,
      showPhysicsVis: true,
      hideTooltip: false
    }
  };

  function setOperationMode(mode) {
    state.mode = mode;
    resetModeButtons();

    const cfg = MODE_CONFIGS[mode];
    if (!cfg) return;

    if (cfg.btn) {
      cfg.btn.className = 'mode-btn active flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg border text-xs font-medium transition bg-cyan-600 border-cyan-400 text-white shadow';
    }
    if (modeDesc) modeDesc.textContent = cfg.desc;
    if (panelHeaderTitle) panelHeaderTitle.textContent = cfg.title;
    if (panelHeaderIcon) panelHeaderIcon.className = cfg.icon;

    if (bodyPlacementSection) bodyPlacementSection.classList.toggle('hidden', !cfg.showPlacement);
    if (diskParametersSection) diskParametersSection.classList.toggle('hidden', !cfg.showDisk);
    if (spraySpeedContainer) spraySpeedContainer.classList.toggle('hidden', !cfg.showSpray);
    if (panModeNotice) panModeNotice.classList.toggle('hidden', !cfg.showPanNotice);
    if (physicsVisualizationSection) physicsVisualizationSection.classList.toggle('hidden', !cfg.showPhysicsVis);

    if (cfg.hideTooltip) eventBus.emit('tooltip:hide');
    if (cfg.onActivate) cfg.onActivate();
  }

  if (btnToggleSidePanel) {
    btnToggleSidePanel.addEventListener('click', () => setSidePanelOpen(!state.isSidePanelOpen));
  }
  if (btnClosePanel) {
    btnClosePanel.addEventListener('click', () => setSidePanelOpen(false));
  }

  if (modeLaunch) modeLaunch.addEventListener('click', () => setOperationMode('launch'));
  if (modeSpray) modeSpray.addEventListener('click', () => setOperationMode('spray'));
  if (modeDisk) modeDisk.addEventListener('click', () => setOperationMode('disk'));
  if (modePan) modePan.addEventListener('click', () => setOperationMode('pan'));

  return {
    setSidePanelOpen,
    setOperationMode
  };
}
