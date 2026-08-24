import type { CropConfig } from '@/types';

// Rape/Covo's thresholds match backend systemInfo (vwcTrigger 25, optimal 40-60)
// exactly — that's the crop actually growing on the demo beds, per
// PROJECT-OBJECTIVES.md. The others are realistic Zimbabwean-crop defaults for
// the Farm Setup crop picker; only Rape/Covo is wired to live sensor thresholds.
export const CROPS: CropConfig[] = [
  {
    id: 'rape-covo',
    name: 'Rape / Covo',
    minMoisturePct: 25,
    optimalMinPct: 40,
    optimalMaxPct: 60,
    tempMinC: 15,
    tempMaxC: 28,
    irrigationPreference: 'Frequent, shallow watering',
  },
  {
    id: 'maize',
    name: 'Maize',
    minMoisturePct: 45,
    optimalMinPct: 50,
    optimalMaxPct: 70,
    tempMinC: 18,
    tempMaxC: 32,
    irrigationPreference: 'Deep watering, less frequent',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    minMoisturePct: 40,
    optimalMinPct: 45,
    optimalMaxPct: 65,
    tempMinC: 12,
    tempMaxC: 25,
    irrigationPreference: 'Moderate, avoid waterlogging',
  },
  {
    id: 'soybean',
    name: 'Soybean',
    minMoisturePct: 42,
    optimalMinPct: 48,
    optimalMaxPct: 68,
    tempMinC: 18,
    tempMaxC: 30,
    irrigationPreference: 'Consistent moisture, critical at flowering',
  },
  {
    id: 'tobacco',
    name: 'Tobacco',
    minMoisturePct: 38,
    optimalMinPct: 45,
    optimalMaxPct: 62,
    tempMinC: 20,
    tempMaxC: 30,
    irrigationPreference: 'Even moisture, avoid leaf stress',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    minMoisturePct: 40,
    optimalMinPct: 50,
    optimalMaxPct: 70,
    tempMinC: 16,
    tempMaxC: 29,
    irrigationPreference: 'Frequent, consistent moisture',
  },
];

export const DEFAULT_CROP_ID = 'rape-covo';

export function getCropById(id: string): CropConfig {
  return CROPS.find((c) => c.id === id) ?? CROPS[0];
}
