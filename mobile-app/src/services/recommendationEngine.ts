import { getCropById, DEFAULT_CROP_ID } from '@/data/crops';
import type { Bed, Recommendation, SystemInfo } from '@/types';

// Rules-based irrigation advisory (MVP). Deliberately not an LLM/chatbot — see
// PROJECT-OBJECTIVES.md and the mobile spec's "Smart Farming Advice" section.
// Swap this module for a real model later without touching the screens that
// call getRecommendations(); the return shape (Recommendation[]) is the contract.

const TIPS = [
  'Irrigating during high solar production can reduce grid dependence.',
  'Watering in the early morning reduces evaporation losses in hot, dry conditions.',
  'Consistent moisture at flowering has the biggest impact on yield.',
];

function pickTip(seed: number): string {
  return TIPS[seed % TIPS.length];
}

function estimateDurationMin(vwc: number, optimalMin: number): number {
  const deficit = Math.max(0, optimalMin - vwc);
  // ~0.9 min per point of deficit, clamped to a sane manual-cycle range.
  return Math.min(45, Math.max(10, Math.round(deficit * 0.9)));
}

export function getRecommendations(
  beds: Bed[],
  systemInfo: SystemInfo,
  rainProbabilityPct: number | null,
  cropId: string = DEFAULT_CROP_ID
): Recommendation[] {
  const crop = getCropById(cropId);
  const significantRainExpected = rainProbabilityPct != null && rainProbabilityPct >= 60;

  return beds.map((bed, i): Recommendation => {
    const belowMinimum = bed.vwc < crop.minMoisturePct || bed.vwc < systemInfo.vwcTrigger;
    const adequate = bed.vwc >= systemInfo.vwcOptimalMin;

    if (adequate || significantRainExpected) {
      return {
        id: `${bed.id}-ok`,
        bedId: bed.id,
        bedName: bed.name,
        severity: 'none',
        headline: `${bed.name} is in good shape`,
        message: significantRainExpected
          ? `Rain is expected soon (${rainProbabilityPct}% chance) — irrigation is not required.`
          : `Soil moisture (${bed.vwc}%) is within the optimal range for ${crop.name}. Irrigation is not required.`,
        suggestedDurationMin: 0,
        reasons: [
          { label: 'Soil moisture', value: `${bed.vwc}%` },
          { label: 'Optimal range', value: `${systemInfo.vwcOptimalMin}%–${systemInfo.vwcOptimalMax}%` },
        ],
        tip: pickTip(i),
      };
    }

    const severity: Recommendation['severity'] = belowMinimum ? 'urgent' : 'suggested';
    const durationMin = estimateDurationMin(bed.vwc, systemInfo.vwcOptimalMin);

    return {
      id: `${bed.id}-irrigate`,
      bedId: bed.id,
      bedName: bed.name,
      severity,
      headline: severity === 'urgent' ? 'Irrigation Recommended' : 'Irrigation Suggested',
      message: `Soil moisture in ${bed.name} has dropped below the preferred level for ${crop.name}. Irrigate for approximately ${durationMin} minutes.`,
      suggestedDurationMin: durationMin,
      reasons: [
        { label: 'Soil moisture', value: `${bed.vwc}%` },
        { label: 'Recommended minimum', value: `${crop.minMoisturePct}%` },
        {
          label: 'Rainfall outlook',
          value:
            rainProbabilityPct != null
              ? `${rainProbabilityPct}% chance in next 24h`
              : 'No forecast data',
        },
      ],
      tip: pickTip(i),
    };
  });
}
