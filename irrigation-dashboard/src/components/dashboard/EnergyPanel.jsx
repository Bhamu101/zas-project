import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { GLASS_CARD } from "../../lib/glass";
import BatteryGauge from "./BatteryGauge";
import StatusPill from "../ui/StatusPill";

// Solar / battery / grid at a glance, plus power draw through the day.
// Which source is currently carrying the farm is the headline — that's what
// decides whether now is a cheap time to run a cycle.

const SOURCE_TONE = { Solar: "ok", Battery: "info", Grid: "warn" };

export default function EnergyPanel({ energyOverview, generatedKwhToday, onNavigate }) {
  const source = energyOverview?.activeSource;
  const battery = energyOverview?.battery;
  const solar = energyOverview?.solarPanel;
  const consumption = energyOverview?.powerConsumption;

  const hours = consumption?.series?.hours ?? [];
  const data = hours.map((hour, i) => ({
    hour,
    kw: consumption?.series?.today?.[i] ?? 0,
  }));

  const batteryPct = battery?.pct;
  const batteryTone =
    typeof batteryPct !== "number" ? "offline" : batteryPct > 50 ? "ok" : batteryPct > 20 ? "warn" : "critical";

  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Power</h3>
        <button
          type="button"
          onClick={() => onNavigate?.("energy")}
          className="shrink-0 text-xs font-semibold text-[var(--color-brand-text)] hover:underline"
        >
          Details
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Running on</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xl font-bold leading-none text-[var(--color-ink)]">{source?.label ?? "—"}</span>
            {source?.status && (
              <StatusPill tone={SOURCE_TONE[source.label] ?? "info"} label={source.status} />
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Battery</p>
          <div className="mt-0.5 flex items-center gap-2">
            <BatteryGauge percent={batteryPct ?? 0} />
            <span className="text-sm font-bold tabular-nums text-[var(--color-ink)]">
              {typeof batteryPct === "number" ? `${batteryPct}%` : "—"}
            </span>
            {/* Only shown when it needs acting on — a healthy battery doesn't
                need a badge competing for attention. */}
            {batteryTone !== "ok" && (
              <StatusPill
                tone={batteryTone}
                label={
                  batteryTone === "offline"
                    ? "No reading"
                    : batteryTone === "critical"
                      ? "Low"
                      : "Draining"
                }
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Generated</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-ink)]">
            {generatedKwhToday ?? "—"} kWh
          </p>
        </div>
        <div className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Used today</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-ink)]">
            {consumption?.totalKwhToday ?? "—"} kWh
          </p>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-3 h-[92px] shrink-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Power draw (kW)
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="powerDraw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v} kW`, "Draw"]}
              />
              <Area
                type="monotone"
                dataKey="kw"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#powerDraw)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {solar && (
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          Panel {solar.voltage} V · {solar.currentA} A · {solar.efficiencyPct}% efficiency
        </p>
      )}
    </div>
  );
}
