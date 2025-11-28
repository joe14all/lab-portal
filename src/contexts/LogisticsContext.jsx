/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

const LogisticsContext = createContext(null);

export const LogisticsProvider = ({ children }) => {
  const { activeLab, user } = useAuth();

  // --- State ---
  const [routes, setRoutes] = useState([]);
  const [pickups, setPickups] = useState([]);
  // In a real app, "Deliveries" would be queried from Cases where status="Ready to Ship"
  // We will mock this aggregation in the "Unassigned" pool logic below
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      if (!activeLab?.id) return;

      setLoading(true);
      try {
        const [fetchedRoutes, fetchedPickups] = await Promise.all([
          MockService.logistics.routes.getAll({ labId: activeLab.id }),
          MockService.logistics.pickups.getAll({ labId: activeLab.id })
        ]);
        
        setRoutes(fetchedRoutes);
        setPickups(fetchedPickups);
        setError(null);
      } catch (err) {
        console.error("Failed to load Logistics data", err);
        setError("Failed to load Logistics data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [activeLab]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const createRoute = useCallback(async (routeData) => {
    try {
      const newRoute = await MockService.logistics.routes.create({
        ...routeData,
        labId: activeLab.id,
        status: 'Scheduled',
        stops: []
      });
      setRoutes(prev => [...prev, newRoute]);
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

      const updatedRoute = await MockService.logistics.routes.update(routeId, {
        stops: updatedStops,
        status: routeStatus
      });

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
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

      const updatedRoute = await MockService.logistics.routes.update(routeId, {
        stops: [...route.stops, newStop]
      });

      setRoutes(prev => prev.map(r => r.id === routeId ? updatedRoute : r));
      
      // If it was a pickup, update its status to 'Assigned'
      if (task.type === 'Pickup') {
        const updatedPickup = await MockService.logistics.pickups.update(task.id, { status: 'Assigned' });
        setPickups(prev => prev.map(p => p.id === task.id ? updatedPickup : p));
      }

    } catch (err) {
      console.error("Failed to assign task", err);
      throw err;
    }
  }, [routes]);

  // ============================================================
  // SELECTORS
  // ============================================================
  
  // Filter routes for the current user (if driver)
  const myRoutes = useMemo(() => {
    if (!user) return [];
    // If user is a driver, only show their routes. Admin sees all.
    const isDriver = user.roleId === 'role-driver'; 
    return isDriver ? routes.filter(r => r.driverId === user.id) : routes;
  }, [routes, user]);

  const value = useMemo(() => ({
    routes,
    pickups,
    loading,
    error,
    myRoutes,
    createRoute,
    updateRouteStopStatus,
    createPickupRequest,
    assignToRoute
  }), [routes, pickups, loading, error, myRoutes, createRoute, updateRouteStopStatus, createPickupRequest, assignToRoute]);

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