// Single source of truth for the app's routes.
//
// The nav id (e.g. "irrigation") is kept as the stable key so Sidebar, TopBar
// and every existing onNavigate("...") call site keep working unchanged — the
// router is wired in behind that contract rather than requiring every component
// to be rewritten against it.

export const ROUTES = [
  { id: "dashboard", path: "/", title: "Dashboard" },
  { id: "ai-assistant", path: "/ai", title: "Goho AI" },
  { id: "crop-health", path: "/crop-health", title: "Crop Health" },
  { id: "irrigation", path: "/irrigation", title: "Irrigation Control" },
  { id: "energy", path: "/energy", title: "Energy Management" },
  { id: "beds", path: "/beds", title: "Bed Monitoring" },
  { id: "aerial-view", path: "/aerial-view", title: "Aerial View" },
  { id: "reports", path: "/reports", title: "Data & Reports" },
  { id: "alerts", path: "/alerts", title: "Alerts & Notifications" },
  { id: "settings", path: "/settings", title: "System Settings" },
];

const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]));

export function pathForId(id) {
  return BY_ID[id]?.path ?? "/";
}

export function idForPath(pathname) {
  return BY_PATH[pathname]?.id ?? "dashboard";
}
