/**
 * IndexedDB Offline Queue
 *
 * Implements offline action queue using IndexedDB (Section 5.3.3)
 *
 * Features:
 * - Queue actions when offline
 * - Auto-sync when online
 * - Persistent storage (survives page refresh)
 * - 7-day retention
 */

const DB_NAME = "logistics-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";

/**
 * Open IndexedDB connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create indexes
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("action", "action", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };
  });
}

/**
 * Add action to queue
 */
export async function queueAction(action, payload) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const item = {
      action,
      payload,
      timestamp: Date.now(),
      status: "pending",
      retries: 0,
      maxRetries: 3,
    };

    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending actions
 */
export async function getPendingActions() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("status");

    const request = index.getAll("pending");

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update action status
 */
export async function updateActionStatus(id, status, error = null) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) {
        reject(new Error("Action not found"));
        return;
      }

      item.status = status;
      if (error) {
        item.error = error;
        item.retries = (item.retries || 0) + 1;
      }
      if (status === "completed" || status === "failed") {
        item.completedAt = Date.now();
      }

      const updateRequest = store.put(item);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete action from queue
 */
export async function deleteAction(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear old completed actions (7-day retention)
 */
export async function clearOldActions() {
  const db = await openDB();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");

    const range = IDBKeyRange.upperBound(sevenDaysAgo);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const item = cursor.value;
        if (item.status === "completed" || item.status === "failed") {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get action count by status
 */
export async function getActionCounts() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result;
      const counts = {
        pending: 0,
        completed: 0,
        failed: 0,
        total: items.length,
      };

      items.forEach((item) => {
        if (item.status === "pending") counts.pending++;
        else if (item.status === "completed") counts.completed++;
        else if (item.status === "failed") counts.failed++;
      });

      resolve(counts);
    };

    request.onerror = () => reject(request.error);
  });
}

// =============================================================================
// OFFLINE QUEUE FOR LOGISTICS ACTIONS
// =============================================================================

/**
 * Queue stop status update
 */
export async function queueStopUpdate(stopId, status, proofOfService) {
  return queueAction("UPDATE_STOP_STATUS", {
    stopId,
    status,
    proofOfService,
  });
}

/**
 * Queue driver location update
 */
export async function queueLocationUpdate(driverId, routeId, coordinates) {
  return queueAction("UPDATE_LOCATION", {
    driverId,
    routeId,
    coordinates,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Queue pickup completion
 */
export async function queuePickupCompletion(pickupId, completionData) {
  return queueAction("COMPLETE_PICKUP", {
    pickupId,
    ...completionData,
  });
}

/**
 * Queue proof upload
 */
export async function queueProofUpload(stopId, fileType, fileData) {
  return queueAction("UPLOAD_PROOF", {
    stopId,
    fileType,
    fileData, // Base64 encoded or Blob URL
  });
}

// =============================================================================
// SYNC MANAGER
// =============================================================================

/**
 * Sync pending actions with server
 */
export async function syncPendingActions(apiHandlers) {
  const actions = await getPendingActions();

  const results = {
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const action of actions) {
    // Skip if max retries reached
    if (action.retries >= action.maxRetries) {
      await updateActionStatus(action.id, "failed", "Max retries exceeded");
      results.failed++;
      continue;
    }

    try {
      const handler = apiHandlers[action.action];
      if (!handler) {
        throw new Error(`No handler for action: ${action.action}`);
      }

      await handler(action.payload);
      await deleteAction(action.id); // Delete on success
      results.synced++;
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);
      await updateActionStatus(action.id, "pending", error.message);
      results.failed++;
      results.errors.push({
        actionId: action.id,
        action: action.action,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Setup auto-sync when online
 */
export function setupAutoSync(apiHandlers, intervalMs = 30000) {
  let syncInterval = null;

  const startSync = () => {
    if (syncInterval) return;

    syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          await syncPendingActions(apiHandlers);
        } catch (error) {
          console.error("Auto-sync failed:", error);
        }
      }
    }, intervalMs);
  };

  const stopSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  // Start immediately if online
  if (navigator.onLine) {
    startSync();
  }

  // Listen for online/offline events
  window.addEventListener("online", startSync);
  window.addEventListener("offline", stopSync);

  // Return cleanup function
  return () => {
    stopSync();
    window.removeEventListener("online", startSync);
    window.removeEventListener("offline", stopSync);
  };
}

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for online connection"));
    }, timeoutMs);

    const handleOnline = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
    };

    window.addEventListener("online", handleOnline);
  });
}

// Export all functions
export default {
  openDB,
  queueAction,
  getPendingActions,
  updateActionStatus,
  deleteAction,
  clearOldActions,
  getActionCounts,
  queueStopUpdate,
  queueLocationUpdate,
  queuePickupCompletion,
  queueProofUpload,
  syncPendingActions,
  setupAutoSync,
  isOnline,
  waitForOnline,
};
