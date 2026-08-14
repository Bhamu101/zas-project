import { useState, useEffect } from "react";

const API_URL = "http://localhost:8001/api/dashboard";
const POLL_INTERVAL_MS = 15000;

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      fetch(API_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`Server responded ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (cancelled) return;
          setData(json);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        });
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, error, loading };
}