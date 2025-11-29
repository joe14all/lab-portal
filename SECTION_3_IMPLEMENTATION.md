# Section 3 Implementation: Core Logistics Architecture

## Overview

This document describes the implementation of **Section 3: Core Logistics Architecture** from `LOGISTICS_DOMAIN_ANALYSIS.MD`. Section 3 defines the helper utilities and algorithms required for the logistics domain.

---

## Implementation Summary

### **Files Created**

1. **`/src/utils/logistics/timeWindowValidator.ts`** (240 lines)
   - Time window validation against operating hours
   - Available time window generation
   - Expired window detection
   - Next available window finder

2. **`/src/utils/logistics/distanceCalculator.ts`** (220 lines)
   - Haversine distance calculation
   - ETA estimation
   - Route distance and duration calculation
   - Nearest location finder
   - Distance sorting and formatting

3. **`/src/utils/logistics/routeOptimizer.ts`** (320 lines)
   - Nearest Neighbor optimization algorithm
   - Time window-based optimization
   - Route metrics calculation
   - Stop sequence validation
   - Dynamic stop insertion/removal

4. **`/src/utils/logistics/geohash.ts`** (348 lines)
   - Geohash encoding/decoding
   - Neighbor cell calculation
   - Bounding box extraction
   - Precision level calculator
   - Validation utilities

5. **`/src/utils/logistics/index.ts`** (50 lines)
   - Barrel export for all logistics utilities
   - Centralized import point

**Total Lines of Code**: ~1,178 lines

---

## Utility Functions Implemented

### **1. Time Window Validation (Section 3.4.1)**

#### Key Functions:

```typescript
// Validate time window against operating hours
validateTimeWindow(
  windowStart: string,
  windowEnd: string,
  operatingHours: OperatingHours
): ValidationResult

// Check if two time windows overlap
doTimeWindowsOverlap(
  window1: TimeWindow,
  window2: TimeWindow
): boolean

// Get all available time windows for a date
getAvailableTimeWindows(
  date: Date,
  operatingHours: OperatingHours,
  windowDurationMin?: number
): TimeWindow[]

// Check if timestamp is within operating hours
isWithinOperatingHours(
  timestamp: string,
  operatingHours: OperatingHours
): boolean

// Get next available time window
getNextAvailableWindow(
  operatingHours: OperatingHours,
  windowDurationMin?: number,
  daysAhead?: number
): TimeWindow | null
```

#### Use Cases:
- **Pickup Request Validation**: Ensure requested pickup time falls within clinic hours
- **Scheduling**: Generate available time slots for clinic selection
- **Conflict Detection**: Prevent overlapping appointments
- **Auto-Rescheduling**: Find next available window when clinic is closed

---

### **2. Distance & ETA Calculation (Section 3.4.3)**

#### Key Functions:

```typescript
// Calculate distance using Haversine formula
calculateDistance(
  from: Coordinates,
  to: Coordinates
): number // kilometers

// Estimate arrival time
estimateETA(
  currentLocation: Coordinates,
  destination: Coordinates,
  avgSpeedKph?: number,
  trafficFactor?: number
): string // ISO8601

// Calculate total route distance
calculateRouteDistance(
  stops: Coordinates[],
  includeReturnToStart?: boolean
): number // kilometers

// Estimate route duration
estimateRouteDuration(
  stops: Coordinates[],
  avgSpeedKph?: number,
  stopDurationMin?: number,
  trafficFactor?: number
): number // minutes

// Find nearest location
findNearest<T extends { coordinates: Coordinates }>(
  from: Coordinates,
  candidates: T[]
): { item: T; distance: number } | null

// Sort locations by distance
sortByDistance<T extends { coordinates: Coordinates }>(
  from: Coordinates,
  locations: T[]
): Array<T & { distance: number }>

// Calculate center point (centroid)
calculateCentroid(
  locations: Coordinates[]
): Coordinates
```

