/**
 * Distance and ETA Calculation Utilities
 * 
 * Haversine distance calculation and ETA estimation
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 3.4.3
 */

import type { Coordinates, GeoLocation } from '../../types/logistics';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimate arrival time based on distance and average speed
 * 
 * @param currentLocation - Current position
 * @param destination - Destination coordinates
 * @param avgSpeedKph - Average speed in km/h (default: 40 for urban areas)
 * @param trafficFactor - Traffic multiplier (default: 1.2 for 20% buffer)
 * @returns ISO8601 timestamp of estimated arrival
 */
export function estimateETA(
  currentLocation: Coordinates,
  destination: Coordinates,
  avgSpeedKph: number = 40,
  trafficFactor: number = 1.2
): string {
  const distanceKm = calculateDistance(currentLocation, destination);
  const durationHours = (distanceKm / avgSpeedKph) * trafficFactor;
  const durationMs = durationHours * 60 * 60 * 1000;

  const eta = new Date(Date.now() + durationMs);
  return eta.toISOString();
}

/**
 * Calculate total route distance
 * 
 * @param stops - Array of coordinates representing stops in order
 * @param includeReturnToStart - Whether to include distance back to first stop
 * @returns Total distance in kilometers
 */
export function calculateRouteDistance(
  stops: Coordinates[],
  includeReturnToStart: boolean = false
): number {
  if (stops.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    totalDistance += calculateDistance(stops[i], stops[i + 1]);
  }

  if (includeReturnToStart && stops.length > 0) {
    totalDistance += calculateDistance(stops[stops.length - 1], stops[0]);
  }

  return totalDistance;
}

/**
 * Calculate estimated duration for entire route
 * 
 * @param stops - Array of coordinates
 * @param avgSpeedKph - Average driving speed
 * @param stopDurationMin - Average time spent at each stop (minutes)
 * @param trafficFactor - Traffic multiplier
 * @returns Total duration in minutes
 */
export function estimateRouteDuration(
  stops: Coordinates[],
  avgSpeedKph: number = 40,
  stopDurationMin: number = 10,
  trafficFactor: number = 1.2
): number {
  const distanceKm = calculateRouteDistance(stops);
  const drivingTimeHours = (distanceKm / avgSpeedKph) * trafficFactor;
  const drivingTimeMin = drivingTimeHours * 60;
  const stopTimeMin = (stops.length - 1) * stopDurationMin; // Don't count first stop

  return Math.ceil(drivingTimeMin + stopTimeMin);
}

/**
 * Check if a location is within a radius of another location
 * 
 * @param location - Location to check
 * @param center - Center point
 * @param radiusKm - Radius in kilometers
 * @returns True if location is within radius
 */
export function isWithinRadius(
  location: Coordinates,
  center: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(location, center);
  return distance <= radiusKm;
}

/**
 * Find the nearest location from a list of candidates
 * 
 * @param from - Starting location
 * @param candidates - Array of candidate locations with IDs
 * @returns Object with nearest location and distance, or null if no candidates
 */
export function findNearest<T extends { coordinates: Coordinates }>(
  from: Coordinates,
  candidates: T[]
): { item: T; distance: number } | null {
  if (candidates.length === 0) return null;

  let nearest = candidates[0];
  let minDistance = calculateDistance(from, nearest.coordinates);

  for (let i = 1; i < candidates.length; i++) {
    const distance = calculateDistance(from, candidates[i].coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = candidates[i];
    }
  }

  return { item: nearest, distance: minDistance };
}

/**
 * Sort locations by distance from a starting point
 * 
 * @param from - Starting location
 * @param locations - Array of locations to sort
 * @returns Sorted array with distances
 */
export function sortByDistance<T extends { coordinates: Coordinates }>(
  from: Coordinates,
  locations: T[]
): Array<T & { distance: number }> {
  return locations
    .map((location) => ({
      ...location,
      distance: calculateDistance(from, location.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Calculate the center point (centroid) of multiple locations
 * 
 * @param locations - Array of coordinates
 * @returns Center point coordinates
 */
export function calculateCentroid(locations: Coordinates[]): Coordinates {
  if (locations.length === 0) {
    throw new Error('Cannot calculate centroid of empty array');
  }

  let sumLat = 0;
  let sumLng = 0;

  for (const loc of locations) {
    sumLat += loc.lat;
    sumLng += loc.lng;
  }

  return {
    lat: sumLat / locations.length,
    lng: sumLng / locations.length,
  };
}

/**
 * Validate that coordinates are within valid ranges
 * 
 * @param coords - Coordinates to validate
 * @returns True if valid, false otherwise
 */
export function areCoordinatesValid(coords: Coordinates): boolean {
  return (
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

/**
 * Format distance for display
 * 
 * @param distanceKm - Distance in kilometers
 * @param precision - Number of decimal places
 * @returns Formatted string with units
 */
export function formatDistance(distanceKm: number, precision: number = 1): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(precision)} km`;
}

/**
 * Format duration for display
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h 30m" or "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
