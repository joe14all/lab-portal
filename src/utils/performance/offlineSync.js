/**
 * Offline Support & Synchronization Utilities
 *
 * Implements offline-first architecture with IndexedDB queue and background sync.
 * Enables Driver app to work without network connectivity and sync when online.
 *
 * Based on Section 8.2 of LOGISTICS_DOMAIN_ANALYSIS.md
 *
 * @module utils/performance/offlineSync
 */

/**
 * Action types for offline queue
 */
export const OfflineActionType = {
  UPDATE_STOP_STATUS: "UPDATE_STOP_STATUS",
  UPLOAD_SIGNATURE: "UPLOAD_SIGNATURE",
  UPLOAD_PHOTO: "UPLOAD_PHOTO",
  UPDATE_LOCATION: "UPDATE_LOCATION",
  REPORT_EXCEPTION: "REPORT_EXCEPTION",
  COMPLETE_PICKUP: "COMPLETE_PICKUP",
  START_ROUTE: "START_ROUTE",
  END_ROUTE: "END_ROUTE",
};

/**
 * Offline sync status
 */
export const SyncStatus = {
  PENDING: "PENDING",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
};

/**
 * IndexedDB database name and version
 */
const DB_NAME = "logistics-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";
const CACHE_STORE = "manifest-cache";

/**
 * Opens or creates the IndexedDB database
 *
 * @returns {Promise<IDBDatabase>}
 * @private
 */
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create pending actions store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("actionType", "actionType", { unique: false });
      }

      // Create manifest cache store
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cacheStore = db.createObjectStore(CACHE_STORE, {
          keyPath: "key",
        });
        cacheStore.createIndex("timestamp", "timestamp", { unique: false });
        cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
  });
};

/**
 * Queues an action for later synchronization when offline
 *
 * @param {string} actionType - Type of action (from OfflineActionType)
 * @param {object} payload - Action payload data
 * @param {object} options - Additional options
 * @returns {Promise<number>} Action ID
 *
 * @example
 * await queueOfflineAction(
 *   OfflineActionType.UPDATE_STOP_STATUS,
 *   {
 *     stopId: 'stop-123',
 *     status: 'Completed',
 *     proofOfService: { signatureUrl: '...' }
 *   },
 *   { priority: 'high', retryLimit: 3 }
 * );
 */
