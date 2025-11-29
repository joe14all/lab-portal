# Section 2 Implementation: Entity & Relationship Mapping

## Overview

This document describes the implementation of **Section 2: Entity & Relationship Mapping** from the `LOGISTICS_DOMAIN_ANALYSIS.MD`. Section 2 establishes the type system, event schemas, and state machines that govern the logistics domain.

---

## Implementation Summary

### **Files Created**

1. **`/src/types/logistics.ts`** (550+ lines)
   - Core entity type definitions for all logistics domain objects
   - Cross-domain entity types (Clinic, Case)
   - Utility types and filters

2. **`/src/types/events.ts`** (400+ lines)
   - Cross-domain event interface definitions
   - Inbound/outbound event types
   - Event metadata schemas

3. **`/src/constants/logistics.ts`** (350+ lines)
   - State machine transition rules
   - Lifecycle phase definitions
   - Validation requirement mappings
   - State transition helper functions

4. **`/src/utils/logistics/validation.ts`** (520+ lines)
   - Business rule validators
   - Time window validation utilities
   - Geolocation validation (Haversine distance calculation)
   - SLA compliance calculators
   - Route efficiency metrics

---

## Type System Architecture

### **Core Domain Entities**

#### Logistics-Specific Entities
```typescript
- Lab
- FleetVehicle
- DriverUser
- Route
- RouteStop
- PickupRequest
- LogisticsProvider
```

#### Cross-Domain Entities
```typescript
- Clinic (from CRM domain)
- Case (from Cases domain)
```

### **Supporting Types**
```typescript
- Address, AddressWithGeo
- ContactInfo
- Coordinates, GeoLocation
- TimeWindow, DateRange
- PackageSpecs, VehicleSpecs
- OperatingHours
- ProofOfService
```

---

## Cross-Domain Event Schemas

### **Section 2.2 Implementation: 4 Event Types**

#### 1. **CaseDeliveryEvent** (Logistics → Cases)
```typescript
interface CaseDeliveryEvent {
  eventType: 'case.delivery.completed';
  payload: {
    caseId, labId, clinicId, routeId, stopId
    deliveredAt, signatureUrl, signedBy
    unitIds, driverId, vehicleId
    slaCompliant, varianceMinutes
  }
}
```
**Purpose**: Notifies Cases domain when a case package is delivered  
**Consumers**: Cases domain, Finance domain

---

#### 2. **PickupRequestEvent** (CRM → Logistics)
```typescript
interface PickupRequestEvent {
  eventType: 'crm.pickup.requested';
  payload: {
    requestId, labId, clinicId
    requestedBy: { userId, name, role }
    windowStart, windowEnd, address
    packageCount, packageSpecs, specialHandling
    associatedCaseIds, isRush
  }
}
```
**Purpose**: Creates a pickup request from clinic portal or CRM  
**Consumers**: Logistics domain

---

#### 3. **DeliveryCompletedEvent** (Logistics → Finance)
```typescript
interface DeliveryCompletedEvent {
  eventType: 'logistics.delivery.completed';
  payload: {
    deliveryId, labId, clinicId, routeId
    deliveryType, fulfillmentMethod
    externalProvider?: { providerId, invoicedAmount }
    internalCosts?: { driverId, distanceKm, fuelCost }
    slaMetrics, proofOfService
  }
}
```
**Purpose**: Triggers billing and invoice generation  
**Consumers**: Finance domain

---

#### 4. **EHRPickupWebhook** (External EHR → Logistics)
```typescript
interface EHRPickupWebhook {
  eventType: 'ehr.pickup.requested';
  payload: {
    ehrSystem: 'DentrixAscend_V2' | 'OpenDental' | ...
    ehrRequestId, labId, clinicId
    patientId, patientName, caseNumber
    requestedPickupDate, timeWindow
    packageCount, description, isRush
    pickupAddress, specialInstructions
  }
  signature?: string; // HMAC for verification
}
```
**Purpose**: Receives pickup requests from external EHR systems  
**Consumers**: Logistics domain

---

## State Machines

### **Section 2.3 Implementation**

#### **Pickup Request Lifecycle**

```
Pending → Assigned → EnRoute → Arrived → Completed
   ↓         ↓          ↓         ↓
Cancelled  Rescheduled Rescheduled Skipped → Rescheduled
```

