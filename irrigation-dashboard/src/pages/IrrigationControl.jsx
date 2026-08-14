import { useState } from "react";
import {
  Droplets, Play, Info, MoreVertical, ChevronRight, Calendar, Clock,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import ProgressBar from "../components/dashboard/ProgressBar";

const STATE_HEX = { optimal: "#16a34a", "needs-water": "#eab308", critical: "#ef4444" };
const STATE_LABEL = { optimal: "Optimal", "needs-water": "Needs Water", critical: "Critical" };

const stateStyles = {
  critical: { badgeText: "text-red-600", bar: "bg-red-500" },
  "needs-water": { badgeText: "text-amber-600", bar: "bg-amber-500" },
  optimal: { badgeText: "text-brand", bar: "bg-brand" },
};

function DeltaTag({ value, goodDirection = "down" }) {
  const isDown = value < 0;
  const isGood = goodDirection === "down" ? isDown : !isDown;
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isGood ? "text-brand" : "text-red-500"}`}>
      <Icon size={11} />
      {Math.abs(value)}% vs yesterday
    </span>
  );
}

export default function IrrigationControl({ beds = [], systemInfo, irrigationOverview }) {
  const [mode, setMode] = useState("automatic");

  const targetRange = systemInfo ? `${systemInfo.vwcOptimalMin}% - ${systemInfo.vwcOptimalMax}%` : "40% - 60%";

  const overviewTiles = irrigationOverview && [
    { icon: Droplets, color: "text-blue-500", label: "Today's Water Use", value: `${irrigationOverview.todayWaterUseL.toLocaleString()} L`, delta: irrigationOverview.todayWaterUseDeltaPct, goodDirection: "down" },
    { icon: Calendar, color: "text-brand", label: "Irrigation Events", value: irrigationOverview.irrigationEventsCount, delta: irrigationOverview.irrigationEventsDeltaPct, goodDirection: "up" },
    { icon: Clock, color: "text-amber-500", label: "Total Irrigation Time", value: irrigationOverview.totalIrrigationTimeLabel, delta: irrigationOverview.totalIrrigationTimeDeltaPct, goodDirection: "down" },
    { icon: TrendingUp, color: "text-brand", label: "Efficiency Score", value: `${irrigationOverview.efficiencyScorePct}%`, delta: irrigationOverview.efficiencyScoreDeltaPct, goodDirection: "up" },
  ];

  const chartData = irrigationOverview?.waterUseSeries.hours.map((h, i) => ({
    hour: h,
    today: irrigationOverview.waterUseSeries.today[i],
    yesterday: irrigationOverview.waterUseSeries.yesterday[i],
  }));

  return (
    <div className="space-y-3">
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h2 className="text-sm font-bold text-ink">SYSTEM MODE</h2>
            <Info size={13} className="text-muted" />
          </div>
          <p className="text-xs text-muted">
            Automatic mode lets the AI trigger irrigation. Manual mode requires you to trigger each bed yourself.
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {beds.map((bed) => {
          const s = stateStyles[bed.state] || stateStyles.optimal;
          return (
            <div key={bed.id} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink">{bed.name}</h3>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badgeText}`}
                    style={{ backgroundColor: `${STATE_HEX[bed.state] || STATE_HEX.optimal}1a` }}
                  >
                    {STATE_LABEL[bed.state] || STATE_LABEL.optimal}
                  </span>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-card transition-colors">
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Droplets size={16} className="text-muted" />
                <p className="text-3xl font-bold text-ink">{bed.vwc}%</p>
              </div>
              <p className="text-xs text-muted mb-2">Soil Moisture</p>

              <ProgressBar percent={bed.vwc} color={s.bar} />

              <div className="flex items-center gap-1 text-xs text-muted mt-2 mb-4">
                <ChevronRight size={12} />
                <span>Target Range: {targetRange}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-100">
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Calendar size={11} /> Last Irrigation</div>
                  <p className="text-xs font-semibold text-ink">{bed.lastIrrigation}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Clock size={11} /> Duration</div>
                  <p className="text-xs font-semibold text-ink">{bed.durationMin} min</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-muted mb-1"><Droplets size={11} /> Water Used</div>
                  <p className="text-xs font-semibold text-ink">{bed.waterUsedL.toLocaleString()} L</p>
                </div>
              </div>

              <button
                disabled={mode === "automatic"}
                className={`w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-3 transition-colors ${
                  mode === "automatic"
                    ? "bg-card text-muted cursor-not-allowed"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                <Play size={15} />
                Trigger Irrigation Now
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-3 shrink-0">
            <h3 className="text-xs font-bold text-ink">IRRIGATION OVERVIEW</h3>
            <Info size={13} className="text-muted" />
          </div>

          {overviewTiles && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 shrink-0">
              {overviewTiles.map((t) => (
                <div key={t.label} className="bg-card rounded-xl p-3">
                  <t.icon size={16} className={`${t.color} mb-2`} />
                  <p className="text-lg font-bold text-ink leading-none">{t.value}</p>
                  <p className="text-[11px] text-muted mt-1">{t.label}</p>
                  <div className="mt-1"><DeltaTag value={t.delta} goodDirection={t.goodDirection} /></div>
                </div>
              ))}
            </div>
          )}

          {chartData && (
            <div className="relative flex-1 min-h-[150px]">
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

        <div className="flex flex-col">
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 mb-3 shrink-0">
              <h3 className="text-xs font-bold text-ink">BED MOISTURE MAP</h3>
              <Info size={13} className="text-muted" />
            </div>
            <div className="flex-1 flex gap-1 rounded-xl overflow-hidden min-h-[96px]">
              {beds.map((bed) => {
                const hex = STATE_HEX[bed.state] || STATE_HEX.optimal;
                return (
                  <div key={bed.id} className="flex-1 flex items-center justify-center" style={{ backgroundColor: `${hex}1a` }}>
                    <div
                      className="w-11 h-11 rounded-full bg-white shadow flex flex-col items-center justify-center border-2"
                      style={{ borderColor: hex }}
                    >
                      <span className="text-[10px] font-bold text-ink leading-none">{bed.id}</span>
                      <span className="text-[10px] font-bold text-ink leading-none mt-0.5">{bed.vwc}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3">
              {Object.entries(STATE_LABEL).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATE_HEX[key] }} />
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
