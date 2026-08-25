import { useState } from "react";
import {
  Power, Battery, Sun, Zap, BatteryCharging, Gauge, Leaf, TrendingUp, TrendingDown, Info,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import SolarTrackerCard from "../components/energy/SolarTrackerCard";

const sourceIconMap = { solar: Sun, battery: Battery, grid: Zap };
const sourceLabelMap = { solar: "Solar", battery: "Battery", grid: "Grid (ZESA)" };
const sourceColorMap = { solar: "text-amber-500", battery: "text-blue-500", grid: "text-red-500" };
const sourceHexMap = { solar: "#f59e0b", battery: "#3b82f6", grid: "#ef4444" };
const sourceBarMap = { solar: "bg-amber-300", battery: "bg-blue-300", grid: "bg-red-300" };

const statIconMap = {
  "Solar Energy Generated": Sun,
  "Grid Energy Used": Zap,
  "Battery Discharge": Battery,
  "Battery Charge": BatteryCharging,
  "Self Consumption": Gauge,
  "CO2 Avoided": Leaf,
};
const statColorMap = {
  "Solar Energy Generated": "text-amber-500",
  "Grid Energy Used": "text-red-500",
  "Battery Discharge": "text-blue-500",
  "Battery Charge": "text-blue-500",
  "Self Consumption": "text-brand",
  "CO2 Avoided": "text-brand",
};

function buildRanges(entries) {
  if (!entries?.length) return [];
  const ranges = [];
  const last = entries[entries.length - 1];
  if (entries[0].time !== "00:00") {
    ranges.push({ start: "00:00", end: entries[0].time, source: last.source });
  }
  entries.forEach((entry, i) => {
    const end = i < entries.length - 1 ? entries[i + 1].time : "24:00";
    ranges.push({ start: entry.time, end, source: entry.source });
  });
  return ranges;
}

function DeltaTag({ value, goodDirection = "up" }) {
  const isUp = value >= 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold shrink-0 ${isGood ? "text-brand" : "text-red-500"}`}>
      <Icon size={12} />
      {Math.abs(value)}%
    </span>
  );
}

export default function EnergyManagement({ kpis, energyHistory, energyOverview, onNavigate }) {
  const [showDetailedTimeline, setShowDetailedTimeline] = useState(false);

  const ranges = buildRanges(energyHistory?.today);
  const hourly = energyHistory?.hourly || [];

  const chartData = energyOverview?.powerConsumption.series.hours.map((h, i) => ({
    hour: h,
    today: energyOverview.powerConsumption.series.today[i],
    yesterday: energyOverview.powerConsumption.series.yesterday[i],
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Power size={18} className="text-amber-500" />
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Active Source</p>
          </div>
          <p className="text-3xl font-bold text-amber-500">{energyOverview?.activeSource.label ?? kpis.energySource}</p>
          <p className="text-sm text-muted mt-1">ATS auto-switching enabled</p>
          {energyOverview?.activeSource.status && (
            <span className="inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full text-brand" style={{ backgroundColor: "#16a34a1a" }}>
              {energyOverview.activeSource.status}
            </span>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Battery size={18} className="text-blue-500" />
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Battery Level</p>
          </div>
          <p className="text-3xl font-bold text-ink">{kpis.batteryPct}%</p>
          <div className="w-full h-2 bg-card rounded-full overflow-hidden mt-3">
            <div className="h-full bg-blue-500" style={{ width: `${kpis.batteryPct}%` }} />
          </div>
          {energyOverview?.battery && (
            <p className="text-xs text-muted mt-3">
              Voltage: {energyOverview.battery.voltage} V &middot; Current: {energyOverview.battery.currentA} A &middot; Temp: {energyOverview.battery.tempC}&deg;C
            </p>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sun size={18} className="text-amber-500" />
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Solar Panel</p>
          </div>
          <p className="text-3xl font-bold text-ink">{energyOverview?.solarPanel.ratedW ?? 60}W</p>
          <p className="text-sm text-muted mt-1">Rated capacity</p>
          {energyOverview?.solarPanel && (
            <p className="text-xs text-muted mt-3">
              Voltage: {energyOverview.solarPanel.voltage} V &middot; Current: {energyOverview.solarPanel.currentA} A &middot; Efficiency: {energyOverview.solarPanel.efficiencyPct}%
            </p>
          )}
        </div>
      </div>

      <SolarTrackerCard />

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-brand" />
            <h2 className="text-sm font-bold text-ink">TODAY'S POWER SOURCE TIMELINE</h2>
          </div>
          <button
            onClick={() => setShowDetailedTimeline((v) => !v)}
            className="text-xs font-bold text-brand hover:underline"
          >
            {showDetailedTimeline ? "Hide Detailed Timeline" : "View Full Timeline"}
          </button>
        </div>

        {!showDetailedTimeline ? (
          <div className="flex items-center gap-2">
            {ranges.map((r, i) => {
              const Icon = sourceIconMap[r.source] || Sun;
              return (
                <div
                  key={i}
                  className="flex-1 text-center border border-gray-100 rounded-lg py-3"
                  style={{ backgroundColor: `${sourceHexMap[r.source] || "#9ca3af"}1a` }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Icon size={14} className={sourceColorMap[r.source] || "text-muted"} />
                    <span className="text-xs font-bold text-ink">{sourceLabelMap[r.source] || r.source}</span>
                  </div>
                  <p className="text-[11px] text-muted">{r.start} &ndash; {r.end}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-end gap-0.5">
            {hourly.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour} — ${sourceLabelMap[h.source]}`}>
                <div className={`w-full h-8 rounded ${sourceBarMap[h.source] || "bg-gray-200"}`} />
                <span className="text-[9px] text-muted">{h.hour}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted mt-4">
          ATS automatically transfers between sources to ensure uninterrupted operation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-3 shrink-0">
            <h3 className="text-xs font-bold text-ink">POWER CONSUMPTION (TODAY)</h3>
            <Info size={13} className="text-muted" />
          </div>

          {energyOverview?.powerConsumption && (
            <div className="flex items-end gap-3 mb-3 shrink-0">
              <div>
                <p className="text-3xl font-bold text-ink leading-none">{energyOverview.powerConsumption.totalKwhToday} kWh</p>
                <p className="text-xs text-muted mt-1">Total Energy Used</p>
              </div>
              <DeltaTag value={energyOverview.powerConsumption.totalDeltaPct} goodDirection="down" />
            </div>
          )}

          {chartData && (
            <div className="relative flex-1 min-h-[130px]">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                    <Line type="monotone" dataKey="today" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="yesterday" stroke="#86efac" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {energyOverview?.powerConsumption && (
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100 shrink-0">
              <div>
                <p className="text-[11px] text-muted">Peak Usage</p>
                <p className="text-sm font-bold text-ink">{energyOverview.powerConsumption.peakKw} kW</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Average Usage</p>
                <p className="text-sm font-bold text-ink">{energyOverview.powerConsumption.avgKw} kW</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-3 shrink-0">
            <h3 className="text-xs font-bold text-ink">ENERGY STATISTICS</h3>
            <Info size={13} className="text-muted" />
          </div>
          <div className="space-y-3 flex-1">
            {energyOverview?.stats.map((s) => {
              const Icon = statIconMap[s.label] || Zap;
              return (
                <div key={s.label} className="flex items-center gap-2.5">
                  <Icon size={16} className={`${statColorMap[s.label] || "text-muted"} shrink-0`} />
                  <p className="text-xs text-ink flex-1 min-w-0 truncate">{s.label}</p>
                  <p className="text-xs font-bold text-ink shrink-0">{s.value}</p>
                  <DeltaTag value={s.deltaPct} goodDirection={s.goodDirection} />
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate?.("reports")}
            className="w-full mt-3 text-xs font-bold text-ink border border-gray-200 rounded-xl py-2.5 hover:bg-card transition-colors shrink-0"
          >
            View Detailed Report
          </button>
        </div>
      </div>
    </div>
  );
}
