/* eslint-disable no-unused-vars */
import {
  labs,
  users,
  roles,
  auditLogs,
  clinics,
  doctors,
  priceLists,
  products,
  addons,
  activeCases,
  caseStages,
  caseFiles,
  caseMessages,
  materials,
  batches,
  equipment,
  invoices,
  payments,
  routes,
  pickups,
  workflows,
} from "./index";

// --- 1. HELPER: LATENCY SIMULATION ---
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 2. GENERIC CRUD CLASS ---
class MockEntity {
  constructor(initialData, name) {
    this.data = [...initialData]; // Clone for session persistence
    this.name = name;
  }

  // READ (All or Filtered)
  async getAll(filters = {}) {
    await delay();

    // Return all if no filters
    if (Object.keys(filters).length === 0) return this.data;

    // Simple Exact Match Filtering
    return this.data.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        // Handle array inclusion (e.g., filter by id in [ids])
        if (Array.isArray(value)) return value.includes(item[key]);
        // Handle strict equality
        return item[key] === value;
      });
    });
  }

  // READ (Single)
  async getById(id) {
    await delay();
    return this.data.find((item) => item.id === id);
  }

  // CREATE
  async create(payload) {
    await delay(600); // Slightly longer for writes

    const newItem = {
      id: payload.id || `${this.name}-${Date.now()}`, // Auto-ID if missing
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    // Add to beginning of list (Newest First)
    this.data.unshift(newItem);
    return newItem;
  }

  // UPDATE
  async update(id, updates) {
    await delay();
    const index = this.data.findIndex((item) => item.id === id);

    if (index === -1) throw new Error(`${this.name} with ID ${id} not found.`);

    const updatedItem = {
      ...this.data[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data[index] = updatedItem;
    return updatedItem;
  }

  // DELETE
  async delete(id) {
    await delay();
    const initialLength = this.data.length;
    this.data = this.data.filter((item) => item.id !== id);

    if (this.data.length === initialLength) {
      throw new Error(`${this.name} with ID ${id} not found.`);
    }
    return true;
  }
}

// --- 3. INSTANTIATE ENTITIES ---

// Org
const LabEntity = new MockEntity(labs, "lab");

// Auth
const UserEntity = new MockEntity(users, "user");
const RoleEntity = new MockEntity(roles, "role");
const LogEntity = new MockEntity(auditLogs, "log");

// CRM
const ClinicEntity = new MockEntity(clinics, "clinic");
const DoctorEntity = new MockEntity(doctors, "doctor");
const PriceListEntity = new MockEntity(priceLists, "price-list");

// Catalog
const ProductEntity = new MockEntity(products, "product");
const AddonEntity = new MockEntity(addons, "addon");

// Cases
const CaseEntity = new MockEntity(activeCases, "case");
const StageEntity = new MockEntity(caseStages, "stage");
const FileEntity = new MockEntity(caseFiles, "file");
const MessageEntity = new MockEntity(caseMessages, "message");

// Settings / Workflows (NEW)
const WorkflowEntity = new MockEntity(workflows, "workflow");

// Production
const MaterialEntity = new MockEntity(materials, "material");
const BatchEntity = new MockEntity(batches, "batch");
const EquipmentEntity = new MockEntity(equipment, "equipment");

// Finance
const InvoiceEntity = new MockEntity(invoices, "invoice");
const PaymentEntity = new MockEntity(payments, "payment");

// Logistics
const RouteEntity = new MockEntity(routes, "route");
const PickupEntity = new MockEntity(pickups, "pickup");

// --- 4. EXPORT SERVICE (GROUPED BY DOMAIN) ---
export const MockService = {
  // Organization
  org: {
    labs: LabEntity,
  },

  // Authentication & Users
  auth: {
    users: UserEntity,
    roles: RoleEntity,
    logs: LogEntity,

    // Specialized Action: Login
    login: async (email, password) => {
      await delay(800);
      const user = UserEntity.data.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!user) throw new Error("Invalid credentials");

      // Update stats
      const now = new Date().toISOString();
      await UserEntity.update(user.id, { lastLogin: now });

      // Log the action
      await LogEntity.create({
        labId: user.memberships?.[0]?.labId || "unknown",
        actorId: user.id,
        action: "LOGIN_SUCCESS",
        resource: "AUTH",
        timestamp: now,
        details: { method: "email/password" },
      });

      return user;
    },
  },

  // CRM (Clients)
  crm: {
    clinics: ClinicEntity,
    doctors: DoctorEntity,
    priceLists: PriceListEntity,
  },

  // Catalog
  catalog: {
    products: ProductEntity,
    addons: AddonEntity,
  },

  // Case Management
  cases: {
    cases: CaseEntity,
    stages: StageEntity,
    files: FileEntity,
    messages: MessageEntity,

    // Helper: Get full case details
    getFullCase: async (caseId) => {
      const caseData = await CaseEntity.getById(caseId);
      if (!caseData) return null;

      const [files, messages] = await Promise.all([
        FileEntity.getAll({ caseId }),
        MessageEntity.getAll({ caseId }),
      ]);

      return { ...caseData, files, messages };
    },
  },

  // Settings
  settings: {
    workflows: WorkflowEntity,
  },

  // Production / Manufacturing
  production: {
    inventory: MaterialEntity,
    batches: BatchEntity,
    equipment: EquipmentEntity,
  },

  // Finance
  finance: {
    invoices: InvoiceEntity,
    payments: PaymentEntity,
  },

  // Logistics
  logistics: {
    routes: RouteEntity,
    pickups: PickupEntity,
  },
};
