import { Settings } from "lucide-react";

export default function SystemSettings({ systemInfo }) {
  const rows = [
    { label: "Irrigation Mode", value: systemInfo.mode },
    { label: "VWC Trigger Threshold", value: `${systemInfo.vwcTrigger}%` },
    { label: "Optimal VWC Range", value: `${systemInfo.vwcOptimalMin}% - ${systemInfo.vwcOptimalMax}%` },
    { label: "ESP32 Nodes Connected", value: systemInfo.espNodes },
    { label: "Firmware Version", value: systemInfo.firmwareVersion },
    { label: "Backend Version", value: systemInfo.backendVersion },
  ];

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <Settings size={18} className="text-brand" />
        <h2 className="text-sm font-bold text-ink">SYSTEM CONFIGURATION</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3">
            <p className="text-sm text-muted">{r.label}</p>
            <p className="text-sm font-bold text-ink">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}