import { useSettingsStore } from '@/store/settingsStore';
import type { Bed, CropDiagnosis, DashboardResponse } from '@/types';

// Points at the same FastAPI backend the web dashboard uses (backend/main.py,
// port 8021). A phone/emulator can't reach "localhost" on the dev machine, so
// this is overridable two ways, checked in order:
//  1. A runtime override set from the Settings screen (persisted, so a judge's
//     phone can be pointed at a LAN IP / ngrok tunnel / deployed URL without a
//     rebuild — see src/store/settingsStore.ts).
//  2. EXPO_PUBLIC_API_URL from .env at build time — see mobile-app/.env.example.
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8021';

export function getApiBaseUrl(): string {
  const override = useSettingsStore.getState().apiBaseUrlOverride;
  return (override || DEFAULT_API_URL).replace(/\/+$/, '');
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Generous enough to cover a Render free-tier cold start (usually
// 30-60s to wake from sleep) without leaving the UI hanging forever
// if the backend is genuinely unreachable.
const REQUEST_TIMEOUT_MS = 60000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Could not reach the farm backend at ${baseUrl}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail ?? `Server responded ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<DashboardResponse>('/api/dashboard'),

  startIrrigation: (bedId: number, durationMin: number) =>
    request<{ bed: Bed }>(`/api/irrigation/start/${bedId}`, {
      method: 'POST',
      body: JSON.stringify({ durationMin }),
    }),

  stopIrrigation: (bedId: number) =>
    request<{ bed: Bed }>(`/api/irrigation/stop/${bedId}`, { method: 'POST' }),

  triggerIrrigation: (bedId: number) =>
    request<{ bed: Bed }>(`/api/irrigation/trigger/${bedId}`, { method: 'POST' }),

  assistantChat: (messages: { role: string; content: string }[]) =>
    request<{ reply: string }>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  diagnoseCropHealth: (imageBase64: string, mimeType: string, cropName?: string) =>
    request<{ diagnosis: CropDiagnosis }>('/api/crop-health/diagnose', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, cropName }),
    }),
};
