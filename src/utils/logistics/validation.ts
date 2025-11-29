/**
 * Logistics Validation Utilities
 * 
 * Business rule validators for logistics domain entities
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 2
 */

import type { TimeWindow, PickupRequest, RouteStop, Route, Coordinates } from '../../types/logistics';
import { isValidPickupTransition, isValidStopTransition } from '../../constants/logistics';

// ============================================================
// TIME WINDOW VALIDATION
// ============================================================

/**
 * Calculate if two time windows overlap
 */
export function doTimeWindowsOverlap(window1: TimeWindow, window2: TimeWindow): boolean {
  const start1 = new Date(window1.start);
  const end1 = new Date(window1.end);
  const start2 = new Date(window2.start);
  const end2 = new Date(window2.end);

  return start1 < end2 && start2 < end1;
}

/**
 * Check if a time window is valid (start < end, future dates)
 */
export function isValidTimeWindow(window: TimeWindow): {
  valid: boolean;
  error?: string;
} {
  const start = new Date(window.start);
  const end = new Date(window.end);
  const now = new Date();

  if (start >= end) {
    return { valid: false, error: 'Window start must be before window end' };
  }

  if (end < now) {
    return { valid: false, error: 'Window end must be in the future' };
  }

  return { valid: true };
}

/**
 * Check if a timestamp falls within a time window
 */
export function isWithinTimeWindow(timestamp: string, window: TimeWindow): boolean {
  const time = new Date(timestamp);
  const start = new Date(window.start);
  const end = new Date(window.end);

  return time >= start && time <= end;
}

/**
 * Calculate time window duration in minutes
 */
