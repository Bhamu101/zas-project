import { GLASS_CARD } from "../../lib/glass";
import StatusPill from "../ui/StatusPill";

// Severity is carried by the pill's label and colour, so dropping the leading
// icon costs no information. Uses the shared StatusPill rather than its own
// hardcoded hex badges, so "Critical" looks identical everywhere.
const LEVELS = {
  critical: { tone: "critical", label: "Critical" },
  warning: { tone: "warn", label: "Warning" },
  success: { tone: "ok", label: "Done" },
  info: { tone: "info", label: "Info" },
};

export default function RecentAlerts({ alerts, onNavigate }) {
  return (
    <div className={`${GLASS_CARD} p-4 h-full`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[var(--color-ink)]">Recent Alerts</h3>
        <button
          type="button"
          onClick={() => onNavigate?.("alerts")}
          className="text-xs font-semibold text-[var(--color-brand-text)] hover:underline"
        >
          View all
        </button>
      </div>

      {alerts.length === 0 && (
        <p className="py-6 text-center text-sm text-[var(--color-muted)]">
          No alerts — everything is running normally.
        </p>
      )}

      <div className="space-y-3">
        {alerts.slice(0, 4).map((a) => {
          const s = LEVELS[a.level] || LEVELS.info;
          return (
            <div key={a.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-ink)] font-medium truncate">{a.text}</p>
                <p className="text-xs text-[var(--color-muted)]">{a.time} &middot; {a.category}</p>
              </div>
              <StatusPill tone={s.tone} label={s.label} className="shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
