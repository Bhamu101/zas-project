import {
  Sprout, ShieldAlert, AlertTriangle, CheckCircle2, Droplets, Droplet, Thermometer, Eye, Check,
  Clock, MapPin,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea } from "recharts";

const STATE_STYLE = {
  critical: {
    hex: "#ef4444", badgeText: "text-red-600", label: "Critical",
    icon: AlertTriangle, message: "Moisture below trigger threshold",
    actionLabel: "Start Irrigation", actionIcon: Droplet, filled: true,
    recommend: (vwc) => `Moisture is critically low at ${vwc}%. Start irrigation immediately.`,
  },
  "needs-water": {
    hex: "#f59e0b", badgeText: "text-amber-700", label: "Needs Water",
    icon: AlertTriangle, message: "Moisture below optimal range",
    actionLabel: "Monitor", actionIcon: Eye, filled: false,
    recommend: () => "Moisture is below the optimal range. Consider irrigation in the next cycle.",
  },
  optimal: {
    hex: "#16a34a", badgeText: "text-brand-dark", label: "Optimal",
    icon: CheckCircle2, message: "Moisture within optimal range",
    actionLabel: "No Action Required", actionIcon: Check, filled: false,
    recommend: () => "Moisture is within the optimal range. No irrigation required.",
  },
};

const ACTIVITY_COLOR = { brand: "#16a34a", blue: "#3b82f6", red: "#ef4444" };

function lastNHourLabels(n, intervalHours) {
  const labels = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * intervalHours * 3600 * 1000);
    labels.push(d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }));
  }
  return labels;
}

