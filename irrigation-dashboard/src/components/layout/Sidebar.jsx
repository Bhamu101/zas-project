import {
  LayoutDashboard, Droplets, Zap, Sprout, BrainCircuit, BarChart3, Bell, Settings, Bot, Leaf,
} from "lucide-react";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "ai-assistant", icon: Bot, label: "AI Assistant" },
  { id: "irrigation", icon: Droplets, label: "Irrigation Control" },
  { id: "energy", icon: Zap, label: "Energy Management" },
  { id: "beds", icon: Sprout, label: "Bed Monitoring" },
  { id: "crop-health", icon: BrainCircuit, label: "Crop Health (AI)" },
  { id: "reports", icon: BarChart3, label: "Data & Reports" },
  { id: "alerts", icon: Bell, label: "Alerts & Notifications" },
  { id: "settings", icon: Settings, label: "System Settings" },
];

export default function Sidebar({ activePage, onNavigate, open = true }) {
  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-300 ${
        open ? "w-64" : "w-20"
      }`}
    >
      <div className="w-full h-full bg-gradient-to-b from-brand to-brand-dark flex flex-col p-3">
        <div className="flex items-center gap-3 px-2 pt-2 pb-4 mb-2 border-b border-white/15">
          <Leaf size={26} className="text-white shrink-0" strokeWidth={1.75} />
          {open && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">Farm Manager</p>
              <p className="text-[11px] text-white/70 leading-tight truncate">Smart Farming, Better Future</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pt-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={label}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                open ? "justify-start" : "justify-center"
              } ${
                activePage === id ? "bg-white text-brand-dark" : "text-white/90 hover:bg-white/10"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              {open && label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}