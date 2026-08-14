import { useState } from "react";
import {
  Droplet, Zap, Sprout, Leaf, TrendingUp, TrendingDown, Calendar, Filter, Download,
  Lightbulb, FileText, X, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const COLOR_HEX = { brand: "#16a34a", amber: "#f59e0b", red: "#ef4444", gray: "#9ca3af" };
const insightIconMap = { droplet: Droplet, zap: Zap, leaf: Leaf };
const reportIconMap = { irrigation: Droplet, energy: Zap, yield: Sprout, environmental: Leaf };
const reportColorMap = {
  irrigation: "text-blue-500",
  energy: "text-amber-500",
  yield: "text-brand",
  environmental: "text-brand",
};

function DeltaLine({ value, goodDirection = "down" }) {
  const isDown = value < 0;
  const isGood = goodDirection === "down" ? isDown : !isDown;
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <p className={`text-xs mt-1 flex items-center gap-1 ${isGood ? "text-brand" : "text-red-500"}`}>
      <Icon size={12} />
      {Math.abs(value)}% vs last season
    </p>
  );
}

function SeriesChart({ title, Icon, iconColor, series, strokeColor, gradientId }) {
  if (!series) return null;
  const data = series.labels.map((label, i) => ({
    label,
    thisSeason: series.thisSeason[i],
    lastSeason: series.lastSeason[i],
  }));

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h3 className="text-xs font-bold text-ink">{title}</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: strokeColor }} /> This Season
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full opacity-40" style={{ backgroundColor: strokeColor, borderTop: `1px dashed ${strokeColor}` }} /> Last Season
          </span>
        </div>
      </div>
      <div className="relative flex-1 min-h-[180px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Area type="monotone" dataKey="thisSeason" stroke={strokeColor} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
              <Area type="monotone" dataKey="lastSeason" stroke={strokeColor} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="5 4" fill="transparent" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function IrrigationEventsCard({ breakdown, total }) {
  if (!breakdown?.length) return null;
  const data = breakdown.map((b) => ({ name: b.label, value: b.count, hex: COLOR_HEX[b.color] }));

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Sprout size={16} className="text-brand" />
        <h3 className="text-xs font-bold text-ink">IRRIGATION EVENTS</h3>
      </div>
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.hex} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-bold text-ink leading-none">{total}</p>
            <p className="text-[10px] text-muted mt-0.5">Total</p>
          </div>
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR_HEX[b.color] }} />
                {b.label}
              </span>
              <span className="font-semibold text-ink shrink-0">{b.count} ({b.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
      <button className="text-xs font-bold text-brand hover:underline mt-3 shrink-0 text-left">
        View All Events &rarr;
      </button>
    </div>
  );
}