**Lifecycle Phases**:
- `PLANNING`: [Pending]
- `EXECUTION`: [Assigned, EnRoute, Arrived]
- `TERMINAL`: [Completed, Skipped, Cancelled]
- `EXCEPTION`: [Rescheduled]

**State Transition Rules** (from `constants/logistics.ts`):
```typescript
PICKUP_STATE_TRANSITIONS = {
  Pending: ['Assigned', 'Cancelled'],
  Assigned: ['EnRoute', 'Rescheduled', 'Cancelled'],
  EnRoute: ['Arrived', 'Rescheduled', 'Cancelled'],
  Arrived: ['Completed', 'Skipped', 'Rescheduled'],
  Completed: [], // Terminal
  Skipped: ['Rescheduled'],
  Rescheduled: ['Pending'],
  Cancelled: [] // Terminal
}
```

---

#### **Route Stop Lifecycle**

```
Pending → InProgress → Arrived → Completed
   ↓          ↓           ↓
Skipped    Skipped     Skipped
```

**Lifecycle Phases**:
- `PLANNING`: [Pending]
- `EXECUTION`: [InProgress, Arrived]
- `TERMINAL`: [Completed, Skipped]

**State Transition Rules**:
```typescript
STOP_STATE_TRANSITIONS = {
  Pending: ['InProgress', 'Skipped'],
  InProgress: ['Arrived', 'Skipped'],
  Arrived: ['Completed', 'Skipped'],
  Completed: [], // Terminal
  Skipped: [] // Terminal
}
```

---

## Validation Utilities

### **Time Window Validation**

```typescript
// Check if time windows overlap
doTimeWindowsOverlap(window1, window2): boolean

// Validate time window (start < end, future dates)
isValidTimeWindow(window): { valid, error? }

// Check if timestamp falls within window
isWithinTimeWindow(timestamp, window): boolean

// Calculate if pickup can be completed in time window
canCompletePickupInWindow(
  currentTime, 
  pickupWindow, 
  travelTimeMin, 
  serviceTimeMin
): { canComplete, arrivalTime?, reason? }
```

---

### **Geolocation Validation**

```typescript
// Calculate distance between coordinates (Haversine formula)
calculateDistance(coord1, coord2): number // meters

// Verify location is within acceptable radius (default: 100m)
isLocationValid(
  actualLocation, 
  expectedLocation, 
  radiusMeters?
): { valid, distance, error? }
```

---

### **Entity Validation**

```typescript
// Validate pickup request before creation
validatePickupRequest(pickup): { valid, errors }

// Validate pickup status transition
validatePickupTransition(
  pickup, 
  newStatus, 
  additionalData?
): { valid, errors }

// Validate route stop before creation
validateRouteStop(stop): { valid, errors }

// Validate stop status transition
validateStopTransition(
  stop, 
  newStatus, 
  additionalData?
): { valid, errors }

// Validate route before creation
validateRoute(route): { valid, errors }

// Check if route can be started/completed
canStartRoute(route): { canStart, reason? }
canCompleteRoute(route): { canComplete, reason? }
```

---

### **SLA Compliance**

```typescript
// Calculate SLA compliance for pickup
calculateSLACompliance(
  expectedArrival, 
  actualArrival
): { compliant, varianceMinutes }

// Calculate route efficiency metrics
calculateRouteEfficiency(route): {
  completionRate,    // % of stops completed
  onTimeRate,        // % of stops on time (within 15 min)
  averageStopTimeMin // Average time per stop
}
```

---

## Validation Checklist

### ✅ **Type Definitions**
- [x] Core logistics entities defined (Lab, Vehicle, Route, Pickup, etc.)
- [x] Cross-domain entities defined (Clinic, Case)
- [x] Supporting types (Address, Coordinates, TimeWindow, etc.)
- [x] Filter and query types for all entities
- [x] All enums properly typed (`RouteStatus`, `StopStatus`, `PickupRequestStatus`, etc.)

### ✅ **Event Interfaces**
- [x] **CaseDeliveryEvent** (Logistics → Cases)
- [x] **PickupRequestEvent** (CRM → Logistics)
- [x] **DeliveryCompletedEvent** (Logistics → Finance)
- [x] **EHRPickupWebhook** (EHR → Logistics)
- [x] Internal events: `PickupStatusChangedEvent`, `RouteStopStatusChangedEvent`
- [x] Event union types (`LogisticsEvent`, `InboundEvent`, `OutboundEvent`)
- [x] Event metadata schemas (correlationId, causationId, retryCount)

