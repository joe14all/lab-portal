/**
 * Route Optimization Utilities
 * 
 * Implements route optimization algorithms including Nearest Neighbor
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 3.4.2
 */

import type { RouteStop, Coordinates } from '../../types/logistics';
import { calculateDistance } from './distanceCalculator';

export interface OptimizationInput {
  stops: RouteStop[];
  startLocation: Coordinates;
  endLocation?: Coordinates;
  algorithm: 'NEAREST_NEIGHBOR' | 'TIME_WINDOWS';
}

export interface OptimizedStop extends Omit<RouteStop, 'estimatedArrival'> {
  sequence: number;
  legDistanceKm?: number;
  estimatedArrival?: string;
}

/**
 * Optimize route using Nearest Neighbor algorithm (greedy approach)
 * Time complexity: O(n²) where n is number of stops
 * 
 * This is a simple but effective heuristic that:
 * 1. Starts at the given location
 * 2. Repeatedly visits the nearest unvisited stop
 * 3. Continues until all stops are visited
 */
export function nearestNeighborOptimization(
  stops: RouteStop[],
  startLocation: Coordinates
): OptimizedStop[] {
  if (stops.length === 0) return [];
  if (stops.length === 1) {
    return [
      {
        ...stops[0],
        sequence: 1,
        legDistanceKm: calculateDistance(startLocation, stops[0].coordinates),
        estimatedArrival: stops[0].estimatedArrival || undefined,
      },
    ];
  }

  const unvisited = new Set(stops.map((_, index) => index));
  const optimized: OptimizedStop[] = [];
  let currentLocation = startLocation;
  let sequence = 1;

  while (unvisited.size > 0) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    // Find nearest unvisited stop
    for (const index of unvisited) {
      const distance = calculateDistance(currentLocation, stops[index].coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    }

    if (nearestIndex === -1) break;

    const stop = stops[nearestIndex];
    optimized.push({
      ...stop,
      sequence: sequence++,
      legDistanceKm: minDistance,
      estimatedArrival: stop.estimatedArrival || undefined,
    });

    currentLocation = stop.coordinates;
    unvisited.delete(nearestIndex);
  }

  return optimized;
}

/**
 * Optimize route considering time windows
 * Prioritizes stops with earlier deadlines while minimizing distance
 */
export function timeWindowOptimization(
  stops: RouteStop[],
  startLocation: Coordinates,
  currentTime: Date = new Date()
): OptimizedStop[] {
  if (stops.length === 0) return [];

  // Sort stops by urgency (earliest estimated arrival first)
  const sortedStops = [...stops].sort((a, b) => {
    const aTime = a.estimatedArrival ? new Date(a.estimatedArrival).getTime() : Infinity;
    const bTime = b.estimatedArrival ? new Date(b.estimatedArrival).getTime() : Infinity;
    return aTime - bTime;
  });

  // Group stops into time buckets (e.g., morning, afternoon)
  const timeBuckets = groupStopsByTimeBucket(sortedStops);

  const optimized: OptimizedStop[] = [];
  let currentLocation = startLocation;
  let sequence = 1;
  let currentTimeEstimate = currentTime;

  // Process each time bucket
  for (const bucket of timeBuckets) {
    // Within each bucket, use nearest neighbor
    const bucketOptimized = nearestNeighborOptimization(bucket, currentLocation);

    for (const stop of bucketOptimized) {
      // Calculate leg distance from current location
      const legDistance = calculateDistance(currentLocation, stop.coordinates);
      
      // Estimate arrival time (assuming 40 km/h average speed + 10 min per stop)
      const travelTimeMin = (legDistance / 40) * 60;
      const arrivalTime = new Date(currentTimeEstimate.getTime() + travelTimeMin * 60 * 1000);

      optimized.push({
        ...stop,
        sequence: sequence++,
        legDistanceKm: legDistance,
        estimatedArrival: arrivalTime.toISOString(),
      });

      currentLocation = stop.coordinates;
      // Add stop duration (average 10 minutes)
      currentTimeEstimate = new Date(arrivalTime.getTime() + 10 * 60 * 1000);
    }
  }

  return optimized;
}

/**
 * Group stops by time bucket (morning, afternoon, evening)
 */
function groupStopsByTimeBucket(stops: RouteStop[]): RouteStop[][] {
  const morning: RouteStop[] = [];
  const afternoon: RouteStop[] = [];
  const evening: RouteStop[] = [];

  for (const stop of stops) {
    if (!stop.estimatedArrival) {
      afternoon.push(stop); // Default to afternoon if no time specified
      continue;
    }

    const hour = new Date(stop.estimatedArrival).getHours();
    
    if (hour < 12) {
      morning.push(stop);
    } else if (hour < 17) {
      afternoon.push(stop);
    } else {
      evening.push(stop);
    }
  }

  return [morning, afternoon, evening].filter((bucket) => bucket.length > 0);
}

