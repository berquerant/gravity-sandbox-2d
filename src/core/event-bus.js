/**
 * Lightweight EventBus for decoupling physics, state, and UI components
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Registers an event listener callback.
   * @param {string} event - Name of the event to subscribe to
   * @param {Function} callback - Callback function triggered on emit
   * @returns {Function} Unsubscribe cleanup function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Removes a previously registered event listener.
   * @param {string} event - Name of the event
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emits an event with optional payload data to all registered listeners.
   * @param {string} event - Name of the event to fire
   * @param {*} [data] - Optional payload passed to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error handling event "${event}":`, err);
        }
      });
    }
  }

  /**
   * Clears all registered event listeners.
   */
  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
