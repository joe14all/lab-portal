# Section 6 Implementation: Integration Points & Cross-Domain Event Flows

**Implementation Date**: January 2025  
**Status**: ✅ Complete  
**Total Lines of Code**: ~1,950

---

## 📋 Overview

Section 6 implements the **cross-domain integration layer** that enables communication between the Logistics domain and:
- **Production Domain** (CaseReadyToShip events)
- **Finance Domain** (DeliveryCompleted events)
- **CRM Domain** (PickupRequested events)
- **External EHR Systems** (Dentrix, OpenDental, Eaglesoft webhooks)
- **Real-Time Tracking** (WebSocket-based driver location updates)

This integration layer provides:
- ✅ Event-driven architecture with consumers and publishers
- ✅ Webhook handlers with HMAC signature verification
- ✅ Data mapping between external and internal formats
- ✅ Real-time driver tracking with ETA calculations
- ✅ Retry logic, error handling, and monitoring

---

## 🗂️ Files Created

### 1. Event Consumers (`/src/services/events/consumers.js`) - 475 lines

**Purpose**: Handles incoming events from other domains

**Exports**:
- `handleCaseReadyToShip(event)` - Processes production completion events
- `handleDeliveryCompleted(event)` - Updates invoices when deliveries complete
- `handlePickupRequested(event)` - Creates pickup requests from CRM portal
- `routeEvent(event)` - Routes events to appropriate handler
- `processBatchEvents(events)` - Batch processes multiple events

**Key Features**:
- Automatic consolidation of deliveries to same clinic/date
- Recurring pickup schedule generation (daily, weekly, biweekly)
- Rush delivery/pickup notifications to dispatchers
- Integration with Finance domain for billing triggers
- Comprehensive error handling and logging

**Example Usage**:
```javascript
import { handleCaseReadyToShip } from '@/services/events/consumers';

// Handle production event
const event = {
  source: 'cases.production',
  detailType: 'CaseReadyToShip',
  detail: {
    caseId: 'CASE-12345',
    clinicId: 'CLI-001',
    labId: 'LAB-001',
    patientName: 'John Smith',
    requestedDeliveryDate: '2025-01-20',
    priority: 'RUSH',
    packageSpecs: {
      weight: 0.5,
      fragile: true,
      requiresSignature: true
    }
  }
};

const delivery = await handleCaseReadyToShip(event);
// Creates delivery task or appends to existing delivery
```

---

### 2. EHR Webhook Handlers (`/src/services/webhooks/ehrWebhooks.js`) - 407 lines

**Purpose**: Processes incoming webhooks from external EHR systems

**Exports**:
- `handleDentrixWebhook(request)` - Processes Dentrix pickup requests
- `handleOpenDentalWebhook(request)` - Processes OpenDental requests
- `handleEaglesoftWebhook(request)` - Processes Eaglesoft requests
- `verifyHMACSignature(payload, signature, secret)` - Security verification
- `routeWebhook(ehrSystem, request)` - Routes webhooks to appropriate handler
- `lambdaWebhookHandler(event)` - AWS Lambda handler wrapper

**Key Features**:
- HMAC-SHA256 signature verification (timing-attack resistant)
- Browser-compatible using Web Crypto API
- Configurable via environment variables
- Automatic data mapping to internal format
- Comprehensive error responses (401, 400, 500)

**Example Usage**:
```javascript
import { handleDentrixWebhook } from '@/services/webhooks/ehrWebhooks';

// Simulate Dentrix webhook
const request = {
  headers: {
    'x-dentrix-signature': 'abc123...'
  },
  body: {
    externalId: 'DX-54321',
    practiceId: 'CLI-001',
    patientName: 'Jane Doe',
    preferredPickupTime: '2025-01-20T14:00:00Z',
    priority: 1, // 0=normal, 1=high, 2=emergency
    notes: 'Please call upon arrival',
    packageCount: 2,
    contactName: 'Dr. Johnson',
    contactPhone: '555-1234'
  }
};

const response = await handleDentrixWebhook(request);
// { statusCode: 200, body: { success: true, pickupId: 'dentrix-DX-54321' } }
```

