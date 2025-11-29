/**
 * Custom Hooks for Logistics Context
 *
 * Provides convenience hooks for common logistics operations
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 4.2.3
 */

import { useCallback, useEffect } from "react";
import { useLogistics } from "../contexts/LogisticsContext";

/**
 * Hook for route filtering with common presets
 */
export function useRouteFilters() {
  const {
    filters,
    setDateFilter,
    setStatusFilter,
    setDriverFilter,
    clearFilters,
  } = useLogistics();

  const filterByToday = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setDateFilter(today);
  }, [setDateFilter]);

  const filterByTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateFilter(tomorrow.toISOString().split("T")[0]);
  }, [setDateFilter]);

  const filterByThisWeek = useCallback(() => {
    // For simplicity, just clear date filter and let UI handle week view
    setDateFilter(null);
  }, [setDateFilter]);

  const filterByActive = useCallback(() => {
    setStatusFilter(["Scheduled", "InProgress"]);
  }, [setStatusFilter]);

  const filterByCompleted = useCallback(() => {
    setStatusFilter(["Completed"]);
  }, [setStatusFilter]);

  return {
    filters,
    filterByToday,
    filterByTomorrow,
    filterByThisWeek,
    filterByActive,
    filterByCompleted,
    setDateFilter,
    setStatusFilter,
    setDriverFilter,
    clearFilters,
  };
}

/**
 * Hook for route pagination
 */
export function useRoutePagination() {
  const { pagination, paginatedRoutes, setPage, setPageSize, filteredRoutes } =
    useLogistics();

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPrevPage = pagination.page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(pagination.page + 1);
    }
  }, [hasNextPage, pagination.page, setPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPage(pagination.page - 1);
    }
  }, [hasPrevPage, pagination.page, setPage]);

  const goToPage = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setPage(page);
      }
    },
    [totalPages, setPage]
  );

  return {
    routes: paginatedRoutes,
    currentPage: pagination.page,
    pageSize: pagination.pageSize,
    totalCount: pagination.totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    // Also expose filtered routes for non-paginated use
    allFilteredRoutes: filteredRoutes,
  };
}

/**
 * Hook for route sorting
 */
export function useRouteSorting() {
  const { sorting, setSortBy, sortedRoutes } = useLogistics();

  const toggleSort = useCallback(
    (field) => {
      if (sorting.field === field) {
        // Toggle order if same field
        setSortBy(field, sorting.order === "asc" ? "desc" : "asc");
      } else {
        // Default to ascending for new field
        setSortBy(field, "asc");
      }
    },
    [sorting, setSortBy]
  );

  const sortByDate = useCallback(
    (order = "desc") => {
      setSortBy("date", order);
    },
    [setSortBy]
  );

  const sortByStatus = useCallback(
    (order = "asc") => {
      setSortBy("status", order);
    },
    [setSortBy]
  );

  const sortByDriver = useCallback(
    (order = "asc") => {
      setSortBy("driverId", order);
    },
    [setSortBy]
  );

  return {
    sorting,
    sortedRoutes,
    toggleSort,
    sortByDate,
    sortByStatus,
    sortByDriver,
    setSortBy,
  };
}

/**
 * Hook for driver-specific routes
 * Automatically filters routes for the current driver
 */
export function useMyRoutes() {
  const { myRoutes, loading, error } = useLogistics();

  const activeRoutes = myRoutes.filter(
    (r) => r.status === "Scheduled" || r.status === "InProgress"
  );

  const todayRoutes = myRoutes.filter((r) => {
    const today = new Date().toISOString().split("T")[0];
    return r.date === today;
  });

  const currentRoute =
    activeRoutes.find((r) => r.status === "InProgress") || activeRoutes[0];

  return {
    myRoutes,
    activeRoutes,
    todayRoutes,
    currentRoute,
    loading,
    error,
  };
}

/**
 * Hook for pickup requests with common filters
 */
export function usePickupRequests() {
  const { pickups, loading, error, createPickupRequest } = useLogistics();

  const pendingPickups = pickups.filter((p) => p.status === "Pending");
  const assignedPickups = pickups.filter((p) => p.status === "Assigned");
  const completedPickups = pickups.filter((p) => p.status === "Completed");
  const rushPickups = pickups.filter((p) => p.isRush);

  const todayPickups = pickups.filter((p) => {
    const today = new Date().toISOString().split("T")[0];
    const pickupDate = new Date(p.windowStart).toISOString().split("T")[0];
    return pickupDate === today;
  });

  return {
    pickups,
    pendingPickups,
    assignedPickups,
    completedPickups,
    rushPickups,
    todayPickups,
    loading,
    error,
    createPickupRequest,
  };
}

/**
 * Hook for auto-refreshing logistics data
 *
 * @param intervalMs - Refresh interval in milliseconds (default: 30 seconds)
 */
export function useAutoRefresh(intervalMs = 30000) {
  const { refreshData, lastFetch } = useLogistics();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshData, intervalMs]);

  return { lastFetch, refreshData };
}

/**
 * Hook for route statistics
 */
export function useRouteStats() {
  const { routes, pickups } = useLogistics();

  const stats = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter((r) => r.status === "InProgress").length,
    scheduledRoutes: routes.filter((r) => r.status === "Scheduled").length,
    completedRoutes: routes.filter((r) => r.status === "Completed").length,
    cancelledRoutes: routes.filter((r) => r.status === "Cancelled").length,

    totalPickups: pickups.length,
    pendingPickups: pickups.filter((p) => p.status === "Pending").length,
    completedPickups: pickups.filter((p) => p.status === "Completed").length,
    rushPickups: pickups.filter((p) => p.isRush).length,
  };

  // Calculate completion rate
  stats.routeCompletionRate =
    stats.totalRoutes > 0
      ? ((stats.completedRoutes / stats.totalRoutes) * 100).toFixed(1)
      : 0;

  stats.pickupCompletionRate =
    stats.totalPickups > 0
      ? ((stats.completedPickups / stats.totalPickups) * 100).toFixed(1)
      : 0;

  return stats;
}

/**
 * Hook for vehicle management
 */
export function useVehicles() {
  const { vehicles, loading, error } = useLogistics();

  const activeVehicles = vehicles.filter((v) => v.status === "Active");
  const maintenanceVehicles = vehicles.filter(
    (v) => v.status === "Maintenance"
  );
  const availableVehicles = activeVehicles.filter((v) => !v.assignedDriverId);

  return {
    vehicles,
    activeVehicles,
    maintenanceVehicles,
    availableVehicles,
    loading,
    error,
  };
}

/**
 * Hook for provider selection
 */
export function useProviders() {
  const { providers, selectProvider, loading, error } = useLogistics();

  const activeProviders = providers.filter((p) => p.status === "Active");
  const inHouseProvider = providers.find((p) => p.type === "IN_HOUSE");
  const thirdPartyProviders = providers.filter((p) => p.type === "THIRD_PARTY");

  return {
    providers,
    activeProviders,
    inHouseProvider,
    thirdPartyProviders,
    selectProvider,
    loading,
    error,
  };
}
