import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import IrrigationControl from "./pages/IrrigationControl";
import EnergyManagement from "./pages/EnergyManagement";
import BedMonitoring from "./pages/BedMonitoring";
import CropHealth from "./pages/CropHealth";
import DataReports from "./pages/DataReports";
import AlertsPage from "./pages/AlertsPage";
import SystemSettings from "./pages/SystemSettings";
import { useDashboardData } from "./hooks/useDashboardData";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data, error, loading, refetch } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted font-display">
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500 font-display px-6 text-center">
        Could not reach the backend at localhost:8000.<br />
        Is the FastAPI server running? ({error})
      </div>
    );
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard": return <Dashboard data={data} />;
      case "ai-assistant": return <AIAssistant />;
      case "irrigation": return (
        <IrrigationControl
          beds={data.beds}
          systemInfo={data.systemInfo}
          irrigationOverview={data.irrigationOverview}
          onIrrigationTriggered={refetch}
        />
      );
      case "energy": return (
        <EnergyManagement
          kpis={data.kpis}
          energyHistory={data.energyHistory}
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
      case "reports": return <DataReports seasonSummary={data.seasonSummary} dataReports={data.dataReports} />;
      case "alerts": return <AlertsPage alerts={data.alerts} />;
      case "settings": return <SystemSettings systemInfo={data.systemInfo} />;
      default: return <Dashboard data={data} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-ink font-display">
      <Sidebar activePage={activePage} onNavigate={setActivePage} open={sidebarOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar
          activePage={activePage}
          alerts={data.alerts}
          onNavigate={setActivePage}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
      <main className="flex-1 overflow-y-auto p-4">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;