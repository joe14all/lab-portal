/**
 * IoT Telemetry Simulator
 * Generates realistic machine sensor data streams.
 */

// Baselines for different machine types
const BASELINES = {
  "Dry Mill": { temp: 45, rpm: 30000, vibration: 2.5 },
  "3D Printer": { temp: 60, rpm: 0, vibration: 0.5 }, // Resin temp
  "Press Furnace": { temp: 900, rpm: 0, vibration: 0.1 },
  "Casting Machine": { temp: 1200, rpm: 500, vibration: 8.0 },
};

export const TelemetryGenerator = {
  /**
   * Generate next data point based on previous state
   */
  nextPoint: (machineType, lastPoint) => {
    const base = BASELINES[machineType] || BASELINES["Dry Mill"];
    const now = new Date().toISOString();

    // If no history, return baseline with slight jitter
    if (!lastPoint) {
      return {
        timestamp: now,
        temperature: base.temp + (Math.random() - 0.5) * 2,
        rpm: base.rpm + (Math.random() - 0.5) * 100,
        vibration: base.vibration + (Math.random() - 0.5) * 0.2,
      };
    }

    // Random walk logic (Brownian motion)
    const drift = Math.random() - 0.5;

    // Simulate heat buildup
    const newTemp = Math.max(20, lastPoint.temperature + drift * 0.5 + 0.05);

    // RPM fluctuates around target
    const newRpm =
      base.rpm > 0 ? Math.max(0, base.rpm + (Math.random() - 0.5) * 500) : 0;

    // Vibration spikes randomly
    const spike = Math.random() > 0.95 ? 2.0 : 0;
    const newVib = Math.max(0, base.vibration + drift * 0.1 + spike);

    return {
      timestamp: now,
      temperature: parseFloat(newTemp.toFixed(1)),
      rpm: Math.floor(newRpm),
      vibration: parseFloat(newVib.toFixed(2)),
    };
  },

  /**
   * Generate a historic dataset (e.g., last 1 hour)
   */
  generateHistory: (machineType, count = 20) => {
    const data = [];
    let prev = null;
    for (let i = 0; i < count; i++) {
      const point = TelemetryGenerator.nextPoint(machineType, prev);
      // Adjust timestamps backwards
      const t = new Date();
      t.setMinutes(t.getMinutes() - (count - i));
      point.timestamp = t.toISOString();

      data.push(point);
      prev = point;
    }
    return data;
  },
};
