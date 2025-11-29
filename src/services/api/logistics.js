/**
 * Logistics API Service Layer
 *
 * Implements REST API clients for AWS Lambda endpoints defined in Section 5.1.1
 * Follows OpenAPI specification from Section 5.1.2
 *
 * Endpoints:
 * - Routes: Create, List, Update, Delete, Optimize
 * - Stops: Update status, Get details, Upload proof
 * - Pickups: Create, List, Assign, Reschedule
 * - Drivers: Get manifest, Update location
 */

// Configuration
const API_BASE_URL =
  import.meta.env.VITE_LOGISTICS_API_URL ||
  "https://api.lab-portal.com/logistics";
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Base fetch wrapper with authentication and error handling
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("authToken");

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    signal: controller.signal,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw err;
  }
}

// =============================================================================
// ROUTES API
// =============================================================================

/**
 * List routes for a lab on specific date
 * GET /routes?date=YYYY-MM-DD&labId={labId}
 */
export async function getRoutes(labId, date) {
  const params = new URLSearchParams({ labId, date });
  return apiRequest(`/routes?${params}`);
}

/**
 * Get single route details
 * GET /routes/{routeId}
 */
export async function getRoute(routeId) {
  return apiRequest(`/routes/${routeId}`);
}

/**
 * Create new route
 * POST /routes
 */
export async function createRoute(routeData) {
  return apiRequest("/routes", {
    method: "POST",
    body: JSON.stringify(routeData),
  });
}

/**
 * Update route details
 * PATCH /routes/{routeId}
 */
