export default function ProgressBar({ percent, color = "bg-brand", trackColor = "bg-black/5" }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="mt-3">
      <div className={`w-full h-2 ${trackColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}