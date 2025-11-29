/**
 * Real-Time Driver Tracking Utilities
 * Section 6.5: Driver Location Updates and ETA Calculation
 *
 * Enhances WebSocket communication for:
 * - Driver location updates
 * - ETA calculations
 * - Live route progress tracking
 * - Dispatcher notifications
 */

import {
  calculateDistance,
  calculateDistanceMatrix,
} from "../logistics/distanceCalculator.js";

/**
 * Driver Location Update Handler
 * Processes driver location updates from WebSocket messages
 */

/**
 * Processes driver location update
 * @param {Object} locationUpdate - Location update data
 * @param {string} locationUpdate.driverId - Driver identifier
 * @param {string} locationUpdate.routeId - Active route identifier
 * @param {Object} locationUpdate.coordinates - GPS coordinates
 * @param {number} locationUpdate.coordinates.lat - Latitude
 * @param {number} locationUpdate.coordinates.lng - Longitude
 * @param {string} locationUpdate.timestamp - ISO timestamp
 * @param {number} locationUpdate.speed - Speed in km/h (optional)
 * @param {number} locationUpdate.heading - Direction in degrees (optional)
 * @returns {Promise<Object>} Updated route with ETAs
 */
export const handleDriverLocationUpdate = async (locationUpdate) => {
  const { driverId, routeId, coordinates, timestamp, speed, heading } =
    locationUpdate;

  try {
    // Store location update
    await storeDriverLocation({
      driverId: driverId,
      routeId: routeId,
      coordinates: coordinates,
      timestamp: timestamp,
      speed: speed,
      heading: heading,
    });

    // Get route with pending stops
    const route = await getActiveRoute(routeId);

    if (!route) {
      console.warn(`No active route found for ${routeId}`);
      return null;
    }

    // Find next pending stop
    const nextStop = route.stops?.find(
      (stop) => stop.status === "Pending" || stop.status === "EnRoute"
    );

    if (!nextStop) {
      console.log(`No pending stops in route ${routeId}`);
      return route;
    }

    // Calculate ETA for next stop
    const eta = await calculateETAToStop(
      coordinates,
      nextStop.coordinates,
      speed
    );

    // Update stop with ETA
    await updateStopETA(routeId, nextStop.id, eta);

    // Calculate ETAs for all remaining stops
    const updatedStops = await calculateAllStopETAs(
      routeId,
      coordinates,
      route.stops,
      speed
    );

    // Prepare update for WebSocket broadcast
    const update = {
      type: "DRIVER_LOCATION_UPDATE",
      routeId: routeId,
      driverId: driverId,
      coordinates: coordinates,
      timestamp: timestamp,
      speed: speed,
      heading: heading,
      nextStop: nextStop
        ? {
            id: nextStop.id,
            clinicName: nextStop.clinicName,
            eta: eta.estimatedArrival,
            distance: eta.distance,
          }
        : null,
      updatedStops: updatedStops,
    };

    return update;
  } catch (error) {
    console.error("Error handling driver location update:", error);
    throw error;
  }
};

/**
 * Calculates ETA to a specific stop
 * @param {Object} currentLocation - Current driver coordinates
 * @param {Object} stopLocation - Stop coordinates
 * @param {number} currentSpeed - Current speed in km/h
 * @returns {Promise<Object>} ETA information
 */
const calculateETAToStop = async (
  currentLocation,
  stopLocation,
  currentSpeed = 40
) => {
  try {
    // Calculate straight-line distance
    const straightLineDistance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      stopLocation.lat,
      stopLocation.lng
    );

    // Use distance matrix for accurate routing
    const routeData = await calculateDistanceMatrix(
      [currentLocation],
      [stopLocation]
    );

    if (routeData && routeData.rows && routeData.rows[0]?.elements[0]) {
      const element = routeData.rows[0].elements[0];

      if (element.status === "OK") {
        const durationInMinutes = element.duration.value / 60;
        const distanceInKm = element.distance.value / 1000;

        return {
          distance: distanceInKm,
          durationMinutes: durationInMinutes,
          estimatedArrival: new Date(
            Date.now() + durationInMinutes * 60 * 1000
          ).toISOString(),
          method: "DISTANCE_MATRIX",
        };
      }
    }

    // Fallback to straight-line calculation
    const avgSpeedKmh = currentSpeed || 40;
    const estimatedMinutes = (straightLineDistance / avgSpeedKmh) * 60;

    return {
      distance: straightLineDistance,
      durationMinutes: estimatedMinutes,
      estimatedArrival: new Date(
        Date.now() + estimatedMinutes * 60 * 1000
      ).toISOString(),
      method: "STRAIGHT_LINE",
    };
  } catch (error) {
    console.error("Error calculating ETA:", error);

    // Fallback calculation
    const fallbackDistance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      stopLocation.lat,
      stopLocation.lng
    );

    const estimatedMinutes = (fallbackDistance / 40) * 60;

    return {
      distance: fallbackDistance,
      durationMinutes: estimatedMinutes,
      estimatedArrival: new Date(
        Date.now() + estimatedMinutes * 60 * 1000
      ).toISOString(),
      method: "FALLBACK",
    };
  }
};

