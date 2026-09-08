import { GLASS_CARD } from "../../lib/glass";

export default function FarmerAdvisory({ advisory }) {
  if (!advisory) return null;

  return (
    <div className={`${GLASS_CARD} p-5 h-full flex flex-col`}>
      <h3 className="text-sm font-bold text-[var(--color-ink)] mb-3">Farmer Advisory</h3>
      <p className="text-lg font-bold text-[var(--color-ink)] mb-2 leading-snug">{advisory.headline}</p>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{advisory.message}</p>
      <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">AI Confidence</span>
        <span className="text-xs font-bold text-[var(--color-brand-text)]">{advisory.confidencePct}%</span>
      </div>
    </div>
  );
}
