/**
 * Cross-Domain Event Interface Definitions
 * 
 * Event schemas for inter-domain communication
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 2.2
 */

import type { 
  PickupRequestStatus, 
  StopStatus, 
  PackageSpecs, 
  ProofOfService,
  SpecialHandling,
  Coordinates,
  ISO8601
} from './logistics';

// ============================================================
// LOGISTICS → CASES
// ============================================================

/**
 * Event published when a case package is delivered to a clinic
 * Consumed by: Cases domain, Finance domain
 */
export interface CaseDeliveryEvent {
  eventId: string;
  eventType: 'case.delivery.completed';
  timestamp: ISO8601;
  source: 'logistics';
  version: string; // Semantic versioning for event schema
  
  payload: {
    caseId: string;
    labId: string;
    clinicId: string;
    routeId: string;
    stopId: string;
    deliveredAt: ISO8601;
    
    // Proof of service
    signatureUrl: string;
    signedBy: string;
    photoUrl?: string;
    geoHashAtDelivery: string;
    verificationCode: string;
    
    // Delivery context
    driverId: string;
    vehicleId: string;
    unitIds: string[]; // List of delivered units (crowns, bridges, etc.)
    
    // Service metrics
    scheduledDelivery: ISO8601;
    actualDelivery: ISO8601;
    slaCompliant: boolean;
    varianceMinutes: number;
  };
  
  metadata?: {
    correlationId?: string;
    causationId?: string;
    retryCount?: number;
  };
}

// ============================================================
// CRM → LOGISTICS
// ============================================================

/**
 * Event published when a clinic requests a pickup
 * Consumed by: Logistics domain
 * Source: CRM domain (clinic portal request or staff request)
 */
export interface PickupRequestEvent {
  eventId: string;
  eventType: 'crm.pickup.requested';
  timestamp: ISO8601;
  source: 'crm';
  version: string;
  
  payload: {
    requestId: string;
    labId: string;
    clinicId: string;
    requestedBy: {
      userId: string;
      name: string;
      role: string;
    };
    
    // Pickup details
    windowStart: ISO8601;
    windowEnd: ISO8601;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
      coordinates: Coordinates;
    };
    
    // Package information
    packageCount: number;
    packageSpecs: PackageSpecs;
    specialHandling: SpecialHandling[];
    
    // Case linkage
    associatedCaseIds: string[];
    
    // Priority
    isRush: boolean;
    notes?: string;
    
    // Access
    accessInstructions?: {
      entrance?: string;
      contactPerson?: string;
      securityCode?: string;
      parkingInstructions?: string;
    };
  };
  
  metadata?: {
    correlationId?: string;
    causationId?: string;
  };
}

// ============================================================
// LOGISTICS → FINANCE
// ============================================================

/**
 * Event published when a delivery is completed for billing purposes
 * Consumed by: Finance domain
 * Triggers: Invoice generation, delivery fee calculation
 */
export interface DeliveryCompletedEvent {
  eventId: string;
  eventType: 'logistics.delivery.completed';
  timestamp: ISO8601;
  source: 'logistics';
  version: string;
  
  payload: {
    deliveryId: string;
    labId: string;
    clinicId: string;
    routeId: string;
    stopId: string;
    completedAt: ISO8601;
    
    // Financial details
    deliveryType: 'Standard' | 'Rush' | 'SameDay' | 'Emergency';
    fulfillmentMethod: 'IN_HOUSE' | 'THIRD_PARTY';
    
    // Third-party provider costs
    externalProvider?: {
      providerId: string;
      providerName: string;
      deliveryId: string;
      invoicedAmount: number;
      currency: string;
    };
    
    // Internal costs
    internalCosts?: {
      driverId: string;
      vehicleId: string;
      distanceKm: number;
      durationMin: number;
      fuelCost?: number;
      laborCost?: number;
    };
    
    // Delivery context
    caseIds: string[];
    packageCount: number;
    
    // Service metrics (for SLA-based pricing)
    slaMetrics: {
      scheduledDelivery: ISO8601;
      actualDelivery: ISO8601;
      slaCompliant: boolean;
      varianceMinutes: number;
    };
    
    // Proof of service
    proofOfService: ProofOfService;
  };
  
  metadata?: {
    correlationId?: string;
    causationId?: string;
  };
}

// ============================================================
// EHR → LOGISTICS
// ============================================================

/**
 * Event received from external EHR system via webhook
 * Consumed by: Logistics domain
 * Source: External EHR systems (DentrixAscend, OpenDental, etc.)
 */
export interface EHRPickupWebhook {
  eventId: string;
  eventType: 'ehr.pickup.requested';
  timestamp: ISO8601;
  source: 'ehr';
  version: string;
  
