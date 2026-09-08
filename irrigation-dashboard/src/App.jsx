import { useEffect, useState } from "react";

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

// App shell.
//
// Layout is a fixed sidebar + scrolling main column on desktop; on screens
// below lg the sidebar becomes an overlay drawer so it doesn't consume the
// viewport. The drawer closes on Escape and on backdrop click, which the
// previous always-visible sidebar had no need for and therefore lacked.

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
  const [activePage, setActivePage] = useState("dashboard");
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

  function renderPage() {
    switch (activePage) {
      case "dashboard": return <Dashboard data={data} onNavigate={setActivePage} />;
      case "ai-assistant": return <AIAssistant />;
      case "irrigation": return (
        <IrrigationControl
          beds={data.beds}
          systemInfo={data.systemInfo}
          irrigationOverview={data.irrigationOverview}
        />
      );
      case "energy": return (
        <EnergyManagement
          kpis={data.kpis}
          energyOverview={data.energyOverview}
          onNavigate={setActivePage}
        />
      );
      case "beds": return (
        <BedMonitoring
          beds={data.beds}
          systemInfo={data.systemInfo}
          bedActivity={data.bedActivity}
          onNavigate={setActivePage}
        />
      );
      case "crop-health": return <CropHealth />;
      case "aerial-view": return <AerialView />;
      case "reports": return <DataReports seasonSummary={data.seasonSummary} dataReports={data.dataReports} />;
      case "alerts": return <AlertsPage alerts={data.alerts} />;
      case "settings": return <SystemSettings dashboard={data} />;
      default: return <Dashboard data={data} onNavigate={setActivePage} />;
    }
  }

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-5">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
