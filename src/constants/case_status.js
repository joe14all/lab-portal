export const CASE_STATUS = {
  NEW: "New", // Just arrived, not Triggered
  RECEIVED: "Received", // Physical impressions/files accepted
  MODEL: "Model Work", // NEW: Stone pouring or model printing
  IN_DESIGN: "In Design", // CAD Department
  DESIGN_APPROVED: "Design Approved", // Ready for CAM
  WAX_UP: "Wax-up / Setup", // NEW: Denture teeth setup or framework waxing
  IN_PRODUCTION: "In Production", // Milling/Printing
  CASTING: "Casting / Pressing", // NEW: Investing, burnout, and casting/pressing
  PROCESSING: "Acrylic Processing", // NEW: Denture investing and injection
  FINISHING: "Finishing", // Staining/Glazing/Porcelain
  QC_CHECK: "Quality Control", // Final check
  READY_TO_SHIP: "Ready to Ship", // Bagged and tagged
  SHIPPED: "Shipped", // Tracking number generated
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold", // Waiting for doctor info/payment
  CANCELLED: "Cancelled",
};

export const CASE_PRIORITY = {
  STANDARD: "Standard",
  RUSH: "Rush",
  EMERGENCY: "Emergency",
};
