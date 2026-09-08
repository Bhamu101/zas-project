import { useMemo, useState } from "react";
import {
  SettingsCard, Field, RangeField, NumberField, SelectField, ToggleRow,
  StatusChip, ConfirmDialog, Toast, SaveBar,
} from "../components/settings/controls";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { runMaintenance } from "../lib/settingsApi";
import { canEditSettings } from "../lib/currentUser";

const clone = (v) => JSON.parse(JSON.stringify(v));

// Immutably set `value` at `path` in `obj`, creating intermediate objects so
// this works on a sparse patch as well as a full settings tree.
function setIn(obj, path, value) {
  const next = clone(obj);
  let cursor = next;
  for (let i = 0; i < path.length - 1; i++) {
    if (cursor[path[i]] == null || typeof cursor[path[i]] !== "object") cursor[path[i]] = {};
    cursor = cursor[path[i]];
  }
  cursor[path[path.length - 1]] = value;
  return next;
}

// Deep-merge a sparse patch onto a base tree (arrays/scalars replace).
function deepMerge(base, patch) {
  const out = clone(base);
  const walk = (o, p) => {
    for (const k of Object.keys(p)) {
      if (p[k] && typeof p[k] === "object" && !Array.isArray(p[k]) && o[k] && typeof o[k] === "object") {
        walk(o[k], p[k]);
      } else {
        o[k] = p[k];
      }
    }
  };
  walk(out, patch);
  return out;
}

// --- validation (mirrors backend _validate_settings) ------------------------
function validate(s) {
  const e = {};
  if (!s) return e;
  const { irrigation: irr, water: w, energy: en } = s;
  const num = (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? NaN : Number(v));

  if (Number.isNaN(num(irr.vwcTrigger))) e["irrigation.vwcTrigger"] = "Required.";
  else if (num(irr.vwcTrigger) >= num(irr.vwcOptimalMin))
    e["irrigation.vwcTrigger"] = "Must be below the optimal minimum.";
  if (num(irr.vwcOptimalMin) >= num(irr.vwcOptimalMax))
    e["irrigation.vwcOptimalMin"] = "Minimum must be below the maximum.";
  if (num(irr.maxDurationMin) <= 0) e["irrigation.maxDurationMin"] = "Must be greater than 0.";
  if (num(irr.minIntervalMin) < 0) e["irrigation.minIntervalMin"] = "Cannot be negative.";

  if (num(w.tankCriticalPct) >= num(w.tankMinPct))
    e["water.tankCriticalPct"] = "Must be below the minimum level.";
  if (num(w.minExpectedFlowLpm) >= num(w.maxExpectedFlowLpm))
    e["water.minExpectedFlowLpm"] = "Must be below the maximum expected flow.";
  if (num(w.pressureMinBar) >= num(w.pressureMaxBar))
    e["water.pressureMinBar"] = "Must be below the maximum pressure.";
  if (num(w.pumpMaxRuntimeMin) <= 0) e["water.pumpMaxRuntimeMin"] = "Must be greater than 0.";

  if (num(en.criticalBatteryPct) >= num(en.lowBatteryPct))
    e["energy.criticalBatteryPct"] = "Must be below the low-battery threshold.";
  return e;
}

// --- small presentational helpers -----------------------------------------
function StatusItem({ label, value, tone = "muted" }) {
  const toneText = {
    online: "text-brand", warning: "text-amber-700", critical: "text-red-700",
    info: "text-blue-700", muted: "text-gray-700",
  }[tone];
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${toneText}`}>{value}</p>
    </div>
  );
}

function DeviceRow({ node }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{node.name}</p>
        <p className="text-xs text-gray-500">
          {node.ip} · {node.rssiDbm} dBm · fw {node.firmware}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-500">Last comm {node.lastComm}</span>
        <StatusChip tone={node.online ? "online" : "critical"}>{node.online ? "Online" : "Offline"}</StatusChip>
      </div>
    </div>
  );
}

function SensorRow({ sensor }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{sensor.name}</p>
        <p className="text-xs text-gray-500">
          Last reading: {sensor.lastReading} · Updated {sensor.lastUpdate}
        </p>
      </div>
      <StatusChip tone={sensor.online ? "online" : "critical"}>{sensor.online ? "Online" : "Offline"}</StatusChip>
    </div>
  );
}

function MaintenanceButton({ label, onClick, busy, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-gray-300 text-ink hover:bg-gray-50"
      }`}
    >
      {busy ? "Working…" : label}
    </button>
  );
}

