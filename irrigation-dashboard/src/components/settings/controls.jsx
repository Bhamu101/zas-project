import { useEffect } from "react";

// ---------------------------------------------------------------------------
// Shared UI kit for the System Settings page.
// Opaque white cards + neutral controls, no icons.
// Every export here is a component (keeps react-refresh happy).
// ---------------------------------------------------------------------------

export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({ id, checked, onChange, disabled }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${checked ? "bg-brand" : "bg-[var(--color-border-strong)]"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-[var(--color-surface)] shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ToggleRow({ id, label, hint, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-ink)]">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NumberField({ id, value, min, max, step = 1, unit, onChange, disabled, invalid }) {
  return (
    <div
      className={`flex items-center rounded-lg border bg-[var(--color-surface)] overflow-hidden ${
        invalid ? "border-red-400" : "border-[var(--color-border-strong)]"
      } ${disabled ? "opacity-50" : "focus-within:ring-2 focus-within:ring-brand/40"}`}
    >
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = e.target.value === "" ? "" : Number(e.target.value);
          if (n === "" || !Number.isNaN(n)) onChange(n === "" ? "" : n);
        }}
        className="w-full min-w-0 px-3 py-2 text-sm text-[var(--color-ink)] bg-transparent focus:outline-none disabled:cursor-not-allowed"
      />
      {unit && <span className="px-3 text-xs font-medium text-[var(--color-muted)] border-l border-[var(--color-border)] py-2 shrink-0">{unit}</span>}
    </div>
  );
}

export function RangeField({ id, value, min = 0, max = 100, step = 1, unit, onChange, disabled, invalid }) {
  const pct = Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100));
  return (
    <div className={`flex items-center gap-3 ${disabled ? "opacity-50" : ""}`}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(Number(value)) ? Number(value) : min}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-brand disabled:cursor-not-allowed"
        style={{ background: `linear-gradient(to right, var(--color-brand) ${pct}%, #e5e7eb ${pct}%)` }}
      />
      <div className="w-24 shrink-0">
        <NumberField
          id={`${id}-num`}
          value={value}
          min={min}
          max={max}
          step={step}
          unit={unit}
          onChange={onChange}
          disabled={disabled}
          invalid={invalid}
        />
      </div>
    </div>
  );
}

export function SelectField({ id, value, options, onChange, disabled }) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-brand/40 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SettingsCard({ title, action, children }) {
  return (
    <section className="rounded-xl border border-brand bg-[var(--color-surface)] shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-[var(--color-ink)]">{title}</h2>
        {action}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

const STATUS_TONE = {
  online: { dot: "bg-brand", text: "text-brand", ring: "border-brand/30 bg-brand/5" },
  warning: { dot: "bg-amber-500", text: "text-[var(--color-warn)]", ring: "border-amber-300 bg-[var(--color-warn-bg)]" },
  critical: { dot: "bg-red-500", text: "text-[var(--color-danger)]", ring: "border-red-300 bg-[var(--color-danger-bg)]" },
  muted: { dot: "bg-[var(--color-neutral)]", text: "text-[var(--color-ink-2)]", ring: "border-[var(--color-border)] bg-[var(--color-surface-2)]" },
  info: { dot: "bg-blue-500", text: "text-[var(--color-info)]", ring: "border-blue-200 bg-[var(--color-info-bg)]" },
};

export function StatusChip({ tone = "muted", children }) {
  const t = STATUS_TONE[tone] || STATUS_TONE.muted;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${t.ring} ${t.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "critical", busy, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const danger = tone === "critical";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => !busy && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-[var(--color-ink)]">{title}</h3>
        <p className="mt-1 text-xs text-[var(--color-ink-2)] leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border-strong)] px-3 py-2 text-xs font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-strong"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ tone = "online", message, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);
  const t = STATUS_TONE[tone] || STATUS_TONE.online;
  return (
    <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className={`flex items-center gap-3 rounded-xl border ${t.ring} px-4 py-2.5 shadow-lg`}>
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        <span className="text-sm font-medium text-[var(--color-ink)]">{message}</span>
        <button type="button" onClick={onClose} className="ml-1 text-sm leading-none text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          ×
        </button>
      </div>
    </div>
  );
}

export function SaveBar({ dirty, saving, error, canEdit, onSave, onCancel }) {
  if (!canEdit || (!dirty && !error)) return null;
  return (
    <div className="sticky bottom-0 z-40 -mx-4 mt-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:-mx-5 sm:px-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className={`text-xs font-medium ${error ? "text-[var(--color-danger)]" : "text-[var(--color-warn)]"}`}>
          {error ? error : "You have unsaved changes."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-[var(--color-border-strong)] px-4 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[var(--color-brand-ink)] hover:bg-brand-strong disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
