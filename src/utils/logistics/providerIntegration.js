/**
 * Third-Party Logistics Provider Integration Utilities
 *
 * This module provides utilities for integrating with external logistics providers
 * like Uber Direct, DoorDash Drive, Stuart, Lalamove, etc.
 */

// ============================================================
// PROVIDER ADAPTERS
// ============================================================

/**
 * Uber Direct API Adapter
 * Docs: https://developer.uber.com/docs/deliveries
 */
export const UberDirectAdapter = {
  /**
   * Create a delivery request
   */
  async createDelivery({ pickup, dropoff, packageSpecs, timeWindow }) {
    const payload = {
      pickup: {
        location: {
          latitude: pickup.coordinates.lat,
          longitude: pickup.coordinates.lng,
        },
        name: pickup.clinicName,
        phone_number: pickup.contactPhone,
        notes: pickup.instructions,
      },
      dropoff: {
        location: {
          latitude: dropoff.coordinates.lat,
          longitude: dropoff.coordinates.lng,
        },
        name: dropoff.labName,
        phone_number: dropoff.contactPhone,
        notes: dropoff.instructions,
      },
      manifest: {
        total_value: 0, // Dental cases have no monetary value in transit
        items: [
          {
            name: packageSpecs.packageType,
            quantity: packageSpecs.packageCount,
            size: packageSpecs.fragile ? "medium" : "small",
            must_be_upright:
              packageSpecs.fragile || packageSpecs.temperatureControlled,
          },
        ],
      },
      pickup_window: {
        start_time: timeWindow.windowStart,
        end_time: timeWindow.windowEnd,
      },
      dropoff_deadline: timeWindow.deliveryBy,
      undeliverable_action: "return", // Return to lab if delivery fails
    };

    // In production, make actual API call:
    // const response = await fetch('https://api.uber.com/v1/deliveries', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${UBER_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(payload),
    // });
    // return await response.json();

    // Mock response
    return {
      id: `uber-delivery-${Date.now()}`,
      status: "pending",
      tracking_url: `https://m.uber.com/ul?action=track&delivery_id=${Date.now()}`,
      fee: calculateUberFee(pickup.coordinates, dropoff.coordinates),
      courier: null,
      created: new Date().toISOString(),
    };
  },

  /**
   * Parse Uber webhook payload
   */
  parseWebhook(payload) {
    return {
      deliveryId: payload.id,
      status: mapUberStatus(payload.status),
      courierInfo: payload.courier
        ? {
            name: payload.courier.name,
            phone: payload.courier.phone_number,
            vehicleType: payload.courier.vehicle_type,
            currentLocation: {
              lat: payload.courier.location?.latitude,
              lng: payload.courier.location?.longitude,
              lastUpdated: payload.courier.location?.timestamp,
            },
          }
        : null,
      events: payload.waypoints?.map((w) => ({
        type: w.type,
        timestamp: w.timestamp,
        location: {
          lat: w.location?.latitude,
          lng: w.location?.longitude,
        },
      })),
    };
  },
};

/**
 * DoorDash Drive API Adapter
 * Docs: https://developer.doordash.com/en-US/docs/drive/
 */
export const DoorDashAdapter = {
  async createDelivery({ pickup, dropoff, packageSpecs, timeWindow }) {
    const payload = {
      external_delivery_id: `lab-${Date.now()}`,
      pickup_address: formatAddress(pickup.address),
      pickup_business_name: pickup.clinicName,
      pickup_phone_number: pickup.contactPhone,
      pickup_instructions: pickup.instructions,
      pickup_reference_tag: pickup.verificationCode,
      pickup_time: timeWindow.windowStart,
      dropoff_address: formatAddress(dropoff.address),
      dropoff_business_name: dropoff.labName,
      dropoff_phone_number: dropoff.contactPhone,
      dropoff_instructions: dropoff.instructions,
      order_value: 0,
      tip: 0,
      items: [
        {
          name: packageSpecs.packageType,
          description: `${packageSpecs.packageCount} package(s)`,
          quantity: packageSpecs.packageCount,
        },
      ],
      // DoorDash-specific features
      dasher_allowed_vehicles: packageSpecs.temperatureControlled
        ? ["car"] // Car required for temperature control
        : ["car", "bicycle", "scooter"],
      contactless_dropoff: false, // Signature required
      dropoff_requires_signature: true,
    };

    // Mock response
    return {
      external_delivery_id: payload.external_delivery_id,
      delivery_id: `dd-delivery-${Date.now()}`,
      delivery_status: "quote",
      tracking_url: `https://doordash.com/track/${Date.now()}`,
      fee: calculateDoorDashFee(
        pickup.coordinates,
        dropoff.coordinates,
        packageSpecs
      ),
      currency: "USD",
      created_at: new Date().toISOString(),
    };
  },

  parseWebhook(payload) {
    return {
      deliveryId: payload.external_delivery_id,
      status: mapDoorDashStatus(payload.delivery_status),
      courierInfo: payload.dasher_name
        ? {
            name: payload.dasher_name,
            phone: payload.dasher_phone_number,
            vehicleType: payload.dasher_vehicle_type,
            currentLocation: payload.dasher_location
              ? {
                  lat: payload.dasher_location.lat,
                  lng: payload.dasher_location.lng,
                  lastUpdated: new Date().toISOString(),
                }
              : null,
          }
        : null,
      events: payload.status_events || [],
    };
  },
};

