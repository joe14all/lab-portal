/**
 * Logistics Utilities Barrel Export
 * 
 * Centralized export for all logistics utility functions
 */

// Time Window Validation
export {
  validateTimeWindow,
  doTimeWindowsOverlap,
  getAvailableTimeWindows,
  isWithinOperatingHours,
  getTimeWindowDuration,
  isTimeWindowExpired,
  getNextAvailableWindow,
  type ValidationResult,
} from './timeWindowValidator';

// Distance & ETA Calculation
export {
  calculateDistance,
  estimateETA,
  calculateRouteDistance,
  estimateRouteDuration,
  isWithinRadius,
  findNearest,
  sortByDistance,
  calculateCentroid,
  areCoordinatesValid,
  formatDistance,
  formatDuration,
} from './distanceCalculator';

// Route Optimization
export {
  nearestNeighborOptimization,
  timeWindowOptimization,
  calculateRouteMetrics,
  resequenceStops,
  validateStopSequence,
  optimizeRoute,
  insertStop,
  removeStop,
  type OptimizationInput,
  type OptimizedStop,
} from './routeOptimizer';

// Geohash
export {
  encodeGeohash,
  decodeGeohash,
  getNeighbors,
  getGeohashBounds,
  getPrecisionForError,
  isValidGeohash,
  encodeLocation,
  decodeLocation,
} from './geohash';

// Provider Integration (already exists)
export * from './providerIntegration';

// Validation (already exists)
export * from './validation';