export const queueOfflineAction = async (actionType, payload, options = {}) => {
  const db = await openDatabase();

  const action = {
    actionType,
    payload,
    status: SyncStatus.PENDING,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    retries: 0,
    retryLimit: options.retryLimit || 3,
    priority: options.priority || "normal",
    metadata: options.metadata || {},
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(action);

    request.onsuccess = () => {
      console.log(`[OfflineSync] Queued action: ${actionType}`, action);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Gets all pending actions from the queue
 *
 * @param {string} filterStatus - Optional status filter
 * @returns {Promise<Array>} Array of pending actions
 */
export const getPendingActions = async (filterStatus = null) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    let request;
    if (filterStatus) {
      const index = store.index("status");
      request = index.getAll(filterStatus);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const actions = request.result || [];
      // Sort by priority (high first) then timestamp (oldest first)
      actions.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (a.priority !== "high" && b.priority === "high") return 1;
        return a.timestamp - b.timestamp;
      });
      resolve(actions);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Updates an action's status in the queue
 *
 * @param {number} actionId - Action ID
 * @param {string} status - New status
 * @param {object} updates - Additional fields to update
 * @returns {Promise<void>}
 * @private
 */
const updateActionStatus = async (actionId, status, updates = {}) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(actionId);

    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (!action) {
        reject(new Error(`Action ${actionId} not found`));
        return;
      }

      const updatedAction = {
        ...action,
        status,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      const putRequest = store.put(updatedAction);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Deletes an action from the queue
 *
 * @param {number} actionId - Action ID
 * @returns {Promise<void>}
 */
export const deleteAction = async (actionId) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(actionId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Executes a single queued action
 *
 * @param {object} action - Action to execute
 * @param {Function} executor - Function to execute the action
 * @returns {Promise<object>} Execution result
 * @private
 */
const executeAction = async (action, executor) => {
  try {
    console.log(`[OfflineSync] Executing action: ${action.actionType}`, action);

    await updateActionStatus(action.id, SyncStatus.SYNCING);

    const result = await executor(action.actionType, action.payload);

    await updateActionStatus(action.id, SyncStatus.SYNCED, {
      syncedAt: new Date().toISOString(),
      result,
    });

    // Delete synced action after short delay (for debugging/audit)
    setTimeout(() => deleteAction(action.id), 5000);

    return { success: true, result };
  } catch (error) {
    console.error(
      `[OfflineSync] Failed to execute action ${action.id}:`,
      error
    );

    const retries = action.retries + 1;

    if (retries >= action.retryLimit) {
      await updateActionStatus(action.id, SyncStatus.FAILED, {
        retries,
        error: error.message,
        failedAt: new Date().toISOString(),
      });
      return { success: false, error: error.message, retriesExhausted: true };
    } else {
      await updateActionStatus(action.id, SyncStatus.PENDING, {
        retries,
        lastError: error.message,
      });
      return { success: false, error: error.message, willRetry: true };
    }
  }
};

/**
 * Synchronizes all pending actions
 *
 * @param {Function} executor - Function that executes actions (actionType, payload) => Promise
 * @param {object} options - Sync options
 * @returns {Promise<{synced: number, failed: number, results: Array}>}
 *
 * @example
 * const results = await syncPendingActions(async (actionType, payload) => {
 *   switch (actionType) {
 *     case OfflineActionType.UPDATE_STOP_STATUS:
 *       return await api.patch(`/stops/${payload.stopId}`, payload);
 *     case OfflineActionType.UPLOAD_SIGNATURE:
 *       return await api.post('/signatures', payload);
 *     default:
 *       throw new Error(`Unknown action type: ${actionType}`);
 *   }
 * });
 *
 * console.log(`Synced ${results.synced} actions, ${results.failed} failed`);
 */
export const syncPendingActions = async (executor, options = {}) => {
  const { maxConcurrent = 3, onProgress } = options;

  const pendingActions = await getPendingActions(SyncStatus.PENDING);

  if (pendingActions.length === 0) {
    console.log("[OfflineSync] No pending actions to sync");
    return { synced: 0, failed: 0, results: [] };
  }

  console.log(
    `[OfflineSync] Starting sync of ${pendingActions.length} actions`
  );

  const results = [];
  let synced = 0;
  let failed = 0;

  // Process actions in batches
  for (let i = 0; i < pendingActions.length; i += maxConcurrent) {
    const batch = pendingActions.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map((action) => executeAction(action, executor))
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        synced++;
      } else {
        failed++;
      }
      results.push({
        action: batch[index],
        ...result.value,
      });
    });

    if (onProgress) {
      onProgress({
        completed: i + batch.length,
        total: pendingActions.length,
        synced,
        failed,
      });
    }
  }

  console.log(
    `[OfflineSync] Sync complete: ${synced} synced, ${failed} failed`
  );

  return { synced, failed, results };
};

/**
 * Checks if the browser is online
 *
 * @returns {boolean}
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Sets up automatic sync when browser comes online
 *
 * @param {Function} executor - Action executor function
 * @param {object} options - Listener options
 * @returns {Function} Cleanup function to remove listeners
 *
 * @example
 * const cleanup = setupAutoSync(async (actionType, payload) => {
 *   // Execute action...
 * });
 *
 * // Later, when component unmounts:
 * cleanup();
 */
export const setupAutoSync = (executor, options = {}) => {
  const { debounceMs = 1000 } = options;

  let debounceTimer = null;

  const handleOnline = () => {
    console.log("[OfflineSync] Browser is online, starting auto-sync");

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        await syncPendingActions(executor, options);
      } catch (error) {
        console.error("[OfflineSync] Auto-sync failed:", error);
      }
    }, debounceMs);
  };

  const handleOffline = () => {
    console.log("[OfflineSync] Browser is offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    clearTimeout(debounceTimer);
  };
};

