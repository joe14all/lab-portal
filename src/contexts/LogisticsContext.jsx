/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';
import { useLab } from './LabContext';
import { LabEventBus, EVENTS } from '../utils/eventBus';
import { routeCache, deduplicator } from '../utils/performance/cache';

const LogisticsContext = createContext(null);

export const LogisticsProvider = ({ children }) => {
  const { activeLab, user } = useAuth();
  const { cases } = useLab();

  // --- State ---
  const [routes, setRoutes] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [providers, setProviders] = useState([]);
  // In a real app, "Deliveries" would be queried from Cases where status="Ready to Ship"
  // We will mock this aggregation in the "Unassigned" pool logic below
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // --- Filters & UI State (Section 4.2.2) ---
  const [filters, setFilters] = useState({
    date: null,           // YYYY-MM-DD or null for all
    status: [],           // Array of RouteStatus to filter by
    driverId: null,       // Filter by specific driver
  });

  const [sorting, setSorting] = useState({
    field: 'date',        // 'date' | 'status' | 'driverId'
    order: 'desc',        // 'asc' | 'desc'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      if (!activeLab?.id) return;

      // Cache check: don't re-fetch if data was loaded recently (within 30 seconds)
      const now = Date.now();
      if (lastFetch && (now - lastFetch) < 30000) {
        return;
      }

      // Try to load from cache first
      const cacheKey = `logistics-data-${activeLab.id}`;
      const cachedData = routeCache.get(cacheKey);
      
      if (cachedData) {
        console.log('[LogisticsContext] Loading from cache');
        setRoutes(cachedData.routes || []);
        setPickups(cachedData.pickups || []);
        setVehicles(cachedData.vehicles || []);
        setProviders(cachedData.providers || []);
        setPagination(prev => ({ ...prev, totalCount: cachedData.routes?.length || 0 }));
        // Continue to background fetch for fresh data
      }

      setLoading(true);
      try {
        // Use deduplicator to prevent duplicate initial loads
        const data = await deduplicator.dedupe(`init-logistics-${activeLab.id}`, async () => {
          const [fetchedRoutes, fetchedPickups, fetchedVehicles, fetchedProviders] = await Promise.all([
            MockService.logistics.routes.getAll({ labId: activeLab.id }),
            MockService.logistics.pickups.getAll({ labId: activeLab.id }),
            MockService.logistics.vehicles.getAll({ labId: activeLab.id }),
            MockService.logistics.providers.getAll({ status: 'Active' })
          ]);
          return { routes: fetchedRoutes, pickups: fetchedPickups, vehicles: fetchedVehicles, providers: fetchedProviders };
        });
        
        // Cache the fetched data (5 minute TTL)
        routeCache.set(cacheKey, data, 300000);
        
        // Cache individual routes
        data.routes.forEach(route => {
          routeCache.set(route.id, route, 300000);
        });
        
        setRoutes(data.routes);
        setPickups(data.pickups);
        setVehicles(data.vehicles);
        setProviders(data.providers);
        setPagination(prev => ({ ...prev, totalCount: data.routes.length }));
        setLastFetch(now);
        setError(null);
      } catch (err) {
        console.error("Failed to load Logistics data", err);
        setError("Failed to load Logistics data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeLab, lastFetch]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const createRoute = useCallback(async (routeData) => {
    try {
      // Use deduplicator to prevent duplicate create requests
      const cacheKey = `create-route-${routeData.name}-${routeData.driverId}`;
      const newRoute = await deduplicator.dedupe(cacheKey, async () => {
        return await MockService.logistics.routes.create({
          ...routeData,
          labId: activeLab.id,
          status: 'Scheduled',
          stops: []
        });
      });
      
      // Cache the new route
      routeCache.set(newRoute.id, newRoute);
      
      setRoutes(prev => [...prev, newRoute]);
      
      // Publish event for real-time updates
      LabEventBus.publish(EVENTS.ROUTE_CREATED, {
        routeId: newRoute.id,
        routeName: newRoute.name,
        driverId: newRoute.driverId,
        timestamp: new Date().toISOString()
      });
      
      return newRoute;
    } catch (err) {
      console.error("Failed to create route", err);
      throw err;
    }
  }, [activeLab]);

  const updateRouteStopStatus = useCallback(async (routeId, stopId, newStatus, proofData = {}) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) throw new Error("Route not found");

      const updatedStops = route.stops.map(stop => {
        if (stop.id === stopId) {
          return {
            ...stop,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? new Date().toISOString() : null,
            ...proofData // signature, photo url, etc.
          };
        }
        return stop;
      });

      // Check if all stops are done
      const allDone = updatedStops.every(s => s.status === 'Completed' || s.status === 'Skipped');
      const routeStatus = allDone ? 'Completed' : 'InProgress';

      // Use deduplicator to prevent duplicate update requests
      const cacheKey = `update-stop-${routeId}-${stopId}-${newStatus}`;
      const updatedRoute = await deduplicator.dedupe(cacheKey, async () => {
        return await MockService.logistics.routes.update(routeId, {
          stops: updatedStops,
          status: routeStatus
        });
      });

      // Update route cache
      routeCache.set(routeId, updatedRoute);

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
      
      // Publish event for real-time updates
      const updatedStop = updatedStops.find(s => s.id === stopId);
      LabEventBus.publish(EVENTS.STOP_UPDATED, {
        routeId,
        stopId,
        status: newStatus,
        clinicId: updatedStop?.clinicId,
        routeName: updatedRoute.name,
        timestamp: new Date().toISOString()
      });
      
      // Publish specific event for completed stops
      if (newStatus === 'Completed') {
        LabEventBus.publish(EVENTS.STOP_COMPLETED, {
          routeId,
          stopId,
          clinicId: updatedStop?.clinicId,
          routeName: updatedRoute.name,
          timestamp: new Date().toISOString()
        });

        // Update all cases in delivery manifest to stage-delivered
        if (updatedStop?.deliveryManifest && updatedStop.deliveryManifest.length > 0) {
          for (const delivery of updatedStop.deliveryManifest) {
            if (delivery.caseId) {
              try {
                await MockService.cases.cases.update(delivery.caseId, {
                  status: 'stage-delivered',
                  deliveryInfo: {
                    deliveredAt: new Date().toISOString(),
                    routeId,
                    routeName: updatedRoute.name,
                    stopId,
                    ...proofData // Include signature, photo, etc.
                  }
                });

                // Emit event for case status change
                LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
                  caseId: delivery.caseId,
                  oldStatus: 'stage-shipped',
                  newStatus: 'stage-delivered',
                  routeId,
                  stopId,
                  timestamp: new Date().toISOString()
                });
              } catch (err) {
                console.error(`Failed to update case ${delivery.caseId} to delivered`, err);
                // Continue processing other cases even if one fails
              }
            }
          }
        }
      }
      
      return updatedRoute;
    } catch (err) {
      console.error("Failed to update stop", err);
      throw err;
    }
  }, [routes]);

  const createPickupRequest = useCallback(async (requestData) => {
    if (!activeLab) return;
    try {
      const newPickup = await MockService.logistics.pickups.create({
        ...requestData,
        labId: activeLab.id,
        status: 'Pending',
        requestTime: new Date().toISOString()
      });
      setPickups(prev => [newPickup, ...prev]);
      return newPickup;
    } catch (err) {
      console.error("Failed to create pickup", err);
      throw err;
    }
  }, [activeLab]);

  // Skip a route stop with reason and notification
  const skipRouteStop = useCallback(async (routeId, stopId, skipReason, skipNotes = '') => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) throw new Error("Route not found");

      const stop = route.stops.find(s => s.id === stopId);
      if (!stop) throw new Error("Stop not found");

      const updatedStops = route.stops.map(s => {
        if (s.id === stopId) {
          return {
            ...s,
            status: 'Skipped',
            skippedAt: new Date().toISOString(),
            skipReason,
            skipNotes,
            requiresFollowUp: true
          };
        }
        return s;
      });

      // Check if all stops are done (completed or skipped)
      const allDone = updatedStops.every(s => s.status === 'Completed' || s.status === 'Skipped');
      const routeStatus = allDone ? 'Completed' : 'InProgress';

      const updatedRoute = await MockService.logistics.routes.update(routeId, {
        stops: updatedStops,
        status: routeStatus
      });

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));

      // Publish event for real-time updates
      LabEventBus.publish(EVENTS.STOP_SKIPPED, {
        routeId,
        stopId,
        skipReason,
        skipNotes,
        clinicId: stop.clinicId,
        routeName: updatedRoute.name,
        timestamp: new Date().toISOString()
      });

      // In a real app, this would send a notification to dispatcher
      // For now, we'll just log it
      console.log(`[NOTIFICATION] Stop skipped at ${stop.clinicId}. Reason: ${skipReason}. Notes: ${skipNotes}`);
      
      return updatedRoute;
    } catch (err) {
      console.error("Failed to skip stop", err);
      throw err;
    }
  }, [routes]);

  // Mock function to "Assign" a pending item to a route
  // In a real backend, this would move the entity from "Pool" to "Route.stops"
  const assignToRoute = useCallback(async (routeId, task) => {
    try {
      const route = routes.find(r => r.id === routeId);
      const newStop = {
        id: `stop-${Date.now()}`,
        sequence: route.stops.length + 1,
        clinicId: task.clinicId,
        type: task.type, // 'Pickup' or 'Delivery'
        status: 'Pending',
        // Copy relevant details
        pickupTasks: task.type === 'Pickup' ? [task] : [],
        deliveryManifest: task.type === 'Delivery' ? [task] : []
      };

      // Use deduplicator to prevent duplicate assignments
      const cacheKey = `assign-${routeId}-${task.id}`;
      const updatedRoute = await deduplicator.dedupe(cacheKey, async () => {
        return await MockService.logistics.routes.update(routeId, {
          stops: [...route.stops, newStop]
        });
      });

      // Update route cache
      routeCache.set(routeId, updatedRoute);
      
      // Invalidate logistics data cache since routes changed
      if (activeLab?.id) {
        routeCache.delete(`logistics-data-${activeLab.id}`);
      }

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
      
      // Publish event for real-time updates
      LabEventBus.publish(EVENTS.STOP_ASSIGNED, {
        routeId,
        routeName: route.name,
        clinicId: task.clinicId,
        taskType: task.type,
        stopId: newStop.id,
        timestamp: new Date().toISOString()
      });
      
      // If it was a pickup, update its status to 'Assigned'
      if (task.type === 'Pickup') {
        const updatedPickup = await MockService.logistics.pickups.update(task.id, { status: 'Assigned' });
        setPickups(prev => prev.map(p => p.id === task.id ? updatedPickup : p));
      }

      // If it's a delivery, update case status from stage-shipping to stage-shipped
      if (task.type === 'Delivery' && task.caseId) {
        try {
          await MockService.cases.cases.update(task.caseId, {
            status: 'stage-shipped',
            trackingInfo: {
              routeId,
              routeName: route.name,
              assignedAt: new Date().toISOString()
            }
          });

          // Emit event for case status change
          LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
            caseId: task.caseId,
            oldStatus: 'stage-shipping',
            newStatus: 'stage-shipped',
            routeId,
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to update case status to shipped", err);
          // Don't throw - allow route assignment to complete even if case update fails
        }
      }

    } catch (err) {
      console.error("Failed to assign task", err);
      throw err;
    }
  }, [routes, activeLab]);

  // Assign multiple tasks to a route in a single operation (bulk assignment)
  const assignMultipleTasks = useCallback(async (routeId, tasks) => {
    if (!tasks || tasks.length === 0) {
      return { success: 0, failed: 0 };
    }

    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) throw new Error("Route not found");

      const results = { success: 0, failed: 0, errors: [] };
      const newStops = [];
      const pickupsToUpdate = [];

      // Create stops for all tasks
      const casesToUpdate = []; // Track delivery cases to update
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        try {
          const newStop = {
            id: `stop-${Date.now()}-${i}`,
            sequence: route.stops.length + newStops.length + 1,
            clinicId: task.clinicId,
            type: task.type,
            status: 'Pending',
            pickupTasks: task.type === 'Pickup' ? [task] : [],
            deliveryManifest: task.type === 'Delivery' ? [task] : []
          };
          newStops.push(newStop);
          
          if (task.type === 'Pickup') {
            pickupsToUpdate.push(task.id);
          } else if (task.type === 'Delivery' && task.caseId) {
            casesToUpdate.push(task.caseId);
          }
          
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ taskId: task.id, error: err.message });
        }
      }

      // Update route with all new stops in one operation
      if (newStops.length > 0) {
        const updatedRoute = await MockService.logistics.routes.update(routeId, {
          stops: [...route.stops, ...newStops]
        });

        setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));

        // Publish bulk assignment event
        LabEventBus.publish(EVENTS.STOP_ASSIGNED, {
          routeId,
          routeName: route.name,
          taskCount: newStops.length,
          clinicIds: newStops.map(s => s.clinicId),
          timestamp: new Date().toISOString(),
          bulk: true
        });

        // Update pickup statuses in batch
        if (pickupsToUpdate.length > 0) {
          for (const pickupId of pickupsToUpdate) {
            try {
              const updatedPickup = await MockService.logistics.pickups.update(pickupId, { status: 'Assigned' });
              setPickups(prev => prev.map(p => p.id === pickupId ? updatedPickup : p));
            } catch (err) {
              console.error(`Failed to update pickup ${pickupId}:`, err);
            }
          }
        }

        // Update case statuses from stage-shipping to stage-shipped in batch
        if (casesToUpdate.length > 0) {
          for (const caseId of casesToUpdate) {
            try {
              await MockService.cases.cases.update(caseId, {
                status: 'stage-shipped',
                trackingInfo: {
                  routeId,
                  routeName: route.name,
                  assignedAt: new Date().toISOString()
                }
              });

              // Emit event for case status change
              LabEventBus.publish(EVENTS.CASE_STATUS_CHANGED, {
                caseId,
                oldStatus: 'stage-shipping',
                newStatus: 'stage-shipped',
                routeId,
                timestamp: new Date().toISOString()
              });
            } catch (err) {
              console.error(`Failed to update case ${caseId} to shipped:`, err);
            }
          }
        }
      }

      return results;
    } catch (err) {
      console.error("Failed to assign multiple tasks", err);
      throw err;
    }
  }, [routes]);

  // Optimize route stops using nearest-neighbor algorithm
  const optimizeRouteStops = useCallback(async (routeId) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route || route.stops.length <= 1) {
        return null; // Nothing to optimize
      }

      // Import optimization utilities
      const { nearestNeighborOptimization, calculateRouteMetrics } = await import('../utils/logistics/routeOptimizer');

      // Get first stop's coordinates as starting location (or use depot/lab location)
      const startLocation = route.stops[0].coordinates || { lat: 40.7128, lng: -74.0060 };

      // Calculate current metrics
      const currentMetrics = calculateRouteMetrics(route.stops.map((stop, idx) => ({
        ...stop,
        sequence: idx + 1,
        legDistanceKm: 0 // Will be calculated
      })));

      // Optimize stops
      const optimizedStops = nearestNeighborOptimization(route.stops, startLocation);

      // Calculate optimized metrics
      const optimizedMetrics = calculateRouteMetrics(optimizedStops);

      // Map optimized stops back to route stop format
      const reorderedStops = optimizedStops.map(stop => {
        const originalStop = route.stops.find(s => s.id === stop.id);
        return {
          ...originalStop,
          sequence: stop.sequence
        };
      });

      // Update route with optimized stops and new metrics
      const updatedRoute = await MockService.logistics.routes.update(routeId, {
        stops: reorderedStops,
        metrics: {
          ...route.metrics,
          totalDistanceKm: optimizedMetrics.totalDistanceKm,
          estimatedDurationMin: optimizedMetrics.estimatedDurationMin
        }
      });

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));

      // Calculate improvement metrics
      const improvement = {
        distanceSaved: currentMetrics.totalDistanceKm - optimizedMetrics.totalDistanceKm,
        timeSaved: currentMetrics.estimatedDurationMin - optimizedMetrics.estimatedDurationMin
      };

      // Publish event for real-time updates
      LabEventBus.publish(EVENTS.ROUTE_OPTIMIZED, {
        routeId,
        routeName: route.name,
        improvement,
        stopCount: reorderedStops.length,
        timestamp: new Date().toISOString()
      });

      // Return optimization results for UI feedback
      return {
        before: currentMetrics,
        after: optimizedMetrics,
        improvement
      };

    } catch (err) {
      console.error("Failed to optimize route", err);
      throw err;
    }
  }, [routes]);

  // Manually reorder stops in a route
  const reorderStops = useCallback(async (routeId, fromIndex, toIndex) => {
    try {
      const route = routes.find(r => r.id === routeId);
      if (!route) throw new Error('Route not found');

      // Don't allow reordering completed/delivered stops
      const fromStop = route.stops[fromIndex];
      const toStop = route.stops[toIndex];
      
      if (fromStop.status === 'Completed' || fromStop.status === 'Delivered') {
        return; // Don't move completed stops
      }
      
      if (toStop.status === 'Completed' || toStop.status === 'Delivered') {
        return; // Don't allow inserting into completed positions
      }

      const updatedStops = [...route.stops];
      const [movedStop] = updatedStops.splice(fromIndex, 1);
      updatedStops.splice(toIndex, 0, movedStop);

      // Update route with new stop order
      const updatedRoute = await MockService.logistics.routes.update(routeId, {
        stops: updatedStops
      });

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
      
      // Clear cache
      routeCache.delete(routeId);
      
      return updatedRoute;
    } catch (err) {
      console.error('Failed to reorder stops:', err);
      throw err;
    }
  }, [routes]);

  const moveStopBetweenRoutes = useCallback(async (fromRouteId, toRouteId, stopId) => {
    try {
      const fromRoute = routes.find(r => r.id === fromRouteId);
      const toRoute = routes.find(r => r.id === toRouteId);
      
      if (!fromRoute || !toRoute) throw new Error('Route not found');
      
      const stop = fromRoute.stops.find(s => s.id === stopId);
      if (!stop) throw new Error('Stop not found');
      
      // Don't allow moving completed/delivered stops
      if (stop.status === 'Completed' || stop.status === 'Delivered') {
        throw new Error('Cannot move completed or delivered stops');
      }
      
      // Remove from source route
      const updatedFromStops = fromRoute.stops.filter(s => s.id !== stopId);
      const updatedFromRoute = await MockService.logistics.routes.update(fromRouteId, {
        stops: updatedFromStops
      });
      
      // Add to destination route
      const updatedToStops = [...toRoute.stops, stop];
      const updatedToRoute = await MockService.logistics.routes.update(toRouteId, {
        stops: updatedToStops
      });
      
      // Update state
      setRoutes(prev => prev.map(r => {
        if (r.id === fromRouteId) return updatedFromRoute;
        if (r.id === toRouteId) return updatedToRoute;
        return r;
      }));
      
      // Clear cache
      routeCache.delete(fromRouteId);
      routeCache.delete(toRouteId);
      
      return { fromRoute: updatedFromRoute, toRoute: updatedToRoute };
    } catch (err) {
      console.error('Failed to move stop between routes:', err);
      throw err;
    }
  }, [routes]);

  // ============================================================
  // SELECTORS (Section 4.2.2 - Memoized selectors)
  // ============================================================
  
  // Deliveries selector - cases that are ready to ship (completed QC, not yet shipped)
  // In a real app, this would query cases with status between QC and Shipped
  const deliveries = useMemo(() => {
    if (!cases || cases.length === 0) return [];
    
    // Find cases that are ready for delivery:
    // - Status is "stage-shipping" (Ready to Ship - QC completed, bagged and tagged)
    // - Not yet assigned to any route
    const readyToShipCases = cases.filter(c => 
      c.status === 'stage-shipping' && 
      !routes.some(r => r.stops.some(s => 
        s.type === 'Delivery' && 
        s.deliveryManifest?.some(d => d.caseId === c.id)
      ))
    );

    // Transform cases into delivery tasks
    return readyToShipCases.map(c => ({
      id: `delivery-${c.id}`,
      caseId: c.id,
      caseNumber: c.caseNumber,
      type: 'Delivery',
      clinicId: c.clinicId,
      notes: `Ready to Ship (Case #${c.caseNumber})`,
      isRush: c.tags?.includes('Rush') || false,
      requestedTime: c.dates?.due || c.dates?.created,
      units: c.units || [],
      patient: c.patient
    }));
  }, [cases, routes]);

  // Filter routes for the current user (if driver)
  const myRoutes = useMemo(() => {
    if (!user) return [];
    // If user is a driver, only show their routes. Admin sees all.
    const isDriver = user.roleId === 'role-driver'; 
    return isDriver ? routes.filter(r => r.driverId === user.id) : routes;
  }, [routes, user]);

  // Filtered routes based on active filters
  const filteredRoutes = useMemo(() => {
    let filtered = [...routes];

    // Apply date filter
    if (filters.date) {
      filtered = filtered.filter(r => r.date === filters.date);
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(r => filters.status.includes(r.status));
    }

    // Apply driver filter
    if (filters.driverId) {
      filtered = filtered.filter(r => r.driverId === filters.driverId);
    }

    return filtered;
  }, [routes, filters]);

  // Sorted routes
  const sortedRoutes = useMemo(() => {
    const sorted = [...filteredRoutes];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sorting.field) {
        case 'date':
          aVal = a.date || '';
          bVal = b.date || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'driverId':
          aVal = a.driverId || '';
          bVal = b.driverId || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sorting.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sorting.order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredRoutes, sorting]);

  // Paginated routes
  const paginatedRoutes = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return sortedRoutes.slice(startIndex, endIndex);
  }, [sortedRoutes, pagination]);

  // Update total count when filtered routes change
  useEffect(() => {
    setPagination(prev => ({ ...prev, totalCount: filteredRoutes.length }));
  }, [filteredRoutes]);

  // ============================================================
  // FILTER & SORT ACTIONS
  // ============================================================

  const setDateFilter = useCallback((date) => {
    setFilters(prev => ({ ...prev, date }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const setStatusFilter = useCallback((status) => {
    setFilters(prev => ({ ...prev, status }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const setDriverFilter = useCallback((driverId) => {
    setFilters(prev => ({ ...prev, driverId }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ date: null, status: [], driverId: null });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const setSortBy = useCallback((field, order = 'asc') => {
    setSorting({ field, order });
  }, []);

  const setPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // ============================================================
  // DATA REFRESH
  // ============================================================

  const refreshData = useCallback(async () => {
    if (!activeLab?.id) return;

    setLoading(true);
    try {
      const [fetchedRoutes, fetchedPickups, fetchedVehicles, fetchedProviders] = await Promise.all([
        MockService.logistics.routes.getAll({ labId: activeLab.id }),
        MockService.logistics.pickups.getAll({ labId: activeLab.id }),
        MockService.logistics.vehicles.getAll({ labId: activeLab.id }),
        MockService.logistics.providers.getAll({ status: 'Active' })
      ]);
      
      setRoutes(fetchedRoutes);
      setPickups(fetchedPickups);
      setVehicles(fetchedVehicles);
      setProviders(fetchedProviders);
      setLastFetch(Date.now());
      setError(null);
    } catch (err) {
      console.error("Failed to refresh Logistics data", err);
      setError("Failed to refresh Logistics data");
    } finally {
      setLoading(false);
    }
  }, [activeLab]);

  // ============================================================
  // SELECTORS (LEGACY - kept for backwards compatibility)
  // ============================================================

  const value = useMemo(() => ({
    // Data
    routes,
    pickups,
    deliveries,
    vehicles,
    providers,
    
    // UI State
    loading,
    error,
    lastFetch,
    filters,
    sorting,
    pagination,
    
    // Selectors (Section 4.2.2)
    myRoutes,
    filteredRoutes,
    sortedRoutes,
    paginatedRoutes,
    
    // Actions
    createRoute,
    updateRouteStopStatus,
    createPickupRequest,
    assignToRoute,
    assignMultipleTasks,
    optimizeRouteStops,
    reorderStops,
    moveStopBetweenRoutes,
    skipRouteStop,
    
    // Filter & Sort Actions
    setDateFilter,
    setStatusFilter,
    setDriverFilter,
    clearFilters,
    setSortBy,
    setPage,
    setPageSize,
    
    // Utility
    refreshData,
    selectProvider: MockService.logistics.selectProvider
  }), [
    routes, 
    pickups, 
    deliveries,
    vehicles, 
    providers, 
    loading, 
    error, 
    lastFetch,
    filters,
    sorting,
    pagination,
    myRoutes, 
    filteredRoutes,
    sortedRoutes,
    paginatedRoutes,
    createRoute, 
    updateRouteStopStatus, 
    createPickupRequest, 
    assignToRoute,
    assignMultipleTasks,
    optimizeRouteStops,
    reorderStops,
    moveStopBetweenRoutes,
    skipRouteStop,
    setDateFilter,
    setStatusFilter,
    setDriverFilter,
    clearFilters,
    setSortBy,
    setPage,
    setPageSize,
    refreshData
  ]);

  return (
    <LogisticsContext.Provider value={value}>
      {children}
    </LogisticsContext.Provider>
  );
};

export const useLogistics = () => {
  const context = useContext(LogisticsContext);
  if (!context) throw new Error('useLogistics must be used within a LogisticsProvider');
  return context;
};