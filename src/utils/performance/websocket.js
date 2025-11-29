/**
 * WebSocket Connection Pooling & Broadcasting
 *
 * Implements efficient WebSocket connection management with fan-out patterns.
 * Enables real-time updates for dispatchers, drivers, and clinic staff.
 *
 * Based on Section 8.3 of LOGISTICS_DOMAIN_ANALYSIS.md
 *
 * @module utils/performance/websocket
 */

/**
 * WebSocket message types
 */
export const MessageType = {
  // Connection lifecycle
  CONNECT: "CONNECT",
  DISCONNECT: "DISCONNECT",
  PING: "PING",
  PONG: "PONG",

  // Route updates
  ROUTE_UPDATED: "ROUTE_UPDATED",
  ROUTE_STARTED: "ROUTE_STARTED",
  ROUTE_COMPLETED: "ROUTE_COMPLETED",

  // Stop updates
  STOP_STATUS_CHANGED: "STOP_STATUS_CHANGED",
  STOP_ARRIVED: "STOP_ARRIVED",
  STOP_COMPLETED: "STOP_COMPLETED",

  // Driver updates
  DRIVER_LOCATION_UPDATED: "DRIVER_LOCATION_UPDATED",
  DRIVER_STATUS_CHANGED: "DRIVER_STATUS_CHANGED",

  // Pickup requests
  PICKUP_REQUEST_CREATED: "PICKUP_REQUEST_CREATED",
  PICKUP_ASSIGNED: "PICKUP_ASSIGNED",

  // Notifications
  NOTIFICATION: "NOTIFICATION",
  ALERT: "ALERT",
};

/**
 * Connection states
 */
export const ConnectionState = {
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTING: "RECONNECTING",
  FAILED: "FAILED",
};

/**
 * WebSocket Manager Class
 * Handles connection lifecycle, reconnection, and message routing
 */
export class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      token: null,
      debug: false,
      ...options,
    };

    this.ws = null;
    this.state = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.messageHandlers = new Map();
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.connectionId = null;
  }

  /**
   * Connects to WebSocket server
   *
   * @returns {Promise<void>}
   *
   * @example
   * const ws = new WebSocketManager('wss://api.example.com/ws', {
   *   token: authToken
   * });
   * await ws.connect();
   */
  async connect() {
    if (
      this.state === ConnectionState.CONNECTED ||
      this.state === ConnectionState.CONNECTING
    ) {
      this.log("Already connected or connecting");
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.log("Connecting to WebSocket...");

    const wsUrl = this.options.token
      ? `${this.url}?token=${this.options.token}`
      : this.url;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.state = ConnectionState.CONNECTED;
          this.reconnectAttempts = 0;
          this.log("WebSocket connected");
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          this.log("WebSocket error:", error);
          if (this.state === ConnectionState.CONNECTING) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          this.log("WebSocket closed:", event.code, event.reason);
          this.state = ConnectionState.DISCONNECTED;
          this.stopHeartbeat();

          if (!event.wasClean) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.state = ConnectionState.FAILED;
        reject(error);
      }
    });
  }

  /**
   * Disconnects from WebSocket server
   */
  disconnect() {
    this.log("Disconnecting WebSocket...");
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.state = ConnectionState.DISCONNECTED;
  }

  /**
   * Schedules automatic reconnection
   * @private
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached");
      this.state = ConnectionState.FAILED;
      return;
    }

    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    const delay =
      this.options.reconnectInterval *
      Math.pow(1.5, this.reconnectAttempts - 1);

    this.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log("Reconnect failed:", error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Starts heartbeat ping/pong
   * @private
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        this.send(MessageType.PING, {});
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stops heartbeat
   * @private
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handles incoming messages
   * @private
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.log("Received message:", message.type);

      // Handle system messages
      if (message.type === MessageType.PONG) {
        // Heartbeat response
        return;
      }

      if (message.type === MessageType.CONNECT) {
        this.connectionId = message.connectionId;
        this.log("Connection ID:", this.connectionId);
        return;
      }

      // Route to registered handlers
      const handlers = this.messageHandlers.get(message.type) || [];
      handlers.forEach((handler) => {
        try {
          handler(message.data, message);
        } catch (error) {
          this.log("Handler error:", error);
        }
      });

      // Catch-all handlers
      const catchAllHandlers = this.messageHandlers.get("*") || [];
      catchAllHandlers.forEach((handler) => {
        try {
          handler(message.data, message);
        } catch (error) {
          this.log("Catch-all handler error:", error);
        }
      });
    } catch (error) {
      this.log("Failed to parse message:", error);
    }
  }

  /**
   * Registers a message handler
   *
   * @param {string} messageType - Message type to handle (or '*' for all)
   * @param {Function} handler - Handler function (data, message) => void
   * @returns {Function} Unregister function
   *
   * @example
   * const unregister = ws.on(MessageType.DRIVER_LOCATION_UPDATED, (data) => {
   *   console.log('Driver location:', data);
   * });
   *
   * // Later: unregister()
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }

    this.messageHandlers.get(messageType).push(handler);

    // Return unregister function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Sends a message to the server
   *
   * @param {string} type - Message type
   * @param {object} data - Message data
   *
   * @example
   * ws.send(MessageType.DRIVER_LOCATION_UPDATED, {
   *   driverId: 'driver-123',
   *   coordinates: { lat: 40.7128, lng: -74.0060 }
   * });
   */
  send(type, data) {
    if (this.state !== ConnectionState.CONNECTED) {
      this.log("Cannot send message: not connected");
      return false;
    }

    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.log("Sent message:", type);
      return true;
    } catch (error) {
      this.log("Failed to send message:", error);
      return false;
    }
  }

  /**
   * Gets current connection state
   *
   * @returns {string} Connection state
   */
  getState() {
    return this.state;
  }

  /**
   * Checks if connected
   *
   * @returns {boolean}
   */
  isConnected() {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Logs debug messages
   * @private
   */
  log(...args) {
    if (this.options.debug) {
      console.log("[WebSocket]", ...args);
    }
  }
}

