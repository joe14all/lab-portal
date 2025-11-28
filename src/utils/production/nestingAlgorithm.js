/**
 * Mock Nesting Algorithm
 * Simulates 2D bin packing to estimate material usage for Dental Discs/Sheets.
 * In a real app, this would offload to a C++ WASM module or Python backend.
 */

// Approximate sizes in mm² (2D footprint)
const UNIT_SIZES = {
  Crown: 120, // ~10x12mm
  Bridge: 350, // 3 units
  Veneer: 80,
  Inlay: 60,
  Denture: 4000, // Large arch
  Nightguard: 3500,
  "Implant Crown": 140,
};

// Standard material dimensions (mm)
const MATERIAL_DIMS = {
  Disc: { radius: 49, area: 7542 }, // 98mm diameter
  Block: { width: 18, height: 15, area: 270 },
  Sheet: { width: 120, height: 120, area: 14400 }, // Thermoform sheet
};

export const NestingAlgorithm = {
  /**
   * Calculates layout efficiency and mock coordinates for visualization.
   * @param {Array} units - Array of unit objects { type, ... }
   * @param {string} materialType - 'Disc', 'Block', 'Sheet'
   */
  calculateLayout: (units, materialType = "Disc") => {
    // 1. Determine Container Size
    const dims = MATERIAL_DIMS[materialType] || MATERIAL_DIMS["Disc"];
    const totalArea = dims.area;

    // 2. Calculate Used Area
    let usedArea = 0;
    const placedItems = units.map((u, i) => {
      // Fuzzy match type to size
      const sizeKey =
        Object.keys(UNIT_SIZES).find((k) => u.type.includes(k)) || "Crown";
      const itemArea = UNIT_SIZES[sizeKey];
      usedArea += itemArea;

      // Mock Coordinate Generation (Spiral pattern for discs, Grid for sheets)
      // This is purely for UI visualization in the mockup
      const angle = i * 45;
      const radius = 10 + i * 5;

      return {
        id: u.id,
        type: sizeKey,
        x:
          materialType === "Disc"
            ? 50 + radius * Math.cos(angle) // Center offset (50%)
            : 10 + (i % 5) * 20,
        y:
          materialType === "Disc"
            ? 50 + radius * Math.sin(angle)
            : 10 + Math.floor(i / 5) * 20,
        area: itemArea,
        color: u.priority === "Rush" ? "#ef4444" : "#3b82f6",
      };
    });

    // 3. Calculate Efficiency
    // Add 20% overhead for sprues/connectors
    const efficiency = Math.min(
      100,
      Math.round(((usedArea * 1.2) / totalArea) * 100)
    );

    return {
      efficiency,
      placedItems,
      wastePercentage: 100 - efficiency,
      materialType,
    };
  },
};