#### Use Cases:
- **Driver Assignment**: Find nearest available driver
- **Route Planning**: Calculate total route distance and duration
- **ETA Notifications**: Inform clinics when driver will arrive
- **Proximity Searches**: Find nearby clinics for deliveries
- **Performance Metrics**: Track actual vs. estimated times

---

### **3. Route Optimization (Section 3.4.2)**

#### Key Functions:

```typescript
// Optimize using Nearest Neighbor (O(n²))
nearestNeighborOptimization(
  stops: RouteStop[],
  startLocation: Coordinates
): OptimizedStop[]

// Optimize considering time windows
timeWindowOptimization(
  stops: RouteStop[],
  startLocation: Coordinates,
  currentTime?: Date
): OptimizedStop[]

// Calculate route metrics
calculateRouteMetrics(
  optimizedStops: OptimizedStop[]
): {
  totalDistanceKm: number;
  estimatedDurationMin: number;
  stopsTotal: number;
}

// Validate stop sequence
validateStopSequence(
  stops: RouteStop[]
): { valid: boolean; errors: string[] }

// Insert new stop optimally
insertStop(
  existingStops: OptimizedStop[],
  newStop: RouteStop,
  startLocation: Coordinates
): OptimizedStop[]

// Remove stop from route
removeStop(
  stops: OptimizedStop[],
  stopId: string
): OptimizedStop[]

// Re-sequence stops
resequenceStops<T extends RouteStop>(
  stops: T[]
): T[]
```

#### Algorithms Implemented:

**Nearest Neighbor (Greedy)**
- Time Complexity: O(n²)
- Space Complexity: O(n)
- Approach: Always visit nearest unvisited stop
- Use Case: Quick optimization for daily routes (<20 stops)

**Time Window Priority**
- Groups stops by time buckets (morning/afternoon/evening)
- Within each bucket, applies Nearest Neighbor
- Ensures urgent deliveries are prioritized
- Use Case: Routes with strict delivery deadlines

#### Use Cases:
- **Route Planning**: Automatically optimize stop order
- **Manual Adjustments**: Re-optimize after dispatcher changes
- **Dynamic Updates**: Insert new pickup requests into active routes
- **Performance Analysis**: Compare actual route vs. optimized route

---

### **4. Geohash Utilities (Section 3.4.4)**

#### Key Functions:

```typescript
// Encode coordinates to geohash
encodeGeohash(
  lat: number,
  lng: number,
  precision?: number
): string

// Decode geohash to coordinates
decodeGeohash(
  geohash: string
): Coordinates

// Get 8 neighboring cells
getNeighbors(
  geohash: string
): string[]

// Get bounding box
getGeohashBounds(
  geohash: string
): { minLat, maxLat, minLng, maxLng }

// Calculate precision for error
getPrecisionForError(
  errorMeters: number
): number

// Validate geohash
isValidGeohash(
  geohash: string
): boolean
```

#### Precision Levels:

| Length | Cell Width | Cell Height | Use Case |
|--------|-----------|-------------|----------|
| 1 | ±2500 km | ±2500 km | Country-level |
| 3 | ±78 km | ±78 km | City-level |
| 5 | ±2.4 km | ±2.4 km | Neighborhood |
| 6 | ±610 m | ±610 m | Street block |
| 7 | ±76 m | ±76 m | Building |
| 9 | ±4.77 m | ±4.77 m | Room-level (default) |

#### Use Cases:
- **Proof of Service**: Verify driver was at clinic location (±5m precision)
- **Proximity Queries**: Find stops near driver (efficient spatial indexing)
- **Location Clustering**: Group nearby clinics on map
- **Database Indexing**: Use geohash as partition key in DynamoDB

---

## Integration with Existing Codebase

### **LogisticsContext Enhancement Opportunities**

The utilities can be integrated into existing components:

