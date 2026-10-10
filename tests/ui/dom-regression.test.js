import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadIndexHtml } from './dom-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_UI_DIR = path.resolve(__dirname, '../../src/ui');
const PRESETS_FILE = path.resolve(__dirname, '../../src/presets/index.js');

describe('DOM Regression & Element Integrity', () => {
  const { rawHtml, elementsById, mockDocument } = loadIndexHtml();

  test('All getElementById calls in src/ui/**/*.js must correspond to valid elements in index.html', () => {
    const uiFiles = fs.readdirSync(SRC_UI_DIR, { recursive: true })
      .map(f => f.toString())
      .filter(f => f.endsWith('.js'));
    const missingIds = [];

    for (const file of uiFiles) {
      const content = fs.readFileSync(path.join(SRC_UI_DIR, file), 'utf-8');
      const matches = content.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);

      for (const match of matches) {
        const id = match[1];
        if (!elementsById.has(id)) {
          missingIds.push({ file, id });
        }
      }
    }

    assert.equal(
      missingIds.length,
      0,
      `Found getElementById calls pointing to missing IDs in index.html:\n${JSON.stringify(missingIds, null, 2)}`
    );
  });

  test('Critical action buttons and interactive controls exist in DOM', () => {
    const criticalButtons = [
      'btnPlayPause',
      'btnStep',
      'btnClear',
      'btnZoomIn',
      'btnZoomOut',
      'btnResetView',
      'btnToggleSidePanel',
      'btnClosePanel',
      'btnOpenTimeSkip',
      'btnCloseTimeSkip',
      'btnExecuteSkip',
      'btnOpenSaveModal',
      'btnCloseSaveModal',
      'btnExportJson',
      'btnImportJson',
      'btnOpenBodyList',
      'btnCloseBodyList',
      'btnToggleHistory',
      'btnCloseHistory',
      'btnClearHistory',
      'btnTrackBody',
      'btnDeleteBody',
      'btnResetVelocity',
      'btnApplySliderModal',
      'btnCancelSliderModal'
    ];

    for (const btnId of criticalButtons) {
      const el = mockDocument.getElementById(btnId);
      assert.ok(el, `Expected critical button #${btnId} to exist in index.html`);
    }
  });

  test('All 4 simulation placement modes exist with appropriate IDs', () => {
    const modes = ['modeLaunch', 'modeSpray', 'modePan', 'modeDisk'];
    for (const modeId of modes) {
      const el = mockDocument.getElementById(modeId);
      assert.ok(el, `Expected mode button #${modeId} to exist in index.html`);
    }
  });

  test('Disk placement parameters section and inputs are present', () => {
    const diskSection = mockDocument.getElementById('diskParametersSection');
    assert.ok(diskSection, 'Expected #diskParametersSection to exist in index.html');

    const diskControls = [
      'diskCountInput',
      'diskRadiusInput',
      'diskRadiusJitterInput',
      'diskSpeedInput',
      'diskSpeedJitterInput',
      'btnDiskDirCCW',
      'btnDiskDirCW',
      'chkDiskAutoKeplerian',
      'btnDiskCountEdit',
      'btnDiskRadiusEdit',
      'btnDiskRadiusJitterEdit',
      'btnDiskSpeedEdit',
      'btnDiskSpeedJitterEdit'
    ];

    for (const id of diskControls) {
      const el = mockDocument.getElementById(id);
      assert.ok(el, `Expected disk parameter element #${id} to exist in index.html`);
    }
  });

  test('Preset selector options in index.html match registered presets in src/presets/index.js', () => {
    const presetSelect = mockDocument.getElementById('presetSelect');
    assert.ok(presetSelect, '#presetSelect must exist');

    // Extract options from presetSelect block in HTML
    const selectHtmlMatch = rawHtml.match(/<select[^>]*id="presetSelect"[^>]*>([\s\S]*?)<\/select>/i);
    assert.ok(selectHtmlMatch, 'Could not find <select id="presetSelect"> in index.html');

    const optionMatches = [...selectHtmlMatch[1].matchAll(/<option[^>]*value="([^"]+)"/g)];
    const optionValues = optionMatches.map(m => m[1]);

    // Extract preset cases from loadPreset in src/presets/index.js (if (name === '...'))
    const presetsSrc = fs.readFileSync(PRESETS_FILE, 'utf-8');
    const nameMatches = [...presetsSrc.matchAll(/name\s*===?\s*['"]([^'"]+)['"]/g)];
    const registeredPresets = nameMatches.map(m => m[1]);

    for (const val of optionValues) {
      assert.ok(
        registeredPresets.includes(val),
        `Preset option '${val}' in index.html is missing handler in src/presets/index.js`
      );
    }
  });

  test('Quick skip buttons in time skip modal have valid data-skip attributes', () => {
    const quickSkips = mockDocument.querySelectorAll('.btn-quick-skip');
    assert.ok(quickSkips.length >= 3, 'Expected at least 3 quick skip buttons');
    for (const btn of quickSkips) {
      const skipSec = parseFloat(btn.dataset.skip);
      assert.ok(!isNaN(skipSec) && skipSec > 0, `btn-quick-skip must have positive numeric data-skip attribute, got: ${btn.dataset.skip}`);
    }
  });

  test('Range inputs have finite min and max attributes', () => {
    const rangeInputIds = ['massRange', 'timeScale', 'radiusInput', 'spraySpeedInput', 'trailLengthInput'];
    for (const id of rangeInputIds) {
      const el = mockDocument.getElementById(id);
      assert.ok(el, `#${id} range input must exist`);
      assert.ok(el.attributes.min !== undefined, `#${id} must have min attribute`);
      assert.ok(el.attributes.max !== undefined, `#${id} must have max attribute`);
    }
  });
});
