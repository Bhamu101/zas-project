import { useState, useEffect, useRef } from "react";
import {
  Menu, Bell, ChevronDown, UserCircle, AlertOctagon, AlertTriangle, CheckCircle2, Info,
  Settings, ShieldCheck, LogOut, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, MapPin,
} from "lucide-react";
import { SOLID_DROPDOWN } from "../../lib/glass";
import { useLiveWeather } from "../../hooks/useLiveWeather";
import ThemeToggle from "./ThemeToggle";

const alertStyles = {
  critical: { icon: AlertOctagon, iconColor: "text-red-500", priority: 0 },
  warning: { icon: AlertTriangle, iconColor: "text-amber-500", priority: 1 },
  success: { icon: CheckCircle2, iconColor: "text-brand", priority: 2 },
  info: { icon: Info, iconColor: "text-blue-500", priority: 3 },
};

const weatherIconMap = {
  sunny: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

const PAGE_META = {
  dashboard: { title: "Welcome back, Bhamu \u{1F44B}", subtitle: "Here is what has been happening on your farm today." },
  "ai-assistant": { title: "Goho AI" },
  irrigation: { title: "Irrigation Control" },
  energy: { title: "Energy Management" },
  beds: { title: "Bed Monitoring" },
  "crop-health": { title: "Crop Health (AI)" },
  "aerial-view": { title: "Aerial View" },
  reports: { title: "Data & Reports" },
  alerts: { title: "Alerts & Notifications" },
  settings: { title: "System Settings" },
};

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function WeatherChip() {
  const { loading, error, weather } = useLiveWeather();
  if (loading || error || !weather) return null;
  const Icon = weatherIconMap[weather.conditionIcon] || Cloud;

  return (
    <div className="hidden lg:flex items-center gap-2.5 pr-1 shrink-0">
      <Icon size={26} className="text-amber-500 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-ink flex items-center gap-1">
          <MapPin size={12} className="text-brand" /> {weather.location}
        </p>
        <p className="text-sm text-muted">
          {weather.temp}&deg;C &middot; {weather.condition}
        </p>
      </div>
    </div>
  );
}

export default function TopBar({ activePage = "dashboard", alerts = [], onNavigate, onToggleSidebar }) {
  const [now, setNow] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });

  const pageMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  const sortedAlerts = [...alerts].sort(
    (a, b) => (alertStyles[a.level]?.priority ?? 9) - (alertStyles[b.level]?.priority ?? 9)
  );

  return (
    <header className="h-[100px] shrink-0 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-6 relative z-20">
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shrink-0 hover:opacity-90 active:opacity-80 transition-opacity"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-start justify-center min-w-0">
        <p className="font-semibold text-2xl leading-none tracking-tight text-ink truncate">
          {pageMeta.title}
        </p>
        {pageMeta.subtitle && (
          <p className="text-xs text-muted mt-1 truncate">
            {pageMeta.subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <WeatherChip />

        <ThemeToggle />

        <div className="text-right leading-tight text-xs text-muted hidden md:block">
          <p>{dateStr}</p>
          <p>{timeStr}</p>
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            className="relative w-12 h-12 flex items-center justify-center rounded-xl text-ink hover:bg-black/5 active:bg-black/10 transition-colors"
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className={`${SOLID_DROPDOWN} absolute right-0 top-10 w-80 p-3 z-30`}>
              <p className="text-xs font-bold text-muted uppercase tracking-wide px-1 mb-2">Notifications</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {sortedAlerts.map((a) => {
                  const s = alertStyles[a.level] || alertStyles.info;
                  const Icon = s.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <Icon size={17} className={`${s.iconColor} shrink-0 mt-0.5`} strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className="text-sm text-ink font-medium leading-snug">{a.text}</p>
                        <p className="text-xs text-muted mt-0.5">{a.time} &middot; {a.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { onNavigate?.("alerts"); setNotifOpen(false); }}
                className="w-full mt-2 text-xs font-bold text-brand hover:underline text-center py-1.5"
              >
                View All Alerts
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 h-12 pl-3 pr-2 rounded-xl border-l border-black/10 hover:bg-black/5 active:bg-black/10 transition-colors"
          >
            <UserCircle size={24} className="text-gray-300" strokeWidth={1.5} />
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-xs text-ink font-bold">Farm Admin</p>
              <p className="text-[11px] text-muted">Administrator</p>
            </div>
            <ChevronDown size={13} className={`text-muted transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className={`${SOLID_DROPDOWN} absolute right-0 top-11 w-56 p-2 z-30`}>
              <button
                onClick={() => { onNavigate?.("settings"); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink hover:bg-gray-50 transition-colors"
              >
                <Settings size={16} className="text-muted" />
                System Settings
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink hover:bg-gray-50 transition-colors">
                <ShieldCheck size={16} className="text-muted" />
                System Diagnostics
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}