#### **RoutePlanner.jsx**
```javascript
import { optimizeRoute, calculateRouteMetrics } from '@/utils/logistics';

const handleOptimizeRoute = async (routeId) => {
  const route = routes.find(r => r.id === routeId);
  const result = await optimizeRoute({
    stops: route.stops,
    startLocation: labLocation,
    algorithm: 'NEAREST_NEIGHBOR'
  });
  
  // Update route with optimized stops
  await updateRoute(routeId, {
    stops: result.stops,
    metrics: result.metrics
  });
};
```

#### **DriverManifest.jsx**
```javascript
import { calculateDistance, estimateETA } from '@/utils/logistics';

const nextStop = route.stops.find(s => s.status === 'Pending');
const eta = estimateETA(
  currentDriverLocation,
  nextStop.coordinates,
  40, // avg speed
  1.2  // traffic factor
);

// Display: "ETA: 15 minutes"
```

#### **PickupFormModal.jsx**
```javascript
import { validateTimeWindow, getAvailableTimeWindows } from '@/utils/logistics';

const availableSlots = getAvailableTimeWindows(
  selectedDate,
  clinic.operatingHours,
  120 // 2-hour windows
);

// Show dropdown with available time slots
```

---

## Performance Characteristics

### **Time Complexity**

| Function | Complexity | Notes |
|----------|-----------|-------|
| `calculateDistance` | O(1) | Mathematical formula |
| `nearestNeighborOptimization` | O(n²) | n = number of stops |
| `timeWindowOptimization` | O(n² log n) | Includes sorting |
| `encodeGeohash` | O(p) | p = precision length |
| `getNeighbors` | O(1) | Fixed 8 neighbors |
| `validateTimeWindow` | O(h) | h = operating hour ranges |

### **Space Complexity**

All functions use O(n) space where n is the input size. No exponential memory growth.

### **Scalability Considerations**

- **Routes with 50+ stops**: Consider using AWS Location Service API instead of Nearest Neighbor
- **Real-time updates**: Use geohash indexing for fast proximity queries
- **Large datasets**: Implement pagination for `getAvailableTimeWindows`

---

## Testing Recommendations

### **Unit Tests**

```javascript
// timeWindowValidator.test.ts
describe('validateTimeWindow', () => {
  it('should accept window within operating hours', () => {
    const result = validateTimeWindow(
      '2025-11-29T09:00:00Z',
      '2025-11-29T11:00:00Z',
      {
        timezone: 'America/Los_Angeles',
        schedule: { Fri: ['08:00-17:00'] }
      }
    );
    expect(result.valid).toBe(true);
  });

  it('should reject window outside operating hours', () => {
    const result = validateTimeWindow(
      '2025-11-29T18:00:00Z', // After close
      '2025-11-29T20:00:00Z',
      {
        timezone: 'America/Los_Angeles',
        schedule: { Fri: ['08:00-17:00'] }
      }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('outside operating hours');
  });
});

// distanceCalculator.test.ts
describe('calculateDistance', () => {
  it('should calculate NYC to LA distance correctly', () => {
    const nyc = { lat: 40.7128, lng: -74.0060 };
    const la = { lat: 34.0522, lng: -118.2437 };
    const distance = calculateDistance(nyc, la);
    expect(distance).toBeCloseTo(3944, 0); // ~3944 km
  });
});

// routeOptimizer.test.ts
describe('nearestNeighborOptimization', () => {
  it('should optimize 3-stop route correctly', () => {
    const stops = [
      { id: '1', coordinates: { lat: 40.75, lng: -73.99 } },
      { id: '2', coordinates: { lat: 40.76, lng: -74.00 } },
      { id: '3', coordinates: { lat: 40.74, lng: -73.98 } }
    ];
    const start = { lat: 40.73, lng: -73.97 };
    
    const optimized = nearestNeighborOptimization(stops, start);
    expect(optimized).toHaveLength(3);
    expect(optimized[0].sequence).toBe(1);
  });
});
```

