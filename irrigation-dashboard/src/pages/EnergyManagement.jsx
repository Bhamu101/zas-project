import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import BatteryBars from "../components/energy/BatteryBars";
import SmartPowerRecommendation from "../components/energy/SmartPowerRecommendation";
import LiveOperationsSimulator from "../components/energy/LiveOperationsSimulator";
import GridChangeoverSimulation from "../components/energy/GridChangeoverSimulation";
import EnergySavingsCard from "../components/energy/EnergySavingsCard";

function DeltaTag({ value, goodDirection = "up" }) {
  const isUp = value >= 0;
  const isGood = goodDirection === "up" ? isUp : !isUp;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold shrink-0 ${isGood ? "text-brand" : "text-red-500"}`}>
      {value >= 0 ? "+" : "−"}{Math.abs(value)}%
    </span>
  );
}

export default function EnergyManagement({ kpis, energyOverview, onNavigate }) {
  const [liveBattery, setLiveBattery] = useState(kpis.batteryPct ?? 50);
  const [atsSource, setAtsSource] = useState(null);

  const chartData = energyOverview?.powerConsumption.series.hours.map((h, i) => ({
    hour: h,
    today: energyOverview.powerConsumption.series.today[i],
    yesterday: energyOverview.powerConsumption.series.yesterday[i],
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold tracking-wide text-muted uppercase mb-3">Active Source</p>
          <p className="text-3xl font-bold text-amber-500">{energyOverview?.activeSource.label ?? kpis.energySource}</p>
          <p className="text-sm text-muted mt-1">ATS auto-switching enabled</p>
          {energyOverview?.activeSource.status && (
            <span className="inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full text-brand" style={{ backgroundColor: "#16a34a1a" }}>
              {energyOverview.activeSource.status}
            </span>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold tracking-wide text-muted uppercase mb-3">Battery Level</p>
          <p className="text-3xl font-bold text-ink">{Math.round(liveBattery)}%</p>
          <BatteryBars pct={liveBattery} className="mt-3" />
          {energyOverview?.battery && (
            <p className="text-xs text-muted mt-3">
              Voltage: {energyOverview.battery.voltage} V &middot; Current: {energyOverview.battery.currentA} A &middot; Temp: {energyOverview.battery.tempC}&deg;C
            </p>
          )}
        </div>
      </div>

      <SmartPowerRecommendation batteryPct={Math.round(liveBattery)} />

      <LiveOperationsSimulator
        batteryPct={kpis.batteryPct}
        irrigationStatus={kpis.irrigationStatus}
        activeSourceLabel={atsSource ?? energyOverview?.activeSource.label ?? kpis.energySource}
        onBatteryChange={setLiveBattery}
      />

      <GridChangeoverSimulation batteryPct={liveBattery} onSourceChange={setAtsSource} />

      <EnergySavingsCard stats={energyOverview?.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <h3 className="text-xs font-bold text-ink mb-3 shrink-0">POWER CONSUMPTION (TODAY)</h3>

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
          <h3 className="text-xs font-bold text-ink mb-3 shrink-0">ENERGY STATISTICS</h3>
          <div className="space-y-3 flex-1">
            {energyOverview?.stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <p className="text-xs text-ink flex-1 min-w-0 truncate">{s.label}</p>
                <p className="text-xs font-bold text-ink shrink-0">{s.value}</p>
                <DeltaTag value={s.deltaPct} goodDirection={s.goodDirection} />
              </div>
            ))}
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
