// Per-crop soil-moisture (VWC %) targets. Leafy brassicas (covo, tsunga) are
// shallow-rooted and need consistently moist soil, so they carry a higher
// trigger point and a higher optimal band than the deeper-rooted, more
// drought-tolerant tomato, which is run slightly drier for better fruit set.
// Mirrors CROP_TARGETS in backend/main.py — used only as a fallback when the
// backend payload doesn't carry per-bed thresholds yet.
export const CROP_TARGETS = {
  Covo:   { vwcTrigger: 32, vwcOptimalMin: 48, vwcOptimalMax: 68 },
  Tsunga: { vwcTrigger: 30, vwcOptimalMin: 45, vwcOptimalMax: 65 },
  Tomato: { vwcTrigger: 22, vwcOptimalMin: 34, vwcOptimalMax: 52 },
};

const CROP_BY_BED = { 1: "Covo", 2: "Tsunga", 3: "Tomato" };

// Resolve a bed's moisture targets, preferring per-bed values from the backend,
// then the per-crop table, then the system-wide defaults.
export function bedTargets(bed = {}, systemInfo = {}) {
  const crop = bed.crop || CROP_BY_BED[bed.id];
  const fromCrop = CROP_TARGETS[crop] || {};
  return {
    crop,
    vwcTrigger: bed.vwcTrigger ?? fromCrop.vwcTrigger ?? systemInfo.vwcTrigger ?? 25,
    vwcOptimalMin: bed.vwcOptimalMin ?? fromCrop.vwcOptimalMin ?? systemInfo.vwcOptimalMin ?? 40,
    vwcOptimalMax: bed.vwcOptimalMax ?? fromCrop.vwcOptimalMax ?? systemInfo.vwcOptimalMax ?? 60,
  };
}
