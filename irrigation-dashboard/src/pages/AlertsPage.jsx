import { useState, useEffect } from "react";
import {
  Bell, AlertOctagon, AlertTriangle, CheckCircle2, Info, Search, Download,
  MoreVertical, Check, X,
} from "lucide-react";

const STATUS = {
  critical: { icon: AlertOctagon, hex: "#ef4444", color: "text-[var(--color-danger)]", badgeText: "text-[var(--color-danger)]", label: "Critical", priority: 0 },
  warning: { icon: AlertTriangle, hex: "#f59e0b", color: "text-amber-500", badgeText: "text-[var(--color-warn)]", label: "Warning", priority: 1 },
  success: { icon: CheckCircle2, hex: "#16a34a", color: "text-brand", badgeText: "text-[var(--color-brand-text)]", label: "Resolved", priority: 2 },
  info: { icon: Info, hex: "#3b82f6", color: "text-blue-500", badgeText: "text-[var(--color-info)]", label: "Info", priority: 3 },
};

// Mock alert times are plain strings ("10:15 AM" / "Yesterday 07:30 PM"), not
// real timestamps, so this is a display-only split, not date parsing.
function splitTime(raw) {
  const match = raw.match(/^(\w+)\s+(.*)$/);
  if (match && /^(today|yesterday)$/i.test(match[1])) {
    return { day: match[1], time: match[2] };
  }
  return { day: "Today", time: raw };
}

function StatTile({ label, sublabel, value, hex, Icon }) {
  return (
    <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-[var(--color-ink)]">{value}</p>
        <Icon size={22} style={{ color: hex }} />
      </div>
      <p className="text-xs font-medium text-[var(--color-ink)] mt-2">{label}</p>
      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{sublabel}</p>
    </div>
  );
}

export default function AlertsPage({ alerts = [] }) {
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => new Set());
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest("[data-kebab-menu]")) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function acknowledge(id) {
    setAcknowledgedIds((prev) => new Set(prev).add(id));
  }
  function dismiss(id) {
    setDismissedIds((prev) => new Set(prev).add(id));
    setMenuOpenId(null);
    setViewing(null);
  }

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));
  const categories = [...new Set(alerts.map((a) => a.category))];

  const filtered = visible
    .filter((a) => severityFilter === "all" || a.level === severityFilter)
    .filter((a) => categoryFilter === "all" || a.category === categoryFilter)
    .filter((a) => dateFilter === "all" || splitTime(a.time).day.toLowerCase() === dateFilter)
    .filter((a) => !search || a.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (STATUS[a.level]?.priority ?? 9) - (STATUS[b.level]?.priority ?? 9));

  const resolvedToday = visible.filter((a) => a.level === "success" && splitTime(a.time).day === "Today").length;

  const stats = [
    { label: "Total Alerts", sublabel: "All time", value: visible.length, hex: "#16a34a", Icon: Bell },
    { label: "Critical", sublabel: "Needs immediate action", value: visible.filter((a) => a.level === "critical").length, hex: STATUS.critical.hex, Icon: AlertOctagon },
    { label: "Warnings", sublabel: "Requires attention", value: visible.filter((a) => a.level === "warning").length, hex: STATUS.warning.hex, Icon: AlertTriangle },
    { label: "Info", sublabel: "For your awareness", value: visible.filter((a) => a.level === "info").length, hex: STATUS.info.hex, Icon: Info },
    { label: "Resolved Today", sublabel: "Alerts cleared", value: resolvedToday, hex: STATUS.success.hex, Icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <StatTile key={s.label} {...s} />
        ))}
      </div>

      <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-ink)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="all">All Severity</option>
            {Object.entries(STATUS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-ink)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-ink)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand text-brand text-sm font-bold hover:bg-[var(--color-ok-bg)] transition-colors">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--color-muted)]">
            <Bell size={28} className="mb-2" />
            <p className="text-sm">No alerts match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs text-[var(--color-muted)]">
                  <th className="pb-3 font-semibold">Alert</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const s = STATUS[a.level] || STATUS.info;
                  const Icon = s.icon;
                  const { day, time } = splitTime(a.time);
                  const isAck = acknowledgedIds.has(a.id);
                  return (
                    <tr key={a.id} className="[&>td]:border-b [&>td]:border-[var(--color-border)]">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className={`${s.color} shrink-0`} />
                          <span className={`font-medium text-[var(--color-ink)] ${isAck ? "opacity-60" : ""}`}>{a.text}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)] whitespace-nowrap">
                          {a.category}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <p className="text-[var(--color-ink)]">{time}</p>
                        <p className="text-xs text-[var(--color-muted)]">{day}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${isAck ? "bg-[var(--color-surface-2)] text-[var(--color-muted)]" : s.badgeText}`}
                          style={isAck ? undefined : { backgroundColor: `${s.hex}1a` }}
                        >
                          {isAck ? "Acknowledged" : s.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewing(a)}
                            className="text-xs font-bold text-brand border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-[var(--color-ok-bg)] transition-colors"
                          >
                            View
                          </button>
                          <div className="relative" data-kebab-menu>
                            <button
                              onClick={() => setMenuOpenId((cur) => (cur === a.id ? null : a.id))}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
                              aria-label={`More actions for: ${a.text}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {menuOpenId === a.id && (
                              <div className="absolute right-0 top-9 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg rounded-xl p-1 w-44">
                                {!isAck && (
                                  <button
                                    onClick={() => { acknowledge(a.id); setMenuOpenId(null); }}
                                    className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                                  >
                                    <Check size={14} className="text-brand" /> Acknowledge
                                  </button>
                                )}
                                <button
                                  onClick={() => dismiss(a.id)}
                                  className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg hover:bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                                >
                                  <X size={14} /> Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[var(--color-muted)] mt-4">
          Showing {filtered.length} of {visible.length} alerts
        </p>
      </div>

      {viewing && (() => {
        const s = STATUS[viewing.level] || STATUS.info;
        const Icon = s.icon;
        const { day, time } = splitTime(viewing.time);
        const isAck = acknowledgedIds.has(viewing.id);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon size={24} className={`${s.color} shrink-0`} />
                  <div>
                    <p className="text-sm font-bold text-[var(--color-ink)]">{s.label} Alert</p>
                    <p className="text-xs text-[var(--color-muted)]">{viewing.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-[var(--color-ink)] leading-relaxed mt-4">{viewing.text}</p>
              <p className="text-xs text-[var(--color-muted)] mt-2">{day} &middot; {time}</p>

              <div className="flex items-center gap-2 mt-5">
                {!isAck && (
                  <button
                    onClick={() => { acknowledge(viewing.id); setViewing(null); }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-brand-ink)] bg-brand hover:bg-brand-strong rounded-xl py-2.5 transition-colors"
                  >
                    <Check size={16} /> Acknowledge
                  </button>
                )}
                <button
                  onClick={() => dismiss(viewing.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-danger)] border border-red-200 hover:bg-[var(--color-danger-bg)] rounded-xl py-2.5 transition-colors"
                >
                  <X size={16} /> Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
