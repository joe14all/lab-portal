/**
 * Logistics WebSocket Client
 *
 * Implements real-time communication for:
 * - Driver location updates (Section 5.1.2)
 * - Dispatcher broadcasts (Section 5.1.2)
 * - Route status changes (Section 6.5)
 *
 * Connection lifecycle:
 * 1. Connect with JWT token
 * 2. Subscribe to channels (driver updates, route changes)
 * 3. Handle incoming messages
 * 4. Reconnect on disconnect
 */

const WS_URL = import.meta.env.VITE_WS_URL || "wss://api.lab-portal.com/ws";
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * WebSocket Client Class
 */
class LogisticsWebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.messageHandlers = new Map();
    this.connected = false;
    this.subscriptions = new Set();
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn("WebSocket already connected");
      return;
    }

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onmessage = (event) => this.handleMessage(event);
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  handleOpen() {
    console.log("WebSocket connected");
    this.connected = true;
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Resubscribe to channels
    this.subscriptions.forEach((channel) => {
      this.send({ action: "SUBSCRIBE", channel });
    });

    // Notify listeners
    this.emit("connected");
  }

  /**
   * Handle connection close
   */
  handleClose(event) {
    console.log("WebSocket disconnected", event.code, event.reason);
    this.connected = false;
    this.stopHeartbeat();

    // Notify listeners
    this.emit("disconnected", { code: event.code, reason: event.reason });

    // Attempt reconnect if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  handleError(error) {
    console.error("WebSocket error:", error);
    this.emit("error", error);
  }

  /**
   * Handle incoming message
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      // Reset heartbeat timer on any message
      this.resetHeartbeat();

      // Route message to appropriate handler
      switch (type) {
        case "DRIVER_LOCATION_UPDATE":
          this.emit("driverLocation", data);
          break;

        case "ROUTE_STATUS_CHANGED":
          this.emit("routeStatus", data);
          break;

        case "STOP_STATUS_CHANGED":
          this.emit("stopStatus", data);
          break;

        case "PICKUP_ASSIGNED":
          this.emit("pickupAssigned", data);
          break;

        case "ETA_UPDATE":
          this.emit("etaUpdate", data);
          break;

        case "PONG":
          // Heartbeat response, no action needed
          break;

        default:
          console.warn("Unknown message type:", type);
          this.emit("message", message);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, message queued:", message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel) {
    this.subscriptions.add(channel);

    if (this.connected) {
      this.send({ action: "SUBSCRIBE", channel });
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);

    if (this.connected) {
      this.send({ action: "UNSUBSCRIBE", channel });
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unregister event handler
   */
  off(event, handler) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.send({ action: "PING" });
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Reset heartbeat timer
   */
  resetHeartbeat() {
    this.startHeartbeat();
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnect attempts reached");
      this.emit("maxReconnectReached");
      return;
    }

    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * this.reconnectAttempts;

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const token = localStorage.getItem("authToken");
      if (token) {
        this.connect(token);
      }
    }, delay);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let wsClient = null;

/**
 * Get singleton WebSocket client instance
 */
export function getWebSocketClient() {
  if (!wsClient) {
    wsClient = new LogisticsWebSocketClient();
  }
  return wsClient;
}

// =============================================================================
// DRIVER LOCATION TRACKING
// =============================================================================

/**
 * Start sending driver location updates
 */
export function startLocationTracking(driverId, routeId, intervalMs = 30000) {
  const client = getWebSocketClient();

  let trackingInterval = null;

  const sendLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        client.send({
          action: "UPDATE_LOCATION",
          data: {
            driverId,
            routeId,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          },
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Send immediately
  sendLocation();

  // Then send periodically
  trackingInterval = setInterval(sendLocation, intervalMs);

  // Return cleanup function
  return () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
  };
}

/**
 * Subscribe to driver location updates for dispatchers
 */
export function subscribeToDriverLocations(labId, callback) {
  const client = getWebSocketClient();

  // Subscribe to lab's driver channel
  client.subscribe(`lab:${labId}:drivers`);

  // Register callback
  const unsubscribe = client.on("driverLocation", callback);

  // Return cleanup function
  return () => {
    unsubscribe();
    client.unsubscribe(`lab:${labId}:drivers`);
  };
}

// =============================================================================
// ROUTE STATUS UPDATES
// =============================================================================

/**
 * Subscribe to route status changes
 */
export function subscribeToRouteUpdates(routeId, callback) {
  const client = getWebSocketClient();

  client.subscribe(`route:${routeId}`);

  const unsubscribeStatus = client.on("routeStatus", callback);
  const unsubscribeStop = client.on("stopStatus", callback);

  return () => {
    unsubscribeStatus();
    unsubscribeStop();
    client.unsubscribe(`route:${routeId}`);
  };
}

/**
 * Subscribe to ETA updates
 */
export function subscribeToETAUpdates(routeId, callback) {
  const client = getWebSocketClient();

  client.subscribe(`route:${routeId}:eta`);

  const unsubscribe = client.on("etaUpdate", callback);

  return () => {
    unsubscribe();
    client.unsubscribe(`route:${routeId}:eta`);
  };
}

// =============================================================================
// PICKUP UPDATES
// =============================================================================

/**
 * Subscribe to pickup assignment notifications
 */
export function subscribeToPickupUpdates(labId, callback) {
  const client = getWebSocketClient();

  client.subscribe(`lab:${labId}:pickups`);

  const unsubscribe = client.on("pickupAssigned", callback);

  return () => {
    unsubscribe();
    client.unsubscribe(`lab:${labId}:pickups`);
  };
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(token) {
  const client = getWebSocketClient();
  client.connect(token);
  return client;
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket() {
  const client = getWebSocketClient();
  client.disconnect();
}

/**
 * Check WebSocket connection status
 */
export function isWebSocketConnected() {
  const client = getWebSocketClient();
  return client.isConnected();
}

// Export the client class for advanced usage
export { LogisticsWebSocketClient };

// Default export
export default {
  getWebSocketClient,
  initializeWebSocket,
  closeWebSocket,
  isWebSocketConnected,
  startLocationTracking,
  subscribeToDriverLocations,
  subscribeToRouteUpdates,
  subscribeToETAUpdates,
  subscribeToPickupUpdates,
};