/**
 * Connection pool for managing multiple WebSocket connections
 */
export class ConnectionPool {
  constructor() {
    this.connections = new Map(); // labId -> Set of connectionIds
    this.metadata = new Map(); // connectionId -> { labId, userId, role, connectedAt }
  }

  /**
   * Registers a new connection
   *
   * @param {string} connectionId - Unique connection ID
   * @param {object} metadata - Connection metadata
   *
   * @example
   * pool.register('conn-123', {
   *   labId: 'lab-456',
   *   userId: 'user-789',
   *   role: 'LOGISTICS_MANAGE'
   * });
   */
  register(connectionId, metadata) {
    const { labId } = metadata;

    if (!this.connections.has(labId)) {
      this.connections.set(labId, new Set());
    }

    this.connections.get(labId).add(connectionId);
    this.metadata.set(connectionId, {
      ...metadata,
      connectedAt: new Date().toISOString(),
    });

    console.log(
      `[ConnectionPool] Registered connection ${connectionId} for lab ${labId}`
    );
  }

  /**
   * Unregisters a connection
   *
   * @param {string} connectionId - Connection ID to remove
   */
  unregister(connectionId) {
    const metadata = this.metadata.get(connectionId);

    if (metadata) {
      const { labId } = metadata;
      const connections = this.connections.get(labId);

      if (connections) {
        connections.delete(connectionId);

        if (connections.size === 0) {
          this.connections.delete(labId);
        }
      }

      this.metadata.delete(connectionId);
      console.log(`[ConnectionPool] Unregistered connection ${connectionId}`);
    }
  }

  /**
   * Gets all connections for a lab
   *
   * @param {string} labId - Lab ID
   * @returns {Set<string>} Set of connection IDs
   */
  getLabConnections(labId) {
    return this.connections.get(labId) || new Set();
  }

  /**
   * Gets connections filtered by role
   *
   * @param {string} labId - Lab ID
   * @param {string} role - User role
   * @returns {string[]} Array of connection IDs
   */
  getConnectionsByRole(labId, role) {
    const connections = this.getLabConnections(labId);

    return Array.from(connections).filter((connectionId) => {
      const metadata = this.metadata.get(connectionId);
      return metadata && metadata.role === role;
    });
  }

  /**
   * Gets connections for a specific user
   *
   * @param {string} userId - User ID
   * @returns {string[]} Array of connection IDs
   */
  getUserConnections(userId) {
    const userConnections = [];

    for (const [connectionId, metadata] of this.metadata.entries()) {
      if (metadata.userId === userId) {
        userConnections.push(connectionId);
      }
    }

    return userConnections;
  }

