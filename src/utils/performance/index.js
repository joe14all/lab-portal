/**
 * Performance & Scalability Utilities
 *
 * Main export file for all performance optimization utilities.
 * Provides geohashing, offline sync, WebSocket pooling, and caching.
 *
 * Based on Section 8 of LOGISTICS_DOMAIN_ANALYSIS.md
 *
 * @module utils/performance
 */

// Geohashing utilities
export {
  encodeLocation,
  decodeLocation,
  getNeighbors,
  calculateDistance,
  findNearbyLocations,
  validateDeliveryLocation,
  estimateETA,
  buildGeoQuery,
  getBoundingBox,
  GeohashPrecision,
  GeoHashUtils,
} from "./geohash.js";

// Offline synchronization
export {
  queueOfflineAction,
  getPendingActions,
  syncPendingActions,
  deleteAction,
  isOnline,
  setupAutoSync,
  cacheOfflineData,
  getCachedData,
  clearExpiredCache,
  getStorageStats,
  clearAllOfflineData,
  registerServiceWorker,
  OfflineActionType,
  SyncStatus,
  OfflineSync,
} from "./offlineSync.js";

// WebSocket connection pooling
export {
  WebSocketManager,
  ConnectionPool,
  Broadcaster,
  useWebSocket,
  MessageType,
  ConnectionState,
  WebSocketUtils,
} from "./websocket.js";

// Caching utilities
export {
  MemoryCache,
  MultiLevelCache,
  CacheInvalidator,
  RequestDeduplicator,
  defaultCache,
  routeCache,
  stopCache,
  deduplicator,
  CacheUtils,
} from "./cache.js";

// Import defaults for re-export
import GeoHashUtilsDefault from "./geohash.js";
import OfflineSyncDefault from "./offlineSync.js";
import WebSocketUtilsDefault from "./websocket.js";
import CacheUtilsDefault from "./cache.js";

/**
 * Default export with all utilities organized by category
 */
export default {
  geohash: GeoHashUtilsDefault,
  offline: OfflineSyncDefault,
  websocket: WebSocketUtilsDefault,
  cache: CacheUtilsDefault,
};
