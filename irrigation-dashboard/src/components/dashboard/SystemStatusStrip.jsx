import StatusPill from "../ui/StatusPill";

// The top strip answers "is anything wrong, and is anything running" before the
// reader has to interpret a single number.
//
// It used to sit on a full-width lime gradient. Now it's a neutral surface with
// a single lime rule: the brand marks the panel without competing with the
// status colours, which are the part that actually needs to be noticed.

const SYSTEM_TONE = { OPTIMAL: "ok", WARNING: "warn", CRITICAL: "critical" };

function Item({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase leading-none tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <div className="mt-1.5 truncate text-sm font-semibold leading-none text-[var(--color-ink)]">
        {children}
      </div>
    </div>
  );
}

export default function SystemStatusStrip({ systemStatus, kpis, systemInfo, alerts, onNavigate }) {
  const criticalCount = (alerts ?? []).filter((a) => a.level === "critical").length;
  const irrigating = kpis?.irrigationStatus === "Running";

  // Worst-of: an open critical alert outranks the system's own nominal status.
  const baseTone = SYSTEM_TONE[systemStatus?.status] ?? "info";
  const tone = criticalCount > 0 ? "critical" : baseTone;

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      {/* Single lime rule: brand presence without a page-scale wash of colour. */}
      <div className="h-1 bg-[var(--color-brand)]" />
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            System status
          </p>
          <div className="mt-1.5">
            <StatusPill
              tone={tone}
              label={
                criticalCount > 0
                  ? `${criticalCount} critical alert${criticalCount > 1 ? "s" : ""}`
                  : (systemStatus?.status ?? "Unknown")
              }
              pulse={criticalCount > 0}
              className="!text-[13px] !px-3 !py-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4 lg:gap-x-7">
          <Item label="Mode">{systemStatus?.mode ?? systemInfo?.mode ?? "—"}</Item>
          <Item label="Irrigation">
            <span className="flex items-center gap-1.5">
              {kpis?.irrigationStatus ?? "—"}
              {irrigating && (
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-info)]" />
              )}
            </span>
          </Item>
          <Item label="Next cycle">{kpis?.nextCycle ?? "—"}</Item>
          <button
            type="button"
            onClick={() => onNavigate?.("alerts")}
            className="cursor-pointer text-left transition-opacity hover:opacity-70"
          >
            <Item label="Alerts">{(alerts ?? []).length}</Item>
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 sm:px-5">
        <p className="text-[11px] text-[var(--color-muted)]">
          Last updated {systemStatus?.lastUpdated ?? "—"} · {systemInfo?.espNodes ?? 0} controller
          node{systemInfo?.espNodes === 1 ? "" : "s"} · firmware {systemInfo?.firmwareVersion ?? "—"}
        </p>
      </div>
    </section>
  );
}