const NOTIFICATION_EVENTS = [
  ["lowSoilMoisture", "Low soil moisture"],
  ["lowTankLevel", "Low tank level"],
  ["pumpFault", "Pump fault"],
  ["abnormalFlow", "Abnormal flow"],
  ["pressureAbnormality", "Pressure abnormality"],
  ["nodeOffline", "ESP32 node offline"],
  ["lowBattery", "Low battery"],
  ["solarFault", "Solar system fault"],
  ["irrigationCompleted", "Irrigation completed"],
];
const NOTIFICATION_CHANNELS = [
  ["whatsapp", "WhatsApp"],
  ["sms", "SMS"],
  ["email", "Email"],
  ["inApp", "In-app notifications"],
];

export default function SystemSettings({ dashboard }) {
  const { settings, status, devices, meta, loading, error, saving, save, reload } = useSystemSettings();
  const canEdit = canEditSettings();

  // Unsaved edits are held as a sparse patch; the editable `draft` is the
  // server settings with that patch merged in. No state-syncing effect needed —
  // when the server settings change (load / save / reset) the patch is cleared
  // from the async handler that caused it.
  const [edits, setEdits] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action, title, message, confirmLabel }
  const [maintBusy, setMaintBusy] = useState(null);

  const draft = useMemo(() => (settings ? deepMerge(settings, edits) : null), [settings, edits]);
  const errors = useMemo(() => validate(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = useMemo(
    () => !!(draft && settings && JSON.stringify(draft) !== JSON.stringify(settings)),
    [draft, settings]
  );

  const up = (path, value) => {
    setSaveError(null);
    setEdits((e) => setIn(e, path, value));
  };

  const onSave = async () => {
    if (hasErrors) {
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }
    try {
      setSaveError(null);
      await save(edits);
      setEdits({});
      setToast({ tone: "online", message: "Settings saved." });
    } catch (e) {
      setSaveError(e.message || "Could not save settings.");
      setToast({ tone: "critical", message: "Save failed." });
    }
  };

  const onCancel = () => {
    setEdits({});
    setSaveError(null);
  };

  const doMaintenance = async (action) => {
    setMaintBusy(action);
    try {
      const res = await runMaintenance(action);
      setToast({ tone: "online", message: res.message || "Done." });
      if (action === "factory-reset" || action === "refresh-data") {
        await reload();
        setEdits({});
      }
    } catch (e) {
      setToast({ tone: "critical", message: e.message || "Action failed." });
    } finally {
      setMaintBusy(null);
      setConfirm(null);
    }
  };

  // ---- loading / error --------------------------------------------------
  if (loading && !settings) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading system settings…
      </div>
    );
  }
  if (error && !settings) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-bold text-red-700">Could not load system settings</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          onClick={reload}
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!draft) return null;

  const liveBattery = dashboard?.kpis?.batteryPct ?? status?.batteryPct ?? 0;
  const batteryTone = liveBattery <= draft.energy.criticalBatteryPct
    ? "critical"
    : liveBattery <= draft.energy.lowBatteryPct
      ? "warning"
      : "online";
  const solarTone = status?.solar === "active" ? "online" : status?.solar === "fault" ? "critical" : "muted";
  const pumpTone = status?.pump === "fault" ? "critical" : status?.pump === "running" ? "info" : "online";

  return (
    // overflow-x-clip guards narrow screens against any wide child widening the
    // page; it doesn't create a scroll container, so the sticky SaveBar still
    // resolves against <main>.
    <div className="mx-auto max-w-6xl space-y-4 overflow-x-clip pb-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">System Settings</h1>
        {!canEdit && <StatusChip tone="warning">Read-only (viewer role)</StatusChip>}
      </div>

      {/* 1. SYSTEM STATUS */}
      <SettingsCard
        title="System Status"
        action={
          <button
            type="button"
            onClick={() => doMaintenance("refresh-data")}
            disabled={maintBusy === "refresh-data"}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-gray-50 disabled:opacity-50"
          >
            {maintBusy === "refresh-data" ? "Refreshing…" : "Refresh"}
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={status?.online ? "online" : "critical"}>
            {status?.online ? "System Online" : "System Offline"}
          </StatusChip>
          <StatusChip tone={status?.nodesConnected === status?.nodesTotal ? "online" : "warning"}>
            {status?.nodesConnected}/{status?.nodesTotal} Nodes
          </StatusChip>
          <StatusChip tone={status?.sensorsOnline === status?.sensorsTotal ? "online" : "warning"}>
            {status?.sensorsOnline === status?.sensorsTotal ? "All Sensors Normal" : `${status?.sensorsOnline}/${status?.sensorsTotal} Sensors`}
          </StatusChip>
          <StatusChip tone={batteryTone}>Battery {liveBattery}%</StatusChip>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <StatusItem label="ESP32 Nodes" value={`${status?.nodesConnected}/${status?.nodesTotal} online`} tone={status?.nodesConnected === status?.nodesTotal ? "online" : "warning"} />
          <StatusItem label="Sensors" value={`${status?.sensorsOnline}/${status?.sensorsTotal} online`} tone={status?.sensorsOnline === status?.sensorsTotal ? "online" : "warning"} />
          <StatusItem label="Pump" value={status?.pump === "running" ? "Running" : status?.pump === "fault" ? "Fault" : "Idle"} tone={pumpTone} />
          <StatusItem label="Solar" value={status?.solar === "active" ? "Active" : status?.solar === "fault" ? "Fault" : "Standby"} tone={solarTone} />
          <StatusItem label="Battery" value={`${liveBattery}%`} tone={batteryTone} />
          <StatusItem label="Tank Level" value={`${status?.tankLevelPct ?? "—"}%`} tone={(status?.tankLevelPct ?? 100) <= draft.water.tankCriticalPct ? "critical" : (status?.tankLevelPct ?? 100) <= draft.water.tankMinPct ? "warning" : "online"} />
          <StatusItem label="Power Source" value={status?.energySource ?? "—"} tone="info" />
          <StatusItem label="Last Sync" value={status?.lastSync?.split(",")[1]?.trim() ?? status?.lastSync ?? "—"} tone="muted" />
        </div>
      </SettingsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 2. IRRIGATION SETTINGS */}
        <SettingsCard title="Irrigation Settings">
          <div className="space-y-4">
            <Field label="Irrigation Mode" htmlFor="irr-mode">
              <SelectField
                id="irr-mode"
                value={draft.irrigation.mode}
                disabled={!canEdit}
                onChange={(v) => up(["irrigation", "mode"], v)}
                options={[
                  { value: "automatic", label: "Automatic" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </Field>

            <Field
              label="VWC / Soil Moisture Trigger Threshold"
              htmlFor="irr-trigger"
              hint="Irrigation starts when soil moisture falls below this threshold."
              error={errors["irrigation.vwcTrigger"]}
            >
              <RangeField id="irr-trigger" value={draft.irrigation.vwcTrigger} min={5} max={80} unit="%" disabled={!canEdit} invalid={!!errors["irrigation.vwcTrigger"]} onChange={(v) => up(["irrigation", "vwcTrigger"], v)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Optimal VWC — Minimum" htmlFor="irr-optmin" error={errors["irrigation.vwcOptimalMin"]}>
                <NumberField id="irr-optmin" value={draft.irrigation.vwcOptimalMin} min={10} max={95} unit="%" disabled={!canEdit} invalid={!!errors["irrigation.vwcOptimalMin"]} onChange={(v) => up(["irrigation", "vwcOptimalMin"], v)} />
              </Field>
              <Field label="Optimal VWC — Maximum" htmlFor="irr-optmax">
                <NumberField id="irr-optmax" value={draft.irrigation.vwcOptimalMax} min={20} max={100} unit="%" disabled={!canEdit} onChange={(v) => up(["irrigation", "vwcOptimalMax"], v)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Maximum Irrigation Duration" htmlFor="irr-maxdur" error={errors["irrigation.maxDurationMin"]}>
                <NumberField id="irr-maxdur" value={draft.irrigation.maxDurationMin} min={1} max={240} unit="min" disabled={!canEdit} invalid={!!errors["irrigation.maxDurationMin"]} onChange={(v) => up(["irrigation", "maxDurationMin"], v)} />
              </Field>
              <Field label="Minimum Time Between Cycles" htmlFor="irr-interval" error={errors["irrigation.minIntervalMin"]}>
                <NumberField id="irr-interval" value={draft.irrigation.minIntervalMin} min={0} max={720} unit="min" disabled={!canEdit} invalid={!!errors["irrigation.minIntervalMin"]} onChange={(v) => up(["irrigation", "minIntervalMin"], v)} />
              </Field>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <ToggleRow
                id="irr-rain"
                label="Rainfall Skip"
                checked={draft.irrigation.rainfallSkipEnabled}
                disabled={!canEdit}
                onChange={(v) => up(["irrigation", "rainfallSkipEnabled"], v)}
              />
              {draft.irrigation.rainfallSkipEnabled && (
                <div className="mt-2">
                  <Field label="Rainfall Skip Threshold" htmlFor="irr-rainmm">
                    <NumberField id="irr-rainmm" value={draft.irrigation.rainfallSkipMm} min={1} max={50} unit="mm" disabled={!canEdit} onChange={(v) => up(["irrigation", "rainfallSkipMm"], v)} />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </SettingsCard>

        {/* 3. WATER & PUMP */}
        <SettingsCard title="Water & Pump">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tank Minimum Level" htmlFor="w-tankmin">
                <NumberField id="w-tankmin" value={draft.water.tankMinPct} min={0} max={100} unit="%" disabled={!canEdit} onChange={(v) => up(["water", "tankMinPct"], v)} />
              </Field>
              <Field label="Tank Critical Level" htmlFor="w-tankcrit" error={errors["water.tankCriticalPct"]}>
                <NumberField id="w-tankcrit" value={draft.water.tankCriticalPct} min={0} max={100} unit="%" disabled={!canEdit} invalid={!!errors["water.tankCriticalPct"]} onChange={(v) => up(["water", "tankCriticalPct"], v)} />
              </Field>
            </div>

            <Field label="Flow Rate Threshold" htmlFor="w-flow">
              <NumberField id="w-flow" value={draft.water.flowThresholdLpm} min={1} max={100} step={0.5} unit="L/min" disabled={!canEdit} onChange={(v) => up(["water", "flowThresholdLpm"], v)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum Expected Flow" htmlFor="w-minflow" error={errors["water.minExpectedFlowLpm"]}>
                <NumberField id="w-minflow" value={draft.water.minExpectedFlowLpm} min={0} max={100} step={0.5} unit="L/min" disabled={!canEdit} invalid={!!errors["water.minExpectedFlowLpm"]} onChange={(v) => up(["water", "minExpectedFlowLpm"], v)} />
              </Field>
              <Field label="Maximum Expected Flow" htmlFor="w-maxflow">
                <NumberField id="w-maxflow" value={draft.water.maxExpectedFlowLpm} min={0} max={200} step={0.5} unit="L/min" disabled={!canEdit} onChange={(v) => up(["water", "maxExpectedFlowLpm"], v)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pressure — Minimum" htmlFor="w-pmin" error={errors["water.pressureMinBar"]}>
                <NumberField id="w-pmin" value={draft.water.pressureMinBar} min={0} max={10} step={0.1} unit="bar" disabled={!canEdit} invalid={!!errors["water.pressureMinBar"]} onChange={(v) => up(["water", "pressureMinBar"], v)} />
              </Field>
              <Field label="Pressure — Maximum" htmlFor="w-pmax">
                <NumberField id="w-pmax" value={draft.water.pressureMaxBar} min={0} max={12} step={0.1} unit="bar" disabled={!canEdit} onChange={(v) => up(["water", "pressureMaxBar"], v)} />
              </Field>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-1">
              <ToggleRow id="w-leak" label="Leak Detection" checked={draft.water.leakDetectionEnabled} disabled={!canEdit} onChange={(v) => up(["water", "leakDetectionEnabled"], v)} />
              <ToggleRow id="w-dryrun" label="Dry-Run Protection" checked={draft.water.dryRunProtectionEnabled} disabled={!canEdit} onChange={(v) => up(["water", "dryRunProtectionEnabled"], v)} />
              <div className="pt-1">
                <Field label="Maximum Continuous Pump Runtime" htmlFor="w-pumpmax" error={errors["water.pumpMaxRuntimeMin"]}>
                  <NumberField id="w-pumpmax" value={draft.water.pumpMaxRuntimeMin} min={1} max={480} unit="min" disabled={!canEdit} invalid={!!errors["water.pumpMaxRuntimeMin"]} onChange={(v) => up(["water", "pumpMaxRuntimeMin"], v)} />
                </Field>
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>

      {/* 4. ENERGY MANAGEMENT */}
      <SettingsCard title="Energy Management">
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusChip tone={solarTone}>Solar: {status?.solar === "active" ? "Active" : "Standby"}</StatusChip>
          <StatusChip tone={batteryTone}>Battery: {liveBattery}%</StatusChip>
          <StatusChip tone="muted">Grid: {dashboard?.mobileExtras?.gridAvailable === false ? "Unavailable" : "Standby"}</StatusChip>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Power Source" htmlFor="en-src">
            <SelectField
              id="en-src"
              value={draft.energy.powerSource}
              disabled={!canEdit}
              onChange={(v) => up(["energy", "powerSource"], v)}
              options={[
                { value: "solar", label: "Solar" },
                { value: "battery", label: "Battery" },
                { value: "grid", label: "Grid" },
                { value: "hybrid", label: "Hybrid (auto)" },
              ]}
            />
          </Field>
          <Field label="Battery Charging Priority" htmlFor="en-charge">
            <SelectField
              id="en-charge"
              value={draft.energy.chargingPriority}
              disabled={!canEdit}
              onChange={(v) => up(["energy", "chargingPriority"], v)}
              options={[
                { value: "solar", label: "Solar first" },
                { value: "grid", label: "Grid backup" },
              ]}
            />
          </Field>

          <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2">
            <ToggleRow id="en-solarprio" label="Solar Priority" checked={draft.energy.solarPriority} disabled={!canEdit} onChange={(v) => up(["energy", "solarPriority"], v)} />
            <ToggleRow id="en-gridbk" label="Grid Backup" checked={draft.energy.gridBackup} disabled={!canEdit} onChange={(v) => up(["energy", "gridBackup"], v)} />
            <ToggleRow id="en-ats" label="Automatic Transfer" checked={draft.energy.automaticTransfer} disabled={!canEdit} onChange={(v) => up(["energy", "automaticTransfer"], v)} />
          </div>

          <Field label="Low Battery Threshold" htmlFor="en-low">
            <NumberField id="en-low" value={draft.energy.lowBatteryPct} min={0} max={100} unit="%" disabled={!canEdit} onChange={(v) => up(["energy", "lowBatteryPct"], v)} />
          </Field>
          <Field label="Critical Battery Threshold" htmlFor="en-crit" error={errors["energy.criticalBatteryPct"]}>
            <NumberField id="en-crit" value={draft.energy.criticalBatteryPct} min={0} max={100} unit="%" disabled={!canEdit} invalid={!!errors["energy.criticalBatteryPct"]} onChange={(v) => up(["energy", "criticalBatteryPct"], v)} />
          </Field>
        </div>
      </SettingsCard>

      {/* 5. DEVICES & SENSORS */}
      <SettingsCard title="Devices & Sensors">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">ESP32 Nodes</p>
            <div className="space-y-2">
              {(devices?.nodes ?? []).map((n) => <DeviceRow key={n.id} node={n} />)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Sensors</p>
            <div className="space-y-2">
              {(devices?.sensors ?? []).map((s) => <SensorRow key={s.id} sensor={s} />)}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* 6. ALERTS & NOTIFICATIONS */}
      <SettingsCard title="Alerts & Notifications">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Alert on</p>
            <div className="divide-y divide-gray-100">
              {NOTIFICATION_EVENTS.map(([key, label]) => (
                <ToggleRow
                  key={key}
                  id={`nev-${key}`}
                  label={label}
                  checked={draft.notifications.events[key]}
                  disabled={!canEdit}
                  onChange={(v) => up(["notifications", "events", key], v)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Delivery channels</p>
            <div className="divide-y divide-gray-100">
              {NOTIFICATION_CHANNELS.map(([key, label]) => (
                <ToggleRow
                  key={key}
                  id={`nch-${key}`}
                  label={label}
                  checked={draft.notifications.channels[key]}
                  disabled={!canEdit}
                  onChange={(v) => up(["notifications", "channels", key], v)}
                />
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 8. SYSTEM INFORMATION */}
        <SettingsCard title="System Information">
          <dl className="divide-y divide-gray-100 text-sm">
            {[
              ["Firmware Version", meta?.firmwareVersion],
              ["Backend Version", meta?.backendVersion],
              ["Database", meta?.database],
              ["API", meta?.api],
              ["Last Synchronisation", meta?.lastSync],
              ["System Uptime", meta?.uptime],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-semibold text-ink">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </SettingsCard>

        {/* 9. MAINTENANCE / ADVANCED */}
        <SettingsCard title="Maintenance & Advanced">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MaintenanceButton label="Restart ESP32 Nodes" busy={maintBusy === "restart-nodes"} onClick={() => doMaintenance("restart-nodes")} />
            <MaintenanceButton label="Reconnect Devices" busy={maintBusy === "reconnect-devices"} onClick={() => doMaintenance("reconnect-devices")} />
            <MaintenanceButton label="Check Sensor Health" busy={maintBusy === "check-sensors"} onClick={() => doMaintenance("check-sensors")} />
            <MaintenanceButton label="Check for Firmware Updates" busy={maintBusy === "check-firmware"} onClick={() => doMaintenance("check-firmware")} />
            <MaintenanceButton label="Refresh System Data" busy={maintBusy === "refresh-data"} onClick={() => doMaintenance("refresh-data")} />
          </div>

          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Danger Zone</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MaintenanceButton
                label="Factory Reset"
                danger
                busy={maintBusy === "factory-reset"}
                onClick={() =>
                  setConfirm({
                    action: "factory-reset",
                    title: "Factory reset all settings?",
                    message: "Every configuration value on this page returns to its factory default. Live status and sensor data are not affected. This cannot be undone.",
                    confirmLabel: "Reset to defaults",
                  })
                }
              />
              <MaintenanceButton
                label="Clear Historical Data"
                danger
                busy={maintBusy === "clear-history"}
                onClick={() =>
                  setConfirm({
                    action: "clear-history",
                    title: "Clear historical data?",
                    message: "Deletes stored irrigation, energy and sensor history used by Data & Reports. Current settings and live status are kept. This cannot be undone.",
                    confirmLabel: "Clear history",
                  })
                }
              />
            </div>
            {!canEdit && <p className="mt-2 text-[11px] text-red-600">Maintenance actions require an administrator.</p>}
          </div>
        </SettingsCard>
      </div>

      {/* 7. SAVE BAR */}
      <SaveBar dirty={dirty} saving={saving} error={saveError} canEdit={canEdit} onSave={onSave} onCancel={onCancel} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        busy={!!maintBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && doMaintenance(confirm.action)}
      />

      {toast && <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
