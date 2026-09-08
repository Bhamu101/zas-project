import {
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  Droplets,
  LayoutDashboard,
  Leaf,
  Satellite,
  Settings,
  Sprout,
  Zap,
} from "lucide-react";

// Navigation.
//
// Two changes from the previous version:
//  1. The full-height saturated lime gradient is gone. Lime now marks only the
//     ACTIVE item, so it reads as "you are here" instead of competing with the
//     page content for attention.
//  2. Items are grouped. Ten flat entries gave no sense of which screens belong
//     together; the groups match how the farm is actually operated.
//
// On small screens this renders as an overlay drawer (see `mobile`/`onClose`)
// rather than permanently occupying the viewport.

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ id: "dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    // Both are Gemini-backed features, so they belong together rather than
    // Crop Health sitting among the sensor-driven monitoring screens.
    label: "AI Assistant",
    items: [
      { id: "ai-assistant", icon: Bot, label: "Goho AI" },
      { id: "crop-health", icon: BrainCircuit, label: "Crop Health" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "irrigation", icon: Droplets, label: "Irrigation" },
      { id: "energy", icon: Zap, label: "Energy" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { id: "beds", icon: Sprout, label: "Bed Monitoring" },
      { id: "aerial-view", icon: Satellite, label: "Aerial View" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "reports", icon: BarChart3, label: "Reports" },
      { id: "alerts", icon: Bell, label: "Alerts" },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", icon: Settings, label: "Settings" }],
  },
];

function NavButton({ item, active, expanded, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      title={expanded ? undefined : item.label}
      // Tells assistive tech which destination is current, not just visually.
      aria-current={active ? "page" : undefined}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
        expanded ? "justify-start" : "justify-center"
      } ${
        active
          ? "bg-[var(--color-brand)] text-[var(--color-brand-ink)] font-semibold"
          : "text-[var(--color-ink-2)] hover:bg-[var(--color-neutral-bg)]"
      }`}
    >
      <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      {expanded && <span className="truncate">{item.label}</span>}
    </button>
  );
}

export default function Sidebar({ activePage, onNavigate, open = true, mobile = false, onClose }) {
  // Collapsed rail only applies to the desktop sidebar; the mobile drawer is
  // always full width when it's on screen.
  const expanded = mobile ? true : open;

  function handleSelect(id) {
    onNavigate(id);
    if (mobile) onClose?.();
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-300 ${
        mobile ? "w-[248px]" : expanded ? "w-[248px]" : "w-[72px]"
      }`}
    >
      <div
        className={`flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-[var(--color-border)] px-4 ${
          expanded ? "" : "justify-center px-0"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand)]">
          <Leaf size={17} className="text-[var(--color-brand-ink)]" strokeWidth={2} aria-hidden="true" />
        </span>
        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--color-ink)]">
              Agri-Intelligence
            </p>
            <p className="truncate text-[11px] leading-tight text-[var(--color-muted)]">
              Smart farming platform
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            {expanded && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activePage === item.id}
                  expanded={expanded}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
