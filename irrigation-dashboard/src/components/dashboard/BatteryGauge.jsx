export default function BatteryGauge({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillColor = clamped > 50 ? "#16a34a" : clamped > 20 ? "#f59e0b" : "#ef4444";

  const bodyW = 64;
  const bodyH = 28;
  const fillMaxW = bodyW - 8;
  const fillW = (fillMaxW * clamped) / 100;

  return (
    <svg width={bodyW + 8} height={bodyH} viewBox={`0 0 ${bodyW + 8} ${bodyH}`}>
      <rect x="1" y="1" width={bodyW - 2} height={bodyH - 2} rx="6" fill="none" stroke="#d1d5db" strokeWidth="2" />
      <rect x={bodyW} y={bodyH / 2 - 5} width="6" height="10" rx="2" fill="#d1d5db" />
      <rect x="4" y="4" width={fillW} height={bodyH - 8} rx="3" fill={fillColor} style={{ transition: "width 0.6s ease" }} />
    </svg>
  );
}