/**
 * Calculate total route metrics after optimization
 */
export function calculateRouteMetrics(optimizedStops: OptimizedStop[]): {
  totalDistanceKm: number;
  estimatedDurationMin: number;
  stopsTotal: number;
} {
  const totalDistanceKm = optimizedStops.reduce(
    (sum, stop) => sum + (stop.legDistanceKm || 0),
    0
  );

  // Estimate duration: driving time + stop time
  const drivingTimeMin = (totalDistanceKm / 40) * 60; // 40 km/h average
  const stopTimeMin = optimizedStops.length * 10; // 10 min per stop
  const estimatedDurationMin = Math.ceil(drivingTimeMin + stopTimeMin);

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, // Round to 1 decimal
    estimatedDurationMin,
    stopsTotal: optimizedStops.length,
  };
}

/**
 * Re-sequence stops to enforce a specific order
 * Useful when manual adjustments are made
 */
export function resequenceStops<T extends RouteStop>(stops: T[]): T[] {
  return stops.map((stop, index) => ({
    ...stop,
    sequence: index + 1,
  })) as T[];
}

/**
 * Validate stop sequence has no gaps or duplicates
 */
export function validateStopSequence(stops: RouteStop[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sequences = stops.map((s) => s.sequence);
  const uniqueSequences = new Set(sequences);

  if (sequences.length !== uniqueSequences.size) {
    errors.push('Duplicate sequence numbers found');
  }

  for (let i = 1; i <= stops.length; i++) {
    if (!sequences.includes(i)) {
      errors.push(`Missing sequence number: ${i}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Optimize route and return full route details
 */
export async function optimizeRoute(input: OptimizationInput): Promise<{
  stops: OptimizedStop[];
  metrics: ReturnType<typeof calculateRouteMetrics>;
}> {
  let optimizedStops: OptimizedStop[];

  if (input.algorithm === 'NEAREST_NEIGHBOR') {
    optimizedStops = nearestNeighborOptimization(input.stops, input.startLocation);
  } else {
    optimizedStops = timeWindowOptimization(input.stops, input.startLocation);
  }

  const metrics = calculateRouteMetrics(optimizedStops);

  return {
    stops: optimizedStops,
    metrics,
  };
}

/**
 * Insert a new stop into an existing optimized route
 * Finds the best position to minimize additional distance
 */
export function insertStop(
  existingStops: OptimizedStop[],
  newStop: RouteStop,
  startLocation: Coordinates
): OptimizedStop[] {
  if (existingStops.length === 0) {
    return [
      {
        ...newStop,
        sequence: 1,
        legDistanceKm: calculateDistance(startLocation, newStop.coordinates),
        estimatedArrival: newStop.estimatedArrival || undefined,
      },
    ];
  }

  let minAdditionalDistance = Infinity;
  let bestPosition = 0;

  // Try inserting at each position
  for (let i = 0; i <= existingStops.length; i++) {
    const prevLocation = i === 0 ? startLocation : existingStops[i - 1].coordinates;
    const nextLocation =
      i === existingStops.length ? null : existingStops[i].coordinates;

    const distanceToPrev = calculateDistance(prevLocation, newStop.coordinates);
    const distanceFromNew = nextLocation
      ? calculateDistance(newStop.coordinates, nextLocation)
      : 0;

    // Calculate original distance if there was a direct connection
    const originalDistance =
      nextLocation ? calculateDistance(prevLocation, nextLocation) : 0;

    const additionalDistance = distanceToPrev + distanceFromNew - originalDistance;

    if (additionalDistance < minAdditionalDistance) {
      minAdditionalDistance = additionalDistance;
      bestPosition = i;
    }
  }

  // Insert at best position
  const result = [...existingStops];
  result.splice(bestPosition, 0, {
    ...newStop,
    sequence: bestPosition + 1,
    legDistanceKm: minAdditionalDistance,
    estimatedArrival: newStop.estimatedArrival || undefined,
  });

  // Re-sequence all stops
  return resequenceStops(result);
}

/**
 * Remove a stop from an optimized route
 */
export function removeStop(
  stops: OptimizedStop[],
  stopId: string
): OptimizedStop[] {
  const filtered = stops.filter((s) => s.id !== stopId);
  return resequenceStops(filtered);
}
