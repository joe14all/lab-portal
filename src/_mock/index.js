// Organization (New)
import labs from "./data/org/labs.json";

// Auth
import users from "./data/auth/users.json";
import roles from "./data/auth/roles.json";
import auditLogs from "./data/auth/audit_logs.json";

// CRM
import clinics from "./data/crm/clinics.json";
import doctors from "./data/crm/doctors.json";
import priceLists from "./data/crm/price_lists.json";

// Catalog
import products from "./data/catalog/products.json";
import addons from "./data/catalog/addons.json";

// Cases
import activeCases from "./data/cases/active_cases.json";
import caseStages from "./data/cases/case_stages.json";
import caseFiles from "./data/cases/case_files.json";
import caseMessages from "./data/cases/case_messages.json";

// Production
import materials from "./data/production/materials.json";
import batches from "./data/production/batches.json";
import equipment from "./data/production/equipment.json";

// Finance
import invoices from "./data/finance/invoices.json";
import payments from "./data/finance/payments.json";

// Logistics
import routes from "./data/logistics/routes.json";
import pickups from "./data/logistics/pickups.json";
import vehicles from "./data/logistics/vehicles.json";
import providers from "./data/logistics/providers.json";

import workflows from "./data/settings/workflows.json"; // Import new file

// Export named for specific imports: import { activeCases } from '../_mock';
export {
  // Org
  labs,

  // Auth
  users,
  roles,
  auditLogs,

  // CRM
  clinics,
  doctors,
  priceLists,

  // Catalog
  products,
  addons,

  // Cases
  activeCases,
  caseStages,
  caseFiles,
  caseMessages,

  // Production
  materials,
  batches,
  equipment,

  // Finance
  invoices,
  payments,

  // Logistics
  routes,
  pickups,
  vehicles,
  providers,

  // Settings
  workflows,
};

// Default export object if needed
export default {
  org: { labs },
  auth: { users, roles, auditLogs },
  crm: { clinics, doctors, priceLists },
  catalog: { products, addons },
  cases: { activeCases, caseStages, caseFiles, caseMessages },
  production: { materials, batches, equipment },
  finance: { invoices, payments },
  logistics: { routes, pickups, vehicles, providers },
  settings: { workflows },
};
