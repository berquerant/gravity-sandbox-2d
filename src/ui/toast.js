import { eventBus } from '../core/event-bus.js';

/**
 * Initializes transient floating notification toast controller.
 * Listens to 'toast:show' and 'history:event' on the eventBus.
 * Throttles high-frequency history events via debounce, summarizing suppressed events upon settling.
 * @returns {{showToast: Function, handleHistoryEvent?: Function}}
 */
export function setupToast() {
  const toast = document.getElementById('toast');
  let toastTimeout = null;

  // Debounce state for high-frequency history events
  const DEBOUNCE_DELAY_MS = 1000;
  let debounceTimeout = null;
  let suppressedCounts = new Map();
  let totalSuppressed = 0;
  let isThrottling = false;

  /**
   * Displays a temporary notification banner for 2.4 seconds.
   * @param {string} message
   */
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none', '-translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2400);
  }

  /**
   * Flushes and displays the aggregated summary of suppressed events after debouncing settles.
   */
  function flushSuppressedSummary() {
    isThrottling = false;
    if (totalSuppressed <= 0) return;

    const breakdown = Array.from(suppressedCounts.entries())
      .map(([type, count]) => `${type} × ${count}`)
      .join(', ');

    const summaryMessage = `+${totalSuppressed} events: ${breakdown}`;
    suppressedCounts.clear();
    totalSuppressed = 0;

    showToast(summaryMessage);
  }

  /**
   * Handles incoming history events, showing the first immediately and buffering subsequent ones until settled.
   * @param {{type?: string, title?: string, description?: string}} evt
   */
  function handleHistoryEvent(evt) {
    if (!evt || !evt.title) return;

    if (!isThrottling) {
      // First event: display immediately and start debouncing window
      isThrottling = true;
      showToast(evt.title);

      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(flushSuppressedSummary, DEBOUNCE_DELAY_MS);
    } else {
      // Subsequent events within debounce period: suppress and count
      const type = evt.type || 'Event';
      suppressedCounts.set(type, (suppressedCounts.get(type) || 0) + 1);
      totalSuppressed++;

      // Reset debounce timer on every new event
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(flushSuppressedSummary, DEBOUNCE_DELAY_MS);
    }
  }

  eventBus.on('toast:show', showToast);
  eventBus.on('history:event', handleHistoryEvent);

  return { showToast, handleHistoryEvent };
}

