/**
 * Logistics State Machine Constants
 * 
 * State transition definitions for pickup requests and route stops
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 2.3
 */

import type { PickupRequestStatus, StopStatus } from '../types/logistics';

// ============================================================
// PICKUP REQUEST STATE MACHINE
// ============================================================

/**
 * Valid state transitions for pickup requests
 * Format: { [currentState]: allowedNextStates[] }
 */
export const PICKUP_STATE_TRANSITIONS: Record<PickupRequestStatus, PickupRequestStatus[]> = {
  // Initial state → Can be assigned or cancelled
  Pending: ['Assigned', 'Cancelled'],
  
  // Assigned to route → Driver en route or rescheduled
  Assigned: ['EnRoute', 'Rescheduled', 'Cancelled'],
  
  // Driver en route → Arrived at location
  EnRoute: ['Arrived', 'Rescheduled', 'Cancelled'],
  
  // Driver arrived → Completed or skipped
  Arrived: ['Completed', 'Skipped', 'Rescheduled'],
  
  // Terminal states
  Completed: [], // No transitions from completed
  Skipped: ['Rescheduled'], // Can reschedule a skipped pickup
  Rescheduled: ['Pending'], // Rescheduled becomes a new pending request
  Cancelled: [], // No transitions from cancelled
};

/**
 * Pickup request lifecycle phases
 */
export const PICKUP_LIFECYCLE_PHASES = {
  PLANNING: ['Pending'],
  EXECUTION: ['Assigned', 'EnRoute', 'Arrived'],
  TERMINAL: ['Completed', 'Skipped', 'Cancelled'],
  EXCEPTION: ['Rescheduled'],
} as const;

/**
 * Required fields for each pickup status transition
 */
export const PICKUP_TRANSITION_REQUIREMENTS: Record<
  PickupRequestStatus,
  {
    requiredFields?: string[];
    optionalFields?: string[];
    validations?: string[];
  }
> = {
  Pending: {
    requiredFields: ['clinicId', 'windowStart', 'windowEnd', 'packageCount'],
    validations: ['windowStart must be before windowEnd', 'windowEnd must be in the future'],
  },
  
  Assigned: {
    requiredFields: ['driverId', 'routeId'],
    validations: ['Driver must be active', 'Route must be Scheduled or InProgress'],
  },
  
  EnRoute: {
    requiredFields: ['driverId', 'routeId', 'stopId'],
    validations: ['Route must be InProgress'],
  },
  
  Arrived: {
    requiredFields: ['actualArrival', 'geoLocation'],
    validations: ['Geo location must be within 100m of clinic address'],
  },
  
  Completed: {
    requiredFields: ['completedAt', 'verificationCode', 'signatureUrl', 'packageCount'],
    validations: [
      'Verification code must match original',
      'Signature URL must be valid',
      'Package count must be > 0',
    ],
  },
  
  Skipped: {
    requiredFields: ['skipReason'],
    optionalFields: ['notes'],
  },
  
  Rescheduled: {
    requiredFields: ['rescheduleReason', 'newWindowStart', 'newWindowEnd'],
    validations: ['New window must be in the future'],
  },
  
  Cancelled: {
    requiredFields: ['cancellationReason'],
    optionalFields: ['notes'],
  },
};

// ============================================================
// ROUTE STOP STATE MACHINE
// ============================================================

/**
 * Valid state transitions for route stops
 * Format: { [currentState]: allowedNextStates[] }
 */
export const STOP_STATE_TRANSITIONS: Record<StopStatus, StopStatus[]> = {
  // Initial state → In progress when route starts
  Pending: ['InProgress', 'Skipped'],
  
  // Driver navigating → Arrived at location
  InProgress: ['Arrived', 'Skipped'],
  
  // Driver arrived → Completed or skipped
  Arrived: ['Completed', 'Skipped'],
  
  // Terminal states
  Completed: [], // No transitions from completed
  Skipped: [], // No transitions from skipped
};

/**
 * Route stop lifecycle phases
 */
export const STOP_LIFECYCLE_PHASES = {
  PLANNING: ['Pending'],
  EXECUTION: ['InProgress', 'Arrived'],
  TERMINAL: ['Completed', 'Skipped'],
} as const;

/**
 * Required fields for each stop status transition
 */
export const STOP_TRANSITION_REQUIREMENTS: Record<
  StopStatus,
  {
    requiredFields?: string[];
    optionalFields?: string[];
    validations?: string[];
  }
> = {
  Pending: {
    requiredFields: ['clinicId', 'type', 'sequence'],
  },
  
  InProgress: {
    requiredFields: ['estimatedArrival'],
    validations: ['Route must be InProgress'],
  },
  
  Arrived: {
    requiredFields: ['actualArrival', 'geoHash'],
    validations: [
      'Geo location must be within 100m of stop address',
      'actualArrival must be >= route.startTime',
    ],
  },
  
  Completed: {
    requiredFields: ['completedAt', 'geoHashAtCompletion'],
    validations: [
      'For delivery stops: signatureUrl and signedBy required',
      'For pickup stops: verificationCode required',
      'completedAt must be >= actualArrival',
    ],
  },
  
  Skipped: {
    requiredFields: ['skipReason'],
    optionalFields: ['notes'],
  },
};

