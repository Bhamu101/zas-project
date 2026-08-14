// Placeholder data — later stages replace this with a live fetch/MQTT feed.

export const systemStatus = {
  mode: "AUTOMATIC",
  status: "OPTIMAL",
  lastUpdated: "10:30:25 AM",
};

export const beds = [
  { id: 1, name: "Bed 1", vwc: 58, state: "optimal" },
  { id: 2, name: "Bed 2", vwc: 42, state: "monitoring" },
  { id: 3, name: "Bed 3", vwc: 56, state: "optimal" },
];

export const kpis = {
  soilMoistureAvg: 52,
  irrigationStatus: "Running",
  nextCycle: "02:15:30",
  energySource: "Solar",
  batteryPct: 85,
  waterUsedTodayL: 12450,
  waterTargetPct: 85,
};

export const sparkline = {
  moisture: [48, 50, 47, 52, 54, 51, 53, 52],
  irrigation: [40, 44, 42, 48, 50, 47, 49, 52],
  energy: [70, 75, 72, 80, 85, 82, 88, 85],
  water: [9000, 9500, 10200, 11000, 10800, 11500, 12100, 12450],
};

export const weather = {
  current: { temp: 22, condition: "Partly Cloudy", min: 16, max: 28 },
  forecast: [
    { day: "FRI", condition: "partly-cloudy", high: 25, low: 16 },
    { day: "SAT", condition: "rain", high: 23, low: 15 },
    { day: "SUN", condition: "sunny", high: 27, low: 17 },
    { day: "MON", condition: "cloudy", high: 28, low: 18 },
  ],
};

export const alerts = [
  { id: 1, level: "warning", text: "Soil moisture low in Bed 2", time: "10:15 AM", category: "Bed Monitoring" },
  { id: 2, level: "success", text: "Irrigation cycle completed", time: "08:45 AM", category: "Irrigation Control" },
  { id: 3, level: "info", text: "Weather update available", time: "Yesterday 07:30 PM", category: "Weather Forecast" },
];