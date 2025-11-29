/**
 * Logistics Domain Type Definitions
 * 
 * Comprehensive TypeScript interfaces for the Logistics domain
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 2
 */

// ============================================================
// SHARED TYPES (Must be defined first)
// ============================================================

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoLocation extends Coordinates {
  lastUpdated: string; // ISO8601
}

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Lab {
  id: string;
  name: string;
  address: Address;
  contactInfo: ContactInfo;
}

export interface FleetVehicle {
  id: string;
  labId: string;
  type: 'Cargo Van' | 'Motorcycle' | 'Bicycle' | 'Car';
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: 'Active' | 'Maintenance' | 'Retired';
  specs: VehicleSpecs;
  currentLocation: GeoLocation | null;
  assignedDriverId: string | null;
  maintenanceSchedule: MaintenanceSchedule;
  insurance: Insurance;
}

export interface VehicleSpecs {
  capacityKg: number;
  volumeCubicMeters: number;
  features: VehicleFeature[];
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';
  fuelEfficiencyKmPerLiter?: number;
}

export type VehicleFeature =
  | 'SECURE_LOCKBOX'
  | 'CLIMATE_CONTROL'
  | 'GPS_TRACKING'
  | 'REFRIGERATION'
  | 'LIFT_GATE'
  | 'WEATHERPROOF_STORAGE';

export interface MaintenanceSchedule {
  lastServiceDate: string;
  nextServiceDate: string;
  odometerKm: number;
  currentIssue?: string;
}

export interface Insurance {
  provider: string;
  policyNumber: string;
  expirationDate: string;
}

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  labMemberships: LabMembership[];
  driverLicense?: string;
  vehicleId?: string;
}

export interface LabMembership {
  labId: string;
  role: string;
  joinedAt: string;
}

// ============================================================
// ROUTE ENTITIES
// ============================================================

export interface Route {
  id: string;
  labId: string;
  name: string;
  driverId: string | null;
  vehicleId: string | null;
  date: string; // YYYY-MM-DD
  status: RouteStatus;
  startTime: string; // ISO8601
  endTime: string | null; // ISO8601
  metrics: RouteMetrics;
  vehicleSnapshot: VehicleSnapshot | null;
  fulfillmentMethod: FulfillmentMethod;
  providerId: string;
  externalProvider: ExternalProviderInfo | null;
  stops: RouteStop[]; // Note: Should be normalized in production
  version?: number; // For optimistic locking
  createdAt?: string;
  updatedAt?: string;
}

export type RouteStatus = 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';

export interface RouteMetrics {
  totalDistanceKm: number;
  estimatedDurationMin: number;
  stopsCompleted: number;
  stopsTotal: number;
}

export interface VehicleSnapshot {
  id: string;
  type: string;
  capacity: number;
  features: string[];
}

export type FulfillmentMethod = 'IN_HOUSE' | 'THIRD_PARTY';

export interface ExternalProviderInfo {
  name: string;
  deliveryId: string;
  trackingUrl: string;
  estimatedCost: number;
  currency: string;
  status: ExternalDeliveryStatus;
  courierInfo: CourierInfo | null;
  webhookStatus?: 'REGISTERED' | 'ACTIVE' | 'INACTIVE';
  lastWebhookAt?: string | null;
}

export type ExternalDeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE_TO_DROPOFF'
  | 'DELIVERED'
  | 'CANCELED'
  | 'RETURNED'
  | 'SEARCHING_DRIVER'
  | 'UNKNOWN';

export interface CourierInfo {
  name: string;
  phone: string;
  vehicleType: string;
  currentLocation?: GeoLocation;
}

// ============================================================
// ROUTE STOP ENTITIES
// ============================================================

export interface RouteStop {
  id: string;
  sequence: number;
  clinicId: string;
  type: StopType;
  coordinates: Coordinates;
  clinicSnapshot: ClinicSnapshot;
  deliveryManifest?: DeliveryItem[];
  pickupTasks?: PickupTask[];
  status: StopStatus;
  completedAt?: string | null;
  actualArrival?: string | null;
  estimatedArrival?: string | null;
  signatureUrl?: string;
  signedBy?: string;
  geoHashAtCompletion?: string;
  driverInstructions?: string;
  proofOfService?: ProofOfService;
}

export type StopType = 'Pickup' | 'Delivery';

export type StopStatus = 'Pending' | 'InProgress' | 'Arrived' | 'Completed' | 'Skipped';

export interface ClinicSnapshot {
  name: string;
  address: Address;
  contactPhone: string;
}

export interface DeliveryItem {
  caseId: string;
  unitIds: string[];
  requiresSignature: boolean;
}

export interface PickupTask {
  requestId: string;
  associatedCaseIds: string[];
  packageCount: number;
  verificationCode: string;
}

export interface ProofOfService {
  signatureUrl: string;
  photoUrl?: string;
  verificationCode: string;
  geoHash: string;
  timestamp: string;
  receivedBy: {
    name: string;
    title?: string;
  };
}

// ============================================================
// PICKUP REQUEST ENTITIES
// ============================================================

export interface PickupRequest {
  id: string;
  labId: string;
  clinicId: string;
  requestedBy: string;
  requestTime: string; // ISO8601
  windowStart: string; // ISO8601
  windowEnd: string; // ISO8601
  status: PickupRequestStatus;
  driverId: string | null;
  notes: string;
  packageCount: number;
  isRush: boolean;
  associatedCaseIds: string[];
  packageSpecs: PackageSpecs;
  accessInstructions: AccessInstructions;
  specialHandling: SpecialHandling[];
  verificationCode: string;
  slaMetrics: SLAMetrics;
  recurrenceRule?: RecurrenceRule;
  fulfillmentMethod: FulfillmentMethod;
  providerId: string;
  externalProvider: ExternalProviderInfo | null;
  externalReference?: ExternalReference;
  createdAt?: string;
  updatedAt?: string;
}