function WaterUseByZoneCard({ zones }) {
  if (!zones?.length) return null;
  const max = Math.max(...zones.map((z) => z.m3));

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Droplet size={16} className="text-blue-500" />
        <h3 className="text-xs font-bold text-ink">WATER USE BY ZONE</h3>
      </div>
      <div className="space-y-3 flex-1">
        {zones.map((z) => (
          <div key={z.zone}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">{z.zone}</span>
              <span className="font-semibold text-ink">{z.m3.toLocaleString()} m&sup3;</span>
            </div>
            <div className="w-full h-2 bg-card rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(z.m3 / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <button className="text-xs font-bold text-brand hover:underline mt-3 shrink-0 text-left">
        View Zone Report &rarr;
      </button>
    </div>
  );
}

function TopInsightsCard({ insights }) {
  if (!insights?.length) return null;

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Lightbulb size={16} className="text-brand" />
        <h3 className="text-xs font-bold text-ink">TOP INSIGHTS</h3>
      </div>
      <div className="space-y-3 flex-1">
        {insights.map((ins, i) => {
          const Icon = insightIconMap[ins.icon] || Lightbulb;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <Icon size={16} className="text-brand shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink leading-snug">{ins.headline}</p>
                <p className="text-[11px] text-muted mt-0.5">{ins.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>
      <button className="text-xs font-bold text-brand hover:underline mt-3 shrink-0 text-left">
        View Full Report &rarr;
      </button>
    </div>
  );
}

export default function DataReports({ seasonSummary, dataReports }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const stats = [
    { key: "water", icon: Droplet, color: "text-blue-500", hex: "#3b82f6", label: "Water Used", value: `${seasonSummary.waterUsedM3.toLocaleString()} m³`, delta: seasonSummary.waterUsedDeltaPct, goodDirection: "down" },
    { key: "energy", icon: Zap, color: "text-amber-500", hex: "#f59e0b", label: "Energy Used", value: `${seasonSummary.energyUsedKwh.toLocaleString()} kWh`, delta: seasonSummary.energyUsedDeltaPct, goodDirection: "down" },
    { key: "events", icon: Sprout, color: "text-brand", hex: "#16a34a", label: "Irrigation Events", value: seasonSummary.irrigationEvents, delta: seasonSummary.irrigationEventsDeltaPct, goodDirection: "down" },
    { key: "yield", icon: Leaf, color: "text-brand", hex: "#16a34a", label: "Est. Yield", value: `${seasonSummary.estYieldTha} t/ha`, delta: seasonSummary.estYieldDeltaPct, goodDirection: "up" },
    { key: "target", icon: TrendingUp, color: "text-brand", hex: "#16a34a", label: "Yield vs Target", value: `${seasonSummary.yieldTargetPct}%`, delta: seasonSummary.yieldTargetDeltaPct, goodDirection: "up" },
  ];

  const reportCards = dataReports
    ? Object.entries(dataReports.reports).map(([key, r]) => ({ key, ...r }))
    : [];
  const activeDetail = selectedReport && dataReports?.reports[selectedReport];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Data & Reports</h1>
          <p className="text-sm text-muted mt-1">Analyse performance and generate insights for your irrigation system.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-sm font-medium text-ink border border-gray-200 rounded-xl px-4 py-2.5 bg-surface">
            <Calendar size={15} className="text-muted" /> {dataReports?.dateRangeLabel}
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-ink border border-gray-200 rounded-xl px-4 py-2.5 bg-surface">
            <Filter size={15} className="text-muted" /> Filters
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 transition-colors">
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-brand" />
          <h2 className="text-sm font-bold text-ink">SEASON DATA SUMMARY</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div key={s.key} className="rounded-xl p-4" style={{ backgroundColor: `${s.hex}14` }}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} className={s.color} />
                <p className="text-xs text-muted">{s.label}</p>
              </div>
              <p className="text-xl font-bold text-ink">{s.value}</p>
              <DeltaLine value={s.delta} goodDirection={s.goodDirection} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SeriesChart
          title="WATER USAGE OVER TIME"
          Icon={Droplet}
          iconColor="text-blue-500"
          series={dataReports?.waterUsageSeries}
          strokeColor="#3b82f6"
          gradientId="waterGradient"
        />
        <SeriesChart
          title="ENERGY USAGE OVER TIME"
          Icon={Zap}
          iconColor="text-amber-500"
          series={dataReports?.energyUsageSeries}
          strokeColor="#f59e0b"
          gradientId="energyGradient"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        <IrrigationEventsCard breakdown={dataReports?.irrigationEventsBreakdown} total={seasonSummary.irrigationEvents} />
        <WaterUseByZoneCard zones={dataReports?.waterUseByZone} />
        <TopInsightsCard insights={dataReports?.topInsights} />
      </div>

      {dataReports && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-brand" />
            <div>
              <h2 className="text-sm font-bold text-ink">REPORTS</h2>
              <p className="text-xs text-muted">Generate and download detailed reports.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {reportCards.map((r) => {
              const Icon = reportIconMap[r.key] || FileText;
              return (
                <button
                  key={r.key}
                  onClick={() => setSelectedReport(r.key)}
                  className="text-left border border-gray-100 rounded-xl p-4 hover:bg-card transition-colors"
                >
                  <Icon size={20} className={reportColorMap[r.key] || "text-muted"} />
                  <p className="text-sm font-bold text-ink mt-2">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5">{r.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeDetail && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = reportIconMap[selectedReport] || FileText;
                  return <Icon size={22} className={reportColorMap[selectedReport] || "text-muted"} />;
                })()}
                <div>
                  <h3 className="text-base font-bold text-ink">{activeDetail.title}</h3>
                  <p className="text-xs text-muted">{activeDetail.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-muted hover:bg-card transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted leading-relaxed mt-4">{activeDetail.summary}</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {activeDetail.rows.map((row) => (
                <div key={row.label} className="bg-card rounded-xl p-3">
                  <p className="text-[11px] text-muted">{row.label}</p>
                  <p className="text-sm font-bold text-ink mt-1">{row.value}</p>
                </div>
              ))}
            </div>

            <button className="w-full mt-5 flex items-center justify-center gap-2 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl py-3 transition-colors">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