---

### 3. EHR Data Mappers (`/src/utils/integration/ehrMappers.js`) - 418 lines

**Purpose**: Transforms external EHR formats to internal schema

**Exports**:
- `mapDentrixToInternal(data)` - Dentrix → Internal
- `mapOpenDentalToInternal(data)` - OpenDental → Internal
- `mapEaglesoftToInternal(data)` - Eaglesoft → Internal
- `mapInternalToDentrix(data)` - Internal → Dentrix (for responses)
- `mapInternalToOpenDental(data)` - Internal → OpenDental
- `mapInternalToEaglesoft(data)` - Internal → Eaglesoft
- `validateDentrixData(data)` - Validates Dentrix payload
- `validateOpenDentalData(data)` - Validates OpenDental payload
- `validateEaglesoftData(data)` - Validates Eaglesoft payload

**Field Mappings**:

| Dentrix Field | OpenDental Field | Eaglesoft Field | Internal Field |
|---------------|------------------|-----------------|----------------|
| `externalId` | `LabCaseNum` | `caseId` | `pickupId` |
| `practiceId` | `ClinicNum` | `practiceId` | `clinicId` |
| `patientName` | `PatName` | `patientInfo.name` | `metadata.patientName` |
| `preferredPickupTime` | `DateTimeScheduled` | `scheduledPickup` | `windowStart/End` |
| `priority` (0-2) | `Priority` (string) | `urgency` (string) | `isRush` (boolean) |
| `notes` | `Note` | `comments` | `notes` |

**Example Usage**:
```javascript
import { mapDentrixToInternal } from '@/utils/integration/ehrMappers';

const dentrixData = {
  externalId: 'DX-99999',
  practiceId: 'CLI-789',
  patientName: 'Alice Brown',
  preferredPickupTime: '2025-01-21T10:00:00Z',
  priority: 2, // Emergency
  notes: 'Urgent case',
  packageCount: 1,
  contactName: 'Dr. Lee',
  contactPhone: '555-9876'
};

const internal = mapDentrixToInternal(dentrixData);
/*
{
  pickupId: 'dentrix-DX-99999',
  clinicId: 'CLI-789',
  labId: 'LAB001',
  requestedBy: { userId: 'dentrix-user-CLI-789', name: 'Dr. Lee', phone: '555-9876' },
  windowStart: '2025-01-21T09:00:00Z', // 1 hour before
  windowEnd: '2025-01-21T11:00:00Z',   // 1 hour after
  isRush: true, // priority >= 1
  notes: 'Urgent case',
  metadata: {
    source: 'dentrix',
    externalId: 'DX-99999',
    patientName: 'Alice Brown',
    originalPriority: 2
  }
}
*/
```

---

### 4. Driver Tracking Utilities (`/src/utils/tracking/driverTracking.js`) - 383 lines

**Purpose**: Real-time driver location tracking and ETA calculations

**Exports**:
- `handleDriverLocationUpdate(update)` - Processes location updates
- `buildLocationUpdateMessage(update)` - Builds WebSocket broadcast message
- `buildETAUpdateMessage(routeId, stops)` - Builds ETA update message
- `buildArrivalNotification(stop, minutesAway)` - Builds arrival notification
- `isWithinGeofence(driverLocation, stopLocation, radius)` - Geofence detection
- `didEnterGeofence(prevLoc, currLoc, stopLoc, radius)` - Geofence entry detection
- `getDriverLocationHistory(driverId, startTime, endTime)` - Historical data
- `calculateDriverStatistics(driverId, date)` - Performance analytics

**Key Features**:
- ETA calculation using Distance Matrix API
- Automatic fallback to straight-line distance
- Geofence detection (100m default radius)
- Cumulative ETA calculation for all stops
- WebSocket message formatting for broadcasts
- Driver performance analytics