### ✅ **State Machines**
- [x] Pickup request state transition rules
- [x] Route stop state transition rules
- [x] Route state transition rules
- [x] Lifecycle phase definitions
- [x] Transition requirement mappings
- [x] Helper functions: `isValidPickupTransition()`, `isValidStopTransition()`
- [x] Terminal state detection
- [x] State transition error types

### ✅ **Validation Utilities**
- [x] Time window validation (overlap, validity, duration)
- [x] Geolocation validation (Haversine distance calculation)
- [x] Pickup request validation
- [x] Route stop validation
- [x] Route validation
- [x] Status transition validation
- [x] SLA compliance calculation
- [x] Route efficiency metrics

### ✅ **Code Quality**
- [x] No TypeScript compilation errors
- [x] Proper imports and exports
- [x] JSDoc comments for all public functions
- [x] Type-safe implementations (no `any` types except in controlled contexts)
- [x] Follows existing codebase conventions

### ✅ **Integration Readiness**
- [x] Types compatible with existing mock data schemas
- [x] Event schemas ready for future event bus integration
- [x] State machines enforce business rules
- [x] Validators provide actionable error messages
- [x] No breaking changes to existing code

---

## Usage Examples

### **Validating a Time Window**
```typescript
import { isValidTimeWindow } from '@/utils/logistics/validation';

const window = { 
  start: '2025-01-15T14:00:00Z', 
  end: '2025-01-15T16:00:00Z' 
};

const result = isValidTimeWindow(window);
// { valid: true }
```

### **Checking State Transition**
```typescript
import { isValidPickupTransition } from '@/constants/logistics';

const canAssign = isValidPickupTransition('Pending', 'Assigned');
// true

const canComplete = isValidPickupTransition('Pending', 'Completed');
// false (must go Pending → Assigned → EnRoute → Arrived → Completed)
```

### **Validating Geolocation**
```typescript
import { isLocationValid } from '@/utils/logistics/validation';

const actual = { lat: 40.7489, lng: -73.9680 };
const expected = { lat: 40.7490, lng: -73.9681 };

const result = isLocationValid(actual, expected, 100);
// { valid: true, distance: 15.2 }
```

### **Creating a Cross-Domain Event**
```typescript
import type { CaseDeliveryEvent } from '@/types/events';

const event: CaseDeliveryEvent = {
  eventId: crypto.randomUUID(),
  eventType: 'case.delivery.completed',
  timestamp: new Date().toISOString(),
  source: 'logistics',
  version: '1.0.0',
  payload: {
    caseId: 'case-123',
    labId: 'lab-001',
    clinicId: 'clinic-456',
    routeId: 'route-morning-A',
    stopId: 'stop-001',
    deliveredAt: '2025-01-15T10:30:00Z',
    signatureUrl: 'https://...',
    signedBy: 'Dr. Smith',
    // ... rest of payload
  }
};
```

---

## Next Steps

**Section 2 is now complete**. The type system, event schemas, and state machines are fully implemented and ready for use.

**Future work** (Section 3+, not part of this implementation):
- API endpoint implementations
- Event bus integration (webhook publishers/subscribers)
- Database schema generation from TypeScript types
- Frontend components using these types
- Real-time tracking UI
- Provider integration API calls

---

## File Locations

```
src/
├── types/
│   ├── logistics.ts          # Core entity types (550+ lines)
│   └── events.ts              # Cross-domain event schemas (400+ lines)
├── constants/
│   └── logistics.ts           # State machines & transition rules (350+ lines)
└── utils/
    └── logistics/
        └── validation.ts      # Business rule validators (520+ lines)
```

**Total Lines of Code**: ~1,820 lines of production-ready TypeScript

---

## Verification Commands

```bash
# Check for TypeScript errors
npm run build

# Run type checking
npx tsc --noEmit

# Verify imports
grep -r "from '@/types/logistics'" src/
grep -r "from '@/types/events'" src/
grep -r "from '@/constants/logistics'" src/
```

---

**Implementation Date**: January 2025  
**Status**: ✅ **COMPLETE**  
**Section**: 2 (Entity & Relationship Mapping)
