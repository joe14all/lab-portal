/**
 * Simple Event Bus to simulate AWS EventBridge behavior in the frontend.
 * Allows decoupling of domains (Production -> Finance).
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event pattern.
   * @param {string} eventType - e.g., 'PRODUCTION_BATCH_COMPLETED'
   * @param {Function} callback - Handler function
   */
  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Publish an event.
   * @param {string} eventType
   * @param {Object} detail - The payload (JSON)
   */
  publish(eventType, detail) {
    console.log(`[EventBus] Publishing: ${eventType}`, detail);
    if (this.listeners[eventType]) {
      // Execute asynchronously to simulate decoupled systems
      setTimeout(() => {
        this.listeners[eventType].forEach((callback) => {
          try {
            callback(detail);
          } catch (err) {
            console.error(`[EventBus] Error in handler for ${eventType}:`, err);
          }
        });
      }, 100);
    }
  }
}

export const LabEventBus = new EventBus();

// Event Types Constant
export const EVENTS = {
  // Production Events
  BATCH_COMPLETED: "production.batch.completed",
  MATERIAL_LOW: "production.inventory.low",

  // Logistics Events
  CASE_SHIPPED: "logistics.case.shipped",
  ROUTE_CREATED: "logistics.route.created",
  ROUTE_UPDATED: "logistics.route.updated",
  ROUTE_DELETED: "logistics.route.deleted",
  STOP_ASSIGNED: "logistics.stop.assigned",
  STOP_UPDATED: "logistics.stop.updated",
  STOP_COMPLETED: "logistics.stop.completed",
  STOP_SKIPPED: "logistics.stop.skipped",
  ROUTE_OPTIMIZED: "logistics.route.optimized",
};
