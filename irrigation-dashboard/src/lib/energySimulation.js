// Shared power-source decision logic for the Energy Management page. No
// backend telemetry exists yet for grid voltage variance or panel
// irradiance, so both scores below are simulated — but every component that
// needs "which source should be active right now, and why" (Smart Power
// Recommendation, the ATS changeover diagram) reads from this single source
// of truth, so they never disagree with each other.

// Solar potential, 0-100, estimated from current weather condition. Real
// panel output would come from irradiance telemetry, not just sky condition.
export const SOLAR_SCORE_BY_ICON = {
  sunny: 90,
  "partly-cloudy": 65,
  cloudy: 40,
  rain: 15,
  storm: 5,
  snow: 20,
};

// No grid telemetry (voltage variance, outage frequency) exists in the
// backend yet, so grid stability is simulated here as a slow-moving wave
// seeded by time of day. Swap this for a real gridStability field once the
// backend/ATS controller exposes one.
export function simulateGridStability() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const wave = Math.sin(mins / 45) * 20 + Math.sin(mins / 13) * 8;
  return Math.max(20, Math.min(98, Math.round(72 + wave)));
}

export function statusFor(score, thresholds) {
  if (score >= thresholds[0]) return { label: thresholds[2], color: "text-brand", dot: "bg-brand" };
  if (score >= thresholds[1]) return { label: thresholds[3], color: "text-amber-500", dot: "bg-amber-500" };
  return { label: thresholds[4], color: "text-red-500", dot: "bg-red-500" };
}

export function recommendSource({ solarScore, gridScore, batteryPct }) {
  if (solarScore >= 65) {
    return {
      source: "solar",
      reason: "Strong solar system output expected right now — draw directly from the panels and let the battery top up.",
    };
  }
  if (gridScore < 50) {
    if (batteryPct >= 25) {
      return {
        source: "battery",
        reason: "Grid supply is fluctuating — running on battery avoids surges while it stabilizes.",
      };
    }
    return {
      source: "grid",
      reason: "Grid is unstable and battery reserve is low, so staying on grid is safer than risking a full discharge.",
    };
  }
  if (batteryPct >= 85) {
    return {
      source: "battery",
      reason: "Battery is nearly full and the grid is stable — discharge some reserve before it tops out.",
    };
  }
  return {
    source: "grid",
    reason: "Grid is stable and solar system output is limited right now — use grid power and preserve the battery for peak or outage periods.",
  };
}
