import { Lightbulb } from "lucide-react";
import { GLASS_CARD } from "../../lib/glass";

export default function FarmerAdvisory({ advisory }) {
  if (!advisory) return null;

  return (
    <div className={`${GLASS_CARD} p-5 h-full flex flex-col`}>
      <div className="flex items-center gap-3 mb-3">
        <Lightbulb size={22} className="text-brand shrink-0" />
        <h3 className="text-sm font-bold text-ink tracking-wide">FARMER ADVISORY</h3>
      </div>
      <p className="text-lg font-bold text-ink mb-2 leading-snug">{advisory.headline}</p>
      <p className="text-sm text-muted leading-relaxed">{advisory.message}</p>
      <div className="mt-auto pt-3 border-t border-black/5 flex items-center justify-between">
        <span className="text-xs text-muted">AI Confidence</span>
        <span className="text-xs font-bold text-brand">{advisory.confidencePct}%</span>
      </div>
    </div>
  );
}