**Example Usage**:
```javascript
import { handleDriverLocationUpdate } from '@/utils/tracking/driverTracking';

// WebSocket receives driver location
const locationUpdate = {
  driverId: 'DRV-001',
  routeId: 'ROUTE-2025-01-20-001',
  coordinates: { lat: 42.3601, lng: -71.0589 },
  timestamp: '2025-01-20T10:15:30Z',
  speed: 45, // km/h
  heading: 270 // degrees
};

const update = await handleDriverLocationUpdate(locationUpdate);
/*
{
  type: 'DRIVER_LOCATION_UPDATE',
  routeId: 'ROUTE-2025-01-20-001',
  driverId: 'DRV-001',
  coordinates: { lat: 42.3601, lng: -71.0589 },
  timestamp: '2025-01-20T10:15:30Z',
  speed: 45,
  heading: 270,
  nextStop: {
    id: 'STOP001',
    clinicName: 'Downtown Dental',
    eta: '2025-01-20T10:25:30Z',
    distance: 7.5
  },
  updatedStops: [...]
}
*/

// Broadcast to dispatchers via WebSocket
websocket.broadcast(update);
```

---

### 5. Integration Utilities (`/src/utils/integration/integrationUtils.js`) - 267 lines

**Purpose**: Shared utilities for cross-domain integration

**Exports**:

**Validation**:
- `validateEvent(event)` - Validates event structure
- `validateCaseReadyToShipEvent(detail)` - Validates production events
- `validatePickupRequestedEvent(detail)` - Validates CRM events

**Data Sanitization**:
- `sanitizeEvent(event)` - Removes sensitive fields
- `sanitizePII(data)` - Masks personal information

**Error Handling**:
- `withErrorHandling(fn, context)` - Error wrapper
- `retryWithBackoff(fn, options)` - Exponential backoff retry

**Monitoring**:
- `recordEventProcessing(type, duration, success)` - Records metrics
- `getIntegrationMetrics()` - Gets metric summary
- `resetIntegrationMetrics()` - Resets counters

**Data Transformation**:
- `toISOString(date)` - Safe date conversion
- `ensureArray(value)` - Ensures array type
- `deepClone(obj)` - Deep object cloning
- `deepMerge(target, source)` - Deep object merging

**Rate Limiting**:
- `isRateLimited(key, maxRequests, windowMs)` - Checks rate limit
- `clearRateLimit(key)` - Clears rate limit

**Example Usage**:
```javascript
import { retryWithBackoff, recordEventProcessing } from '@/utils/integration/integrationUtils';

// Retry API call with exponential backoff
const data = await retryWithBackoff(
  async () => await api.createDelivery(deliveryData),
  { maxRetries: 3, baseDelay: 1000 }
);

// Record event metrics
const startTime = Date.now();
try {
  await handleEvent(event);
  recordEventProcessing('CaseReadyToShip', Date.now() - startTime, true);
} catch (error) {
  recordEventProcessing('CaseReadyToShip', Date.now() - startTime, false);
}

// Get integration health
const metrics = getIntegrationMetrics();
/*
{
  totalEvents: 1523,
  totalErrors: 12,
  errorRate: 0.79,
  avgLatencyMs: 145.3,
  eventCounts: { CaseReadyToShip: 850, PickupRequested: 673 },
  errorCounts: { CaseReadyToShip: 8, PickupRequested: 4 }
}
*/
```

---

## 🔗 Integration Flows

### Flow 1: Production → Logistics (Case Delivery)

```
Production Domain                 Logistics Domain
    |                                    |
    | 1. Marks case "Ready to Ship"     |
    |                                    |
    | 2. Publishes CaseReadyToShip      |
    |---------------------------------->|
    |                                    | 3. handleCaseReadyToShip()
    |                                    | 4. Find existing delivery for date/clinic
    |                                    | 5a. Append to existing OR
    |                                    | 5b. Create new delivery task
    |                                    | 6. Notify dispatcher if RUSH
    |                                    |
    | 7. Delivery confirmation          |
    |<----------------------------------|
```

