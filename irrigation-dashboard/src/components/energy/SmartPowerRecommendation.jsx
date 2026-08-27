import { Sparkles, Sun, Battery, Zap, Signal, CloudSun } from "lucide-react";
import { useLiveWeather } from "../../hooks/useLiveWeather";
import { SOLAR_SCORE_BY_ICON, simulateGridStability, statusFor, recommendSource } from "../../lib/energySimulation";

const sourceMeta = {
  solar: { label: "Solar System", Icon: Sun, color: "text-amber-500", bg: "#f59e0b1a" },
  battery: { label: "Battery", Icon: Battery, color: "text-blue-500", bg: "#3b82f61a" },
  grid: { label: "Grid (ZESA)", Icon: Zap, color: "text-red-500", bg: "#ef44441a" },
};

export default function SmartPowerRecommendation({ batteryPct }) {
  const { loading, weather } = useLiveWeather();

  const solarScore = weather ? SOLAR_SCORE_BY_ICON[weather.conditionIcon] ?? 50 : 50;
  const gridScore = simulateGridStability();
  const { source, reason } = recommendSource({ solarScore, gridScore, batteryPct: batteryPct ?? 0 });

  const { label, Icon, color, bg } = sourceMeta[source];
  const gridStatus = statusFor(gridScore, [75, 50, "Stable", "Fluctuating", "Unstable"]);
  const solarStatus = statusFor(solarScore, [70, 40, "Strong sun", "Partial sun", "Weak sun"]);
  const batteryStatus = statusFor(batteryPct ?? 0, [50, 25, "Sufficient", "Moderate", "Low"]);

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-brand" />
        <h2 className="text-sm font-bold text-ink">SMART POWER RECOMMENDATION</h2>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <Icon size={26} className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wide text-muted uppercase">Suggested Source</p>
          <p className={`text-2xl font-bold ${color}`}>{label}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-card/60 p-3 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1">Why this source</p>
        <p className="text-sm text-ink leading-relaxed">{reason}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="border border-gray-100 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Signal size={13} className="text-muted" />
            <span className="text-[10px] font-bold text-muted uppercase">Grid Stability</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${gridStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gridStatus.dot}`} />
            {gridStatus.label} &middot; {gridScore}%
          </span>
        </div>

        <div className="border border-gray-100 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <CloudSun size={13} className="text-muted" />
            <span className="text-[10px] font-bold text-muted uppercase">Weather Outlook</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${solarStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${solarStatus.dot}`} />
            {loading ? "Loading…" : `${solarStatus.label} · ${weather?.condition ?? "Estimated"}`}
          </span>
        </div>

        <div className="border border-gray-100 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Battery size={13} className="text-muted" />
            <span className="text-[10px] font-bold text-muted uppercase">Battery Reserve</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${batteryStatus.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${batteryStatus.dot}`} />
            {batteryStatus.label} &middot; {batteryPct ?? 0}%
          </span>
        </div>
      </div>

    </div>
  );
}
