/**
 * Geohashing Utilities for Proximity Queries
 *
 * Implements geohash encoding/decoding for efficient location-based queries.
 * Provides proximity search capabilities without expensive latitude/longitude calculations.
 *
 * Based on Section 8.1 of LOGISTICS_DOMAIN_ANALYSIS.md
 *
 * @module utils/performance/geohash
 */

// Base32 character set for geohash encoding
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Precision levels and their approximate accuracy
export const GeohashPrecision = {
  PRECISION_1: 1, // ±2500 km
  PRECISION_2: 2, // ±630 km
  PRECISION_3: 3, // ±78 km
  PRECISION_4: 4, // ±20 km
  PRECISION_5: 5, // ±2.4 km
  PRECISION_6: 6, // ±610 m (recommended for city-level)
  PRECISION_7: 7, // ±76 m
  PRECISION_8: 8, // ±19 m (recommended for delivery validation)
  PRECISION_9: 9, // ±2.4 m
  PRECISION_10: 10, // ±60 cm
};

/**
 * Encodes latitude and longitude into a geohash string
 *
 * @param {number} latitude - Latitude coordinate (-90 to 90)
 * @param {number} longitude - Longitude coordinate (-180 to 180)
 * @param {number} precision - Geohash precision level (1-10), defaults to 8
 * @returns {string} Geohash string
 *
 * @example
 * const hash = encodeLocation(40.7128, -74.0060, 8);
 * console.log(hash); // "dr5regw"
 */
export const encodeLocation = (
  latitude,
  longitude,
  precision = GeohashPrecision.PRECISION_8
) => {
  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      // longitude
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude > lonMid) {
        idx = (idx << 1) + 1;
        lonMin = lonMid;
      } else {
        idx = idx << 1;
        lonMax = lonMid;
      }
    } else {
      // latitude
      const latMid = (latMin + latMax) / 2;
      if (latitude > latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = idx << 1;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
};

/**
 * Decodes a geohash string to latitude and longitude coordinates
 *
 * @param {string} geohash - Geohash string to decode
 * @returns {{latitude: number, longitude: number, error: {latitude: number, longitude: number}}}
 *
 * @example
 * const coords = decodeLocation('dr5regw');
 * console.log(coords.latitude, coords.longitude); // 40.7128, -74.0060
 */
export const decodeLocation = (geohash) => {
  if (!geohash || typeof geohash !== "string") {
    throw new Error("Geohash must be a non-empty string");
  }

  let evenBit = true;
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const char = geohash[i];
    const idx = BASE32.indexOf(char);

    if (idx === -1) {
      throw new Error(`Invalid geohash character: ${char}`);
    }

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;

      if (evenBit) {
        // longitude
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        // latitude
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }

      evenBit = !evenBit;
    }
  }

  const latitude = (latMin + latMax) / 2;
  const longitude = (lonMin + lonMax) / 2;

  return {
    latitude,
    longitude,
    error: {
      latitude: latMax - latitude,
      longitude: lonMax - longitude,
    },
  };
};

/**
 * Gets all 8 neighboring geohashes for a given hash
 *
 * @param {string} geohash - Center geohash
 * @returns {string[]} Array of 8 neighbor hashes [N, NE, E, SE, S, SW, W, NW]
 *
 * @example
 * const neighbors = getNeighbors('dr5regw');
 * console.log(neighbors); // ['dr5regx', 'dr5regy', ...]
 */
export const getNeighbors = (geohash) => {
  if (!geohash) {
    throw new Error("Geohash is required");
  }

  const { latitude, longitude } = decodeLocation(geohash);
  const precision = geohash.length;

  // Calculate approximate cell size at this precision
  const latDelta = 180 / Math.pow(2, Math.floor(precision * 2.5));
  const lonDelta = 360 / Math.pow(2, Math.floor(precision * 2.5));

  const neighbors = [
    encodeLocation(latitude + latDelta, longitude, precision), // N
    encodeLocation(latitude + latDelta, longitude + lonDelta, precision), // NE
    encodeLocation(latitude, longitude + lonDelta, precision), // E
    encodeLocation(latitude - latDelta, longitude + lonDelta, precision), // SE
    encodeLocation(latitude - latDelta, longitude, precision), // S
    encodeLocation(latitude - latDelta, longitude - lonDelta, precision), // SW
    encodeLocation(latitude, longitude - lonDelta, precision), // W
    encodeLocation(latitude + latDelta, longitude - lonDelta, precision), // NW
  ];

  // Remove duplicates and the center hash itself
  return [...new Set(neighbors)].filter((hash) => hash !== geohash);
};

/**
 * Calculates distance between two coordinates using Haversine formula
 *
 * @param {{latitude: number, longitude: number}} from - Starting point
 * @param {{latitude: number, longitude: number}} to - Ending point
 * @returns {number} Distance in kilometers
 *
 * @example
 * const distance = calculateDistance(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   { latitude: 40.7580, longitude: -73.9855 }
 * );
 * console.log(distance); // 8.15 km
 */
