import { useLiveWeather } from "../../hooks/useLiveWeather";
import { SOLAR_SCORE_BY_ICON, simulateGridStability, statusFor, recommendSource } from "../../lib/energySimulation";

const sourceMeta = {
  solar: { label: "Solar System", color: "text-amber-500" },
  battery: { label: "Battery", color: "text-blue-500" },
  grid: { label: "Grid (ZESA)", color: "text-[var(--color-danger)]" },
};

export default function SmartPowerRecommendation({ batteryPct }) {
  const { loading, weather } = useLiveWeather();

  const solarScore = weather ? SOLAR_SCORE_BY_ICON[weather.conditionIcon] ?? 50 : 50;
  const gridScore = simulateGridStability();
  const { source, reason } = recommendSource({ solarScore, gridScore, batteryPct: batteryPct ?? 0 });

  const { label, color } = sourceMeta[source];
  const gridStatus = statusFor(gridScore, [75, 50, "Stable", "Fluctuating", "Unstable"]);
  const solarStatus = statusFor(solarScore, [70, 40, "Strong sun", "Partial sun", "Weak sun"]);
  const batteryStatus = statusFor(batteryPct ?? 0, [50, 25, "Sufficient", "Moderate", "Low"]);

  return (
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
      <h2 className="text-sm font-bold text-[var(--color-ink)] mb-4">SMART POWER RECOMMENDATION</h2>

      <div className="mb-4">
        <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Suggested Source</p>
        <p className={`text-2xl font-bold ${color}`}>{label}</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)] mb-1">Why this source</p>
        <p className="text-sm text-[var(--color-ink)] leading-relaxed">{reason}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="border border-[var(--color-border)] rounded-lg p-2.5">
          <span className="block text-xs font-bold text-[var(--color-muted)] uppercase mb-1">Grid Stability</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${gridStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gridStatus.dot}`} />
            {gridStatus.label} &middot; {gridScore}%
          </span>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg p-2.5">
          <span className="block text-xs font-bold text-[var(--color-muted)] uppercase mb-1">Weather Outlook</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${solarStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${solarStatus.dot}`} />
            {loading ? "Loading…" : `${solarStatus.label} · ${weather?.condition ?? "Estimated"}`}
          </span>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg p-2.5">
          <span className="block text-xs font-bold text-[var(--color-muted)] uppercase mb-1">Battery Reserve</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${batteryStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${batteryStatus.dot}`} />
            {batteryStatus.label} &middot; {batteryPct ?? 0}%
          </span>
        </div>
      </div>

    </div>
  );
}
