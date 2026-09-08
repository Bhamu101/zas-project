import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GLASS_CARD } from "../../lib/glass";

// Water use through the day, today against yesterday. Two series rather than
// one because the useful question isn't "how much did we use" but "is that
// normal for this time of day".

export default function WaterUseChart({ series, totalL, deltaPct }) {
  const hours = series?.hours ?? [];
  const data = hours.map((hour, i) => ({
    hour,
    today: series?.today?.[i] ?? 0,
    yesterday: series?.yesterday?.[i] ?? 0,
  }));

  const improved = typeof deltaPct === "number" && deltaPct < 0; // using less water is good

  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Water Use Today</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums text-[var(--color-ink)]">
            {(totalL ?? 0).toLocaleString()} L
          </span>
          {typeof deltaPct === "number" && (
            <span
              className={`text-xs font-bold ${improved ? "text-[var(--color-ok)]" : "text-[var(--color-warn)]"}`}
              title="Change vs yesterday"
            >
              {deltaPct > 0 ? "+" : ""}
              {deltaPct}% vs yesterday
            </span>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
          No water-use data recorded today.
        </p>
      ) : (
        <div className="min-h-[200px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="waterToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
                formatter={(v, name) => [`${Number(v).toLocaleString()} L`, name]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="plainline"
                wrapperStyle={{ fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="yesterday"
                name="Yesterday"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="today"
                name="Today"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#waterToday)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
