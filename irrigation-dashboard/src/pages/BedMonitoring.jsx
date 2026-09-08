import {
  Sprout, ShieldAlert, AlertTriangle, CheckCircle2, Droplets, Droplet, Eye, Check,
  Clock, MapPin,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea } from "recharts";
import { bedTargets } from "../lib/cropTargets";

const STATE_STYLE = {
  critical: {
    hex: "#ef4444", badgeText: "text-[var(--color-danger)]", label: "Critical",
    icon: AlertTriangle, message: "Moisture below trigger threshold",
    actionLabel: "Start Irrigation", actionIcon: Droplet, filled: true,
    recommend: (vwc, t) =>
      `Moisture is critically low at ${vwc}% — below the ${t.crop || "crop"} trigger of ${t.vwcTrigger}%. Start irrigation immediately.`,
  },
  "needs-water": {
    hex: "#f59e0b", badgeText: "text-[var(--color-warn)]", label: "Needs Water",
    icon: AlertTriangle, message: "Moisture below optimal range",
    actionLabel: "Monitor", actionIcon: Eye, filled: false,
    recommend: (vwc, t) =>
      `At ${vwc}%, moisture is below the ${t.crop ? `${t.crop} ` : ""}optimal band (${t.vwcOptimalMin}–${t.vwcOptimalMax}%). Irrigate in the next cycle.`,
  },
  optimal: {
    hex: "#16a34a", badgeText: "text-[var(--color-brand-text)]", label: "Optimal",
    icon: CheckCircle2, message: "Moisture within optimal range",
    actionLabel: "No Action Required", actionIcon: Check, filled: false,
    recommend: (vwc, t) =>
      `At ${vwc}%, moisture is within the ${t.crop ? `${t.crop} ` : ""}optimal band (${t.vwcOptimalMin}–${t.vwcOptimalMax}%). No irrigation required.`,
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
          <div className="bg-[var(--color-border-strong)]" style={{ width: `${Math.max(0, 100 - optMax)}%` }} />
        </div>
        <div className="relative h-3 mt-1.5 text-[10px] text-[var(--color-muted)]">
          {[...new Set([0, trigger, optMin, optMax, 100])]
            .sort((a, b) => a - b)
            .map((tick) => (
              <span
                key={tick}
                className="absolute tabular-nums"
                style={{
                  left: `${tick}%`,
                  transform:
                    tick === 0 ? "none" : tick === 100 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {tick}%
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
  const t = bedTargets(bed, systemInfo);

  return (
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[var(--color-ink)] whitespace-nowrap">
          {bed.name}{t.crop ? `: ${t.crop}` : ""}
        </h3>
        <span className={`text-sm font-bold lowercase first-letter:uppercase whitespace-nowrap ${s.badgeText}`}>
          {s.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <Droplets size={14} className="text-[var(--color-muted)]" />
        <p className="text-xs text-[var(--color-muted)]">Soil Moisture (VWC)</p>
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color: s.hex }}>{bed.vwc}%</p>

      <RangeBar vwc={bed.vwc} trigger={t.vwcTrigger} optMin={t.vwcOptimalMin} optMax={t.vwcOptimalMax} color={s.hex} />

      <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mt-3 pt-3 border-t border-[var(--color-border)]">
        <span>{t.crop ? `${t.crop} optimal` : "Optimal range"}: {t.vwcOptimalMin}% - {t.vwcOptimalMax}%</span>
        <span>Trigger: &lt; {t.vwcTrigger}%</span>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: s.hex }}>
        <Icon size={14} className="shrink-0" /> {s.message}
      </div>

      <button
        onClick={() => onNavigate?.("irrigation")}
        className={`w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-2.5 mt-4 transition-colors ${
          s.filled ? "text-white hover:opacity-90" : "border hover:bg-[var(--color-surface-2)]"
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
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex flex-col">
      <h3 className="text-sm font-bold text-[var(--color-ink)] mb-3 shrink-0">
        Moisture Trend <span className="text-[var(--color-muted)] font-normal text-xs">(Last 12 Hours)</span>
      </h3>
      <div className="relative flex-1 min-h-[180px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              {beds.map((b) => {
                const bt = bedTargets(b, systemInfo);
                return (
                  <ReferenceArea
                    key={`band-${b.id}`}
                    y1={bt.vwcOptimalMin}
                    y2={bt.vwcOptimalMax}
                    fill={STATE_STYLE[b.state]?.hex || STATE_STYLE.optimal.hex}
                    fillOpacity={0.06}
                    strokeOpacity={0}
                  />
                );
              })}
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
            <span className="text-[var(--color-muted)]">
              {b.name}{bedTargets(b, systemInfo).crop ? `: ${bedTargets(b, systemInfo).crop}` : ""}
            </span>
            <span className="font-bold text-[var(--color-ink)]">{b.vwc}%</span>
          </div>
        ))}
      </div>
      {systemInfo && (
        <p className="text-[11px] text-[var(--color-muted)] mt-2 text-center shrink-0">
          Shaded bands show each crop's optimal moisture range
        </p>
      )}
    </div>
  );
}

function RecommendedActions({ beds, systemInfo, onNavigate }) {
  return (
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Sprout size={16} className="text-brand" />
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Recommended Actions</h3>
      </div>
      <div className="space-y-2 flex-1">
        {beds.map((bed) => {
          const s = STATE_STYLE[bed.state] || STATE_STYLE.optimal;
          const Icon = s.icon;
          const t = bedTargets(bed, systemInfo);
          return (
            <div key={bed.id} className="rounded-xl p-3 border-l-4" style={{ borderColor: s.hex, backgroundColor: `${s.hex}0d` }}>
              <div className="flex items-start gap-2">
                <Icon size={15} className="shrink-0 mt-0.5" style={{ color: s.hex }} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--color-ink)]">
                    {bed.name}{t.crop ? `: ${t.crop}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-snug">{s.recommend(bed.vwc, t)}</p>
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
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Clock size={16} className="text-brand" />
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Recent Activity</h3>
      </div>
      <div className="space-y-3 flex-1">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: ACTIVITY_COLOR[item.color] || ACTIVITY_COLOR.blue }}
            />
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--color-muted)]">{item.time}</p>
              <p className="text-xs font-semibold text-[var(--color-ink)] leading-snug">{item.title}</p>
              <p className="text-[11px] text-[var(--color-muted)]">{item.subtitle}</p>
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
          <div key={s.label} className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex items-center gap-3">
            <s.Icon size={26} className="shrink-0" style={{ color: s.hex }} />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-[var(--color-ink)] leading-none">{s.value}</p>
              <p className="text-xs font-bold text-[var(--color-ink)] mt-1">{s.label}</p>
              <p className="text-[11px] text-[var(--color-muted)]">{s.sublabel}</p>
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
        <RecommendedActions beds={beds} systemInfo={systemInfo} onNavigate={onNavigate} />
        <RecentActivity items={bedActivity} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