export async function updateRoute(routeId, updates) {
  return apiRequest(`/routes/${routeId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete route
 * DELETE /routes/{routeId}
 */
export async function deleteRoute(routeId) {
  return apiRequest(`/routes/${routeId}`, {
    method: "DELETE",
  });
}

/**
 * Optimize route using AWS Location Service
 * POST /routes/{routeId}/optimize
 */
export async function optimizeRoute(routeId, options = {}) {
  return apiRequest(`/routes/${routeId}/optimize`, {
    method: "POST",
    body: JSON.stringify({
      algorithm: options.algorithm || "TIME_WINDOWS",
      considerTraffic: options.considerTraffic !== false,
    }),
  });
}

// =============================================================================
// STOPS API
// =============================================================================

/**
 * Get stop details
 * GET /stops/{stopId}
 */
export async function getStop(stopId) {
  return apiRequest(`/stops/${stopId}`);
}

/**
 * Update stop status
 * PATCH /stops/{stopId}
 */
export async function updateStopStatus(stopId, status, proofOfService = null) {
  const payload = { status };

  if (proofOfService) {
    payload.proofOfService = proofOfService;
  }

  return apiRequest(`/stops/${stopId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Get upload URL for proof of delivery
 * POST /stops/{stopId}/proof
 */
export async function getProofUploadUrl(stopId, fileType) {
  return apiRequest(`/stops/${stopId}/proof`, {
    method: "POST",
    body: JSON.stringify({ fileType }),
  });
}

// =============================================================================
// PICKUPS API
// =============================================================================

/**
 * List pickups for clinic or lab
 * GET /pickups?clinicId={clinicId}&status={status}
 */
export async function getPickups(filters = {}) {
  const params = new URLSearchParams();

  if (filters.clinicId) params.append("clinicId", filters.clinicId);
  if (filters.labId) params.append("labId", filters.labId);
  if (filters.status) params.append("status", filters.status);
  if (filters.date) params.append("date", filters.date);

  return apiRequest(`/pickups?${params}`);
}

/**
 * Get single pickup details
 * GET /pickups/{pickupId}
 */
export async function getPickup(pickupId) {
  return apiRequest(`/pickups/${pickupId}`);
}

/**
 * Create new pickup request
 * POST /pickups
 */
export async function createPickup(pickupData) {
  return apiRequest("/pickups", {
    method: "POST",
    body: JSON.stringify(pickupData),
  });
}

/**
 * Assign pickup to driver/route
 * PATCH /pickups/{pickupId}/assign
 */
export async function assignPickup(pickupId, assignment) {
  return apiRequest(`/pickups/${pickupId}/assign`, {
    method: "PATCH",
    body: JSON.stringify(assignment),
  });
}

/**
 * Reschedule pickup
 * POST /pickups/{pickupId}/reschedule
 */
export async function reschedulePickup(pickupId, newWindow) {
  return apiRequest(`/pickups/${pickupId}/reschedule`, {
    method: "POST",
    body: JSON.stringify(newWindow),
  });
}

/**
 * Delete pickup request
 * DELETE /pickups/{pickupId}
 */
export async function deletePickup(pickupId) {
  return apiRequest(`/pickups/${pickupId}`, {
    method: "DELETE",
  });
}

// =============================================================================
// DRIVERS API
// =============================================================================

/**
 * Get driver's manifest for specific date
 * GET /drivers/{driverId}/manifest?date=YYYY-MM-DD
 */
export async function getDriverManifest(driverId, date) {
  const params = new URLSearchParams({ date });
  return apiRequest(`/drivers/${driverId}/manifest?${params}`);
}

/**
 * Update driver location (WebSocket preferred, HTTP fallback)
 * POST /drivers/{driverId}/location
 */
export async function updateDriverLocation(driverId, location) {
  return apiRequest(`/drivers/${driverId}/location`, {
    method: "POST",
    body: JSON.stringify({
      coordinates: location.coordinates,
      timestamp: location.timestamp || new Date().toISOString(),
      routeId: location.routeId,
    }),
  });
}

// =============================================================================
// VEHICLES API
// =============================================================================

/**
 * List all vehicles
 * GET /vehicles?labId={labId}
 */
export async function getVehicles(labId) {
  const params = new URLSearchParams({ labId });
  return apiRequest(`/vehicles?${params}`);
}

/**
 * Get vehicle details
 * GET /vehicles/{vehicleId}
 */
export async function getVehicle(vehicleId) {
  return apiRequest(`/vehicles/${vehicleId}`);
}

/**
 * Update vehicle status/details
 * PATCH /vehicles/{vehicleId}
 */
export async function updateVehicle(vehicleId, updates) {
  return apiRequest(`/vehicles/${vehicleId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// =============================================================================
// PROVIDERS API
// =============================================================================

/**
 * List delivery providers
 * GET /providers?type={type}
 */
export async function getProviders(type = null) {
  const params = type ? new URLSearchParams({ type }) : "";
  return apiRequest(`/providers${params ? `?${params}` : ""}`);
}

/**
 * Select best provider for delivery
 * POST /providers/select
 */
export async function selectProvider(criteria) {
  return apiRequest("/providers/select", {
    method: "POST",
    body: JSON.stringify(criteria),
  });
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Batch update multiple stops (for route completion)
 * POST /stops/batch
 */
export async function batchUpdateStops(updates) {
  return apiRequest("/stops/batch", {
    method: "POST",
    body: JSON.stringify({ updates }),
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check API health
 * GET /health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get API configuration
 */
export function getApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    timeout: API_TIMEOUT,
  };
}

// Export all functions as named exports for tree-shaking
export default {
  // Routes
  getRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  optimizeRoute,

  // Stops
  getStop,
  updateStopStatus,
  getProofUploadUrl,

  // Pickups
  getPickups,
  getPickup,
  createPickup,
  assignPickup,
  reschedulePickup,
  deletePickup,

  // Drivers
  getDriverManifest,
  updateDriverLocation,

  // Vehicles
  getVehicles,
  getVehicle,
  updateVehicle,

  // Providers
  getProviders,
  selectProvider,

  // Batch
  batchUpdateStops,

  // Utilities
  checkHealth,
  getApiConfig,
};
