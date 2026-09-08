import {
  LayoutDashboard, Droplets, Zap, Sprout, BrainCircuit, BarChart3, Bell, Settings, Bot, Leaf, Satellite,
} from "lucide-react";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "ai-assistant", icon: Bot, label: "Goho AI" },
  { id: "irrigation", icon: Droplets, label: "Irrigation Control" },
  { id: "energy", icon: Zap, label: "Energy Management" },
  { id: "beds", icon: Sprout, label: "Bed Monitoring" },
  { id: "crop-health", icon: BrainCircuit, label: "Crop Health (AI)" },
  { id: "aerial-view", icon: Satellite, label: "Aerial View" },
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
      <div className="relative w-full h-full overflow-hidden flex flex-col p-3">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand to-brand-dark" />

        <div className="flex items-center gap-3 px-2 pt-2 pb-4 mb-2 border-b border-black/10">
          <Leaf size={26} className="text-[#0f0f0f] shrink-0" strokeWidth={1.75} />
          {open && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0f0f0f] leading-tight truncate">Farm Manager</p>
              <p className="text-[11px] text-[#0f0f0f]/60 leading-tight truncate">Smart Farming, Better Future</p>
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
                activePage === id
                  ? "bg-[#0f0f0f] text-[#c7ff2e] shadow-sm"
                  : "text-[#0f0f0f]/80 hover:bg-black/10"
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