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
   * @returns {Object} { 'Zirconia': [unit1, unit2], 'E.max': [unit3] }
   */
  getProductionCandidates: (cases) => {
    const candidates = [];

    cases.forEach((c) => {
      // Filter for cases in pre-production stages
      const isReady = c.status === "stage-design" || c.status === "stage-model";

      if (isReady && c.units) {
        c.units.forEach((unit) => {
          // Exclude units already in a batch or completed
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
              // Propagate rush tag from case to unit for sorting
              priority: (c.tags || []).includes("Rush") ? "Rush" : "Standard",
            });
          }
        });
      }
    });

    // Group by Material Type
    return groupBy(candidates, (u) => u.material || "Unknown Material");
  },

  /**
   * Matches a material type to compatible equipment.
   */
  getCompatibleMachines: (materialType, equipmentList) => {
    const type = (materialType || "").toLowerCase();

    return equipmentList.filter((eq) => {
      if (eq.status === "Maintenance") return false;

      const machineType = eq.type.toLowerCase();

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
    if (type.includes("furnace")) return 120; // Fixed cycle
    return 60;
  },

  /**
   * Detects if a proposed batch overlaps with existing scheduled jobs on a machine.
   * @param {Object} proposed - { machineId, startTime, estimatedEndTime }
   * @param {Array} existingBatches - List of all active batches
   */
  detectScheduleConflicts: (proposed, existingBatches) => {
    const conflicts = [];
    const proposedStart = new Date(proposed.startTime).getTime();
    const proposedEnd = new Date(proposed.estimatedEndTime).getTime();

    existingBatches.forEach((b) => {
      if (b.machineId !== proposed.machineId) return;
      if (b.status === "Completed" || b.status === "Cancelled") return;

      // Check time overlap
      const existingStart = new Date(b.startTime || b.createdAt).getTime(); // Fallback if not started
      const existingEnd = b.estimatedEndTime
        ? new Date(b.estimatedEndTime).getTime()
        : existingStart + 2 * 60 * 60 * 1000; // Default 2hr if unknown

      const isOverlap =
        proposedStart < existingEnd && proposedEnd > existingStart;

      if (isOverlap) {
        conflicts.push({
          batchId: b.id,
          status: b.status,
          conflictType: "Time Overlap",
          message: `Machine is busy until ${new Date(
            existingEnd
          ).toLocaleTimeString()}`,
        });
      }
    });

    return conflicts;
  },
};