---

## Future Enhancements

### **AWS Integration (Production)**

Replace local algorithms with cloud services:

```javascript
// Use AWS Location Service for production routes
import { LocationClient, CalculateRouteCommand } from '@aws-sdk/client-location';

export async function optimizeRouteAWS(stops) {
  const client = new LocationClient({ region: 'us-west-2' });
  
  const command = new CalculateRouteCommand({
    CalculatorName: 'LabPortalRouteCalculator',
    DeparturePosition: [startLng, startLat],
    DestinationPosition: [endLng, endLat],
    WaypointPositions: stops.map(s => [s.lng, s.lat]),
    OptimizeWaypointOrder: true,
    TravelMode: 'Car'
  });
  
  const response = await client.send(command);
  return response.Legs.map((leg, i) => ({
    ...stops[leg.WaypointIndex],
    sequence: i + 1,
    legDistanceKm: leg.Distance / 1000
  }));
}
```

### **Machine Learning**

Train models on historical route data:
- **ETA Prediction**: Account for traffic patterns, time of day
- **Route Optimization**: Learn from driver feedback on actual routes
- **Stop Duration**: Predict service time based on package count, clinic type

---

## Validation Checklist

### ✅ **Time Window Validation**
- [x] `validateTimeWindow()` - Checks against operating hours
- [x] `doTimeWindowsOverlap()` - Conflict detection
- [x] `getAvailableTimeWindows()` - Generates time slots
- [x] `isWithinOperatingHours()` - Single timestamp check
- [x] `getNextAvailableWindow()` - Auto-reschedule helper
- [x] Handles edge cases (closed days, multi-range hours)
- [x] Timezone-aware (through Date API)

### ✅ **Distance & ETA Calculation**
- [x] `calculateDistance()` - Haversine formula (±0.5% accuracy)
- [x] `estimateETA()` - Traffic-adjusted arrival time
- [x] `calculateRouteDistance()` - Multi-stop total
- [x] `estimateRouteDuration()` - Includes stop time
- [x] `findNearest()` - Proximity search
- [x] `sortByDistance()` - Ordered results
- [x] `calculateCentroid()` - Center point
- [x] `formatDistance()` / `formatDuration()` - Display formatting

### ✅ **Route Optimization**
- [x] `nearestNeighborOptimization()` - O(n²) greedy algorithm
- [x] `timeWindowOptimization()` - Priority-based optimization
- [x] `calculateRouteMetrics()` - Distance/duration aggregation
- [x] `validateStopSequence()` - Gap/duplicate detection
- [x] `insertStop()` - Minimal distance insertion
- [x] `removeStop()` - Sequence preservation
- [x] `resequenceStops()` - Manual reordering
- [x] Type-safe `OptimizedStop` interface

### ✅ **Geohash Utilities**
- [x] `encodeGeohash()` - Lat/lng to geohash
- [x] `decodeGeohash()` - Geohash to lat/lng
- [x] `getNeighbors()` - 8 adjacent cells
- [x] `getGeohashBounds()` - Bounding box extraction
- [x] `getPrecisionForError()` - Precision calculator
- [x] `isValidGeohash()` - Input validation
- [x] Supports precision levels 1-10
- [x] Handles edge cases (poles, anti-meridian)

### ✅ **Code Quality**
- [x] Zero TypeScript compilation errors
- [x] No ESLint warnings
- [x] JSDoc comments on all public functions
- [x] Type-safe implementations
- [x] Follows existing codebase patterns
- [x] Barrel export for clean imports

### ✅ **Integration Readiness**
- [x] Compatible with existing types (`RouteStop`, `Coordinates`, etc.)
- [x] Can be imported via `@/utils/logistics`
- [x] Ready for use in `RoutePlanner`, `DriverManifest`, `PickupFormModal`
- [x] No breaking changes to existing code
- [x] Performance optimized for <50 stop routes

