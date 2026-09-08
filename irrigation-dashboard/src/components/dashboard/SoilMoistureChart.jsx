import { GLASS_CARD } from "../../lib/glass";

const STATE_COLOR = { optimal: "#16a34a", "needs-water": "#eab308", critical: "#ef4444" };
const STATE_LABEL = { optimal: "Optimal", "needs-water": "Needs Water", critical: "Critical" };

function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// Semicircle arc from 180deg (left) sweeping clockwise to endAngle (0deg = right).
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarPoint(cx, cy, r, startAngle);
  const end = polarPoint(cx, cy, r, endAngle);
  const largeArc = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function MoistureGauge({ percent, color, label }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 160;
  const height = 96;
  const cx = size / 2;
  const cy = 82;
  const r = 62;
  const strokeWidth = 14;
  const endAngle = 180 - (clamped / 100) * 180;
  const tip = polarPoint(cx, cy, r, endAngle);

  return (
    <div className="relative mx-auto" style={{ width: size, height }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
        <path d={describeArc(cx, cy, r, 180, 0)} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} strokeLinecap="round" />
        {clamped > 0 && (
          <path d={describeArc(cx, cy, r, 180, endAngle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        <circle cx={tip.x} cy={tip.y} r={7} fill="white" stroke={color} strokeWidth={3} />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: cy - 40 }}>
        <p className="text-xl font-bold text-[var(--color-ink)] leading-none">{clamped}%</p>
        <p className="text-[10px] font-semibold mt-1.5 whitespace-nowrap" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

export default function SoilMoistureChart({ beds = [], systemInfo }) {
  return (
    <div className={`${GLASS_CARD} p-4 h-full flex flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
        <h3 className="text-xs font-bold text-[var(--color-ink)]">SOIL MOISTURE BY BED</h3>
        {systemInfo && (
          <span className="text-[11px] font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-full whitespace-nowrap">
            Optimal Range ({systemInfo.vwcOptimalMin}% - {systemInfo.vwcOptimalMax}%)
          </span>
        )}
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2 items-center">
        {beds.map((bed) => {
          const color = STATE_COLOR[bed.state] || STATE_COLOR.optimal;
          const label = STATE_LABEL[bed.state] || STATE_LABEL.optimal;
          return (
            <div key={bed.id} className="flex flex-col items-center text-center">
              <p className="text-xs font-bold text-[var(--color-ink)] mb-1">{bed.name}</p>
              <MoistureGauge percent={bed.vwc} color={color} label={label} />
              {systemInfo && (
                <p className="text-[11px] text-[var(--color-muted)] mt-1">
                  Target: {systemInfo.vwcOptimalMin}% - {systemInfo.vwcOptimalMax}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