export type PickupRequestStatus =
  | 'Pending'
  | 'Assigned'
  | 'EnRoute'
  | 'Arrived'
  | 'Completed'
  | 'Skipped'
  | 'Rescheduled'
  | 'Cancelled';

export interface PackageSpecs {
  weight: number; // kg
  dimensions: string; // Format: "LxWxH cm"
  fragile: boolean;
  packageType: string;
  temperatureControlled?: boolean;
  requiresSignature?: boolean;
}

export interface AccessInstructions {
  entrance?: string;
  contactPerson?: string;
  securityCode?: string;
  parkingInstructions?: string;
}

export type SpecialHandling =
  | 'RUSH'
  | 'FRAGILE'
  | 'KEEP_LEVEL'
  | 'TEMPERATURE_SENSITIVE'
  | 'KEEP_MOIST'
  | 'REFRIGERATION_REQUIRED'
  | 'HAZMAT';

export interface SLAMetrics {
  expectedArrival: string; // ISO8601
  actualArrival: string | null; // ISO8601
  variance: number | null; // Minutes (negative = early, positive = late)
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  interval: number;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  timeWindow: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  endDate?: string; // YYYY-MM-DD
}

export interface ExternalReference {
  ehrSystem: 'DentrixAscend_V2' | 'OpenDental' | 'Eaglesoft' | 'Other';
  patientId?: string;
  caseNumber?: string;
  externalId?: string;
}

// ============================================================
// CLINIC ENTITIES (Cross-Domain)
// ============================================================

export interface Clinic {
  id: string;
  labId: string;
  name: string;
  accountNumber: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  addresses: {
    shipping: AddressWithGeo;
    billing: Address;
  };
  operatingHours: OperatingHours;
  contacts: {
    primary: ContactInfo;
    billing?: ContactInfo;
  };
}

export interface AddressWithGeo extends Address {
  geoCoordinates: Coordinates & {
    radiusMeters?: number;
  };
}

export interface OperatingHours {
  timezone: string;
  schedule: {
    [day: string]: string[]; // e.g., Mon: ["08:00-12:00", "13:00-17:00"]
  };
}

// ============================================================
// CASE ENTITIES (Cross-Domain)
// ============================================================

export interface Case {
  id: string;
  labId: string;
  clinicId: string;
  patientName: string;
  status: CaseStatus;
  priority: CasePriority;
  completedAt?: string;
  deliveryRequiredBy?: string;
  packageSpecs?: PackageSpecs;
}

export type CaseStatus =
  | 'InProduction'
  | 'QualityCheck'
  | 'ReadyToShip'
  | 'Shipped'
  | 'Delivered'
  | 'OnHold'
  | 'Cancelled';

export type CasePriority = 'STANDARD' | 'RUSH' | 'EMERGENCY';

// ============================================================
// LOGISTICS PROVIDER ENTITIES
// ============================================================

export interface LogisticsProvider {
  id: string;
  name: string;
  type: 'THIRD_PARTY' | 'IN_HOUSE';
  status: 'Active' | 'Inactive';
  regions: string[];
  capabilities: ProviderCapabilities;
  apiConfig: APIConfig | null;
  pricing: PricingModel;
  serviceAreas: ServiceArea[];
  integration: IntegrationSettings;
}

export interface ProviderCapabilities {
  sameDay: boolean;
  scheduled: boolean;
  realTimeTracking: boolean;
  proofOfDelivery: boolean;
  signatureCapture: boolean;
  photoCapture: boolean;
  temperatureControl: boolean;
  fragileHandling: boolean;
  maxWeightKg: number;
  maxDimensionsCm: string;
}

export interface APIConfig {
  baseUrl: string;
  authType: 'OAUTH2' | 'JWT' | 'API_KEY' | 'HMAC';
  webhookUrl: string;
  credentials: {
    clientId?: string;
    organizationId?: string;
    developerId?: string;
    keyId?: string;
    apiKey?: string;
  };
}

export interface PricingModel {
  model: 'DISTANCE_BASED' | 'DYNAMIC' | 'ZONE_BASED' | 'VEHICLE_TYPE' | 'INTERNAL';
  baseFee: number;
  perKmRate: number;
  rushSurcharge: number;
  temperatureControlFee?: number;
  currency: string;
}

export interface ServiceArea {
  city: string;
  state: string;
  coverage: 'FULL' | 'PARTIAL' | 'LIMITED';
  avgDeliveryTimeMin: number;
}

export interface IntegrationSettings {
  enabled: boolean;
  autoAssign: boolean;
  requiresApproval: boolean;
  fallbackPriority: number; // Lower = higher priority
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type ISO8601 = string;
export type GeoHash = string;

export interface TimeWindow {
  start: ISO8601;
  end: ISO8601;
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

// ============================================================
// FILTER & QUERY TYPES
// ============================================================

export interface RouteFilters {
  labId?: string;
  driverId?: string;
  date?: string;
  status?: RouteStatus;
  fulfillmentMethod?: FulfillmentMethod;
}

export interface PickupRequestFilters {
  labId?: string;
  clinicId?: string;
  status?: PickupRequestStatus;
  isRush?: boolean;
  dateRange?: DateRange;
  fulfillmentMethod?: FulfillmentMethod;
}

export interface VehicleFilters {
  labId?: string;
  status?: 'Active' | 'Maintenance' | 'Retired';
  type?: string;
  assignedDriverId?: string;
}
