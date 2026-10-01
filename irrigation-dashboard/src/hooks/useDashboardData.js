import { useState, useEffect, useCallback, useRef } from "react";

import { apiFetch } from "../lib/apiClient";

const POLL_INTERVAL_MS = 15000;
// While any bed is irrigating the cycle countdown and pump state change by the
// second, so poll faster. The backend reads the ESP32 at most every 4 s
// (ESP32_POLL_SECONDS), so going below that would only re-fetch cached values.
const ACTIVE_POLL_INTERVAL_MS = 3000;

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refetch = useCallback(() => {
    return apiFetch("/api/dashboard")
      .then((json) => {
        if (cancelledRef.current) return;
        setData(json);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const anyIrrigating = Boolean(data?.beds?.some((b) => b.irrigating));

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, anyIrrigating ? ACTIVE_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetch, anyIrrigating]);

  return { data, error, loading, refetch };
}
