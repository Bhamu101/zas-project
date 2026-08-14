export default function TankGauge({ percent, size = 48 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const w = size;
  const h = size * 1.3;
  const fillH = ((h - 8) * clamped) / 100;
  const fillY = h - 4 - fillH;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <clipPath id="tankClip">
          <rect x="4" y="4" width={w - 8} height={h - 8} rx="8" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width={w - 8} height={h - 8} rx="8" fill="rgba(59,130,246,0.06)" stroke="#93c5fd" strokeWidth="2" />
      <g clipPath="url(#tankClip)">
        <rect x="4" y={fillY} width={w - 8} height={fillH} fill="#3b82f6" style={{ transition: "y 0.6s ease, height 0.6s ease" }} />
        <rect x="4" y={fillY} width={w - 8} height="3" fill="#60a5fa" />
      </g>
    </svg>
  );
}