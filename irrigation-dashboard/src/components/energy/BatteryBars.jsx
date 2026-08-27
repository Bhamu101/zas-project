// Segmented battery indicator — draws a fixed number of bars and fills them
// according to the current charge level, so a falling battery visibly drops
// from (e.g.) 5 bars to 3 bars rather than just shrinking a thin strip.
export default function BatteryBars({ pct = 0, segments = 5, className = "", barHeight = "h-4" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.max(0, Math.min(segments, Math.round((clamped / 100) * segments)));
  const color = clamped >= 50 ? "bg-brand" : clamped >= 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`${barHeight} flex-1 rounded transition-colors duration-700 ${
            i < filled ? color : "bg-card border border-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