/**
 * Stuart Delivery API Adapter (Europe)
 * Docs: https://api-docs.stuart.com/
 */
export const StuartAdapter = {
  async createDelivery({ pickup, dropoff, packageSpecs, timeWindow }) {
    const payload = {
      job: {
        pickups: [
          {
            address: formatAddress(pickup.address),
            comment: pickup.instructions,
            contact: {
              firstname: pickup.contactPerson.split(" ")[0],
              lastname: pickup.contactPerson.split(" ")[1] || "",
              phone: pickup.contactPhone,
              company: pickup.clinicName,
            },
          },
        ],
        dropoffs: [
          {
            address: formatAddress(dropoff.address),
            comment: dropoff.instructions,
            contact: {
              firstname: "Lab",
              lastname: "Technician",
              phone: dropoff.contactPhone,
              company: dropoff.labName,
            },
            package_type: packageSpecs.fragile ? "medium" : "small",
            package_description: packageSpecs.packageType,
          },
        ],
        assignment_code: pickup.verificationCode,
      },
    };

    return {
      id: `stuart-job-${Date.now()}`,
      status: "new",
      tracking_url: `https://stuart.com/track/${Date.now()}`,
      pricing: calculateStuartFee(pickup.coordinates, dropoff.coordinates),
      currency: "EUR",
      created_at: new Date().toISOString(),
    };
  },

  parseWebhook(payload) {
    return {
      deliveryId: payload.id,
      status: mapStuartStatus(payload.status),
      courierInfo: payload.driver
        ? {
            name: payload.driver.display_name,
            phone: payload.driver.phone,
            vehicleType: payload.driver.transport_type,
            currentLocation: payload.driver.latitude
              ? {
                  lat: payload.driver.latitude,
                  lng: payload.driver.longitude,
                  lastUpdated: new Date().toISOString(),
                }
              : null,
          }
        : null,
    };
  },
};

/**
 * Lalamove API Adapter (Asia-Pacific)
 * Docs: https://developers.lalamove.com/
 */
export const LalamoveAdapter = {
  async createDelivery({ pickup, dropoff, packageSpecs, timeWindow }) {
    const payload = {
      serviceType: packageSpecs.weight > 5 ? "MOTORCYCLE" : "BIKE",
      specialRequests: [],
      requesterContact: {
        name: pickup.contactPerson,
        phone: pickup.contactPhone,
      },
      stops: [
        {
          location: {
            lat: pickup.coordinates.lat.toString(),
            lng: pickup.coordinates.lng.toString(),
          },
          addresses: {
            en_US: {
              displayString: formatAddress(pickup.address),
              market: "US",
            },
          },
        },
        {
          location: {
            lat: dropoff.coordinates.lat.toString(),
            lng: dropoff.coordinates.lng.toString(),
          },
          addresses: {
            en_US: {
              displayString: formatAddress(dropoff.address),
              market: "US",
            },
          },
        },
      ],
      deliveries: [
        {
          toStop: 1,
          toContact: {
            name: "Lab Technician",
            phone: dropoff.contactPhone,
          },
          remarks: packageSpecs.packageType,
        },
      ],
    };

    return {
      orderId: `lalamove-${Date.now()}`,
      shareLink: `https://www.lalamove.com/track/${Date.now()}`,
      status: "ASSIGNING_DRIVER",
      priceBreakdown: {
        total: calculateLalamoveFee(pickup.coordinates, dropoff.coordinates),
        currency: "USD",
      },
    };
  },

  parseWebhook(payload) {
    return {
      deliveryId: payload.orderId,
      status: mapLalamoveStatus(payload.status),
      courierInfo: payload.driverName
        ? {
            name: payload.driverName,
            phone: payload.driverPhone,
            vehicleType: payload.vehicleType,
            currentLocation: payload.driverCoordinates
              ? {
                  lat: parseFloat(payload.driverCoordinates.lat),
                  lng: parseFloat(payload.driverCoordinates.lng),
                  lastUpdated: new Date().toISOString(),
                }
              : null,
          }
        : null,
    };
  },
};

// ============================================================
// SMART ROUTING ENGINE
// ============================================================

/**
 * Intelligent provider selection based on package requirements
 */
