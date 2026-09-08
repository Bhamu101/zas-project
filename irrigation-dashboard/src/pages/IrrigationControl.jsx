import { useState, useEffect, useRef } from "react";
import {
  Droplets, Play, Info, MoreVertical, ChevronRight, Calendar, Clock, Loader2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import ProgressBar from "../components/dashboard/ProgressBar";
import { bedTargets } from "../lib/cropTargets";
import { apiFetch } from "../lib/apiClient";

// API calls go through the shared client (base URL + bearer token).

// Must match ESP32_HARDWARE_BED_ID in backend/main.py — Bed 1 is the only bed
// with a real ESP32 behind it right now.
const HARDWARE_BED_ID = 1;

// Client-side irrigation simulation tuning. This still drives the visual
// moisture ramp on the card (nice smooth feedback while a cycle runs), but
// the actual start/stop now goes through the real backend first — for Bed 1
// with ESP32_BASE_URL configured that's what fires the physical pump/valve;
// for the other beds the backend just flips its own mock state the same way
// the mobile app's manual controls already do.
//
// IMPORTANT: this ramp runs at a fixed cosmetic pace (a few seconds),
// completely independent of the real requested duration. For Bed 1, calling
// /stop when the ramp finishes would abort the real hardware cycle after
// only a few seconds instead of letting it run the full requested duration
// — so Bed 1's backend "stop" (which just syncs bookkeeping; the ESP32
// already stopped the physical pump on its own timer by then) is scheduled
// separately, timed to the real duration instead of the fake ramp.
const SIM_TICK_MS = 450;          // how often the moisture reading updates
const SIM_STEP_PCT = 1.4;         // average % gained per tick
const SIM_TARGET_GAIN = 24;       // total % the bed climbs once triggered

const STATE_LABEL = { optimal: "Optimal", "needs-water": "Needs Water", critical: "Critical" };

const stateStyles = {
  critical: { badgeText: "text-red-600", bar: "bg-red-500" },
  "needs-water": { badgeText: "text-amber-600", bar: "bg-amber-500" },
  optimal: { badgeText: "text-brand", bar: "bg-brand" },
};

function DeltaTag({ value, goodDirection = "down" }) {
  const isDown = value < 0;
  const isGood = goodDirection === "down" ? isDown : !isDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isGood ? "text-brand" : "text-red-500"}`}>
      {value < 0 ? "−" : "+"}{Math.abs(value)}% vs yesterday
    </span>
  );
}

function stateForVwc(vwc, t) {
  if (vwc < t.vwcTrigger) return "critical";
  if (vwc < t.vwcOptimalMin) return "needs-water";
  return "optimal";
}

export default function IrrigationControl({ beds = [], systemInfo, irrigationOverview }) {
  const [mode, setMode] = useState("automatic");
  // Per-bed live simulation: { [bedId]: { vwc, state, running } }
  const [sim, setSim] = useState({});
  // bedIds with an in-flight start request — disables the button so a slow
  // network/hardware round trip can't be double-tapped.
  const [pending, setPending] = useState({});
  const [triggerError, setTriggerError] = useState(null);
  const timersRef = useRef({});
  const hardwareStopTimerRef = useRef(null);

  // Clear any running intervals/timeouts when the page unmounts.
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearInterval);
    clearTimeout(hardwareStopTimerRef.current);
  }, []);

  async function handleTrigger(bedId) {
    const bed = beds.find((b) => b.id === bedId);
    if (!bed) return;

    const durationMin = bed.durationMin || 30;

    setTriggerError(null);
    setPending((prev) => ({ ...prev, [bedId]: true }));
    try {
      await apiFetch(`/api/irrigation/start/${bedId}`, {
        method: "POST",
        body: JSON.stringify({ durationMin }),
      });
    } catch (err) {
      setTriggerError(`${bed.name}: ${err.message}`);
      setPending((prev) => ({ ...prev, [bedId]: false }));
      return;
    }
    setPending((prev) => ({ ...prev, [bedId]: false }));

    if (bedId === HARDWARE_BED_ID) {
      // Real hardware runs its own full timed cycle and stops itself — only
      // sync the backend's bookkeeping once that's actually done, not when
      // the fast cosmetic ramp below finishes.
      clearTimeout(hardwareStopTimerRef.current);
      hardwareStopTimerRef.current = setTimeout(() => {
        apiFetch(`/api/irrigation/stop/${bedId}`, { method: "POST" }).catch(() => {});
      }, durationMin * 60 * 1000);
    }

    const t = bedTargets(bed, systemInfo);
    const start = sim[bedId]?.vwc ?? bed.vwc;
    // Aim for the middle of this crop's optimal band, but always at least a
    // meaningful bump above where the bed started.
    const bandMid = (t.vwcOptimalMin + t.vwcOptimalMax) / 2;
    const target = Math.min(100, Math.max(start + SIM_TARGET_GAIN, bandMid));

    clearInterval(timersRef.current[bedId]);
    setSim((prev) => ({
      ...prev,
      [bedId]: { vwc: start, state: stateForVwc(start, t), running: true },
    }));

    timersRef.current[bedId] = setInterval(() => {
      setSim((prev) => {
        const cur = prev[bedId]?.vwc ?? start;
        const step = SIM_STEP_PCT * (0.6 + Math.random() * 0.8); // slight jitter
        const next = Math.min(target, cur + step);
        const done = next >= target - 0.05;
        if (done) {
          clearInterval(timersRef.current[bedId]);
          delete timersRef.current[bedId];
          // For simulated beds, this ramp finishing IS the cycle ending —
          // tell the backend now so it applies its moisture bump. Bed 1's
          // stop is handled separately above, timed to the real duration.
          if (bedId !== HARDWARE_BED_ID) {
            apiFetch(`/api/irrigation/stop/${bedId}`, { method: "POST" }).catch(() => {});
          }
        }
        return {
          ...prev,
          [bedId]: { vwc: next, state: stateForVwc(next, t), running: !done },
        };
      });
    }, SIM_TICK_MS);
  }

  const overviewTiles = irrigationOverview && [
    { label: "Today's Water Use", value: `${irrigationOverview.todayWaterUseL.toLocaleString()} L`, delta: irrigationOverview.todayWaterUseDeltaPct, goodDirection: "down" },
    { label: "Irrigation Events", value: irrigationOverview.irrigationEventsCount, delta: irrigationOverview.irrigationEventsDeltaPct, goodDirection: "up" },
    { label: "Total Irrigation Time", value: irrigationOverview.totalIrrigationTimeLabel, delta: irrigationOverview.totalIrrigationTimeDeltaPct, goodDirection: "down" },
    { label: "Efficiency Score", value: `${irrigationOverview.efficiencyScorePct}%`, delta: irrigationOverview.efficiencyScoreDeltaPct, goodDirection: "up" },
  ];

  const chartData = irrigationOverview?.waterUseSeries.hours.map((h, i) => ({
    hour: h,
    today: irrigationOverview.waterUseSeries.today[i],
    yesterday: irrigationOverview.waterUseSeries.yesterday[i],
  }));

  return (
    <div className="space-y-3">
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold text-ink">SYSTEM MODE</h2>
          <Info size={13} className="text-muted" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMode("automatic")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              mode === "automatic" ? "bg-brand text-white" : "bg-card text-muted"
            }`}
          >
            Automatic
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${
              mode === "manual" ? "bg-ink text-white border-ink" : "bg-white text-muted border-gray-200"
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {triggerError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl px-4 py-3">
          Could not start irrigation — {triggerError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {beds.map((bed) => {
          const live = sim[bed.id];
          const vwc = live?.vwc ?? bed.vwc;
          const state = live?.state ?? bed.state;
          const running = !!live?.running;
          const t = bedTargets(bed, systemInfo);
          const s = stateStyles[state] || stateStyles.optimal;
          return (
            <div key={bed.id} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ink whitespace-nowrap">
                  {bed.name}{t.crop ? `: ${t.crop}` : ""}
                </h3>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold whitespace-nowrap ${s.badgeText}`}>
                    {STATE_LABEL[state] || STATE_LABEL.optimal}
                  </span>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-card transition-colors">
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              <p className="text-3xl font-bold text-ink tabular-nums mb-1">{Math.round(vwc)}%</p>
              <p className="text-xs text-muted mb-2">
                Soil Moisture{running && <span className="text-brand font-semibold"> · irrigating…</span>}
              </p>

              <ProgressBar percent={vwc} color={s.bar} />

              <div className="flex items-center gap-1 text-xs text-muted mt-2 mb-4">
                <ChevronRight size={12} />
                <span>
                  {t.crop ? `${t.crop} target: ` : "Target range: "}
                  {t.vwcOptimalMin}% - {t.vwcOptimalMax}%
                  <span className="text-muted/70"> · trigger &lt; {t.vwcTrigger}%</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-100">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Calendar size={11} /> Last Irrigation</div>
                  <p className="text-xs font-semibold text-ink min-h-[2rem] leading-4">{bed.lastIrrigation}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Clock size={11} /> Duration</div>
                  <p className="text-xs font-semibold text-ink min-h-[2rem] leading-4">{bed.durationMin} min</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Droplets size={11} /> Water Used</div>
                  <p className="text-xs font-semibold text-ink min-h-[2rem] leading-4">{bed.waterUsedL.toLocaleString()} L</p>
                </div>
              </div>

              <button
                onClick={() => handleTrigger(bed.id)}
                disabled={mode === "automatic" || running || !!pending[bed.id]}
                className={`mt-auto w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-3 transition-colors ${
                  mode === "automatic" || running || pending[bed.id]
                    ? "bg-card text-muted cursor-not-allowed"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {pending[bed.id] ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Starting…
                  </>
                ) : running ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Irrigating… {Math.round(vwc)}%
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Trigger Irrigation Now
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
        <h3 className="text-xs font-bold text-ink mb-3 shrink-0">IRRIGATION OVERVIEW</h3>

        {overviewTiles && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 shrink-0">
            {overviewTiles.map((t) => (
              <div key={t.label} className="bg-card rounded-xl p-3">
                <p className="text-lg font-bold text-ink leading-none">{t.value}</p>
                <p className="text-[11px] text-muted mt-1">{t.label}</p>
                <div className="mt-1"><DeltaTag value={t.delta} goodDirection={t.goodDirection} /></div>
              </div>
            ))}
          </div>
        )}

        {chartData && (
          <div className="relative flex-1 min-h-[220px]">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v / 1000}K`} />
                  <Line type="monotone" dataKey="today" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="yesterday" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
