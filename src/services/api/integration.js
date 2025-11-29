/**
 * API Integration Adapter
 *
 * Provides a unified interface to switch between mock and real APIs
 * Based on environment configuration (Section 5)
 *
 * Usage:
 *   import LogisticsAPI from './services/api/integration';
 *   const routes = await LogisticsAPI.getRoutes(labId, date);
 */

import { MockService } from "../_mock/service";
import * as RealAPI from "./api/logistics";

// Determine which API to use based on environment
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === "true";

/**
 * Adapter for routes operations
 */
const RoutesAdapter = {
  /**
   * Get all routes
   */
  async getAll(labId, date) {
    if (USE_REAL_API) {
      return RealAPI.getRoutes(labId, date);
    }

    // Mock API - filter by labId and date
    const allRoutes = await MockService.logistics.routes.getAll();
    return allRoutes.filter((route) => {
      const matchesLab = !labId || route.labId === labId;
      const matchesDate = !date || route.date === date;
      return matchesLab && matchesDate;
    });
  },

  /**
   * Get single route
   */
  async getById(routeId) {
    if (USE_REAL_API) {
      return RealAPI.getRoute(routeId);
    }
    return MockService.logistics.routes.getById(routeId);
  },

  /**
   * Create route
   */
  async create(routeData) {
    if (USE_REAL_API) {
      return RealAPI.createRoute(routeData);
    }
    return MockService.logistics.routes.create(routeData);
  },

  /**
   * Update route
   */
  async update(routeId, updates) {
    if (USE_REAL_API) {
      return RealAPI.updateRoute(routeId, updates);
    }
    return MockService.logistics.routes.update(routeId, updates);
  },

  /**
   * Delete route
   */
  async delete(routeId) {
    if (USE_REAL_API) {
      return RealAPI.deleteRoute(routeId);
    }
    return MockService.logistics.routes.delete(routeId);
  },

  /**
   * Optimize route
   */
  async optimize(routeId, options) {
    if (USE_REAL_API) {
      return RealAPI.optimizeRoute(routeId, options);
    }

    // Mock optimization - just return the route unchanged
    const route = await MockService.logistics.routes.getById(routeId);
    return { ...route, optimized: true };
  },
};

/**
 * Adapter for pickups operations
 */
const PickupsAdapter = {
  /**
   * Get all pickups
   */
  async getAll(filters = {}) {
    if (USE_REAL_API) {
      return RealAPI.getPickups(filters);
    }
    return MockService.logistics.pickups.getAll(filters);
  },

  /**
   * Get single pickup
   */
  async getById(pickupId) {
    if (USE_REAL_API) {
      return RealAPI.getPickup(pickupId);
    }
    return MockService.logistics.pickups.getById(pickupId);
  },

  /**
   * Create pickup
   */
  async create(pickupData) {
    if (USE_REAL_API) {
      return RealAPI.createPickup(pickupData);
    }
    return MockService.logistics.pickups.create(pickupData);
  },

  /**
   * Assign pickup
   */
  async assign(pickupId, assignment) {
    if (USE_REAL_API) {
      return RealAPI.assignPickup(pickupId, assignment);
    }
    return MockService.logistics.pickups.update(pickupId, assignment);
  },

  /**
   * Reschedule pickup
   */
  async reschedule(pickupId, newWindow) {
    if (USE_REAL_API) {
      return RealAPI.reschedulePickup(pickupId, newWindow);
    }
    return MockService.logistics.pickups.update(pickupId, newWindow);
  },

  /**
   * Delete pickup
   */
  async delete(pickupId) {
    if (USE_REAL_API) {
      return RealAPI.deletePickup(pickupId);
    }
    return MockService.logistics.pickups.delete(pickupId);
  },
};

/**
 * Adapter for vehicles operations
 */
const VehiclesAdapter = {
  /**
   * Get all vehicles
   */
  async getAll(labId) {
    if (USE_REAL_API) {
      return RealAPI.getVehicles(labId);
    }

    const allVehicles = await MockService.logistics.vehicles.getAll();
    return labId ? allVehicles.filter((v) => v.labId === labId) : allVehicles;
  },

  /**
   * Get single vehicle
   */
  async getById(vehicleId) {
    if (USE_REAL_API) {
      return RealAPI.getVehicle(vehicleId);
    }
    return MockService.logistics.vehicles.getById(vehicleId);
  },

  /**
   * Update vehicle
   */
  async update(vehicleId, updates) {
    if (USE_REAL_API) {
      return RealAPI.updateVehicle(vehicleId, updates);
    }
    return MockService.logistics.vehicles.update(vehicleId, updates);
  },
};

/**
 * Adapter for providers operations
 */
const ProvidersAdapter = {
  /**
   * Get all providers
   */
  async getAll(type = null) {
    if (USE_REAL_API) {
      return RealAPI.getProviders(type);
    }

    const allProviders = await MockService.logistics.providers.getAll();
    return type ? allProviders.filter((p) => p.type === type) : allProviders;
  },

  /**
   * Select best provider
   */
  async select(criteria) {
    if (USE_REAL_API) {
      return RealAPI.selectProvider(criteria);
    }
    return MockService.logistics.selectProvider(criteria);
  },
};

/**
 * Adapter for stops operations
 */
const StopsAdapter = {
  /**
   * Update stop status
   */
  async updateStatus(stopId, status, proofOfService) {
    if (USE_REAL_API) {
      return RealAPI.updateStopStatus(stopId, status, proofOfService);
    }

    // Mock doesn't have direct stop API, need to find route and update
    // This is a simplified mock implementation
    return { id: stopId, status, updatedAt: new Date().toISOString() };
  },

  /**
   * Get upload URL for proof
   */
  async getUploadUrl(stopId, fileType) {
    if (USE_REAL_API) {
      return RealAPI.getProofUploadUrl(stopId, fileType);
    }

    // Mock returns fake pre-signed URL
    return {
      uploadUrl: `https://mock-s3.amazonaws.com/upload/${stopId}/${fileType}`,
      s3Key: `${fileType}s/${stopId}/${fileType}-${Date.now()}.png`,
    };
  },
};

/**
 * Unified API interface
 */
const LogisticsAPI = {
  routes: RoutesAdapter,
  pickups: PickupsAdapter,
  vehicles: VehiclesAdapter,
  providers: ProvidersAdapter,
  stops: StopsAdapter,

  /**
   * Check if using real API
   */
  isRealAPI() {
    return USE_REAL_API;
  },

  /**
   * Get API configuration
   */
  getConfig() {
    if (USE_REAL_API) {
      return RealAPI.getApiConfig();
    }
    return {
      mode: "mock",
      baseUrl: "mock://localhost",
    };
  },

  /**
   * Health check
   */
  async checkHealth() {
    if (USE_REAL_API) {
      return RealAPI.checkHealth();
    }
    return true; // Mock always healthy
  },
};

export default LogisticsAPI;
