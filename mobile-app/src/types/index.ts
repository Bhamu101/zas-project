// Mirrors backend/main.py's response shapes so the mobile app and the web
// dashboard read from exactly the same fields — never redefine these ad hoc.

export type BedState = 'critical' | 'needs-water' | 'optimal';

export interface Bed {
  id: number;
  name: string;
  crop: string;
  vwc: number;
  state: BedState;
  vwcTrigger: number;
  vwcOptimalMin: number;
  vwcOptimalMax: number;
  lastIrrigation: string;
  durationMin: number;
  waterUsedL: number;
  soilTempC: number;
  trendVwc: number[];
  airTempC: number;
  humidityPct: number;
  pumpStatus: 'ON' | 'OFF';
  valveStatus: 'OPEN' | 'CLOSED';
  irrigating: boolean;
}

export interface BedActivity {
  id: number;
  time: string;
  title: string;
  subtitle: string;
  color: 'brand' | 'blue' | 'red';
}

export interface AlertItem {
  id: number;
  level: 'critical' | 'success' | 'info';
  text: string;
  time: string;
  category: string;
}

export interface SystemInfo {
  mode: 'AUTOMATIC' | 'MANUAL';
  vwcTrigger: number;
  vwcOptimalMin: number;
  vwcOptimalMax: number;
  espNodes: number;
  firmwareVersion: string;
  backendVersion: string;
}

export interface DashboardResponse {
  systemStatus: { mode: string; status: string; lastUpdated: string };
  beds: Bed[];
  bedActivity: BedActivity[];
  irrigationOverview: {
    todayWaterUseL: number;
    todayWaterUseDeltaPct: number;
    irrigationEventsCount: number;
    totalIrrigationTimeLabel: string;
    efficiencyScorePct: number;
  };
  kpis: {
    soilMoistureAvg: number;
    irrigationStatus: string;
    nextCycle: string;
    cycleProgressPct: number;
    energySource: string;
    batteryPct: number;
    waterUsedTodayL: number;
    waterTargetPct: number;
  };
  extendedStats: {
    cropHealthScorePct: number;
    cropHealthLabel: string;
    totalWaterSavedL: number;
    totalWaterSavedPeriod: string;
    energyGeneratedKwhToday: number;
    systemEfficiencyPct: number;
    systemEfficiencyLabel: string;
  };
  farmerAdvisory: { headline: string; message: string; confidencePct: number };
  sparkline: {
    moisture: number[];
    irrigation: number[];
    energy: number[];
    energyGeneratedKwh: number[];
    water: number[];
  };
  alerts: AlertItem[];
  energyOverview: {
    activeSource: { label: string; status: string };
    battery: { pct: number; voltage: number; currentA: number; tempC: number };
    solarPanel: { ratedW: number; voltage: number; currentA: number; efficiencyPct: number };
    powerConsumption: {
      totalKwhToday: number;
      totalDeltaPct: number;
      peakKw: number;
      avgKw: number;
      series: { hours: string[]; today: number[]; yesterday: number[] };
    };
    stats: { label: string; value: string; deltaPct: number; goodDirection: 'up' | 'down' }[];
  };
  systemInfo: SystemInfo;
  mobileExtras: {
    tankLevelPct: number;
    weeklyUsageL: number;
    dailyUsageSeriesL: number[];
    dailyUsageLabels: string[];
    gridAvailable: boolean;
    estimatedWaterSavingPct: number;
  };
}

// App-local (device-only) types — not backend-sourced.

export interface FarmProfile {
  farmName: string;
  location: string;
  farmSizeHectares: string;
  mainCrop: string;
  irrigationType: string;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface Recommendation {
  id: string;
  bedId: number;
  bedName: string;
  severity: 'urgent' | 'suggested' | 'none';
  headline: string;
  message: string;
  suggestedDurationMin: number;
  reasons: { label: string; value: string }[];
  tip: string;
}

export interface CropConfig {
  id: string;
  name: string;
  minMoisturePct: number;
  optimalMinPct: number;
  optimalMaxPct: number;
  tempMinC: number;
  tempMaxC: number;
  irrigationPreference: string;
}

export type CropHealthStatus = 'healthy' | 'diseased' | 'pest' | 'nutrient_deficiency' | 'unclear';
export type CropHealthSeverity = 'none' | 'low' | 'moderate' | 'high';

export interface CropDiagnosis {
  plantIdentified: string;
  healthStatus: CropHealthStatus;
  condition: string;
  confidencePct: number;
  severity: CropHealthSeverity;
  description: string;
  treatment: string;
  preventionTips: string;
}

// GET /api/camera/{bedId} — photos from the ESP32-CAM on the stand
// (backend/camera.py). `url` is a signed Supabase Storage URL, valid ~1 h.
export type CameraFrameReason = 'scheduled' | 'requested' | 'irrigation' | 'boot';

export interface CameraFrame {
  id: string;
  url: string;
  takenAt: string; // ISO UTC
  reason: CameraFrameReason | string;
}

export interface BedCameraResponse {
  bedId: number;
  online: boolean;
  lastSeen: string | null;
  rssiDbm: number | null;
  captureRequested: boolean;
  frames: CameraFrame[];
  health: BedHealthCheck | null;
  healthChecking: boolean;
}

// AI check of a camera photo (backend/camera.py): the CropDiagnosis shape plus
// when/why it ran.
export interface BedHealthCheck extends CropDiagnosis {
  checkedAt: string;
  frameId: string;
  frameTakenAt: string;
  trigger: 'auto' | 'manual';
}
