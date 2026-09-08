import { useState, useEffect, useRef } from "react";
import {
  Menu, Bell, ChevronDown, UserCircle, AlertOctagon, AlertTriangle, CheckCircle2, Info,
  Settings, ShieldCheck, LogOut, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, MapPin,
} from "lucide-react";
import { SOLID_DROPDOWN } from "../../lib/glass";
import { useLiveWeather } from "../../hooks/useLiveWeather";
import { CURRENT_USER, signOut } from "../../lib/currentUser";
import { ROUTES } from "../../routes";
import ThemeToggle from "./ThemeToggle";

const alertStyles = {
  critical: { icon: AlertOctagon, iconColor: "text-[var(--color-danger)]", priority: 0 },
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

// Titles come from the route table so they can't drift out of sync with the
// URLs; only the dashboard's greeting and subtitle are special-cased here.
const TITLES = Object.fromEntries(ROUTES.map((r) => [r.id, r.title]));
const SUBTITLES = {
  dashboard: "Here is what has been happening on your farm today.",
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
        <p className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1">
          <MapPin size={12} className="text-brand" /> {weather.location}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {weather.temp}&deg;C &middot; {weather.condition}
        </p>
      </div>
    </div>
  );
}

export default function TopBar({ activePage = "dashboard", alerts = [], onNavigate, onToggleSidebar, onOpenDrawer }) {
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

  const subtitle = SUBTITLES[activePage];
  const pageTitle =
    activePage === "dashboard"
      ? `Welcome back, ${CURRENT_USER.name} \u{1F44B}`
      : (TITLES[activePage] ?? "Dashboard");

  const sortedAlerts = [...alerts].sort(
    (a, b) => (alertStyles[a.level]?.priority ?? 9) - (alertStyles[b.level]?.priority ?? 9)
  );

  return (
    <header className="relative z-20 flex h-[var(--topbar-h)] shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenDrawer}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-neutral-bg)] lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Collapse navigation"
          onClick={onToggleSidebar}
          className="hidden h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-neutral-bg)] lg:flex"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight text-[var(--color-ink)] sm:text-lg">
            {pageTitle}
          </h1>
          {subtitle && (
            <p className="hidden truncate text-xs text-[var(--color-muted)] sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <WeatherChip />

        <ThemeToggle />

        <div className="hidden text-right text-xs leading-tight text-[var(--color-muted)] xl:block">
          <p>{dateStr}</p>
          <p>{timeStr}</p>
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            aria-label={`Notifications${alerts.length ? `, ${alerts.length} unread` : ""}`}
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-neutral-bg)]"
          >
            <Bell size={20} aria-hidden="true" />
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className={`${SOLID_DROPDOWN} absolute right-0 top-10 w-80 p-3 z-30`}>
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide px-1 mb-2">Notifications</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {sortedAlerts.map((a) => {
                  const s = alertStyles[a.level] || alertStyles.info;
                  const Icon = s.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors">
                      <Icon size={17} className={`${s.iconColor} shrink-0 mt-0.5`} strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--color-ink)] font-medium leading-snug">{a.text}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{a.time} &middot; {a.category}</p>
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
            <UserCircle size={24} className="text-[var(--color-muted)]" strokeWidth={1.5} aria-hidden="true" />
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-xs text-[var(--color-ink)] font-bold">{CURRENT_USER.name}</p>
              <p className="text-[11px] text-[var(--color-muted)] capitalize">{CURRENT_USER.role}</p>
            </div>
            <ChevronDown size={13} className={`text-[var(--color-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className={`${SOLID_DROPDOWN} absolute right-0 top-11 w-56 p-2 z-30`}>
              <button
                onClick={() => { onNavigate?.("settings"); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <Settings size={16} className="text-[var(--color-muted)]" />
                System Settings
              </button>
              <button
                onClick={() => { onNavigate?.("settings"); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <ShieldCheck size={16} className="text-[var(--color-muted)]" />
                System Diagnostics
              </button>
              <div className="h-px bg-[var(--color-neutral-bg)] my-1" />
              {/* Previously had no onClick at all — the only way out of the app
                  did nothing. LoginGate returns to the sign-in screen once the
                  session clears. */}
              <button
                onClick={() => { setProfileOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
              >
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