// ============================================================
// ROUTE STATE MACHINE
// ============================================================

export const ROUTE_STATE_TRANSITIONS = {
  Scheduled: ['InProgress', 'Cancelled'],
  InProgress: ['Completed', 'Cancelled'],
  Completed: [], // Terminal
  Cancelled: [], // Terminal
} as const;

export const ROUTE_TRANSITION_REQUIREMENTS = {
  Scheduled: {
    requiredFields: ['driverId', 'vehicleId', 'date', 'stops'],
    validations: ['stops array must not be empty', 'date must be today or future'],
  },
  
  InProgress: {
    requiredFields: ['startTime'],
    validations: ['Driver must be active', 'Vehicle must be active', 'At least one stop must be Pending'],
  },
  
  Completed: {
    requiredFields: ['endTime'],
    validations: ['All stops must be Completed or Skipped', 'endTime must be >= startTime'],
  },
  
  Cancelled: {
    requiredFields: ['cancellationReason'],
    optionalFields: ['notes'],
  },
} as const;

// ============================================================
// STATE VALIDATION FUNCTIONS
// ============================================================

/**
 * Check if a pickup status transition is valid
 */
export function isValidPickupTransition(
  currentStatus: PickupRequestStatus,
  newStatus: PickupRequestStatus
): boolean {
  const allowedTransitions = PICKUP_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Check if a stop status transition is valid
 */
export function isValidStopTransition(
  currentStatus: StopStatus,
  newStatus: StopStatus
): boolean {
  const allowedTransitions = STOP_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get the lifecycle phase for a pickup status
 */
export function getPickupPhase(status: PickupRequestStatus): keyof typeof PICKUP_LIFECYCLE_PHASES {
  for (const [phase, statuses] of Object.entries(PICKUP_LIFECYCLE_PHASES)) {
    if ((statuses as readonly PickupRequestStatus[]).includes(status)) {
      return phase as keyof typeof PICKUP_LIFECYCLE_PHASES;
    }
  }
  throw new Error(`Unknown pickup status: ${status}`);
}

/**
 * Get the lifecycle phase for a stop status
 */
export function getStopPhase(status: StopStatus): keyof typeof STOP_LIFECYCLE_PHASES {
  for (const [phase, statuses] of Object.entries(STOP_LIFECYCLE_PHASES)) {
    if ((statuses as readonly StopStatus[]).includes(status)) {
      return phase as keyof typeof STOP_LIFECYCLE_PHASES;
    }
  }
  throw new Error(`Unknown stop status: ${status}`);
}

/**
 * Check if a pickup status is terminal (no further transitions)
 */
export function isPickupTerminal(status: PickupRequestStatus): boolean {
  return PICKUP_STATE_TRANSITIONS[status].length === 0;
}

/**
 * Check if a stop status is terminal (no further transitions)
 */
export function isStopTerminal(status: StopStatus): boolean {
  return STOP_STATE_TRANSITIONS[status].length === 0;
}

// ============================================================
// STATE TRANSITION EVENTS
// ============================================================

/**
 * Reasons for pickup status changes
 */
export const PICKUP_TRANSITION_REASONS = {
  DRIVER_ASSIGNED: 'Driver assigned to route',
  DRIVER_DEPARTED: 'Driver departed for pickup location',
  DRIVER_ARRIVED: 'Driver arrived at pickup location',
  PICKUP_COMPLETED: 'Pickup completed successfully',
  CLINIC_UNAVAILABLE: 'Clinic was closed or unavailable',
  CLINIC_REQUESTED: 'Clinic requested reschedule',
  TIME_CONSTRAINT: 'Could not complete within time window',
  USER_CANCELLED: 'User cancelled the request',
  SYSTEM_CANCELLED: 'System cancelled due to timeout',
} as const;

/**
 * Reasons for stop status changes
 */
export const STOP_TRANSITION_REASONS = {
  ROUTE_STARTED: 'Route execution started',
  NAVIGATING: 'Driver navigating to stop',
  ARRIVED: 'Driver arrived at stop',
  SERVICE_COMPLETED: 'Service completed at stop',
  CLINIC_CLOSED: 'Clinic was closed',
  ACCESS_DENIED: 'Could not access location',
  TIME_EXCEEDED: 'Time window exceeded',
} as const;

// ============================================================
// VALIDATION ERROR TYPES
// ============================================================

export class StateTransitionError extends Error {
  constructor(
    public entityType: 'pickup' | 'stop' | 'route',
    public entityId: string,
    public currentStatus: string,
    public attemptedStatus: string,
    message?: string
  ) {
    super(
      message ||
        `Invalid ${entityType} transition: ${currentStatus} → ${attemptedStatus} for ${entityId}`
    );
    this.name = 'StateTransitionError';
  }
}

export class ValidationError extends Error {
  constructor(
    public entityType: 'pickup' | 'stop' | 'route',
    public entityId: string,
    public field: string,
    public validationRule: string,
    message?: string
  ) {
    super(message || `Validation failed for ${entityType}.${field}: ${validationRule}`);
    this.name = 'ValidationError';
  }
}
