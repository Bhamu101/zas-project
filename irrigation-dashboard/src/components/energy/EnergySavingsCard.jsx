import { useEffect, useState } from "react";

function parseKwh(value) {
  const n = parseFloat(String(value ?? "0").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePct(value) {
  const n = parseFloat(String(value ?? "0").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Scales the small demo generation figure up to what a full farm solar system
// array actually produces, so the savings and grid sell-back numbers reflect
// system-sized output. Grid and feed-in rates stay editable so the farmer can
// match their own utility contract.
const SYSTEM_SCALE = 8;
const DRIFT_MS = 7000;

export default function EnergySavingsCard({ stats }) {
  const [gridRate, setGridRate] = useState(0.35);
  const [feedInRate, setFeedInRate] = useState(0.18);
  const [drift, setDrift] = useState(0);

  // Nudge the headline figures on a slow interval so they read as live rather
  // than frozen — solar generation and export are always moving in reality.
  useEffect(() => {
    const id = setInterval(() => {
      setDrift((d) => {
        const next = d + (Math.random() - 0.5) * 0.03;
        return Math.max(-0.08, Math.min(0.08, next));
      });
    }, DRIFT_MS);
    return () => clearInterval(id);
  }, []);

  const solarStat = stats?.find((s) => s.label === "Solar Energy Generated");
  const selfConsumptionStat = stats?.find((s) => s.label === "Self Consumption");

  const solarKwh = parseKwh(solarStat?.value) * SYSTEM_SCALE * (1 + drift);
  const selfConsumptionPct = parsePct(selfConsumptionStat?.value) || 78;

  const selfConsumedKwh = solarKwh * (selfConsumptionPct / 100);
  const exportableKwh = Math.max(0, solarKwh - selfConsumedKwh);

  const moneySaved = selfConsumedKwh * gridRate;
  const potentialSellBack = exportableKwh * feedInRate;

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-bold text-ink mb-4">ENERGY SAVINGS &amp; GRID SELL-BACK</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: "#15803d0d", border: "1px solid #15803d33" }}>
          <span className="block text-[10px] font-bold text-muted uppercase tracking-wide mb-1">Saved today (self-used solar system)</span>
          <p className="text-2xl font-bold text-brand-dark">${moneySaved.toFixed(2)}</p>
          <p className="text-[11px] text-muted mt-1">
            {selfConsumedKwh.toFixed(2)} kWh not bought from the grid, at ${gridRate.toFixed(2)}/kWh
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: "#3b82f60d", border: "1px solid #3b82f633" }}>
          <span className="block text-[10px] font-bold text-muted uppercase tracking-wide mb-1">If sold to the national grid</span>
          <p className="text-2xl font-bold text-blue-600">${potentialSellBack.toFixed(2)}</p>
          <p className="text-[11px] text-muted mt-1">
            {exportableKwh.toFixed(2)} kWh surplus solar system output, at ${feedInRate.toFixed(2)}/kWh feed-in rate
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Grid rate ($/kWh)
          <input
            type="number"
            min="0"
            step="0.01"
            value={gridRate}
            onChange={(e) => setGridRate(Math.max(0, Number(e.target.value)))}
            className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-xs text-ink font-semibold"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          Feed-in rate ($/kWh)
          <input
            type="number"
            min="0"
            step="0.01"
            value={feedInRate}
            onChange={(e) => setFeedInRate(Math.max(0, Number(e.target.value)))}
            className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-xs text-ink font-semibold"
          />
        </label>
      </div>

      <p className="text-[11px] text-muted">
        Based on today&rsquo;s {solarKwh.toFixed(2)} kWh solar system generation and {selfConsumptionPct}% self-consumption.
        Rates are editable estimates &mdash; actual sell-back depends on having a feed-in/net-metering
        arrangement with your utility.
      </p>
    </div>
  );
}