export const calculateDistance = (from, to) => {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Converts degrees to radians
 * @private
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Finds locations within a radius using geohash proximity
 *
 * @param {{latitude: number, longitude: number}} center - Center point
 * @param {number} radiusKm - Radius in kilometers
 * @param {Array} locations - Array of location objects with latitude/longitude
 * @param {number} precision - Geohash precision (default: 6)
 * @returns {Array} Filtered locations within radius
 *
 * @example
 * const nearbyStops = findNearbyLocations(
 *   { latitude: 40.7128, longitude: -74.0060 },
 *   5, // 5km radius
 *   allStops.map(s => s.coordinates),
 *   6
 * );
 */
export const findNearbyLocations = (
  center,
  radiusKm,
  locations,
  precision = 6
) => {
  const centerHash = encodeLocation(
    center.latitude,
    center.longitude,
    precision
  );
  const neighbors = getNeighbors(centerHash);
  const searchHashes = [centerHash, ...neighbors];

  // Filter locations by geohash first (fast)
  const candidates = locations.filter((loc) => {
    const locHash = encodeLocation(loc.latitude, loc.longitude, precision);
    return searchHashes.includes(locHash);
  });

  // Then filter by exact distance (slower but accurate)
  return candidates.filter((loc) => {
    const distance = calculateDistance(center, loc);
    return distance <= radiusKm;
  });
};

/**
 * Validates if a delivery location matches expected coordinates
 *
 * @param {{latitude: number, longitude: number}} actualLocation - GPS location from driver
 * @param {{latitude: number, longitude: number}} expectedLocation - Clinic coordinates
 * @param {number} toleranceMeters - Acceptable distance variance (default: 100m)
 * @returns {{valid: boolean, distance: number, geohashMatch: boolean}}
 *
 * @example
 * const validation = validateDeliveryLocation(
 *   actualGPS,
 *   clinicAddress,
 *   100 // 100m tolerance for HIPAA
 * );
 *
 * if (!validation.valid) {
 *   throw new Error('Delivery location outside acceptable range');
 * }
 */
export const validateDeliveryLocation = (
  actualLocation,
  expectedLocation,
  toleranceMeters = 100
) => {
  const distanceKm = calculateDistance(actualLocation, expectedLocation);
  const distanceMeters = distanceKm * 1000;

  // Check geohash match at precision 8 (~19m cells)
  const actualHash8 = encodeLocation(
    actualLocation.latitude,
    actualLocation.longitude,
    8
  );
  const expectedHash8 = encodeLocation(
    expectedLocation.latitude,
    expectedLocation.longitude,
    8
  );
  const geohashMatch = actualHash8 === expectedHash8;

  return {
    valid: distanceMeters <= toleranceMeters,
    distance: distanceMeters,
    distanceKm,
    geohashMatch,
    actualGeohash: actualHash8,
    expectedGeohash: expectedHash8,
  };
};

/**
 * Creates a bounding box for a given center and radius
 *
 * @param {{latitude: number, longitude: number}} center - Center point
 * @param {number} radiusKm - Radius in kilometers
 * @returns {{minLat: number, maxLat: number, minLon: number, maxLon: number}}
 */
export const getBoundingBox = (center, radiusKm) => {
  const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(center.latitude)));

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
};

/**
 * Estimates ETA based on distance and average speed
 *
 * @param {{latitude: number, longitude: number}} currentLocation - Current driver position
 * @param {{latitude: number, longitude: number}} destination - Destination coordinates
 * @param {number} avgSpeedKph - Average speed in km/h (default: 40)
 * @param {number} trafficFactor - Traffic multiplier (default: 1.2 for 20% buffer)
 * @returns {{eta: string, durationMinutes: number, distanceKm: number}}
 *
 * @example
 * const eta = estimateETA(driverGPS, nextStop.coordinates);
 * console.log(`Arriving in ${eta.durationMinutes} minutes`);
 */
export const estimateETA = (
  currentLocation,
  destination,
  avgSpeedKph = 40,
  trafficFactor = 1.2
) => {
  const distanceKm = calculateDistance(currentLocation, destination);
  const durationHours = (distanceKm / avgSpeedKph) * trafficFactor;
  const durationMinutes = Math.ceil(durationHours * 60);

  const eta = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  return {
    eta,
    durationMinutes,
    distanceKm: parseFloat(distanceKm.toFixed(2)),
  };
};

/**
 * Query helper for DynamoDB geohash index
 *
 * @param {{latitude: number, longitude: number}} location - Search center
 * @param {number} precision - Geohash precision (default: 6)
 * @returns {{hashes: string[], queryPattern: string}}
 *
 * @example
 * const query = buildGeoQuery(driverLocation, 6);
 * // Use query.hashes to search DynamoDB GSI
 * const results = await Promise.all(
 *   query.hashes.map(hash =>
 *     dynamoDB.query({
 *       IndexName: 'GeoHashIndex',
 *       KeyConditionExpression: 'geoHash6 = :hash',
 *       ExpressionAttributeValues: { ':hash': hash }
 *     })
 *   )
 * );
 */
export const buildGeoQuery = (location, precision = 6) => {
  const centerHash = encodeLocation(
    location.latitude,
    location.longitude,
    precision
  );
  const neighbors = getNeighbors(centerHash);
  const hashes = [centerHash, ...neighbors];

  return {
    hashes,
    queryPattern: `geoHash${precision} IN (${hashes
      .map((_, i) => `:hash${i}`)
      .join(", ")})`,
    attributeValues: Object.fromEntries(
      hashes.map((hash, i) => [`:hash${i}`, hash])
    ),
  };
};

/**
 * Geohash utilities for route optimization
 */
export const GeoHashUtils = {
  encode: encodeLocation,
  decode: decodeLocation,
  neighbors: getNeighbors,
  distance: calculateDistance,
  findNearby: findNearbyLocations,
  validate: validateDeliveryLocation,
  estimateETA,
  buildQuery: buildGeoQuery,
  getBoundingBox,
  precision: GeohashPrecision,
};

export default GeoHashUtils;
