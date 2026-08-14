import { Droplet, ShowerHead, Sun, Zap, Sprout } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ProgressBar from "../components/dashboard/ProgressBar";
import BatteryGauge from "../components/dashboard/BatteryGauge";
import TankGauge from "../components/dashboard/TankGauge";
import SoilMoistureChart from "../components/dashboard/SoilMoistureChart";
import FarmerAdvisory from "../components/dashboard/FarmerAdvisory";
import RecentAlerts from "../components/dashboard/RecentAlerts";
import WeatherToday from "../components/dashboard/WeatherToday";
import TrendChart from "../components/dashboard/TrendChart";

function lastNDayLabels(n) {
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return labels;
}

export default function Dashboard({ data }) {
  const { kpis, beds, alerts, extendedStats, farmerAdvisory, systemInfo, sparkline } = data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Droplet} iconColor="text-brand" label="Soil Moisture (Avg)" value={`${kpis.soilMoistureAvg}%`} sublabel="Across 3 beds">
          <ProgressBar percent={kpis.soilMoistureAvg} color="bg-brand" />
        </StatCard>

        <StatCard icon={ShowerHead} iconColor="text-brand" label="Irrigation Status" value={kpis.irrigationStatus} valueColor="text-ink" sublabel={`Next cycle in ${kpis.nextCycle}`}>
          <ProgressBar percent={kpis.cycleProgressPct} color="bg-brand" />
          <p className="text-[11px] text-muted mt-1 text-right">{kpis.cycleProgressPct}% to next cycle</p>
        </StatCard>

        <StatCard icon={Sun} iconColor="text-amber-500" label="Energy Status" value={kpis.energySource} valueColor="text-ink" sublabel={`Battery: ${kpis.batteryPct}%`}>
          <div className="mt-1"><BatteryGauge percent={kpis.batteryPct} /></div>
        </StatCard>

        <StatCard icon={Droplet} iconColor="text-blue-500" label="Water Usage (Today)" value={`${kpis.waterUsedTodayL.toLocaleString()} L`} sublabel={`${kpis.waterTargetPct}% of daily target`} sublabelColor="text-blue-500">
          <div className="mt-1 flex justify-center"><TankGauge percent={kpis.waterTargetPct} size={40} /></div>
        </StatCard>

        {extendedStats && (
          <StatCard
            icon={Zap}
            iconColor="text-amber-500"
            label="Energy Generated"
            value={`${extendedStats.energyGeneratedKwhToday} kWh`}
            sublabel="Today"
            sublabelColor="text-amber-600"
          />
        )}
      </div>

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="lg:col-span-2">
          <SoilMoistureChart beds={beds} systemInfo={systemInfo} />
        </div>
        <div>
          <RecentAlerts alerts={alerts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <div className="lg:col-span-2">
          <WeatherToday />
        </div>
        <div>
          <FarmerAdvisory advisory={farmerAdvisory} />
        </div>
      </div>

      {sparkline && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <TrendChart
            icon={Droplet}
            title="WATER CONSUMPTION (7 DAYS)"
            unit="Litre"
            labels={lastNDayLabels(sparkline.water.length)}
            data={sparkline.water}
            color="#3b82f6"
            valueLabel={`${sparkline.water[sparkline.water.length - 1].toLocaleString()} L`}
          />
          <TrendChart
            icon={Zap}
            title="ENERGY GENERATION (7 DAYS)"
            unit="kWh"
            labels={lastNDayLabels(sparkline.energyGeneratedKwh.length)}
            data={sparkline.energyGeneratedKwh}
            color="#f59e0b"
            valueLabel={`${sparkline.energyGeneratedKwh[sparkline.energyGeneratedKwh.length - 1]} kWh`}
          />
          <TrendChart
            icon={Sprout}
            title="SOIL MOISTURE TREND (7 DAYS)"
            unit="%"
            labels={lastNDayLabels(sparkline.moisture.length)}
            data={sparkline.moisture}
            color="#16a34a"
            valueLabel={`${sparkline.moisture[sparkline.moisture.length - 1]}%`}
          />
        </div>
      )}
    </div>
  );
}