function RangeBar({ vwc, trigger, optMin, optMax, color }) {
  const clamped = Math.max(0, Math.min(100, vwc));
  return (
    <div className="mt-3">
      <div className="relative pt-5">
        <MapPin
          size={18}
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${clamped}%`, color }}
          fill="white"
          strokeWidth={2}
        />
        <div className="h-2.5 rounded-full overflow-hidden flex mt-4">
          <div className="bg-red-500" style={{ width: `${trigger}%` }} />
          <div className="bg-amber-500" style={{ width: `${Math.max(0, optMin - trigger)}%` }} />
          <div className="bg-brand" style={{ width: `${Math.max(0, optMax - optMin)}%` }} />
          <div className="bg-gray-200" style={{ width: `${Math.max(0, 100 - optMax)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
        <div className="relative h-3">
          {[trigger, optMin, optMax].map((t) => (
            <span key={t} className="absolute -translate-x-1/2 text-[10px] text-muted" style={{ left: `${t}%` }}>
              {t}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BedCard({ bed, systemInfo, onNavigate }) {
  const s = STATE_STYLE[bed.state] || STATE_STYLE.optimal;
  const Icon = s.icon;
  const ActionIcon = s.actionIcon;

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-ink">{bed.name}</h3>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${s.badgeText}`}
          style={{ backgroundColor: `${s.hex}1a` }}
        >
          {s.label.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Droplets size={14} className="text-muted" />
        <p className="text-xs text-muted">Soil Moisture (VWC)</p>
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color: s.hex }}>{bed.vwc}%</p>

      {systemInfo && (
        <RangeBar vwc={bed.vwc} trigger={systemInfo.vwcTrigger} optMin={systemInfo.vwcOptimalMin} optMax={systemInfo.vwcOptimalMax} color={s.hex} />
      )}

      {systemInfo && (
        <div className="flex items-center justify-between text-xs text-muted mt-3 pt-3 border-t border-gray-100">
          <span>Optimal range: {systemInfo.vwcOptimalMin}% - {systemInfo.vwcOptimalMax}%</span>
          <span>Trigger: &lt; {systemInfo.vwcTrigger}%</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Thermometer size={14} /> Soil Temperature
        </span>
        <span className="text-sm font-bold text-ink">{bed.soilTempC}&deg;C</span>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: s.hex }}>
        <Icon size={14} className="shrink-0" /> {s.message}
      </div>

      <button
        onClick={() => onNavigate?.("irrigation")}
        className={`w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-2.5 mt-4 transition-colors ${
          s.filled ? "text-white hover:opacity-90" : "border hover:bg-card"
        }`}
        style={s.filled ? { backgroundColor: s.hex } : { borderColor: s.hex, color: s.hex }}
      >
        <ActionIcon size={15} /> {s.actionLabel}
      </button>
      <button
        onClick={() => onNavigate?.("irrigation")}
        className="w-full text-center text-xs font-bold text-brand hover:underline mt-2"
      >
        View Details &rarr;
      </button>
    </div>
  );
}

function MoistureTrendChart({ beds, systemInfo }) {
  const pointCount = beds[0]?.trendVwc?.length || 0;
  const hours = lastNHourLabels(pointCount, 1.5);
  const chartData = hours.map((h, i) => {
    const point = { hour: h };
    beds.forEach((b) => { point[`bed${b.id}`] = b.trendVwc?.[i]; });
    return point;
  });

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <h3 className="text-sm font-bold text-ink mb-3 shrink-0">
        Moisture Trend <span className="text-muted font-normal text-xs">(Last 12 Hours)</span>
      </h3>
      <div className="relative flex-1 min-h-[180px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              {systemInfo && (
                <ReferenceArea
                  y1={systemInfo.vwcOptimalMin}
                  y2={systemInfo.vwcOptimalMax}
                  fill="#16a34a"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} interval={1} />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              {beds.map((b) => (
                <Line
                  key={b.id}
                  type="monotone"
                  dataKey={`bed${b.id}`}
                  stroke={STATE_STYLE[b.state]?.hex || STATE_STYLE.optimal.hex}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 shrink-0 flex-wrap">
        {beds.map((b) => (
          <div key={b.id} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATE_STYLE[b.state]?.hex }} />
            <span className="text-muted">{b.name}</span>
            <span className="font-bold text-ink">{b.vwc}%</span>
          </div>
        ))}
      </div>
      {systemInfo && (
        <p className="text-[11px] text-muted mt-2 text-center shrink-0">
          Shaded band indicates optimal range ({systemInfo.vwcOptimalMin}% - {systemInfo.vwcOptimalMax}%)
        </p>
      )}
    </div>
  );
}

function RecommendedActions({ beds, onNavigate }) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Sprout size={16} className="text-brand" />
        <h3 className="text-sm font-bold text-ink">Recommended Actions</h3>
      </div>
      <div className="space-y-2 flex-1">
        {beds.map((bed) => {
          const s = STATE_STYLE[bed.state] || STATE_STYLE.optimal;
          const Icon = s.icon;
          return (
            <div key={bed.id} className="rounded-xl p-3 border-l-4" style={{ borderColor: s.hex, backgroundColor: `${s.hex}0d` }}>
              <div className="flex items-start gap-2">
                <Icon size={15} className="shrink-0 mt-0.5" style={{ color: s.hex }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink">{bed.name}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{s.recommend(bed.vwc)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => onNavigate?.("irrigation")}
        className="text-xs font-bold text-brand hover:underline mt-3 shrink-0 text-left"
      >
        View Irrigation Control &rarr;
      </button>
    </div>
  );
}

function RecentActivity({ items = [], onNavigate }) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Clock size={16} className="text-brand" />
        <h3 className="text-sm font-bold text-ink">Recent Activity</h3>
      </div>
      <div className="space-y-3 flex-1">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: ACTIVITY_COLOR[item.color] || ACTIVITY_COLOR.blue }}
            />
            <div className="min-w-0">
              <p className="text-[10px] text-muted">{item.time}</p>
              <p className="text-xs font-semibold text-ink leading-snug">{item.title}</p>
              <p className="text-[11px] text-muted">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onNavigate?.("alerts")}
        className="text-xs font-bold text-brand hover:underline mt-3 shrink-0 text-left"
      >
        View All Alerts &rarr;
      </button>
    </div>
  );
}

export default function BedMonitoring({ beds = [], systemInfo, bedActivity = [], onNavigate }) {
  const counts = {
    critical: beds.filter((b) => b.state === "critical").length,
    needsWater: beds.filter((b) => b.state === "needs-water").length,
    optimal: beds.filter((b) => b.state === "optimal").length,
  };

  const summaryStats = [
    { label: "Beds Active", sublabel: "All systems running", value: beds.length, hex: "#16a34a", Icon: Sprout },
    { label: "Critical", sublabel: "Needs immediate action", value: counts.critical, hex: "#ef4444", Icon: ShieldAlert },
    { label: "Needs Water", sublabel: "Needs attention", value: counts.needsWater, hex: "#f59e0b", Icon: AlertTriangle },
    { label: "Optimal", sublabel: "No action required", value: counts.optimal, hex: "#16a34a", Icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <s.Icon size={26} className="shrink-0" style={{ color: s.hex }} />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-ink leading-none">{s.value}</p>
              <p className="text-xs font-bold text-ink mt-1">{s.label}</p>
              <p className="text-[11px] text-muted">{s.sublabel}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {beds.map((bed) => (
          <BedCard key={bed.id} bed={bed} systemInfo={systemInfo} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <MoistureTrendChart beds={beds} systemInfo={systemInfo} />
        <RecommendedActions beds={beds} onNavigate={onNavigate} />
        <RecentActivity items={bedActivity} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
