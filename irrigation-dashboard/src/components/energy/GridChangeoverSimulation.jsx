import { useEffect, useRef, useState } from "react";
import { useLiveWeather } from "../../hooks/useLiveWeather";
import { SOLAR_SCORE_BY_ICON, simulateGridStability, statusFor, recommendSource } from "../../lib/energySimulation";

// The ATS (Automatic Transfer Switch) only changes source when the same
// grid-stability / solar / battery metrics behind the Smart Power
// Recommendation card actually call for a different one. It runs slowly and
// deliberately, the way a real transfer switch would, and reports the active
// source up to the page so the battery level tracks it.
const EVAL_INTERVAL_MS = 18000;
const SWITCH_MS = 6000;

const META = {
  solar: { label: "Solar System", color: "#f59e0b" },
  battery: { label: "Battery Bank", color: "#3b82f6" },
  grid: { label: "Grid (ZESA)", color: "#ef4444" },
};
const ORDER = ["solar", "battery", "grid"];

export default function GridChangeoverSimulation({ batteryPct, onSourceChange }) {
  const { weather } = useLiveWeather();
  const solarScore = weather ? SOLAR_SCORE_BY_ICON[weather.conditionIcon] ?? 50 : 50;
  const gridScore = simulateGridStability();

  const initial = recommendSource({ solarScore, gridScore, batteryPct: batteryPct ?? 0 });
  const [active, setActive] = useState(initial.source);
  const [reason, setReason] = useState(initial.reason);
  const [switching, setSwitching] = useState(false);
  const [pendingSource, setPendingSource] = useState(null);
  const activeRef = useRef(initial.source);
  const pendingRef = useRef(null);
  const switchTimerRef = useRef(null);
  const batteryRef = useRef(batteryPct ?? 0);

  // Keep the ref current so the slow eval interval below always reads the
  // latest battery level without needing it in its dependency list.
  useEffect(() => {
    batteryRef.current = batteryPct ?? 0;
  });

  useEffect(() => {
    onSourceChange?.(active);
  }, [active, onSourceChange]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pendingRef.current) return;

      const nextGridScore = simulateGridStability();
      const nextSolarScore = weather ? SOLAR_SCORE_BY_ICON[weather.conditionIcon] ?? 50 : 50;
      const recommendation = recommendSource({
        solarScore: nextSolarScore,
        gridScore: nextGridScore,
        batteryPct: batteryRef.current,
      });
      if (recommendation.source === activeRef.current) return;

      pendingRef.current = recommendation;
      setSwitching(true);
      setPendingSource(recommendation.source);
      switchTimerRef.current = setTimeout(() => {
        activeRef.current = recommendation.source;
        setActive(recommendation.source);
        setReason(recommendation.reason);
        setSwitching(false);
        setPendingSource(null);
        pendingRef.current = null;
      }, SWITCH_MS);
    }, EVAL_INTERVAL_MS);

    return () => {
      clearInterval(id);
      clearTimeout(switchTimerRef.current);
    };
  }, [weather]);

  const gridStatus = statusFor(gridScore, [75, 50, "Stable", "Fluctuating", "Unstable"]);

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <style>{`
        @keyframes flowdot {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .flow-line { position: relative; height: 2px; background: #e5e7eb; overflow: visible; }
        .flow-line.is-active { background: rgba(21,128,61,0.25); }
        .flow-dot {
          position: absolute; top: 50%; width: 7px; height: 7px; border-radius: 9999px;
          transform: translateY(-50%); animation: flowdot 4s linear infinite;
        }
      `}</style>

      <h2 className="text-sm font-bold text-ink mb-4">ATS CHANGEOVER</h2>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex flex-col gap-2.5 shrink-0 w-28 sm:w-32">
          {ORDER.map((key) => {
            const { label, color } = META[key];
            const isActive = key === active;
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <span
                    className="h-6 w-2 rounded-full shrink-0 transition-colors duration-500"
                    style={{ backgroundColor: isActive ? color : "#e5e7eb" }}
                  />
                  <span className={`text-[10px] font-semibold truncate ${isActive ? "text-ink" : "text-muted"}`}>
                    {label}
                  </span>
                </div>
                <div className={`flow-line flex-1 ${isActive ? "is-active" : ""}`}>
                  {isActive && !switching && (
                    <span className="flow-dot" style={{ backgroundColor: color }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`w-16 h-16 shrink-0 rounded-2xl border-2 flex items-center justify-center text-center transition-colors duration-300 ${
            switching ? "border-amber-500 bg-amber-50" : "border-brand bg-brand/5"
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wide ${switching ? "text-amber-500 animate-pulse" : "text-brand"}`}>
            ATS
          </span>
        </div>

        <div className="w-4 h-0.5 bg-gray-300 shrink-0" />

        <div className="w-16 h-16 shrink-0 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wide leading-tight text-ink">Farm Load</span>
        </div>
      </div>

      <p className="text-sm text-center mt-4 font-semibold" style={{ color: switching ? "#f59e0b" : "#4d7c0f" }}>
        {switching
          ? `Changeover in progress — moving to ${META[pendingSource ?? active].label}…`
          : `Currently running on ${META[active].label}`}
      </p>

      <div className="mt-3 rounded-xl border border-gray-100 bg-card/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1">Why this source</p>
        <p className="text-sm text-ink leading-relaxed">{reason}</p>
      </div>

      <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-muted">
          Deciding factor: grid stability at <span className={`font-semibold ${gridStatus.color}`}>{gridScore}% ({gridStatus.label})</span>
        </span>
      </div>
    </div>
  );
}
