import { useState, useEffect, useCallback, useRef } from "react";

import { apiFetch } from "../lib/apiClient";

const POLL_INTERVAL_MS = 15000;

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

  useEffect(() => {
    cancelledRef.current = false;
    refetch();
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [refetch]);

  return { data, error, loading, refetch };
}