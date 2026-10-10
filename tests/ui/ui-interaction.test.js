import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupGlobalDom } from './dom-helper.js';
import { Body } from '../../src/models/body.js';
import { eventBus } from '../../src/core/event-bus.js';
import { setupTimeSkipModal } from '../../src/ui/time-skip-modal.js';
import { setupSidePanel } from '../../src/ui/side-panel.js';
import { setupBodyCatalog } from '../../src/ui/body-catalog.js';
import { setupHistoryDrawer } from '../../src/ui/history-drawer.js';
import { setupSliderModal } from '../../src/ui/slider-modal.js';
import { setupToast } from '../../src/ui/toast.js';

describe('UI Interaction & Controller Integration', () => {
  let domEnv;
  let state;
  let mockCamera;

  beforeEach(() => {
    domEnv = setupGlobalDom();

    state = {
      bodies: [],
      archivedBodies: [],
      G: 1.0,
      timeScale: 1.0,
      isPaused: false,
      softening: 5.0,
      collisions: true,
      enableRelativity: false,
      speedOfLight: 150,
      enableGravitationalWaves: false,
      showTrails: true,
      trailLength: 200,
      showHillSphere: true,
      showDistanceLines: true,
      showBodyNames: true,
      showGravityField: false,
      showGravityContours: false,
      effectivePotentialMode: false,
      mode: 'pan',
      currentPreset: 'solar',
      spraySpeed: 0.3,
      diskPlacement: {
        count: 40,
        baseRadius: 200,
        radiusJitterPct: 15,
        baseSpeed: 5.0,
        speedJitterPct: 10,
        direction: 'ccw',
        autoKeplerian: true
      },
      elapsedTime: 0,
      historyEvents: [],
      selectedBodyId: null,
      selectedBodyIds: new Set(),
      hoveredBodyId: null,
      trackedBodyId: null,
      relativeOriginBodyId: null,
      isSidePanelOpen: false,
      bodyListSortKey: 'absorb',
      bodyListSortAsc: false,
      isBodyListOpen: false,
      newBody: {
        mass: 100,
        isNegative: false,
        radius: 12,
        color: '#38bdf8',
        isFixed: false,
        autoRadius: true
      }
    };

    mockCamera = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      trackBody: () => {},
      stopTracking: () => {},
      reset: () => {}
    };
  });

  afterEach(() => {
    domEnv.restore();
    eventBus.clear();
  });

  describe('Time Skip Modal Interactions', () => {
    test('open and close modal toggles visibility classes', () => {
      setupTimeSkipModal(state);
      const modal = domEnv.mockDocument.getElementById('timeSkipModal');
      const btnOpen = domEnv.mockDocument.getElementById('btnOpenTimeSkip');
      const btnClose = domEnv.mockDocument.getElementById('btnCloseTimeSkip');

      assert.ok(modal.classList.contains('opacity-0'), 'Modal starts hidden');

      btnOpen.click();
      assert.ok(!modal.classList.contains('opacity-0'), 'Modal opened (opacity-0 removed)');

      btnClose.click();
      assert.ok(modal.classList.contains('opacity-0'), 'Modal closed (opacity-0 added)');
    });

    test('quick skip buttons update the numeric input field', () => {
      setupTimeSkipModal(state);
      const input = domEnv.mockDocument.getElementById('skipTimeSecondsInput');
      const quickBtns = domEnv.mockDocument.querySelectorAll('.btn-quick-skip');

      assert.ok(quickBtns.length > 0);
      const firstBtn = quickBtns[0];
      const skipSec = firstBtn.dataset.skip;

      firstBtn.click();
      assert.equal(input.value, skipSec, 'Input value updated by quick skip button');
    });

    test('executing skip advances simulation time and emits history and toast events', () => {
      setupTimeSkipModal(state);
      const input = domEnv.mockDocument.getElementById('skipTimeSecondsInput');
      const btnExec = domEnv.mockDocument.getElementById('btnExecuteSkip');

      input.value = '100';

      const eventsReceived = [];
      eventBus.on('history:event', (e) => eventsReceived.push(e));
      eventBus.on('toast:show', (msg) => eventsReceived.push(msg));

      btnExec.click();

      assert.equal(state.elapsedTime, 100, 'State elapsed time advanced by skip duration');
      assert.ok(eventsReceived.some(e => e.type === 'Time Skip'), 'Emitted history event for Time Skip');
    });
  });

  describe('Side Panel and Mode Switching Interactions', () => {
    test('panel toggle button switches open state and updates css classes', () => {
      setupSidePanel(state);
      const panel = domEnv.mockDocument.getElementById('sidePanel');
      const btnToggle = domEnv.mockDocument.getElementById('btnToggleSidePanel');

      assert.ok(panel.classList.contains('translate-x-full'), 'Panel starts closed');

      btnToggle.click();
      assert.equal(state.isSidePanelOpen, true, 'state.isSidePanelOpen updated to true');
      assert.ok(!panel.classList.contains('translate-x-full'), 'Panel opened');

      btnToggle.click();
      assert.equal(state.isSidePanelOpen, false, 'state.isSidePanelOpen updated to false');
      assert.ok(panel.classList.contains('translate-x-full'), 'Panel closed');
    });

    test('switching placement mode updates state.mode and toggles disk parameters section', () => {
      setupSidePanel(state);
      const modeDisk = domEnv.mockDocument.getElementById('modeDisk');
      const modeSpray = domEnv.mockDocument.getElementById('modeSpray');
      const diskSection = domEnv.mockDocument.getElementById('diskParametersSection');

      modeDisk.click();
      assert.equal(state.mode, 'disk', 'state.mode switched to disk');
      assert.ok(!diskSection.classList.contains('hidden'), 'Disk parameter section is shown');

      modeSpray.click();
      assert.equal(state.mode, 'spray', 'state.mode switched to spray');
      assert.ok(diskSection.classList.contains('hidden'), 'Disk parameter section is hidden');
    });

    test('disk direction buttons toggle clockwise and counter-clockwise state', () => {
      setupSidePanel(state);
      const btnCW = domEnv.mockDocument.getElementById('btnDiskDirCW');
      const btnCCW = domEnv.mockDocument.getElementById('btnDiskDirCCW');

      btnCW.click();
      assert.equal(state.diskPlacement.direction, 'cw', 'Direction updated to cw');

      btnCCW.click();
      assert.equal(state.diskPlacement.direction, 'ccw', 'Direction updated to ccw');
    });
  });

  describe('Body Catalog Interactions & Event Delegation', () => {
    test('opening catalog renders bodies and clicking Select triggers body:selected via delegation', () => {
      setupBodyCatalog(state, mockCamera);
      const testBody = new Body({ id: 'earth-id-1', name: 'Earth', mass: 10, radius: 8, color: '#38bdf8' });
      state.bodies = [testBody];

      const btnOpen = domEnv.mockDocument.getElementById('btnOpenBodyList');
      const tableBody = domEnv.mockDocument.getElementById('bodyTableBody');

      btnOpen.click();

      // Check row rendered
      const selectBtn = tableBody.querySelector('.btn-list-view');
      assert.ok(selectBtn, 'Rendered select button in table');
      assert.equal(selectBtn.dataset.id, 'earth-id-1');

      let selectedBody = null;
      eventBus.on('body:selected', (b) => {
        selectedBody = b;
      });

      // Trigger delegated click
      selectBtn.click();
      assert.ok(selectedBody, 'eventBus emitted body:selected');
      assert.equal(selectedBody.id, 'earth-id-1');
    });

    test('clearing archived bodies clears state and shows toast', () => {
      setupBodyCatalog(state, mockCamera);
      state.archivedBodies = [{ id: 'dead-1', name: 'Dead Star' }];

      let toastReceived = null;
      eventBus.on('toast:show', (msg) => {
        toastReceived = msg;
      });

      const btnClear = domEnv.mockDocument.getElementById('btnClearArchivedBodies');
      btnClear.click();

      assert.equal(state.archivedBodies.length, 0, 'Archived bodies array emptied');
      assert.ok(toastReceived, 'Toast notification emitted');
    });
  });

  describe('History Drawer Interactions', () => {
    test('receiving history:event updates the badge and adds entry to list', () => {
      setupHistoryDrawer(state);
      const badge = domEnv.mockDocument.getElementById('eventCountBadge');
      const list = domEnv.mockDocument.getElementById('historyList');

      assert.equal(state.historyEvents.length, 0);

      eventBus.emit('history:event', {
        type: 'Collision',
        title: 'Collision test',
        description: 'b1 merged into b2',
        color: '#f59e0b'
      });

      assert.equal(state.historyEvents.length, 1);
      assert.equal(badge.textContent, '1', 'Badge count updated to 1');
      assert.ok(list.innerHTML.includes('Collision test'), 'Event title rendered in history list');
    });

    test('clear history button empties the list and resets badge', () => {
      setupHistoryDrawer(state);
      state.historyEvents = [{ id: 'evt-1', time: 10, type: 'Test', title: 'T', description: 'D', color: '#fff' }];

      const btnClear = domEnv.mockDocument.getElementById('btnClearHistory');
      const badge = domEnv.mockDocument.getElementById('eventCountBadge');

      btnClear.click();
      assert.equal(state.historyEvents.length, 0, 'historyEvents array emptied');
      assert.equal(badge.textContent, '0', 'Badge count reset to 0');
    });
  });

  describe('Slider Modal Interactions', () => {
    test('opening slider modal sets parameters and applying passes parsed value to callback', () => {
      const modalController = setupSliderModal(state);
      const modal = domEnv.mockDocument.getElementById('sliderInputModal');
      const input = domEnv.mockDocument.getElementById('sliderModalInput');
      const btnApply = domEnv.mockDocument.getElementById('btnApplySliderModal');

      assert.ok(modal.classList.contains('opacity-0'), 'Modal starts closed');

      let appliedValue = null;
      modalController.openModal({
        title: 'Adjust Velocity',
        value: 12.5,
        min: 0,
        max: 100,
        unit: 'km/s',
        onApply: (val) => {
          appliedValue = val;
        }
      });

      assert.ok(!modal.classList.contains('opacity-0'), 'Modal opened');
      assert.equal(input.value, '12.5', 'Input initialized with current value');

      // Edit value and apply
      input.value = '45.0';
      btnApply.click();

      assert.equal(appliedValue, 45.0, 'Callback received parsed numerical value');
      assert.ok(modal.classList.contains('opacity-0'), 'Modal closed after apply');
    });
  });

  describe('Toast and Debounced History Notifications', () => {
    test('displays single history event immediately in toast', () => {
      setupToast();
      const toast = domEnv.mockDocument.getElementById('toast');

      eventBus.emit('history:event', {
        type: 'Merge',
        title: 'Star A absorbed Star B',
        description: 'Details'
      });

      assert.equal(toast.textContent, 'Star A absorbed Star B');
      assert.ok(toast.classList.contains('opacity-100'), 'Toast is visible');
    });

    test('suppresses rapid successive events and flushes summary after debounce settles', async () => {
      setupToast();
      const toast = domEnv.mockDocument.getElementById('toast');

      // First event triggers immediate display
      eventBus.emit('history:event', {
        type: 'Merge',
        title: 'Initial Merge Event',
        description: 'Details'
      });
      assert.equal(toast.textContent, 'Initial Merge Event');

      // Subsequent events within debounce period are suppressed
      eventBus.emit('history:event', { type: 'Merge', title: 'Merge 2' });
      eventBus.emit('history:event', { type: 'Merge', title: 'Merge 3' });
      eventBus.emit('history:event', { type: 'Event Horizon Capture', title: 'Capture 1' });
      eventBus.emit('history:event', { type: 'Annihilation', title: 'Annihilate 1' });

      // Toast text remains the initial event while throttling
      assert.equal(toast.textContent, 'Initial Merge Event');

      // Wait for debounce timer (1000ms + margin)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // After settling, summary of suppressed events is displayed
      assert.ok(
        toast.textContent.includes('+4 events'),
        `Expected text to mention +4 events, got "${toast.textContent}"`
      );
      assert.ok(
        toast.textContent.includes('Merge × 2'),
        `Expected breakdown of Merge × 2, got "${toast.textContent}"`
      );
      assert.ok(
        toast.textContent.includes('Event Horizon Capture × 1'),
        `Expected breakdown of Event Horizon Capture × 1, got "${toast.textContent}"`
      );
      assert.ok(
        toast.textContent.includes('Annihilation × 1'),
        `Expected breakdown of Annihilation × 1, got "${toast.textContent}"`
      );
    });
  });
});

