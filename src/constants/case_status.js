export const CASE_STATUS = {
  NEW: 'New',                     // Just arrived, not triaged
  RECEIVED: 'Received',           // Physical impressions/files accepted
  ON_HOLD: 'On Hold',             // Waiting for doctor info/payment
  IN_DESIGN: 'In Design',         // CAD Department
  DESIGN_APPROVED: 'Design Approved', // Ready for CAM
  IN_PRODUCTION: 'In Production', // Milling/Printing
  FINISHING: 'Finishing',         // Staining/Glazing/Porcelain
  QC_CHECK: 'Quality Control',    // Final check
  READY_TO_SHIP: 'Ready to Ship', // Bagged and tagged
  SHIPPED: 'Shipped',             // Tracking number generated
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const CASE_PRIORITY = {
  STANDARD: 'Standard',
  RUSH: 'Rush',
  EMERGENCY: 'Emergency',
};