export function getTimeWindowDuration(window: TimeWindow): number {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Check if a driver can complete a pickup within the time window
 * considering travel time and service time
 */
export function canCompletePickupInWindow(
  currentTime: string,
  pickupWindow: TimeWindow,
  travelTimeMin: number,
  serviceTimeMin: number = 10 // Default 10 minutes for pickup service
): {
  canComplete: boolean;
  arrivalTime?: string;
  reason?: string;
} {
  const now = new Date(currentTime);
  const windowEnd = new Date(pickupWindow.end);
  
  const estimatedArrival = new Date(now.getTime() + travelTimeMin * 60 * 1000);
  const estimatedCompletion = new Date(estimatedArrival.getTime() + serviceTimeMin * 60 * 1000);

  if (estimatedCompletion > windowEnd) {
    return {
      canComplete: false,
      reason: `Cannot complete before window closes at ${windowEnd.toISOString()}. Estimated completion: ${estimatedCompletion.toISOString()}`,
    };
  }

  return {
    canComplete: true,
    arrivalTime: estimatedArrival.toISOString(),
  };
}

// ============================================================
// GEOLOCATION VALIDATION
// ============================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Verify that a geolocation is within acceptable radius of expected location
 * Default radius: 100 meters
 */
export function isLocationValid(
  actualLocation: Coordinates,
  expectedLocation: Coordinates,
  radiusMeters: number = 100
): {
  valid: boolean;
  distance: number;
  error?: string;
} {
  const distance = calculateDistance(actualLocation, expectedLocation);

  if (distance > radiusMeters) {
    return {
      valid: false,
      distance,
      error: `Location is ${Math.round(distance)}m away from expected location (max: ${radiusMeters}m)`,
    };
  }

  return {
    valid: true,
    distance,
  };
}

// ============================================================
// PICKUP REQUEST VALIDATION
// ============================================================

/**
 * Validate a pickup request before creation
 */
export function validatePickupRequest(pickup: Partial<PickupRequest>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!pickup.clinicId) errors.push('clinicId is required');
  if (!pickup.labId) errors.push('labId is required');
  if (!pickup.windowStart) errors.push('windowStart is required');
  if (!pickup.windowEnd) errors.push('windowEnd is required');
  if (!pickup.packageCount || pickup.packageCount <= 0) {
    errors.push('packageCount must be greater than 0');
  }

  // Time window validation
  if (pickup.windowStart && pickup.windowEnd) {
    const windowValidation = isValidTimeWindow({
      start: pickup.windowStart,
      end: pickup.windowEnd,
    });
    if (!windowValidation.valid) {
      errors.push(windowValidation.error!);
    }
  }

  // Package specs validation
  if (pickup.packageSpecs) {
    if (pickup.packageSpecs.weight <= 0) {
      errors.push('Package weight must be greater than 0');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a pickup status transition
 */
export function validatePickupTransition(
  pickup: PickupRequest,
  newStatus: PickupRequest['status'],
  additionalData?: Record<string, unknown>
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check state machine rules
  if (!isValidPickupTransition(pickup.status, newStatus)) {
    errors.push(`Invalid transition from ${pickup.status} to ${newStatus}`);
    return { valid: false, errors };
  }

  // Status-specific validations
  switch (newStatus) {
    case 'Assigned':
      if (!additionalData?.driverId) errors.push('driverId required for Assigned status');
      break;

    case 'Completed':
      if (!additionalData?.verificationCode) {
        errors.push('verificationCode required for Completed status');
      }
      if (!additionalData?.signatureUrl) {
        errors.push('signatureUrl required for Completed status');
      }
      break;

    case 'Rescheduled':
      if (!additionalData?.newWindowStart || !additionalData?.newWindowEnd) {
        errors.push('New time window required for Rescheduled status');
      }
      break;

    case 'Cancelled':
      if (!additionalData?.cancellationReason) {
        errors.push('cancellationReason required for Cancelled status');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// ROUTE STOP VALIDATION
// ============================================================

/**
 * Validate a route stop before creation
 */
export function validateRouteStop(stop: Partial<RouteStop>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!stop.clinicId) errors.push('clinicId is required');
  if (!stop.type) errors.push('type is required');
  if (stop.sequence === undefined || stop.sequence < 0) {
    errors.push('sequence must be >= 0');
  }

  // Coordinates validation
  if (stop.coordinates) {
    if (stop.coordinates.lat < -90 || stop.coordinates.lat > 90) {
      errors.push('latitude must be between -90 and 90');
    }
    if (stop.coordinates.lng < -180 || stop.coordinates.lng > 180) {
      errors.push('longitude must be between -180 and 180');
    }
  }

  // Type-specific validations
  if (stop.type === 'Delivery') {
    if (!stop.deliveryManifest || stop.deliveryManifest.length === 0) {
      errors.push('Delivery stops must have at least one delivery item');
    }
  }

  if (stop.type === 'Pickup') {
    if (!stop.pickupTasks || stop.pickupTasks.length === 0) {
      errors.push('Pickup stops must have at least one pickup task');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a stop status transition
 */
export function validateStopTransition(
  stop: RouteStop,
  newStatus: RouteStop['status'],
  additionalData?: Record<string, unknown>
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check state machine rules
  if (!isValidStopTransition(stop.status, newStatus)) {
    errors.push(`Invalid transition from ${stop.status} to ${newStatus}`);
    return { valid: false, errors };
  }

  // Status-specific validations
  switch (newStatus) {
    case 'Arrived':
      if (!additionalData?.actualArrival) {
        errors.push('actualArrival required for Arrived status');
      }
      if (!additionalData?.coordinates) {
        errors.push('coordinates required for Arrived status');
      }
      break;

    case 'Completed':
      if (!additionalData?.completedAt) {
        errors.push('completedAt required for Completed status');
      }
      if (stop.type === 'Delivery' && !additionalData?.signatureUrl) {
        errors.push('signatureUrl required for completed Delivery stops');
      }
      if (stop.type === 'Pickup' && !additionalData?.verificationCode) {
        errors.push('verificationCode required for completed Pickup stops');
      }
      break;

    case 'Skipped':
      if (!additionalData?.skipReason) {
        errors.push('skipReason required for Skipped status');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// ROUTE VALIDATION
// ============================================================

/**
 * Validate a route before creation
 */
export function validateRoute(route: Partial<Route>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!route.labId) errors.push('labId is required');
  if (!route.date) errors.push('date is required');
  if (!route.stops || route.stops.length === 0) {
    errors.push('Route must have at least one stop');
  }

  // Validate stops sequence
  if (route.stops) {
    const sequences = route.stops.map((s) => s.sequence);
    const uniqueSequences = new Set(sequences);
    if (sequences.length !== uniqueSequences.size) {
      errors.push('Stop sequences must be unique');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a route can be started
 */
export function canStartRoute(route: Route): {
  canStart: boolean;
  reason?: string;
} {
  if (!route.driverId) {
    return { canStart: false, reason: 'No driver assigned' };
  }

  if (!route.vehicleId) {
    return { canStart: false, reason: 'No vehicle assigned' };
  }

  if (route.stops.length === 0) {
    return { canStart: false, reason: 'No stops in route' };
  }

  const pendingStops = route.stops.filter((s) => s.status === 'Pending');
  if (pendingStops.length === 0) {
    return { canStart: false, reason: 'No pending stops' };
  }

  return { canStart: true };
}

/**
 * Check if a route can be completed
 */
export function canCompleteRoute(route: Route): {
  canComplete: boolean;
  reason?: string;
} {
  const incompleteStops = route.stops.filter(
    (s) => s.status !== 'Completed' && s.status !== 'Skipped'
  );

  if (incompleteStops.length > 0) {
    return {
      canComplete: false,
      reason: `${incompleteStops.length} stop(s) not completed or skipped`,
    };
  }

  return { canComplete: true };
}

// ============================================================
// SLA COMPLIANCE VALIDATION
// ============================================================

/**
 * Calculate SLA compliance for a pickup request
 */
export function calculateSLACompliance(
  expectedArrival: string,
  actualArrival: string | null
): {
  compliant: boolean;
  varianceMinutes: number;
} {
  if (!actualArrival) {
    return { compliant: false, varianceMinutes: 0 };
  }

  const expected = new Date(expectedArrival);
  const actual = new Date(actualArrival);
  const varianceMs = actual.getTime() - expected.getTime();
  const varianceMinutes = Math.floor(varianceMs / (1000 * 60));

  // Allow 15-minute grace period
  const compliant = varianceMinutes <= 15;

  return {
    compliant,
    varianceMinutes,
  };
}

/**
 * Calculate route efficiency metrics
 */
export function calculateRouteEfficiency(route: Route): {
  completionRate: number; // Percentage of stops completed
  onTimeRate: number; // Percentage of stops completed on time
  averageStopTimeMin: number;
} {
  const totalStops = route.stops.length;
  const completedStops = route.stops.filter((s) => s.status === 'Completed');
  
  const completionRate = totalStops > 0 ? (completedStops.length / totalStops) * 100 : 0;

  // Calculate on-time stops (within 15 minutes of estimated arrival)
  const onTimeStops = completedStops.filter((stop) => {
    if (!stop.estimatedArrival || !stop.actualArrival) return false;
    const variance = new Date(stop.actualArrival).getTime() - new Date(stop.estimatedArrival).getTime();
    return variance <= 15 * 60 * 1000; // 15 minutes in ms
  });

  const onTimeRate = completedStops.length > 0 ? (onTimeStops.length / completedStops.length) * 100 : 0;

  // Calculate average stop time
  let totalStopTime = 0;
  let stopsWithTime = 0;

  completedStops.forEach((stop) => {
    if (stop.actualArrival && stop.completedAt) {
      const arrival = new Date(stop.actualArrival).getTime();
      const completion = new Date(stop.completedAt).getTime();
      totalStopTime += completion - arrival;
      stopsWithTime++;
    }
  });

  const averageStopTimeMin = stopsWithTime > 0 
    ? Math.floor(totalStopTime / stopsWithTime / (1000 * 60)) 
    : 0;

  return {
    completionRate,
    onTimeRate,
    averageStopTimeMin,
  };
}
