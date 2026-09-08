// Service layer for the System Settings page.
//
// Talks to the FastAPI backend (same host the dashboard/irrigation pages use):
//   GET  /api/settings                -> { settings, status, devices, meta }
//   PUT  /api/settings                -> merge + validate + persist, returns same shape
//   POST /api/settings/maintenance    -> { action } -> simulated result
//
// The backend persists settings to a JSON file, so saves survive a restart.

import { apiFetch } from "./apiClient";

export function fetchSettings() {
  return apiFetch("/api/settings");
}

export function saveSettings(patch) {
  return apiFetch("/api/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function runMaintenance(action) {
  return apiFetch("/api/settings/maintenance", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
