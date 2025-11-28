/**
 * Predictive Maintenance Logic (Mock ML)
 * Analyzes telemetry patterns to predict failures.
 */

export const PredictiveModel = {
  analyze: (telemetryData, machineType) => {
    if (!telemetryData || telemetryData.length < 5) {
      return { score: 100, status: "Healthy", recommendation: null };
    }

    const latest = telemetryData[telemetryData.length - 1];
    const recent = telemetryData.slice(-5);

    // 1. Calculate Average Vibration (Recent)
    const avgVib =
      recent.reduce((sum, d) => sum + d.vibration, 0) / recent.length;

    // 2. Temperature Trend
    const tempTrend = latest.temperature - recent[0].temperature;

    let score = 100;
    let issues = [];

    // --- Rules Engine ---

    // High Vibration Rule (Bearing wear)
    if (avgVib > 5.0 && machineType.includes("Mill")) {
      score -= 30;
      issues.push("Spindle bearing wear detected");
    }

    // Overheating Rule
    if (latest.temperature > 65 && machineType.includes("Mill")) {
      score -= 40;
      issues.push("Cooling system inefficiency");
    }

    // Furnace Rules
    if (
      machineType.includes("Furnace") &&
      Math.abs(latest.temperature - 900) > 50
    ) {
      score -= 25;
      issues.push("Temperature calibration drift");
    }

    // Cap score
    score = Math.max(0, Math.min(100, score));

    // Determine Status
    let status = "Healthy";
    let recommendation = "No action needed";

    if (score < 50) {
      status = "Critical";
      recommendation = "Stop machine immediately. Schedule Level 2 service.";
    } else if (score < 80) {
      status = "Warning";
      recommendation = "Monitor closely. Plan maintenance within 48h.";
    }

    return {
      score,
      status,
      issues,
      recommendation,
      lastAnalysis: new Date().toISOString(),
    };
  },
};
