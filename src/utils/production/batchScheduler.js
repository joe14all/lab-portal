/**
 * Production Batching Logic
 * Matches cases to materials and equipment based on workflow requirements.
 */

// Helper: Group items by a key
const groupBy = (array, keyFn) => {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

export const BatchScheduler = {
  /**
   * Identifies cases ready for production and groups them by Material.
   * @param {Array} cases - All active cases
   * @param {Array} units - All case units (if flat list available) or extracted from cases
   * @returns {Object} { 'Zirconia': [unit1, unit2], 'E.max': [unit3] }
   */
  getProductionCandidates: (cases) => {
    const candidates = [];

    cases.forEach((c) => {
      // Filter for cases in pre-production stages that are ready for the next step
      // In a real app, we'd check specific workflow transitions.
      // Here we assume 'stage-design' means ready for 'stage-milling'/'stage-printing'
      const isReady = c.status === "stage-design" || c.status === "stage-model";

      if (isReady && c.units) {
        c.units.forEach((unit) => {
          // Exclude units already in a batch (would be checked via status in real DB)
          if (
            !unit.batchId &&
            !["stage-shipped", "stage-cancelled"].includes(unit.status)
          ) {
            candidates.push({
              ...unit,
              caseNumber: c.caseNumber,
              patient: c.patient.name,
              caseId: c.id,
              doctor: c.doctorName,
              dueDate: c.dates.due,
            });
          }
        });
      }
    });

    // Group by Material Type (e.g., "Zirconia", "E.max")
    // We treat the 'material' string as the grouping key for simplicity
    return groupBy(candidates, (u) => u.material || "Unknown Material");
  },

  /**
   * Matches a material type to compatible equipment.
   * @param {string} materialType
   * @param {Array} equipmentList
   */
  getCompatibleMachines: (materialType, equipmentList) => {
    const type = (materialType || "").toLowerCase();

    return equipmentList.filter((eq) => {
      if (eq.status === "Maintenance") return false; // Exclude broken machines

      const machineType = eq.type.toLowerCase();

      // Logic mapping (simplified)
      if (
        type.includes("zirconia") ||
        type.includes("pmma") ||
        type.includes("wax")
      ) {
        return machineType.includes("mill");
      }
      if (
        type.includes("resin") ||
        type.includes("model") ||
        type.includes("nightguard")
      ) {
        return machineType.includes("printer");
      }
      if (type.includes("emax") || type.includes("ingot")) {
        return machineType.includes("press") || machineType.includes("furnace");
      }
      if (
        type.includes("metal") ||
        type.includes("gold") ||
        type.includes("chrome")
      ) {
        return machineType.includes("cast") || machineType.includes("sinter");
      }
      return false;
    });
  },

  /**
   * Estimates the duration of a batch based on unit count and machine type
   */
  estimateDurationMinutes: (unitCount, machineType) => {
    const type = machineType.toLowerCase();
    if (type.includes("mill")) return 30 + unitCount * 15; // Setup + 15m/unit
    if (type.includes("printer")) return 60 + unitCount * 5; // Base curing + height factor
    if (type.includes("furnace")) return 120; // Fixed cycle usually
    return 60;
  },
};