  payload: {
    ehrSystem: 'DentrixAscend_V2' | 'OpenDental' | 'Eaglesoft' | 'Other';
    ehrRequestId: string;
    
    // Lab & Clinic identification
    labId: string;
    clinicId: string;
    
    // Patient context (for case linkage)
    patientId: string;
    patientName: string;
    caseNumber?: string;
    
    // Pickup details
    requestedPickupDate: string; // YYYY-MM-DD
    timeWindow: {
      start: string; // HH:MM
      end: string; // HH:MM
    };
    
    // Package information
    packageCount: number;
    description: string;
    isRush: boolean;
    
    // Address
    pickupAddress: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      contactPerson?: string;
    };
    
    // Special instructions
    specialInstructions?: string;
    
    // External reference for tracking
    externalReference: string;
  };
  
  // Webhook security
  signature?: string; // HMAC signature for verification
  
  metadata?: {
    webhookId?: string;
    retryAttempt?: number;
  };
}

// ============================================================
// PICKUP LIFECYCLE STATE CHANGE EVENT
// ============================================================

/**
 * Internal event published when a pickup request changes status
 * Consumed by: CRM domain (for notification), Finance domain (for billing triggers)
 */
export interface PickupStatusChangedEvent {
  eventId: string;
  eventType: 'logistics.pickup.status_changed';
  timestamp: ISO8601;
  source: 'logistics';
  version: string;
  
  payload: {
    pickupRequestId: string;
    labId: string;
    clinicId: string;
    
    previousStatus: PickupRequestStatus;
    newStatus: PickupRequestStatus;
    
    changedBy: {
      userId: string;
      userType: 'Driver' | 'Dispatcher' | 'System';
    };
    
    routeId?: string;
    stopId?: string;
    
    // Context for specific status transitions
    assignedDriver?: {
      driverId: string;
      driverName: string;
      vehicleId: string;
    };
    
    arrivalInfo?: {
      arrivedAt: ISO8601;
      coordinates: Coordinates;
    };
    
    completionInfo?: {
      completedAt: ISO8601;
      verificationCode: string;
      signatureUrl: string;
      packageCount: number;
    };
    
    cancellationInfo?: {
      reason: string;
      notes?: string;
    };
  };
  
  metadata?: {
    correlationId?: string;
    causationId?: string;
  };
}

// ============================================================
// ROUTE STOP STATE CHANGE EVENT
// ============================================================

/**
 * Internal event published when a route stop changes status
 * Consumed by: Cases domain, CRM domain
 */
export interface RouteStopStatusChangedEvent {
  eventId: string;
  eventType: 'logistics.route_stop.status_changed';
  timestamp: ISO8601;
  source: 'logistics';
  version: string;
  
  payload: {
    routeId: string;
    stopId: string;
    labId: string;
    clinicId: string;
    
    previousStatus: StopStatus;
    newStatus: StopStatus;
    
    changedBy: {
      driverId: string;
      driverName: string;
    };
    
    stopType: 'Pickup' | 'Delivery';
    sequence: number;
    
    // Context for specific status transitions
    arrivalInfo?: {
      arrivedAt: ISO8601;
      coordinates: Coordinates;
      estimatedArrival?: ISO8601;
      actualArrival: ISO8601;
    };
    
    completionInfo?: {
      completedAt: ISO8601;
      signatureUrl?: string;
      signedBy?: string;
      photoUrl?: string;
      verificationCode?: string;
      
      // Pickup-specific
      pickupTasks?: {
        requestId: string;
        associatedCaseIds: string[];
        packageCount: number;
      }[];
      
      // Delivery-specific
      deliveryItems?: {
        caseId: string;
        unitIds: string[];
      }[];
    };
  };
  
  metadata?: {
    correlationId?: string;
    causationId?: string;
  };
}

// ============================================================
// EVENT UNION TYPES
// ============================================================

export type LogisticsEvent =
  | CaseDeliveryEvent
  | DeliveryCompletedEvent
  | PickupStatusChangedEvent
  | RouteStopStatusChangedEvent;

export type InboundEvent =
  | PickupRequestEvent
  | EHRPickupWebhook;

export type OutboundEvent =
  | CaseDeliveryEvent
  | DeliveryCompletedEvent;

export type AllEvents =
  | LogisticsEvent
  | InboundEvent;

// ============================================================
// EVENT METADATA TYPES
// ============================================================

export interface EventMetadata {
  correlationId?: string; // Links related events in a business transaction
  causationId?: string; // The event that caused this event
  retryCount?: number; // For retry logic
  idempotencyKey?: string; // For ensuring exactly-once processing
}

export interface WebhookMetadata {
  webhookId?: string;
  retryAttempt?: number;
  signature?: string; // HMAC for verification
}