### Flow 2: Logistics → Finance (Delivery Confirmation)

```
Logistics Domain                 Finance Domain
    |                                    |
    | 1. Driver completes delivery      |
    | 2. Captures proof (signature/photo)|
    |                                    |
    | 3. Publishes DeliveryCompleted    |
    |---------------------------------->|
    |                                    | 4. handleDeliveryCompleted()
    |                                    | 5. Get invoices for cases
    |                                    | 6. Update invoice status
    |                                    | 7. Attach proof of delivery
    |                                    | 8. Trigger billing workflow
    |                                    |
```

### Flow 3: CRM → Logistics (Pickup Request)

```
CRM Portal                       Logistics Domain
    |                                    |
    | 1. Clinic requests pickup         |
    | 2. Selects time window            |
    |                                    |
    | 3. Publishes PickupRequested      |
    |---------------------------------->|
    |                                    | 4. handlePickupRequested()
    |                                    | 5. Get clinic details
    |                                    | 6. Validate time window
    |                                    | 7. Create pickup request
    |                                    | 8. Generate recurring (if specified)
    |                                    | 9. Notify dispatcher if RUSH
    |                                    |
    | 10. Pickup confirmation           |
    |<----------------------------------|
```

### Flow 4: EHR → Logistics (Webhook Integration)

```
EHR System (Dentrix)             Logistics Domain
    |                                    |
    | 1. User schedules pickup          |
    | 2. Generates webhook payload      |
    | 3. Calculates HMAC signature      |
    |                                    |
    | 4. POST /webhooks/ehr/dentrix     |
    |---------------------------------->|
    |                                    | 5. Verify HMAC signature
    |                                    | 6. Validate payload
    |                                    | 7. Map to internal format
    |                                    | 8. Create internal event
    |                                    | 9. Route to handlePickupRequested()
    |                                    | 10. Create pickup task
    |                                    |
    | 11. { pickupId, confirmationNum } |
    |<----------------------------------|
```

### Flow 5: Real-Time Driver Tracking

```
Driver App                       Server                      Dispatcher
    |                                |                              |
    | Every 30s: Location update    |                              |
    |----------------------------->|                              |
    |                                | 1. Store location           |
    |                                | 2. Get active route         |
    |                                | 3. Calculate ETA to next stop|
    |                                | 4. Update all stop ETAs     |
    |                                | 5. Check geofence           |
    |                                |                              |
    |                                | 6. Broadcast location update|
    |                                |----------------------------->|
    |                                |                              | 7. Update map UI
    |                                |                              | 8. Display ETAs
    |                                |                              |
    |                                | If within 5min of arrival:  |
    |                                | 9. Send clinic notification |
    |                                |----------------------------->|
```

---

## 🧪 Testing Guide

### Test Event Consumers

```javascript
import { routeEvent } from '@/services/events/consumers';

// Test CaseReadyToShip
const productionEvent = {
  source: 'cases.production',
  detailType: 'CaseReadyToShip',
  detail: {
    caseId: 'TEST-001',
    clinicId: 'CLI-TEST',
    labId: 'LAB-TEST',
    patientName: 'Test Patient',
    requestedDeliveryDate: '2025-02-01',
    priority: 'STANDARD',
    packageSpecs: { weight: 1.0, fragile: false }
  }
};

const result = await routeEvent(productionEvent);
console.log('Delivery created:', result);

// Test PickupRequested
const crmEvent = {
  source: 'crm.portal',
  detailType: 'PickupRequested',
  detail: {
    pickupId: 'PICKUP-TEST-001',
    clinicId: 'CLI-TEST',
    labId: 'LAB-TEST',
    requestedBy: { userId: 'USER-001', name: 'Test User', phone: '555-0000' },
    requestTime: new Date().toISOString(),
    windowStart: '2025-02-01T09:00:00Z',
    windowEnd: '2025-02-01T11:00:00Z',
    packageCount: 2,
    isRush: false
  }
};

const pickupResult = await routeEvent(crmEvent);
console.log('Pickup created:', pickupResult);
```

