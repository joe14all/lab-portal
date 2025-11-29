/**
 * Cross-Domain Event Publisher
 *
 * Implements event publishing for EventBridge integration (Section 6)
 *
 * Event Flows:
 * - Production → Logistics (CaseReadyToShip)
 * - Logistics → Finance (DeliveryCompleted)
 * - CRM → Logistics (PickupRequested)
 * - EHR → Logistics (Webhook events)
 */

const EVENT_API_URL =
  import.meta.env.VITE_EVENT_API_URL || "https://api.lab-portal.com/events";

/**
 * Base event publisher
 */
async function publishEvent(source, detailType, detail) {
  const token = localStorage.getItem("authToken");

  const event = {
    source,
    detailType,
    detail: {
      ...detail,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(`${EVENT_API_URL}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Event publish failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to publish event:", error);
    throw error;
  }
}

// =============================================================================
// LOGISTICS EVENTS (Outgoing)
// =============================================================================

/**
 * Publish delivery completed event
 * Triggers: Invoice update, customer notification
 */
export async function publishDeliveryCompleted(deliveryData) {
  return publishEvent("logistics.driver", "DeliveryCompleted", {
    stopId: deliveryData.stopId,
    routeId: deliveryData.routeId,
    caseIds: deliveryData.caseIds,
    clinicId: deliveryData.clinicId,
    deliveredAt: deliveryData.deliveredAt,
    deliveredBy: {
      driverId: deliveryData.driverId,
      driverName: deliveryData.driverName,
    },
    receivedBy: {
      name: deliveryData.receivedBy,
      title: deliveryData.receiverTitle,
    },
    proofOfDelivery: {
      signatureUrl: deliveryData.signatureUrl,
      photoUrl: deliveryData.photoUrl,
      verificationCode: deliveryData.verificationCode,
      geoHash: deliveryData.geoHash,
    },
  });
}

/**
 * Publish pickup completed event
 * Triggers: Case creation, inventory update
 */
export async function publishPickupCompleted(pickupData) {
  return publishEvent("logistics.driver", "PickupCompleted", {
    pickupId: pickupData.pickupId,
    routeId: pickupData.routeId,
    clinicId: pickupData.clinicId,
    labId: pickupData.labId,
    pickedUpAt: pickupData.pickedUpAt,
    pickedUpBy: {
      driverId: pickupData.driverId,
      driverName: pickupData.driverName,
    },
    handedOffBy: {
      name: pickupData.handedOffBy,
      title: pickupData.handoffTitle,
    },
    packageCount: pickupData.packageCount,
    proofOfPickup: {
      signatureUrl: pickupData.signatureUrl,
      photoUrl: pickupData.photoUrl,
      verificationCode: pickupData.verificationCode,
      geoHash: pickupData.geoHash,
    },
  });
}

/**
 * Publish route started event
 * Triggers: Customer notifications, ETA calculations
 */
export async function publishRouteStarted(routeData) {
  return publishEvent("logistics.driver", "RouteStarted", {
    routeId: routeData.routeId,
    driverId: routeData.driverId,
    labId: routeData.labId,
    startedAt: routeData.startedAt,
    stopCount: routeData.stopCount,
    estimatedCompletionTime: routeData.estimatedCompletionTime,
  });
}

/**
 * Publish route completed event
 * Triggers: Performance metrics, billing
 */
export async function publishRouteCompleted(routeData) {
  return publishEvent("logistics.driver", "RouteCompleted", {
    routeId: routeData.routeId,
    driverId: routeData.driverId,
    labId: routeData.labId,
    completedAt: routeData.completedAt,
    totalStops: routeData.totalStops,
    completedStops: routeData.completedStops,
    skippedStops: routeData.skippedStops,
    totalDistance: routeData.totalDistance,
    totalDuration: routeData.totalDuration,
  });
}

/**
 * Publish delivery exception event
 * Triggers: Alert dispatchers, customer service
 */
export async function publishDeliveryException(exceptionData) {
  return publishEvent("logistics.driver", "DeliveryException", {
    stopId: exceptionData.stopId,
    routeId: exceptionData.routeId,
    clinicId: exceptionData.clinicId,
    exceptionType: exceptionData.type, // NO_ACCESS, REFUSED, DAMAGED, etc.
    reason: exceptionData.reason,
    occurredAt: exceptionData.occurredAt,
    driverId: exceptionData.driverId,
    photoUrl: exceptionData.photoUrl,
    resolution: exceptionData.resolution, // RESCHEDULED, RETURNED, etc.
  });
}

// =============================================================================
// LOGISTICS EVENTS (Incoming - Handlers)
// =============================================================================

/**
 * Handle case ready to ship event
 * Creates delivery task in logistics system
 */
export function handleCaseReadyToShip(eventHandler) {
  // Register event listener (would be WebSocket or polling in real implementation)
  return {
    source: "cases.production",
    detailType: "CaseReadyToShip",
    handler: async (event) => {
      const {
        caseId,
        clinicId,
        priority,
        requestedDeliveryDate,
        packageSpecs,
      } = event.detail;

      await eventHandler({
        caseId,
        clinicId,
        priority,
        requestedDeliveryDate,
        packageSpecs,
      });
    },
  };
}

/**
 * Handle pickup requested event
 * Creates pickup request in logistics system
 */
export function handlePickupRequested(eventHandler) {
  return {
    source: "crm.portal",
    detailType: "PickupRequested",
    handler: async (event) => {
      const { pickupId, clinicId, labId, windowStart, windowEnd, isRush } =
        event.detail;

      await eventHandler({
        pickupId,
        clinicId,
        labId,
        windowStart,
        windowEnd,
        isRush,
      });
    },
  };
}

// =============================================================================
// EVENT SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Subscribe to events (WebSocket-based)
 */
export function subscribeToEvents(eventTypes, callback) {
  // In production, this would use WebSocket or EventBridge consumer
  // For now, return unsubscribe function

  console.log("Subscribed to events:", eventTypes);

  // Placeholder for actual subscription logic
  if (callback) {
    // callback would be invoked when events arrive
  }

  return () => {
    console.log("Unsubscribed from events:", eventTypes);
  };
}

/**
 * Poll for events (HTTP fallback)
 */
export async function pollEvents(eventTypes, since) {
  const token = localStorage.getItem("authToken");

  const params = new URLSearchParams({
    types: eventTypes.join(","),
    since: since || new Date(Date.now() - 60000).toISOString(), // Last 1 minute
  });

  try {
    const response = await fetch(`${EVENT_API_URL}/poll?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Event poll failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to poll events:", error);
    return { events: [] };
  }
}

// =============================================================================
// EVENT BATCHING
// =============================================================================

/**
 * Batch event publisher (for bulk operations)
 */
export async function publishEvents(events) {
  const token = localStorage.getItem("authToken");

  try {
    const response = await fetch(`${EVENT_API_URL}/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Batch publish failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to publish batch events:", error);
    throw error;
  }
}

// =============================================================================
// EVENT UTILITIES
// =============================================================================

/**
 * Create event object (helper)
 */
export function createEvent(source, detailType, detail) {
  return {
    source,
    detailType,
    detail: {
      ...detail,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate event structure
 */
export function validateEvent(event) {
  const errors = [];

  if (!event.source) {
    errors.push("Missing required field: source");
  }

  if (!event.detailType) {
    errors.push("Missing required field: detailType");
  }

  if (!event.detail || typeof event.detail !== "object") {
    errors.push("Missing or invalid detail object");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get event schema for validation
 */
export const EventSchemas = {
  CaseReadyToShip: {
    source: "cases.production",
    detailType: "CaseReadyToShip",
    requiredFields: [
      "caseId",
      "labId",
      "clinicId",
      "priority",
      "requestedDeliveryDate",
    ],
  },

  DeliveryCompleted: {
    source: "logistics.driver",
    detailType: "DeliveryCompleted",
    requiredFields: [
      "stopId",
      "routeId",
      "caseIds",
      "deliveredAt",
      "proofOfDelivery",
    ],
  },

  PickupRequested: {
    source: "crm.portal",
    detailType: "PickupRequested",
    requiredFields: [
      "pickupId",
      "clinicId",
      "labId",
      "windowStart",
      "windowEnd",
    ],
  },

  PickupCompleted: {
    source: "logistics.driver",
    detailType: "PickupCompleted",
    requiredFields: ["pickupId", "routeId", "pickedUpAt", "proofOfPickup"],
  },
};

/**
 * Validate event against schema
 */
export function validateEventSchema(event, schemaName) {
  const schema = EventSchemas[schemaName];
  if (!schema) {
    return { valid: false, errors: ["Unknown event schema"] };
  }

  const errors = [];

  if (event.source !== schema.source) {
    errors.push(`Invalid source. Expected: ${schema.source}`);
  }

  if (event.detailType !== schema.detailType) {
    errors.push(`Invalid detailType. Expected: ${schema.detailType}`);
  }

  for (const field of schema.requiredFields) {
    if (!(field in event.detail)) {
      errors.push(`Missing required field in detail: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export all functions
export default {
  publishEvent,
  publishDeliveryCompleted,
  publishPickupCompleted,
  publishRouteStarted,
  publishRouteCompleted,
  publishDeliveryException,
  handleCaseReadyToShip,
  handlePickupRequested,
  subscribeToEvents,
  pollEvents,
  publishEvents,
  createEvent,
  validateEvent,
  validateEventSchema,
  EventSchemas,
};
