/**
 * Chain of Custody Tracking
 * Section 7.1: HIPAA Requirements
 *
 * Implements physical asset tracking with geolocation validation
 * and verifiable handoff records for dental cases.
 *
 * HIPAA Requirements:
 * - All case movements logged with timestamps and geolocation
 * - Chain of custody verifiable from lab → clinic → patient
 * - Signatures required for all handoffs
 */

import { encode as geohashEncode } from "../logistics/geohash.js";
import { calculateDistance } from "../logistics/distanceCalculator.js";

/**
 * Custody Event Types
 */
export const CustodyEventType = {
  LAB_DEPARTURE: "LabDeparture",
  IN_TRANSIT: "InTransit",
  CLINIC_ARRIVAL: "ClinicArrival",
  PATIENT_HANDOFF: "PatientHandoff",
  EXCEPTION: "Exception",
};

/**
 * Verification Methods
 */
export const VerificationMethod = {
  QR_SCAN: "QR_SCAN",
  SIGNATURE: "SIGNATURE",
  BARCODE: "BARCODE",
  PHOTO: "PHOTO",
  BIOMETRIC: "BIOMETRIC",
};

/**
 * Creates a new chain of custody record
 * @param {string} caseId - Case identifier
 * @param {Object} initialData - Initial custody data
 * @returns {Object} Chain of custody record
 */
export const createCustodyRecord = (caseId, initialData = {}) => {
  return {
    caseId: caseId,
    events: [],
    status: "Pending",
    currentHolder: null,
    createdAt: new Date().toISOString(),
    metadata: {
      labId: initialData.labId,
      clinicId: initialData.clinicId,
      patientId: initialData.patientId,
      ...initialData.metadata,
    },
  };
};

/**
 * Records a custody event
 * @param {string} caseId - Case identifier
 * @param {Object} eventData - Event details
 * @returns {Object} Custody event record
 */
export const recordCustodyEvent = async (caseId, eventData) => {
  const { type, actor, location, verification, notes, metadata } = eventData;

  // Validate required fields
  if (!caseId || !type || !actor || !location) {
    throw new Error("Missing required custody event fields");
  }

  // Generate geohash from coordinates
  const geoHash = location.coordinates
    ? geohashEncode(location.coordinates.lat, location.coordinates.lng)
    : null;

  const custodyEvent = {
    id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    caseId: caseId,
    type: type,
    timestamp: new Date().toISOString(),
    actor: {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      ...actor,
    },
    location: {
      geoHash: geoHash,
      address: location.address,
      coordinates: location.coordinates,
      ...location,
    },
    verification: verification
      ? {
          method: verification.method,
          proofUrl: verification.proofUrl,
          verificationCode: verification.verificationCode,
          timestamp: verification.timestamp || new Date().toISOString(),
          ...verification,
        }
      : null,
    notes: notes || "",
    metadata: metadata || {},
  };

  // Store event (in production, this would go to database/API)
  await storeCustodyEvent(custodyEvent);

  return custodyEvent;
};

/**
 * Validates delivery location against expected clinic location
 * @param {string} deliveryGeoHash - Geohash of delivery location
 * @param {string} clinicGeoHash - Geohash of clinic location
 * @param {number} toleranceMeters - Acceptable distance tolerance (default 100m)
 * @returns {Object} Validation result
 */
export const validateDeliveryLocation = (
  deliveryGeoHash,
  clinicGeoHash,
  toleranceMeters = 100
) => {
  if (!deliveryGeoHash || !clinicGeoHash) {
    return {
      valid: false,
      error: "Missing geohash data",
      distance: null,
    };
  }

  try {
    const distance = geohashDistance(deliveryGeoHash, clinicGeoHash);
    const distanceMeters = distance * 1000; // Convert km to meters

    const valid = distanceMeters <= toleranceMeters;

    return {
      valid: valid,
      distance: distanceMeters,
      tolerance: toleranceMeters,
      error: valid ? null : "Delivery location does not match clinic address",
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
      distance: null,
    };
  }
};

