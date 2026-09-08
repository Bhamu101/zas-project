import { GLASS_CARD } from "../../lib/glass";
import StatusPill from "../ui/StatusPill";

// Soil moisture per bed, drawn against each crop's own optimal band rather than
// a single global threshold — a reading of 38% is fine for one crop and dry for
// another, so a bare number or a shared scale would mislead.

const STATE = {
  optimal: { tone: "ok", label: "Optimal", bar: "#16a34a" },
  "needs-water": { tone: "warn", label: "Needs water", bar: "#f59e0b" },
  critical: { tone: "critical", label: "Critical", bar: "#ef4444" },
};

function BedRow({ bed, onNavigate }) {
  const s = STATE[bed.state] ?? STATE["needs-water"];
  const vwc = Math.max(0, Math.min(100, bed.vwc));
  const bandLeft = Math.max(0, Math.min(100, bed.vwcOptimalMin));
  const bandWidth = Math.max(0, Math.min(100, bed.vwcOptimalMax) - bandLeft);

  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate?.("beds")}
        className="w-full rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-[var(--color-ink)]">{bed.name}</span>
            <span className="truncate text-xs text-[var(--color-muted)]">{bed.crop}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-[var(--color-ink)]">{bed.vwc}%</span>
            <StatusPill tone={s.tone} label={s.label} />
          </div>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-neutral-bg)]">
          {/* The crop's optimal band, so the reading is judged against the
              right target instead of an absolute scale. */}
          <div
            className="absolute inset-y-0 bg-green-500/20"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${vwc}%`, backgroundColor: s.bar }}
          />
          {/* Trigger point — below this the system irrigates automatically. */}
          <div
            className="absolute inset-y-0 w-px bg-black/40"
            style={{ left: `${Math.max(0, Math.min(100, bed.vwcTrigger))}%` }}
          />
        </div>

        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted)]">
          <span>Trigger {bed.vwcTrigger}%</span>
          <span>
            Optimal {bed.vwcOptimalMin}–{bed.vwcOptimalMax}%
          </span>
        </div>
      </button>
    </li>
  );
}

export default function BedMoisture({ beds, onNavigate }) {
  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Soil Moisture by Bed</h3>
        <button
          type="button"
          onClick={() => onNavigate?.("beds")}
          className="shrink-0 text-xs font-semibold text-[var(--color-brand-text)] hover:underline"
        >
          View all
        </button>
      </div>

      {(beds ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">No beds configured yet.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-[var(--color-border)] overflow-y-auto">
          {beds.map((bed) => (
            <BedRow key={bed.id} bed={bed} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  );
}