export const selectOptimalProvider = (providers, criteria) => {
  const { packageSpecs, isRush, distance, clinicLocation, currentTime } =
    criteria;

  // Filter capable providers
  const capable = providers.filter((provider) => {
    const caps = provider.capabilities;

    // Check weight limit
    if (packageSpecs.weight > caps.maxWeightKg) return false;

    // Check temperature control
    if (packageSpecs.temperatureControlled && !caps.temperatureControl)
      return false;

    // Check fragile handling
    if (packageSpecs.fragile && !caps.fragileHandling) return false;

    return true;
  });

  // Score providers
  const scored = capable.map((provider) => {
    let score = 0;

    // Cost efficiency (lower is better)
    const estimatedCost = estimateDeliveryCost(
      provider,
      distance,
      packageSpecs
    );
    score -= estimatedCost; // Negative because lower cost is better

    // Speed (for rush orders)
    if (isRush) {
      score += provider.serviceAreas[0]?.avgDeliveryTimeMin < 40 ? 20 : 0;
    }

    // Reliability (in-house fleet gets bonus for critical items)
    if (provider.type === "IN_HOUSE") {
      score += packageSpecs.temperatureControlled ? 30 : 10;
    }

    // Auto-assign capability
    if (
      provider.integration.autoAssign &&
      !provider.integration.requiresApproval
    ) {
      score += 5;
    }

    return { provider, score, estimatedCost };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  return scored[0];
};

// ============================================================
// STATUS MAPPING
// ============================================================

const mapUberStatus = (uberStatus) => {
  const statusMap = {
    pending: "PENDING",
    pickup: "EN_ROUTE_TO_PICKUP",
    pickup_complete: "PICKED_UP",
    dropoff: "EN_ROUTE_TO_DROPOFF",
    delivered: "DELIVERED",
    canceled: "CANCELED",
    returned: "RETURNED",
  };
  return statusMap[uberStatus] || "UNKNOWN";
};

const mapDoorDashStatus = (ddStatus) => {
  const statusMap = {
    quote: "PENDING",
    created: "PENDING",
    confirmed: "ASSIGNED",
    picked_up: "PICKED_UP",
    delivered: "DELIVERED",
    cancelled: "CANCELED",
  };
  return statusMap[ddStatus] || "UNKNOWN";
};

const mapStuartStatus = (stuartStatus) => {
  const statusMap = {
    new: "PENDING",
    searching: "SEARCHING_DRIVER",
    assigned: "ASSIGNED",
    in_progress: "EN_ROUTE_TO_PICKUP",
    picking: "PICKED_UP",
    dropping: "EN_ROUTE_TO_DROPOFF",
    finished: "DELIVERED",
    cancelled: "CANCELED",
  };
  return statusMap[stuartStatus] || "UNKNOWN";
};

const mapLalamoveStatus = (lmStatus) => {
  const statusMap = {
    ASSIGNING_DRIVER: "SEARCHING_DRIVER",
    ON_GOING: "EN_ROUTE_TO_PICKUP",
    PICKED_UP: "PICKED_UP",
    COMPLETED: "DELIVERED",
    CANCELED: "CANCELED",
  };
  return statusMap[lmStatus] || "UNKNOWN";
};

// ============================================================
// COST ESTIMATION
// ============================================================

const calculateUberFee = (origin, destination) => {
  const distance = calculateDistance(origin, destination);
  return 8.0 + distance * 1.5; // $8 base + $1.50/km
};

const calculateDoorDashFee = (origin, destination, packageSpecs) => {
  const distance = calculateDistance(origin, destination);
  let fee = 10.0 + distance * 2.0; // $10 base + $2/km
  if (packageSpecs.temperatureControlled) fee += 3.0;
  return fee;
};

const calculateStuartFee = (origin, destination) => {
  const distance = calculateDistance(origin, destination);
  return 6.5 + distance * 1.2; // €6.50 base + €1.20/km
};

const calculateLalamoveFee = (origin, destination) => {
  const distance = calculateDistance(origin, destination);
  return 5.0 + distance * 0.8; // $5 base + $0.80/km
};

const estimateDeliveryCost = (provider, distance, packageSpecs) => {
  let cost = provider.pricing.baseFee + distance * provider.pricing.perKmRate;
  if (packageSpecs.isRush) cost += provider.pricing.rushSurcharge || 0;
  if (packageSpecs.temperatureControlled)
    cost += provider.pricing.temperatureControlFee || 0;
  return cost;
};

// ============================================================
// UTILITIES
// ============================================================

const calculateDistance = (origin, destination) => {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(destination.lat - origin.lat);
  const dLon = toRad(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees) => (degrees * Math.PI) / 180;

const formatAddress = (address) => {
  return `${address.line1}, ${address.city}, ${address.state} ${address.zip}`;
};

// ============================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================

export const verifyWebhookSignature = {
  uber: (payload, signature, secret) => {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest("hex") === signature;
  },

  doordash: (payload, signature, secret) => {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return hmac.digest("base64") === signature;
  },

  stuart: (payload, signature, secret) => {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return hmac.digest("hex") === signature;
  },
};

export default {
  UberDirectAdapter,
  DoorDashAdapter,
  StuartAdapter,
  LalamoveAdapter,
  selectOptimalProvider,
  verifyWebhookSignature,
};
