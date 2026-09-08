import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceDot } from "recharts";

function ValueBadge({ x, y, text, color }) {
  if (x == null || y == null) return null;
  const width = text.length * 6.5 + 20;
  return (
    <g>
      <rect x={x - width / 2} y={y - 32} width={width} height={22} rx={11} fill={color} />
      <text x={x} y={y - 17} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
        {text}
      </text>
    </g>
  );
}

export default function TrendChart({ icon: Icon, title, unit, labels, data, color, valueLabel }) {
  const chartData = labels.map((label, i) => ({ label, value: data[i] }));
  const gradientId = `trend-${title.replace(/[^a-z0-9]/gi, "")}`;
  const lastLabel = labels[labels.length - 1];
  const lastValue = data[data.length - 1];

  return (
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Icon size={16} className="shrink-0" style={{ color }} />
          <h3 className="text-xs font-bold text-[var(--color-ink)]">{title}</h3>
        </div>
        <span className="text-[11px] text-[var(--color-muted)]">{unit}</span>
      </div>
      <div className="relative flex-1 min-h-[160px]">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 26, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
              />
              <ReferenceDot
                x={lastLabel}
                y={lastValue}
                r={4}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
                isFront
                label={<ValueBadge text={valueLabel} color={color} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