/**
 * Calculates ETAs for all pending stops in a route
 * @param {string} routeId - Route identifier
 * @param {Object} currentLocation - Current driver coordinates
 * @param {Array} stops - Array of stop objects
 * @param {number} currentSpeed - Current speed in km/h
 * @returns {Promise<Array>} Updated stops with ETAs
 */
const calculateAllStopETAs = async (
  routeId,
  currentLocation,
  stops,
  currentSpeed
) => {
  const updatedStops = [];
  let cumulativeTime = 0;
  let previousLocation = currentLocation;

  for (const stop of stops) {
    if (stop.status === "Completed") {
      updatedStops.push(stop);
      continue;
    }

    try {
      const eta = await calculateETAToStop(
        previousLocation,
        stop.coordinates,
        currentSpeed
      );

      // Add service time (default 10 minutes per stop)
      const serviceTimeMinutes = stop.serviceTime || 10;
      cumulativeTime += eta.durationMinutes + serviceTimeMinutes;

      const updatedStop = {
        ...stop,
        eta: new Date(Date.now() + cumulativeTime * 60 * 1000).toISOString(),
        distance: eta.distance,
        durationMinutes: eta.durationMinutes,
      };

      updatedStops.push(updatedStop);
      previousLocation = stop.coordinates;
    } catch (error) {
      console.error(`Error calculating ETA for stop ${stop.id}:`, error);
      updatedStops.push(stop);
    }
  }

  return updatedStops;
};

/**
 * Driver Location Tracking
 * Mock implementations - replace with actual API/database calls
 */

/**
 * Stores driver location update
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} Stored location record
 */
const storeDriverLocation = async (locationData) => {
  // TODO: Replace with actual database call
  console.log("[MOCK] Storing driver location:", locationData);

  return {
    id: `loc-${Date.now()}`,
    ...locationData,
    storedAt: new Date().toISOString(),
  };
};

/**
 * Gets active route by ID
 * @param {string} routeId - Route identifier
 * @returns {Promise<Object|null>} Route object
 */
const getActiveRoute = async (routeId) => {
  // TODO: Replace with actual API call
  console.log("[MOCK] Fetching active route:", routeId);

  // Mock route data
  return {
    id: routeId,
    driverId: "DRV001",
    status: "In Progress",
    stops: [
      {
        id: "STOP001",
        clinicName: "Downtown Dental",
        coordinates: { lat: 42.3601, lng: -71.0589 },
        status: "Pending",
        type: "Delivery",
        serviceTime: 10,
      },
      {
        id: "STOP002",
        clinicName: "Cambridge Orthodontics",
        coordinates: { lat: 42.3736, lng: -71.1097 },
        status: "Pending",
        type: "Pickup",
        serviceTime: 15,
      },
    ],
  };
};

/**
 * Updates stop with ETA
 * @param {string} routeId - Route identifier
 * @param {string} stopId - Stop identifier
 * @param {Object} eta - ETA information
 * @returns {Promise<Object>} Updated stop
 */
