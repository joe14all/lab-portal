export const LAB_ROLES = {
  ADMIN: 'ADMIN',           // Full access
  MANAGER: 'MANAGER',       // Can override prices, approve discounts
  TECHNICIAN: 'TECHNICIAN', // Can only see/update specific production stages
  SHIPPING: 'SHIPPING',     // Can only access Shipping/Receiving modules
  CLIENT: 'CLIENT',         // (The Dentist) - View only / Order creation
};

export const PERMISSIONS = {
  CAN_APPROVE_CASES: [LAB_ROLES.ADMIN, LAB_ROLES.MANAGER],
  CAN_EDIT_PRICING: [LAB_ROLES.ADMIN],
  CAN_VIEW_FINANCIALS: [LAB_ROLES.ADMIN, LAB_ROLES.MANAGER],
};