  /**
   * Gets total connection count
   *
   * @returns {number}
   */
  getTotalConnections() {
    return this.metadata.size;
  }

  /**
   * Gets connection statistics
   *
   * @returns {object} Statistics object
   */
  getStats() {
    const stats = {
      totalConnections: this.metadata.size,
      totalLabs: this.connections.size,
      connectionsByLab: {},
    };

    for (const [labId, connections] of this.connections.entries()) {
      stats.connectionsByLab[labId] = connections.size;
    }

    return stats;
  }
}

/**
 * Broadcaster utility for fan-out messaging
 */
export class Broadcaster {
  constructor(sendFunction) {
    this.send = sendFunction; // Function to send message to a single connection
  }

  /**
   * Broadcasts message to multiple connections
   *
   * @param {string[]} connectionIds - Array of connection IDs
   * @param {string} messageType - Message type
   * @param {object} data - Message data
   * @returns {Promise<{sent: number, failed: number}>}
   *
   * @example
   * const result = await broadcaster.broadcast(
   *   connectionIds,
   *   MessageType.STOP_STATUS_CHANGED,
   *   { stopId: 'stop-123', status: 'Completed' }
   * );
   */
  async broadcast(connectionIds, messageType, data) {
    const message = {
      type: messageType,
      data,
      timestamp: new Date().toISOString(),
    };

    const results = await Promise.allSettled(
      connectionIds.map((connectionId) =>
        this.send(connectionId, JSON.stringify(message))
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[Broadcaster] Sent to ${sent}/${connectionIds.length} connections`
    );

    return { sent, failed };
  }

  /**
   * Broadcasts to all connections in a lab
   *
   * @param {ConnectionPool} pool - Connection pool instance
   * @param {string} labId - Lab ID
   * @param {string} messageType - Message type
   * @param {object} data - Message data
   * @returns {Promise<{sent: number, failed: number}>}
   */
  async broadcastToLab(pool, labId, messageType, data) {
    const connections = pool.getLabConnections(labId);
    return this.broadcast(Array.from(connections), messageType, data);
  }

  /**
   * Broadcasts to specific role in a lab
   *
   * @param {ConnectionPool} pool - Connection pool instance
   * @param {string} labId - Lab ID
   * @param {string} role - User role
   * @param {string} messageType - Message type
   * @param {object} data - Message data
   * @returns {Promise<{sent: number, failed: number}>}
   */
  async broadcastToRole(pool, labId, role, messageType, data) {
    const connections = pool.getConnectionsByRole(labId, role);
    return this.broadcast(connections, messageType, data);
  }

  /**
   * Broadcasts to specific user across all their connections
   *
   * @param {ConnectionPool} pool - Connection pool instance
   * @param {string} userId - User ID
   * @param {string} messageType - Message type
   * @param {object} data - Message data
   * @returns {Promise<{sent: number, failed: number}>}
   */
  async broadcastToUser(pool, userId, messageType, data) {
    const connections = pool.getUserConnections(userId);
    return this.broadcast(connections, messageType, data);
  }
}

/**
 * React hook for WebSocket connection
 *
 * @param {string} url - WebSocket URL
 * @param {object} options - WebSocket options
 * @returns {object} WebSocket instance and state
 *
 * @example
 * const { ws, state, send } = useWebSocket('wss://api.example.com/ws', {
 *   token: authToken
 * });
 *
 * useEffect(() => {
 *   const unsubscribe = ws.on(MessageType.ROUTE_UPDATED, (data) => {
 *     console.log('Route updated:', data);
 *   });
 *
 *   return unsubscribe;
 * }, [ws]);
 */
export const useWebSocket = (url, options = {}) => {
  // This is a conceptual implementation
  // In real React app, use useState and useEffect

  const ws = new WebSocketManager(url, options);

  return {
    ws,
    state: ws.getState(),
    isConnected: ws.isConnected(),
    send: (type, data) => ws.send(type, data),
    on: (type, handler) => ws.on(type, handler),
    connect: () => ws.connect(),
    disconnect: () => ws.disconnect(),
  };
};

/**
 * WebSocket utilities
 */
export const WebSocketUtils = {
  Manager: WebSocketManager,
  Pool: ConnectionPool,
  Broadcaster,
  MessageType,
  ConnectionState,
  useWebSocket,
};

export default WebSocketUtils;
