import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSettings, saveSettings } from "../lib/settingsApi";

// Loads the System Settings payload once, then exposes save/reload.
// Mirrors the shape/ergonomics of useDashboardData.

export function useSystemSettings() {
  const [payload, setPayload] = useState(null); // { settings, status, devices, meta }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const cancelled = useRef(false);

  // No synchronous setState here — `loading` starts true and is only ever
  // flipped inside async callbacks, so this is safe to call from an effect.
  const load = useCallback(() => {
    return fetchSettings()
      .then((data) => {
        if (cancelled.current) return;
        setPayload(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    cancelled.current = false;
    load();
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  const save = useCallback(async (patch) => {
    setSaving(true);
    try {
      const data = await saveSettings(patch);
      if (!cancelled.current) setPayload(data);
      return data;
    } finally {
      if (!cancelled.current) setSaving(false);
    }
  }, []);

  return {
    payload,
    settings: payload?.settings ?? null,
    status: payload?.status ?? null,
    devices: payload?.devices ?? null,
    meta: payload?.meta ?? null,
    loading,
    error,
    saving,
    save,
    reload: load,
  };
}