/**
 * Caches data for offline access
 *
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttlMs - Time to live in milliseconds (default: 24 hours)
 * @returns {Promise<void>}
 *
 * @example
 * await cacheOfflineData('manifest-2024-01-15', manifestData, 86400000);
 */
export const cacheOfflineData = async (key, data, ttlMs = 86400000) => {
  const db = await openDatabase();

  const cacheEntry = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], "readwrite");
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.put(cacheEntry);

    request.onsuccess = () => {
      console.log(`[OfflineSync] Cached data: ${key}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Retrieves cached data
 *
 * @param {string} key - Cache key
 * @returns {Promise<*>} Cached data or null if expired/not found
 *
 * @example
 * const manifest = await getCachedData('manifest-2024-01-15');
 * if (manifest) {
 *   console.log('Using cached manifest');
 * }
 */
export const getCachedData = async (key) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], "readonly");
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      const entry = request.result;

      if (!entry) {
        resolve(null);
        return;
      }

      // Check if expired
      if (entry.expiresAt < Date.now()) {
        console.log(`[OfflineSync] Cache expired: ${key}`);
        // Clean up expired entry
        const deleteTransaction = db.transaction([CACHE_STORE], "readwrite");
        deleteTransaction.objectStore(CACHE_STORE).delete(key);
        resolve(null);
        return;
      }

      resolve(entry.data);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clears expired cache entries
 *
 * @returns {Promise<number>} Number of entries deleted
 */
export const clearExpiredCache = async () => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], "readwrite");
    const store = transaction.objectStore(CACHE_STORE);
    const index = store.index("expiresAt");
    const range = IDBKeyRange.upperBound(Date.now());
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        deletedCount++;
        cursor.continue();
      } else {
        console.log(
          `[OfflineSync] Cleared ${deletedCount} expired cache entries`
        );
        resolve(deletedCount);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Gets storage usage statistics
 *
 * @returns {Promise<{pendingActions: number, cachedItems: number}>}
 */
export const getStorageStats = async () => {
  const db = await openDatabase();

  const stats = await Promise.all([
    new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const request = transaction.objectStore(STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    }),
    new Promise((resolve) => {
      const transaction = db.transaction([CACHE_STORE], "readonly");
      const request = transaction.objectStore(CACHE_STORE).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    }),
  ]);

  return {
    pendingActions: stats[0],
    cachedItems: stats[1],
  };
};

/**
 * Clears all offline data (use with caution)
 *
 * @returns {Promise<void>}
 */
export const clearAllOfflineData = async () => {
  const db = await openDatabase();

  await Promise.all([
    new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const request = transaction.objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
    new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE], "readwrite");
      const request = transaction.objectStore(CACHE_STORE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
  ]);

  console.log("[OfflineSync] Cleared all offline data");
};

/**
 * Service Worker registration helper
 *
 * @param {string} swPath - Path to service worker file
 * @returns {Promise<ServiceWorkerRegistration>}
 *
 * @example
 * await registerServiceWorker('/service-worker.js');
 */
export const registerServiceWorker = async (swPath = "/service-worker.js") => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers not supported in this browser");
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    console.log("[OfflineSync] Service Worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("[OfflineSync] Service Worker registration failed:", error);
    throw error;
  }
};

/**
 * Offline sync utilities
 */
export const OfflineSync = {
  queue: queueOfflineAction,
  getPending: getPendingActions,
  sync: syncPendingActions,
  setupAutoSync,
  isOnline,
  cache: cacheOfflineData,
  getCache: getCachedData,
  clearExpired: clearExpiredCache,
  getStats: getStorageStats,
  clearAll: clearAllOfflineData,
  registerSW: registerServiceWorker,
  ActionType: OfflineActionType,
  Status: SyncStatus,
};

export default OfflineSync;
