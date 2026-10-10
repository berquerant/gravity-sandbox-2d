import { formatSimTime, escapeHtml, hexToRgba } from '../core/formatters.js';
import { eventBus } from '../core/event-bus.js';

/**
 * Initializes the astronomical event log drawer (collisions, horizon captures, collapses).
 * @param {Object} state - Global state store
 */
export function setupHistoryDrawer(state) {
  const historyDrawer = document.getElementById('historyDrawer');
  const btnToggleHistory = document.getElementById('btnToggleHistory');
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const historyList = document.getElementById('historyList');
  const eventCountBadge = document.getElementById('eventCountBadge');

  let isOpen = false;

  /** Opens or closes the event history log drawer panel. */
  function setHistoryOpen(open) {
    isOpen = open;
    if (historyDrawer) {
      if (open) {
        historyDrawer.classList.remove('-translate-x-full');
        updateHistoryUI();
      } else {
        historyDrawer.classList.add('-translate-x-full');
      }
    }
  }

  function updateHistoryUI() {
    if (eventCountBadge) eventCountBadge.textContent = state.historyEvents.length;
    if (!historyList) return;

    if (state.historyEvents.length === 0) {
      historyList.innerHTML = '<div class="text-center text-slate-500 py-8">No event history</div>';
      return;
    }

    historyList.innerHTML = state.historyEvents.slice(0, 60).map(evt => {
      const bgBadgeColor = hexToRgba(evt.color, 0.15);
      const safeType = escapeHtml(evt.type);
      const safeTitle = escapeHtml(evt.title);
      const safeDesc = escapeHtml(evt.description);
      return `
        <div class="p-2.5 rounded-xl bg-slate-900/85 border border-slate-800 text-xs shadow-sm">
          <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span class="mono text-amber-300 font-semibold">${formatSimTime(evt.time)}</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold" style="background-color: ${bgBadgeColor}; color: ${evt.color};">${safeType}</span>
          </div>
          <div class="font-medium text-slate-100">${safeTitle}</div>
          <div class="text-slate-300 text-[11px] mt-1 leading-relaxed bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80 mono">${safeDesc}</div>
        </div>
      `;
    }).join('');
  }

  function addEvent({ type, title, description, color = '#38bdf8' }) {
    const eventItem = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: state.elapsedTime,
      type,
      title,
      description,
      color
    };
    state.historyEvents.unshift(eventItem);
    if (state.historyEvents.length > 150) {
      state.historyEvents.pop();
    }
    updateHistoryUI();
  }

  if (btnToggleHistory) {
    btnToggleHistory.addEventListener('click', () => setHistoryOpen(!isOpen));
  }
  if (btnCloseHistory) {
    btnCloseHistory.addEventListener('click', () => setHistoryOpen(false));
  }
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      state.historyEvents = [];
      updateHistoryUI();
      eventBus.emit('toast:show', 'History cleared');
    });
  }

  eventBus.on('history:event', addEvent);
  eventBus.on('history:updated', updateHistoryUI);

  return { updateHistoryUI, setHistoryOpen, addEvent };
}
