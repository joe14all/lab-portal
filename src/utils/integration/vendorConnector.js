/**
 * Vendor API Connector (Simulation)
 * Simulates B2B integrations with suppliers like Henry Schein, Argen, etc.
 */

const VENDORS = {
  "sup-aidite-direct": { name: "Aidite Direct", region: "CN", currency: "USD" },
  "sup-henry-schein": { name: "Henry Schein", region: "US", currency: "USD" },
  "sup-ivoclar": { name: "Ivoclar Vivadent", region: "EU", currency: "EUR" },
  "sup-formlabs": { name: "Formlabs", region: "US", currency: "USD" },
  "sup-argen": { name: "Argen Corp", region: "US", currency: "USD" },
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const VendorConnector = {
  /**
   * Check stock availability and real-time pricing
   */
  checkAvailability: async (sku, vendorId) => {
    await delay(800 + Math.random() * 500); // Network latency

    // Simulate stock logic
    const inStock = Math.random() > 0.1; // 90% chance in stock
    const priceFluctuation = (Math.random() - 0.5) * 5; // Price +/- $2.50

    return {
      sku,
      vendor: VENDORS[vendorId] || { name: "Unknown Vendor" },
      available: inStock,
      currentPrice: Math.max(10, 50 + priceFluctuation), // Base mock price
      estimatedDelivery: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(), // +3 days
    };
  },

  /**
   * Submit a Purchase Order
   */
  submitPurchaseOrder: async (poData) => {
    await delay(1500); // Simulate processing

    if (Math.random() > 0.95) {
      throw new Error("Vendor API Gateway Timeout");
    }

    return {
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      vendorRef: `ORD-${Math.floor(Math.random() * 100000)}`,
      status: "Acknowledged",
      itemsConfirmed: poData.items.map((item) => ({
        ...item,
        status: "Confirmed",
      })),
      totalCost: poData.totalEstimated,
      submissionDate: new Date().toISOString(),
    };
  },
};