const updateStopETA = async (routeId, stopId, eta) => {
  // TODO: Replace with actual API call
  console.log("[MOCK] Updating stop ETA:", { routeId, stopId, eta });

  return {
    id: stopId,
    routeId: routeId,
    eta: eta.estimatedArrival,
    distance: eta.distance,
    durationMinutes: eta.durationMinutes,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * WebSocket Message Builders
 */

/**
 * Builds location update message for WebSocket broadcast
 * @param {Object} update - Location update data
 * @returns {Object} WebSocket message
 */
export const buildLocationUpdateMessage = (update) => {
  return {
    action: "LOCATION_UPDATE",
    data: {
      type: "DRIVER_LOCATION",
      driverId: update.driverId,
      routeId: update.routeId,
      coordinates: update.coordinates,
      timestamp: update.timestamp,
      speed: update.speed,
      heading: update.heading,
      nextStop: update.nextStop,
      updatedAt: new Date().toISOString(),
    },
  };
};

/**
 * Builds ETA update message for dispatcher
 * @param {string} routeId - Route identifier
 * @param {Array} updatedStops - Updated stops with ETAs
 * @returns {Object} WebSocket message
 */
export const buildETAUpdateMessage = (routeId, updatedStops) => {
  return {
    action: "ETA_UPDATE",
    data: {
      type: "ROUTE_ETA_UPDATE",
      routeId: routeId,
      stops: updatedStops.map((stop) => ({
        id: stop.id,
        clinicName: stop.clinicName,
        eta: stop.eta,
        distance: stop.distance,
        status: stop.status,
      })),
      updatedAt: new Date().toISOString(),
    },
  };
};

/**
 * Builds arrival notification for clinic
 * @param {Object} stop - Stop information
 * @param {number} minutesAway - Minutes until arrival
 * @returns {Object} Notification message
 */
export const buildArrivalNotification = (stop, minutesAway) => {
  return {
    action: "ARRIVAL_NOTIFICATION",
    data: {
      type: "DRIVER_ARRIVING",
      stopId: stop.id,
      clinicId: stop.clinicId,
      clinicName: stop.clinicName,
      driverId: stop.driverId,
      driverName: stop.driverName,
      minutesAway: minutesAway,
      estimatedArrival: stop.eta,
      message: `Driver ${stop.driverName} is ${minutesAway} minutes away`,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Location History and Analytics
 */

/**
 * Gets driver location history
 * @param {string} driverId - Driver identifier
 * @param {string} startTime - Start time ISO string
 * @param {string} endTime - End time ISO string
 * @returns {Promise<Array>} Array of location points
 */
export const getDriverLocationHistory = async (
  driverId,
  startTime,
  endTime
) => {
  // TODO: Replace with actual database query
  console.log("[MOCK] Fetching location history:", {
    driverId,
    startTime,
    endTime,
  });

  return [];
};

/**
 * Calculates driver statistics
 * @param {string} driverId - Driver identifier
 * @param {string} date - Date ISO string
 * @returns {Promise<Object>} Driver statistics
 */
export const calculateDriverStatistics = async (driverId, date) => {
  // TODO: Replace with actual analytics query
  console.log("[MOCK] Calculating driver statistics:", { driverId, date });

  return {
    driverId: driverId,
    date: date,
    totalDistance: 0,
    totalStops: 0,
    completedStops: 0,
    averageStopTime: 0,
    totalDrivingTime: 0,
    averageSpeed: 0,
  };
};

/**
 * Geofence Detection
 */

/**
 * Checks if driver is within geofence of stop
 * @param {Object} driverLocation - Driver coordinates
 * @param {Object} stopLocation - Stop coordinates
 * @param {number} radiusMeters - Geofence radius in meters (default 100m)
 * @returns {boolean} True if within geofence
 */
export const isWithinGeofence = (
  driverLocation,
  stopLocation,
  radiusMeters = 100
) => {
  const distance = calculateDistance(
    driverLocation.lat,
    driverLocation.lng,
    stopLocation.lat,
    stopLocation.lng
  );

  const distanceMeters = distance * 1000; // Convert km to meters

  return distanceMeters <= radiusMeters;
};

/**
 * Detects when driver enters geofence
 * @param {Object} previousLocation - Previous driver coordinates
 * @param {Object} currentLocation - Current driver coordinates
 * @param {Object} stopLocation - Stop coordinates
 * @param {number} radiusMeters - Geofence radius
 * @returns {boolean} True if just entered geofence
 */
export const didEnterGeofence = (
  previousLocation,
  currentLocation,
  stopLocation,
  radiusMeters = 100
) => {
  const wasInside = isWithinGeofence(
    previousLocation,
    stopLocation,
    radiusMeters
  );
  const isInside = isWithinGeofence(
    currentLocation,
    stopLocation,
    radiusMeters
  );

  return !wasInside && isInside;
};

export default {
  handleDriverLocationUpdate,
  buildLocationUpdateMessage,
  buildETAUpdateMessage,
  buildArrivalNotification,
  getDriverLocationHistory,
  calculateDriverStatistics,
  isWithinGeofence,
  didEnterGeofence,
};
