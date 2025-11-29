/**
 * Geohash Utilities
 * 
 * Geolocation encoding/decoding for efficient proximity queries
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 3.4.4
 */

import type { Coordinates } from '../../types/logistics';

// Base32 character set for geohash encoding
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude coordinates into a geohash string
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @param precision - Number of characters in output (default: 9, ~4.77m precision)
 * @returns Geohash string
 */
export function encodeGeohash(
  lat: number,
  lng: number,
  precision: number = 9
): string {
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      // Longitude
      const mid = (lngMin + lngMax) / 2;
      if (lng > mid) {
        idx = (idx << 1) + 1;
        lngMin = mid;
      } else {
        idx = idx << 1;
        lngMax = mid;
      }
    } else {
      // Latitude
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        idx = (idx << 1) + 1;
        latMin = mid;
      } else {
        idx = idx << 1;
        latMax = mid;
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
}

/**
 * Decode a geohash string into latitude/longitude coordinates
 * 
 * @param geohash - Geohash string
 * @returns Coordinates with lat/lng
 */
export function decodeGeohash(geohash: string): Coordinates {
  if (!geohash || geohash.length === 0) {
    throw new Error('Invalid geohash');
  }

  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash[i];
    const idx = BASE32.indexOf(chr);

    if (idx === -1) {
      throw new Error(`Invalid character in geohash: ${chr}`);
    }

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;

      if (evenBit) {
        // Longitude
        const mid = (lngMin + lngMax) / 2;
        if (bitN === 1) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        // Latitude
        const mid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      evenBit = !evenBit;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  };
}

/**
 * Get all 8 neighboring geohash cells
 * Useful for proximity queries
 * 
 * @param geohash - Center geohash
 * @returns Array of 8 neighbor geohashes (N, NE, E, SE, S, SW, W, NW)
 */
export function getNeighbors(geohash: string): string[] {
  if (!geohash || geohash.length === 0) {
    return [];
  }

  const neighbors: string[] = [];
  const directions: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

  // Get 4 cardinal neighbors
  for (const direction of directions) {
    try {
      const neighbor = getNeighbor(geohash, direction);
      neighbors.push(neighbor);
    } catch {
      // Edge case: neighbor doesn't exist (e.g., at poles)
      continue;
    }
  }

  // Get 4 diagonal neighbors
  try {
    neighbors.push(getNeighbor(getNeighbor(geohash, 'top'), 'right')); // NE
    neighbors.push(getNeighbor(getNeighbor(geohash, 'bottom'), 'right')); // SE
    neighbors.push(getNeighbor(getNeighbor(geohash, 'bottom'), 'left')); // SW
    neighbors.push(getNeighbor(getNeighbor(geohash, 'top'), 'left')); // NW
  } catch {
    // Some diagonal neighbors may not exist
  }

  return neighbors;
}

/**
 * Get neighbor in a specific direction
 */
function getNeighbor(
  geohash: string,
  direction: 'top' | 'right' | 'bottom' | 'left'
): string {
  const lastChar = geohash.charAt(geohash.length - 1);
  const parent = geohash.slice(0, -1);
  const type = geohash.length % 2 === 0 ? 'even' : 'odd';

  // Neighbor lookup tables
  const neighbors: Record<string, Record<string, string>> = {
    even: {
      top: 'p0r21436x8zb9dcf5h7kjnmqesgutwvy',
      right: 'bc01fg45238967deuvhjyznpkmstqrwx',
      bottom: '14365h7k9dcfesgujnmqp0r2twvyx8zb',
      left: '238967debc01fg45kmstqrwxuvhjyznp',
    },
    odd: {
      top: 'bc01fg45238967deuvhjyznpkmstqrwx',
      right: 'p0r21436x8zb9dcf5h7kjnmqesgutwvy',
      bottom: '238967debc01fg45kmstqrwxuvhjyznp',
      left: '14365h7k9dcfesgujnmqp0r2twvyx8zb',
    },
  };

  const borders: Record<string, Record<string, string>> = {
    even: {
      top: 'prxz',
      right: 'bcfguvyz',
      bottom: '028b',
      left: '0145hjnp',
    },
    odd: {
      top: 'bcfguvyz',
      right: 'prxz',
      bottom: '0145hjnp',
      left: '028b',
    },
  };

  const border = borders[type][direction];
  const neighbor = neighbors[type][direction];

  if (border.indexOf(lastChar) !== -1 && parent) {
    return getNeighbor(parent, direction) + BASE32[neighbor.indexOf(lastChar)];
  }

  return parent + BASE32[neighbor.indexOf(lastChar)];
}

/**
 * Get bounding box for a geohash
 * Returns min/max lat/lng
 */
export function getGeohashBounds(geohash: string): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash[i];
    const idx = BASE32.indexOf(chr);

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;

      if (evenBit) {
        const mid = (lngMin + lngMax) / 2;
        if (bitN === 1) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      evenBit = !evenBit;
    }
  }

  return {
    minLat: latMin,
    maxLat: latMax,
    minLng: lngMin,
    maxLng: lngMax,
  };
}

/**
 * Calculate the precision level needed for a given error in meters
 * Returns recommended geohash length
 */
export function getPrecisionForError(errorMeters: number): number {
  // Geohash precision levels (approximate)
  const precisionLevels = [
    { length: 1, error: 5000000 }, // ±2500 km
    { length: 2, error: 625000 }, // ±312 km
    { length: 3, error: 78000 }, // ±39 km
    { length: 4, error: 20000 }, // ±10 km
    { length: 5, error: 2400 }, // ±1.2 km
    { length: 6, error: 610 }, // ±305 m
    { length: 7, error: 76 }, // ±38 m
    { length: 8, error: 19 }, // ±9.5 m
    { length: 9, error: 2.4 }, // ±1.2 m
    { length: 10, error: 0.6 }, // ±30 cm
  ];

  for (const level of precisionLevels) {
    if (level.error <= errorMeters) {
      return level.length;
    }
  }

  return 10; // Maximum precision
}

/**
 * Validate geohash string
 */
export function isValidGeohash(geohash: string): boolean {
  if (!geohash || geohash.length === 0) {
    return false;
  }

  for (let i = 0; i < geohash.length; i++) {
    if (BASE32.indexOf(geohash[i]) === -1) {
      return false;
    }
  }

  return true;
}

/**
 * Encode location with error handling
 */
export function encodeLocation(
  lat: number,
  lng: number,
  precision: number = 9
): string {
  try {
    return encodeGeohash(lat, lng, precision);
  } catch (error) {
    console.error('Failed to encode geohash:', error);
    return '';
  }
}

/**
 * Decode location with error handling
 */
export function decodeLocation(geohash: string): Coordinates | null {
  try {
    return decodeGeohash(geohash);
  } catch (error) {
    console.error('Failed to decode geohash:', error);
    return null;
  }
}
