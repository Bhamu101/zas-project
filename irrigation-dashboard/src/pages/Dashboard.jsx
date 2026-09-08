import BedMoisture from "../components/dashboard/BedMoisture";
import EnergyPanel from "../components/dashboard/EnergyPanel";
import FarmerAdvisory from "../components/dashboard/FarmerAdvisory";
import RecentAlerts from "../components/dashboard/RecentAlerts";
import Sparkline from "../components/dashboard/Sparkline";
import StatCard from "../components/dashboard/StatCard";
import SystemStatusStrip from "../components/dashboard/SystemStatusStrip";
import WaterUseChart from "../components/dashboard/WaterUseChart";

// The operational home page.
//
// This replaces a full-screen photo slideshow that ignored its `data` prop
// entirely — the landing page of an irrigation platform showed nothing about
// the farm. The pieces used here (StatCard, Sparkline, RecentAlerts,
// FarmerAdvisory) already existed in the codebase but were never imported
// anywhere; this wires them up rather than reinventing them.
//
// Reading order is deliberate: is anything wrong -> today's headline numbers ->
// water use -> beds -> power -> advice and alerts.

export default function Dashboard({ data, onNavigate }) {
  const { kpis, extendedStats, irrigationOverview, energyOverview, sparkline, beds, alerts } = data;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      <SystemStatusStrip
        systemStatus={data.systemStatus}
        kpis={kpis}
        systemInfo={data.systemInfo}
        alerts={alerts}
        onNavigate={onNavigate}
      />

      {/* Headline numbers. Each carries its own 8-point trend so a value is
          readable as rising or falling without opening another page. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Water used today"
          value={`${(kpis?.waterUsedTodayL ?? 0).toLocaleString()} L`}
          sublabel={`${kpis?.waterTargetPct ?? 0}% of daily target`}
        >
          <Sparkline data={sparkline?.water ?? []} color="#3b82f6" />
        </StatCard>

        <StatCard
          label="Water saved"
          value={`${(extendedStats?.totalWaterSavedL ?? 0).toLocaleString()} L`}
          sublabel={extendedStats?.totalWaterSavedPeriod ?? ""}
          valueColor="text-green-700"
        >
          <Sparkline data={sparkline?.irrigation ?? []} color="#16a34a" />
        </StatCard>

        <StatCard
          label="Avg soil moisture"
          value={`${kpis?.soilMoistureAvg ?? 0}%`}
          sublabel={`Optimal ${data.systemInfo?.vwcOptimalMin ?? 0}–${data.systemInfo?.vwcOptimalMax ?? 0}%`}
        >
          <Sparkline data={sparkline?.moisture ?? []} color="#f59e0b" />
        </StatCard>

        <StatCard
          label="Crop health"
          value={`${extendedStats?.cropHealthScorePct ?? 0}%`}
          sublabel={extendedStats?.cropHealthLabel ?? ""}
          valueColor="text-green-700"
        >
          <Sparkline data={sparkline?.energy ?? []} color="#16a34a" />
        </StatCard>
      </div>

      <WaterUseChart
        series={irrigationOverview?.waterUseSeries}
        totalL={irrigationOverview?.todayWaterUseL}
        deltaPct={irrigationOverview?.todayWaterUseDeltaPct}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BedMoisture beds={beds} onNavigate={onNavigate} />
        <EnergyPanel
          energyOverview={energyOverview}
          generatedKwhToday={extendedStats?.energyGeneratedKwhToday}
          onNavigate={onNavigate}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FarmerAdvisory advisory={data.farmerAdvisory} />
        <RecentAlerts alerts={alerts ?? []} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