---

## File Locations

```
src/
└── utils/
    └── logistics/
        ├── timeWindowValidator.ts     ✅ 240 lines
        ├── distanceCalculator.ts      ✅ 220 lines
        ├── routeOptimizer.ts          ✅ 320 lines
        ├── geohash.ts                 ✅ 348 lines
        ├── index.ts                   ✅ 50 lines (barrel export)
        ├── providerIntegration.js     (pre-existing)
        └── validation.ts              (pre-existing)
```

---

## Usage Examples

### **Example 1: Validate Pickup Time Window**

```javascript
import { validateTimeWindow } from '@/utils/logistics';

const clinic = {
  operatingHours: {
    timezone: 'America/New_York',
    schedule: {
      Mon: ['08:00-12:00', '13:00-17:00'],
      Tue: ['08:00-12:00', '13:00-17:00'],
      Wed: ['08:00-12:00'],
      Thu: ['08:00-12:00', '13:00-17:00'],
      Fri: ['08:00-12:00', '13:00-17:00']
    }
  }
};

const result = validateTimeWindow(
  '2025-11-29T14:00:00Z', // 2 PM
  '2025-11-29T16:00:00Z', // 4 PM
  clinic.operatingHours
);

if (!result.valid) {
  console.error(result.reason);
  console.log('Suggested slot:', result.suggestion);
}
```

### **Example 2: Optimize Route**

```javascript
import { optimizeRoute } from '@/utils/logistics';

const labLocation = { lat: 40.7589, lng: -73.9851 }; // Times Square

const stops = [
  { id: 'stop-1', clinicId: 'clinic-A', coordinates: { lat: 40.76, lng: -73.99 } },
  { id: 'stop-2', clinicId: 'clinic-B', coordinates: { lat: 40.75, lng: -74.00 } },
  { id: 'stop-3', clinicId: 'clinic-C', coordinates: { lat: 40.74, lng: -73.98 } }
];

const result = await optimizeRoute({
  stops,
  startLocation: labLocation,
  algorithm: 'NEAREST_NEIGHBOR'
});

console.log(`Total distance: ${result.metrics.totalDistanceKm} km`);
console.log(`Estimated duration: ${result.metrics.estimatedDurationMin} min`);
console.log('Optimized order:', result.stops.map(s => s.clinicId));
```

### **Example 3: Calculate ETA**

```javascript
import { estimateETA, formatDuration } from '@/utils/logistics';

const driverLocation = { lat: 40.7589, lng: -73.9851 };
const nextStop = { lat: 40.7614, lng: -73.9776 };

const eta = estimateETA(driverLocation, nextStop);
const etaDate = new Date(eta);
const minutesAway = (etaDate - new Date()) / (1000 * 60);

console.log(`ETA: ${formatDuration(minutesAway)}`); // "8m"
```

### **Example 4: Geohash Proof of Service**

```javascript
import { encodeGeohash, calculateDistance } from '@/utils/logistics';

// Driver claims to be at clinic
const driverLocation = { lat: 40.7614, lng: -73.9776 };
const clinicLocation = { lat: 40.7615, lng: -73.9777 };

const driverGeohash = encodeGeohash(driverLocation.lat, driverLocation.lng, 9);
const clinicGeohash = encodeGeohash(clinicLocation.lat, clinicLocation.lng, 9);

// If geohashes match (9-char precision ≈ ±5m), driver is at location
if (driverGeohash === clinicGeohash) {
  console.log('Driver verified at clinic');
} else {
  const distance = calculateDistance(driverLocation, clinicLocation);
  console.log(`Driver is ${distance * 1000}m away`);
}
```

---

**Implementation Date**: November 29, 2025  
**Status**: ✅ **COMPLETE**  
**Section**: 3 (Core Logistics Architecture - Helper Utilities)
