/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
// import { useAuth } from './AuthContext'; // Needed for Audit logging (future)

// --- Mock Data Imports (Updated Structure) ---
import routesData from '../_mock/data/logistics/routes.json'; 
import pickupsData from '../_mock/data/logistics/pickups.json'; 

const LogisticsContext = createContext(null);

export const LogisticsProvider = ({ children }) => {
  // const { user } = useAuth(); 

  // --- State ---
  const [routes, setRoutes] = useState([]);
  const [pickups, setPickups] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Initialize Data ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulate latency
        setRoutes(routesData);
        setPickups(pickupsData);
      } catch (err) {
        console.error("Failed to load Logistics data", err);
        setError("Failed to load Logistics data");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // --- Helper for simulated API calls ---
  const simulateApi = (callback, delay = 500) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        try {
          const result = callback();
          resolve(result);
        } catch (err) {
          console.error("Mock API Error:", err.message);
          setError(err.message);
          reject(err);
        } finally {
          setLoading(false);
        }
      }, delay);
    });
  };

  // ============================================================
  // 1. ROUTE HANDLERS (Driver / Manager)
  // ============================================================

  /**
   * (UPDATE) Updates the status of a specific stop on a route (e.g., Delivery completed)
   * This logic is critical for triggering final case status updates (Delivered)
   */
  const updateRouteStopStatus = useCallback(async (routeId, stopId, updates) => {
    return await simulateApi(() => {
        setRoutes(prevRoutes => prevRoutes.map(route => {
            if (route.id === routeId) {
                const updatedStops = route.stops.map(stop => {
                    if (stop.id === stopId) {
                        return { 
                            ...stop, 
                            ...updates,
                            completedAt: updates.status === 'Completed' ? new Date().toISOString() : updates.completedAt || null
                        };
                    }
                    return stop;
                });
                return { ...route, stops: updatedStops };
            }
            return route;
        }));
        // NOTE: In a real system, completing a Delivery Stop here would trigger a 
        // `LabContext.updateCaseStatus` call to move associated units to 'stage-delivered'.
    });
  }, []);

  /**
   * (CREATE) Creates a new pickup request (usually from Client Portal)
   */
  const createPickupRequest = useCallback(async (requestData) => {
    return await simulateApi(() => {
      const newPickup = {
        ...requestData,
        id: `pickup-${Date.now()}`,
        status: 'Pending',
        requestTime: new Date().toISOString()
      };
      setPickups(prev => [...prev, newPickup]);
      return newPickup;
    });
  }, []);


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
    // Future actions: assignDriverToRoute, optimizeRoutes
  }), [routes, pickups, loading, error, updateRouteStopStatus, createPickupRequest]);

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