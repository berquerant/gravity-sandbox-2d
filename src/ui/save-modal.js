import { saveToSlot, loadFromSlot, exportStateToJson, importStateFromJson } from '../storage/index.js';
import { eventBus } from '../core/event-bus.js';

/**
 * Initializes save/load modal managing LocalStorage slots 1-3 and raw JSON import/export.
 * @param {Object} state - Global state store
 */
export function setupSaveModal(state) {
  const saveModal = document.getElementById('saveModal');
  const btnOpenSaveModal = document.getElementById('btnOpenSaveModal');
  const btnCloseSaveModal = document.getElementById('btnCloseSaveModal');
  const jsonStateArea = document.getElementById('jsonStateArea');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnImportJson = document.getElementById('btnImportJson');
  const btnCopyJson = document.getElementById('btnCopyJson');

  function openModal() {
    if (saveModal) {
      saveModal.classList.remove('opacity-0', 'pointer-events-none');
      if (jsonStateArea) {
        jsonStateArea.value = exportStateToJson(state);
      }
    }
  }

  function closeModal() {
    if (saveModal) {
      saveModal.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  if (btnOpenSaveModal) btnOpenSaveModal.addEventListener('click', openModal);
  if (btnCloseSaveModal) btnCloseSaveModal.addEventListener('click', closeModal);

  if (btnExportJson && jsonStateArea) {
    btnExportJson.addEventListener('click', () => {
      jsonStateArea.value = exportStateToJson(state);
      eventBus.emit('toast:show', 'JSON data generated');
    });
  }

  if (btnCopyJson && jsonStateArea) {
    btnCopyJson.addEventListener('click', () => {
      jsonStateArea.select();
      try {
        navigator.clipboard.writeText(jsonStateArea.value).then(() => {
          eventBus.emit('toast:show', 'JSON copied to clipboard');
        }).catch(() => {
          document.execCommand('copy');
          eventBus.emit('toast:show', 'JSON copied to clipboard');
        });
      } catch (err) {
        eventBus.emit('toast:show', 'Failed to copy');
      }
    });
  }

  if (btnImportJson && jsonStateArea) {
    btnImportJson.addEventListener('click', () => {
      const success = importStateFromJson(jsonStateArea.value, state);
      if (success) {
        closeModal();
      }
    });
  }

  // Quick slot buttons
  document.querySelectorAll('.slot-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveToSlot(btn.dataset.slot, state);
    });
  });

  document.querySelectorAll('.slot-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const success = loadFromSlot(btn.dataset.slot, state);
      if (success) {
        closeModal();
      }
    });
  });

  return { openModal, closeModal };
}