/**
 * Calculates distance between two geohashes
 * @param {string} hash1 - First geohash
 * @param {string} hash2 - Second geohash
 * @returns {number} Distance in kilometers
 */
const geohashDistance = (hash1, hash2) => {
  // Decode geohashes to coordinates
  const coords1 = geohashDecode(hash1);
  const coords2 = geohashDecode(hash2);

  // Calculate Haversine distance
  return calculateDistance(
    coords1.latitude,
    coords1.longitude,
    coords2.latitude,
    coords2.longitude
  );
};

/**
 * Decodes a geohash to coordinates
 * Basic implementation - in production use ngeohash library
 * @param {string} geohash - Geohash string
 * @returns {Object} Coordinates {latitude, longitude}
 */
const geohashDecode = (geohash) => {
  // Simplified decoder - use ngeohash.decode() in production
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let evenBit = true;
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const char = geohash[i];
    const value = BASE32.indexOf(char);

    for (let j = 4; j >= 0; j--) {
      const bit = (value >> j) & 1;

      if (evenBit) {
        // longitude
        const lonMid = (lonMin + lonMax) / 2;
        if (bit === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        // latitude
        const latMid = (latMin + latMax) / 2;
        if (bit === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }

  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
  };
};

/**
 * Verifies chain of custody completeness
 * @param {Array<Object>} events - Custody events
 * @returns {Object} Verification result
 */
export const verifyCustodyChain = (events) => {
  if (!events || events.length === 0) {
    return {
      complete: false,
      missing: ["No custody events recorded"],
      errors: [],
    };
  }

  const missing = [];
  const errors = [];

  // Check for required event sequence
  const hasLabDeparture = events.some(
    (e) => e.type === CustodyEventType.LAB_DEPARTURE
  );
  const hasClinicArrival = events.some(
    (e) => e.type === CustodyEventType.CLINIC_ARRIVAL
  );

  if (!hasLabDeparture) {
    missing.push("Lab departure event");
  }

  if (!hasClinicArrival) {
    missing.push("Clinic arrival event");
  }

  // Verify chronological order
  for (let i = 1; i < events.length; i++) {
    const prevTime = new Date(events[i - 1].timestamp);
    const currTime = new Date(events[i].timestamp);

    if (currTime < prevTime) {
      errors.push(`Event ${i} timestamp before previous event`);
    }
  }

  // Verify all events have verification
  events.forEach((event, index) => {
    if (!event.verification || !event.verification.method) {
      errors.push(`Event ${index} missing verification`);
    }
  });

  return {
    complete: missing.length === 0 && errors.length === 0,
    missing: missing,
    errors: errors,
    eventCount: events.length,
  };
};

/**
 * Generates verification code for custody handoff
 * @param {string} caseId - Case identifier
 * @param {string} timestamp - Event timestamp
 * @returns {string} 6-digit verification code
 */
export const generateVerificationCode = (caseId, timestamp) => {
  const input = `${caseId}-${timestamp}`;
  let hash = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate 6-digit code
  const code = Math.abs(hash % 1000000)
    .toString()
    .padStart(6, "0");
  return code;
};

/**
 * Validates verification code
 * @param {string} caseId - Case identifier
 * @param {string} timestamp - Event timestamp
 * @param {string} code - Verification code to validate
 * @returns {boolean} True if code is valid
 */
export const validateVerificationCode = (caseId, timestamp, code) => {
  const expectedCode = generateVerificationCode(caseId, timestamp);
  return code === expectedCode;
};

/**
 * Gets custody history for a case
 * @param {string} caseId - Case identifier
 * @returns {Promise<Array>} Custody events
 */
export const getCustodyHistory = async (caseId) => {
  // In production, query from database/API
  console.log("[MOCK] Fetching custody history for case:", caseId);

  // Mock implementation
  return [];
};

/**
 * Gets current custody holder
 * @param {string} caseId - Case identifier
 * @returns {Promise<Object>} Current holder information
 */
export const getCurrentHolder = async (caseId) => {
  const events = await getCustodyHistory(caseId);

  if (events.length === 0) {
    return null;
  }

  // Get most recent event
  const latestEvent = events[events.length - 1];

  return {
    actorId: latestEvent.actor.id,
    actorName: latestEvent.actor.name,
    actorRole: latestEvent.actor.role,
    since: latestEvent.timestamp,
    location: latestEvent.location,
  };
};

/**
 * Stores custody event
 * Mock implementation - replace with actual API call
 * @param {Object} event - Custody event
 * @returns {Promise<Object>} Stored event
 */
const storeCustodyEvent = async (event) => {
  // TODO: Replace with actual API call to AWS Lambda/DynamoDB
  console.log("[MOCK] Storing custody event:", event);

  return event;
};

/**
 * Records lab departure event
 * @param {string} caseId - Case identifier
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Custody event
 */
export const recordLabDeparture = async (caseId, data) => {
  return await recordCustodyEvent(caseId, {
    type: CustodyEventType.LAB_DEPARTURE,
    actor: data.actor,
    location: data.location,
    verification: data.verification,
    notes: data.notes,
    metadata: {
      routeId: data.routeId,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      ...data.metadata,
    },
  });
};

/**
 * Records in-transit update
 * @param {string} caseId - Case identifier
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Custody event
 */
export const recordInTransit = async (caseId, data) => {
  return await recordCustodyEvent(caseId, {
    type: CustodyEventType.IN_TRANSIT,
    actor: data.actor,
    location: data.location,
    verification: data.verification,
    notes: data.notes,
    metadata: {
      routeId: data.routeId,
      estimatedArrival: data.estimatedArrival,
      ...data.metadata,
    },
  });
};

/**
 * Records clinic arrival event
 * @param {string} caseId - Case identifier
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Custody event
 */
export const recordClinicArrival = async (caseId, data) => {
  // Validate delivery location
  const locationValidation = validateDeliveryLocation(
    data.location.geoHash,
    data.expectedClinicGeoHash,
    100 // 100 meters tolerance
  );

  if (!locationValidation.valid) {
    console.warn(
      "Delivery location validation failed:",
      locationValidation.error
    );
  }

  return await recordCustodyEvent(caseId, {
    type: CustodyEventType.CLINIC_ARRIVAL,
    actor: data.actor,
    location: data.location,
    verification: data.verification,
    notes: data.notes,
    metadata: {
      routeId: data.routeId,
      receivedBy: data.receivedBy,
      locationValidation: locationValidation,
      ...data.metadata,
    },
  });
};

/**
 * Records patient handoff event
 * @param {string} caseId - Case identifier
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Custody event
 */
export const recordPatientHandoff = async (caseId, data) => {
  return await recordCustodyEvent(caseId, {
    type: CustodyEventType.PATIENT_HANDOFF,
    actor: data.actor,
    location: data.location,
    verification: data.verification,
    notes: data.notes,
    metadata: {
      patientId: data.patientId,
      patientName: data.patientName,
      ...data.metadata,
    },
  });
};

/**
 * Records custody exception/incident
 * @param {string} caseId - Case identifier
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Custody event
 */
export const recordCustodyException = async (caseId, data) => {
  return await recordCustodyEvent(caseId, {
    type: CustodyEventType.EXCEPTION,
    actor: data.actor,
    location: data.location,
    verification: data.verification,
    notes: data.notes,
    metadata: {
      exceptionType: data.exceptionType,
      severity: data.severity,
      resolution: data.resolution,
      ...data.metadata,
    },
  });
};

export default {
  CustodyEventType,
  VerificationMethod,
  createCustodyRecord,
  recordCustodyEvent,
  validateDeliveryLocation,
  verifyCustodyChain,
  generateVerificationCode,
  validateVerificationCode,
  getCustodyHistory,
  getCurrentHolder,
  recordLabDeparture,
  recordInTransit,
  recordClinicArrival,
  recordPatientHandoff,
  recordCustodyException,
};
