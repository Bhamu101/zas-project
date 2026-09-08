import { useEffect, useRef, useState } from "react";
import BatteryBars from "./BatteryBars";

// Client-side model that keeps the page alive between backend polls: the
// irrigation cycle turns on/off on a slow timer (seeded from
// kpis.irrigationStatus) and the battery level drifts up or down depending on
// which source is active and whether irrigation is currently drawing power.
// Runs deliberately slowly so the battery bars step down one segment at a
// time rather than flickering. The live battery value is pushed up to the
// page via onBatteryChange so every card stays in sync.
const TICK_MS = 9000;
const IRRIGATE_ON_MS = 60000;
const IRRIGATE_OFF_MS = 45000;

function batteryColor(pct) {
  if (pct >= 50) return { text: "text-brand" };
  if (pct >= 20) return { text: "text-amber-500" };
  return { text: "text-red-500" };
}

export default function LiveOperationsSimulator({ batteryPct = 50, irrigationStatus, activeSourceLabel, onBatteryChange }) {
  const [simBattery, setSimBattery] = useState(batteryPct);
  const [irrigating, setIrrigating] = useState(irrigationStatus === "Running");
  const [cycleProgress, setCycleProgress] = useState(0);
  const [drawKw, setDrawKw] = useState(0);

  const irrigateTimerRef = useRef(null);

  useEffect(() => {
    onBatteryChange?.(simBattery);
  }, [simBattery, onBatteryChange]);

  useEffect(() => {
    function scheduleNext(isOn) {
      const delay = isOn ? IRRIGATE_ON_MS : IRRIGATE_OFF_MS;
      irrigateTimerRef.current = setTimeout(() => {
        setIrrigating((v) => !v);
        setCycleProgress(0);
      }, delay);
    }
    scheduleNext(irrigating);
    return () => clearTimeout(irrigateTimerRef.current);
  }, [irrigating]);

  useEffect(() => {
    const id = setInterval(() => {
      const cycleLenMs = irrigating ? IRRIGATE_ON_MS : IRRIGATE_OFF_MS;
      setCycleProgress((p) => Math.min(100, p + (TICK_MS / cycleLenMs) * 100));

      const source = (activeSourceLabel || "").toLowerCase();
      const baseLoad = 0.12 + Math.random() * 0.04;
      const irrigationLoad = irrigating ? 0.5 + Math.random() * 0.15 : 0;
      const draw = baseLoad + irrigationLoad;
      setDrawKw(Number(draw.toFixed(2)));

      setSimBattery((pct) => {
        let delta;
        if (source.includes("battery")) {
          delta = -(0.4 + (irrigating ? 0.7 : 0) + Math.random() * 0.3);
        } else if (source.includes("solar")) {
          delta = irrigating ? 0.2 + Math.random() * 0.2 : 0.6 + Math.random() * 0.3;
        } else {
          delta = (Math.random() - 0.4) * 0.2;
        }
        return Math.max(2, Math.min(100, pct + delta));
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [irrigating, activeSourceLabel]);

  const { text: battText } = batteryColor(simBattery);
  const isCharging = (activeSourceLabel || "").toLowerCase().includes("solar") && !irrigating;

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-bold text-ink mb-4">LIVE OPERATIONS</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 p-4">
          <span className="block text-xs font-bold text-muted uppercase tracking-wide mb-3">Irrigation</span>
          <p className={`text-xl font-bold ${irrigating ? "text-blue-500" : "text-ink"}`}>
            {irrigating ? "In Progress" : "Idle"}
          </p>
          <p className="text-xs text-muted mt-1">
            {irrigating ? `Drawing ${drawKw} kW from ${activeSourceLabel || "source"}` : "Waiting for next scheduled cycle"}
          </p>
          <div className="w-full h-2 bg-card rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-[4000ms] ease-linear ${irrigating ? "bg-blue-500" : "bg-gray-300"}`}
              style={{ width: `${cycleProgress}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 p-4">
          <span className="block text-xs font-bold text-muted uppercase tracking-wide mb-3">Battery (live)</span>
          <p className={`text-xl font-bold ${battText}`}>{simBattery.toFixed(1)}%</p>
          <p className="text-xs text-muted mt-1">
            {(activeSourceLabel || "").toLowerCase().includes("battery")
              ? "Discharging to power the farm"
              : (activeSourceLabel || "").toLowerCase().includes("solar")
              ? isCharging ? "Charging from solar system" : "Topping up between draws"
              : "Holding steady on grid power"}
          </p>
          <BatteryBars pct={simBattery} className="mt-3" />
        </div>
      </div>
    </div>
  );
}