### Test Webhook Handlers

```javascript
import { handleDentrixWebhook, verifyHMACSignature } from '@/services/webhooks/ehrWebhooks';

// Test HMAC verification
const payload = { test: 'data' };
const secret = 'test-secret';
const signature = await crypto.subtle.sign(/* ... */); // Generate valid signature

const isValid = await verifyHMACSignature(payload, signature, secret);
console.log('Signature valid:', isValid);

// Test webhook handler
const mockRequest = {
  headers: { 'x-dentrix-signature': signature },
  body: {
    externalId: 'TEST-DX-001',
    practiceId: 'CLI-TEST',
    patientName: 'Test Patient',
    preferredPickupTime: '2025-02-01T14:00:00Z',
    priority: 0
  }
};

const response = await handleDentrixWebhook(mockRequest);
console.log('Webhook response:', response);
```

### Test Driver Tracking

```javascript
import { handleDriverLocationUpdate, isWithinGeofence } from '@/utils/tracking/driverTracking';

// Test location update
const locationUpdate = {
  driverId: 'TEST-DRV-001',
  routeId: 'TEST-ROUTE-001',
  coordinates: { lat: 42.3601, lng: -71.0589 },
  timestamp: new Date().toISOString(),
  speed: 40
};

const tracking = await handleDriverLocationUpdate(locationUpdate);
console.log('Tracking update:', tracking);

// Test geofence
const driverLoc = { lat: 42.3601, lng: -71.0589 };
const stopLoc = { lat: 42.3605, lng: -71.0592 };

const withinFence = isWithinGeofence(driverLoc, stopLoc, 100);
console.log('Within geofence:', withinFence);
```

---

## 🔐 Security Considerations

### HMAC Signature Verification
- Uses HMAC-SHA256 for webhook authentication
- Timing-safe comparison prevents timing attacks
- Secrets configured via environment variables

### Data Sanitization
- PII masking for logging (emails, phone numbers)
- Sensitive fields removed from event payloads
- Input validation on all external data

### Rate Limiting
- Configurable rate limits per endpoint
- Prevents abuse and DDoS attacks
- Automatic reset after time window

---

## 📊 Monitoring & Metrics

### Event Processing Metrics
```javascript
import { getIntegrationMetrics } from '@/utils/integration/integrationUtils';

const metrics = getIntegrationMetrics();
// totalEvents, totalErrors, errorRate, avgLatencyMs, eventCounts, errorCounts
```

### Health Checks
```javascript
import { getWebhookHealth } from '@/services/webhooks/ehrWebhooks';

const health = getWebhookHealth();
// status, supportedSystems, endpoints, requiredHeaders
```

---

## ✅ Validation Checklist

- [x] Event consumers handle Production, Finance, CRM events
- [x] Webhook handlers for Dentrix, OpenDental, Eaglesoft
- [x] HMAC signature verification implemented
- [x] Data mappers transform external → internal formats
- [x] Driver tracking with real-time ETA calculation
- [x] Geofence detection for arrival notifications
- [x] Error handling with exponential backoff retry
- [x] Integration metrics and monitoring
- [x] Rate limiting for webhook endpoints
- [x] Data validation and sanitization
- [x] Zero compilation errors
- [x] Comprehensive documentation

---

## 🚀 Next Steps

1. **Backend Deployment**: Deploy Lambda functions for webhook endpoints
2. **AWS EventBridge**: Configure event bus for cross-domain communication
3. **Monitoring**: Set up CloudWatch dashboards for integration metrics
4. **Testing**: Create integration test suite with mock EHR data
5. **Security**: Rotate HMAC secrets and implement AWS Secrets Manager
6. **Documentation**: Create API documentation for webhook endpoints

---

**Section 6 Status**: ✅ COMPLETE  
**Files**: 5  
**Lines of Code**: ~1,950  
**Compilation**: ✅ No errors
