import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import { ErrorState, PanelSkeleton, StatSkeleton } from "./components/ui/States";
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import IrrigationControl from "./pages/IrrigationControl";
import EnergyManagement from "./pages/EnergyManagement";
import BedMonitoring from "./pages/BedMonitoring";
import CropHealth from "./pages/CropHealth";
import AerialView from "./pages/AerialView";
import DataReports from "./pages/DataReports";
import AlertsPage from "./pages/AlertsPage";
import SystemSettings from "./pages/SystemSettings";
import { useDashboardData } from "./hooks/useDashboardData";
import { getApiRoot } from "./lib/apiClient";
import { ROUTES, idForPath, pathForId } from "./routes";

// App shell.
//
// Layout is a fixed sidebar + scrolling main column on desktop; on screens
// below lg the sidebar becomes an overlay drawer so it doesn't consume the
// viewport. The drawer closes on Escape and on backdrop click, which the
// previous always-visible sidebar had no need for and therefore lacked.
//
// Navigation is URL-backed (see routes.js). Pages were previously swapped with
// a useState, so there were no addresses to bookmark or share, the browser back
// button did nothing, and a refresh always dumped you on the Dashboard.
// Sidebar/TopBar keep their existing activePage + onNavigate(id) contract —
// `navigate` is just wired in behind it.

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 sm:p-5">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <PanelSkeleton height="h-20" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <PanelSkeleton height="h-72" />
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activePage = idForPath(pathname);
  const setActivePage = (id) => navigate(pathForId(id));

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, error, loading, refetch } = useDashboardData();

  // Escape closes the drawer — a modal-style overlay needs a keyboard exit.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6">
        <ErrorState
          title="Could not load farm data"
          message={error}
          detail={`Backend: ${getApiRoot()}`}
          onRetry={refetch}
        />
      </div>
    );
  }

  // One element per route. Kept in the same order as routes.js.
  const pageFor = {
    "dashboard": <Dashboard data={data} onNavigate={setActivePage} />,
    "ai-assistant": <AIAssistant />,
    "crop-health": <CropHealth />,
    "irrigation": (
      <IrrigationControl
        beds={data.beds}
        systemInfo={data.systemInfo}
        irrigationOverview={data.irrigationOverview}
        onChanged={refetch}
      />
    ),
    "energy": (
      <EnergyManagement
        kpis={data.kpis}
        energyOverview={data.energyOverview}
        onNavigate={setActivePage}
      />
    ),
    "beds": (
      <BedMonitoring
        beds={data.beds}
        systemInfo={data.systemInfo}
        bedActivity={data.bedActivity}
        onNavigate={setActivePage}
      />
    ),
    "aerial-view": <AerialView />,
    "reports": <DataReports seasonSummary={data.seasonSummary} dataReports={data.dataReports} />,
    "alerts": <AlertsPage alerts={data.alerts} />,
    "settings": <SystemSettings dashboard={data} />,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] font-display text-[var(--color-ink)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar activePage={activePage} onNavigate={setActivePage} open={sidebarOpen} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div className="relative h-full">
            <Sidebar
              activePage={activePage}
              onNavigate={setActivePage}
              mobile
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <TopBar
          activePage={activePage}
          alerts={data.alerts}
          onNavigate={setActivePage}
          // Collapses the rail on desktop; opens the drawer on small screens.
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          <Routes>
            {ROUTES.map((r) => (
              <Route key={r.id} path={r.path} element={pageFor[r.id]} />
            ))}
            {/* Unknown URL returns to the dashboard rather than a blank screen. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
