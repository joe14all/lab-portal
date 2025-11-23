/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { MockService } from '../_mock/service';
import { useAuth } from './AuthContext';

const LogisticsContext = createContext(null);

export const LogisticsProvider = ({ children }) => {
  const { activeLab } = useAuth();

  // --- State ---
  const [routes, setRoutes] = useState([]);
  const [pickups, setPickups] = useState([]);
  
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
  // 1. ROUTE HANDLERS
  // ============================================================

  /**
   * (UPDATE) Updates the status of a specific stop on a route.
   * Logic: We must find the route, map over its stops to update the specific one,
   * and then send the entire updated 'stops' array to the backend service.
   */
  const updateRouteStopStatus = useCallback(async (routeId, stopId, updates) => {
    try {
      // 1. Find current route state to get existing stops
      const currentRoute = routes.find(r => r.id === routeId);
      if (!currentRoute) throw new Error("Route not found locally");

      // 2. Calculate new stops array
      const updatedStops = currentRoute.stops.map(stop => {
        if (stop.id === stopId) {
          return { 
            ...stop, 
            ...updates,
            completedAt: updates.status === 'Completed' ? new Date().toISOString() : (updates.completedAt || null)
          };
        }
        return stop;
      });

      // 3. Persist to Service
      const updatedRoute = await MockService.logistics.routes.update(routeId, { 
        stops: updatedStops 
      });

      // 4. Update State
      setRoutes(prevRoutes => prevRoutes.map(r => r.id === routeId ? updatedRoute : r));
      
      return updatedRoute;
    } catch (err) {
      console.error("Failed to update route stop", err);
      throw err;
    }
  }, [routes]);

  /**
   * (CREATE) Creates a new pickup request
   */
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
      console.error("Failed to create pickup request", err);
      throw err;
    }
  }, [activeLab]);


  // ============================================================
  // EXPORT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // State
    routes,
    pickups,
    loading,
    error,

    // Actions
    updateRouteStopStatus,
    createPickupRequest,
  }), [
    routes, pickups, loading, error, 
    updateRouteStopStatus, createPickupRequest
  ]);

  return (
    <LogisticsContext.Provider value={value}>
      {children}
    </LogisticsContext.Provider>
  );
};

// Hook
export const useLogistics = () => {
  const context = useContext(LogisticsContext);
  if (!context) {
    throw new Error('useLogistics must be used within a LogisticsProvider');
  }
  return context;
};