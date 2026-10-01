import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '@/store/settingsStore';
import type { Bed, BedCameraResponse, BedHealthCheck, CropDiagnosis, DashboardResponse } from '@/types';

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

/** Every /api/* route requires a Supabase access token. */
async function authHeader(): Promise<Record<string, string>> {
  // getSession() refreshes the access token when it's expired or close to it,
  // so this is also what keeps a long-lived app session working without the
  // user signing in again every hour.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    const auth = await authHeader();
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...auth, ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Could not reach the farm backend at ${baseUrl}`);
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 401) {
    // The token was rejected and a refresh (above) didn't help — the session is
    // genuinely dead (signed out elsewhere, user deleted, refresh expired).
    // Clear it so the app's auth gate sends the user back to the login screen
    // instead of looping on failed requests.
    await supabase.auth.signOut();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
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

  getBedCamera: (bedId: number, limit = 12) =>
    request<BedCameraResponse>(`/api/camera/${bedId}?limit=${limit}`),

  requestBedPhoto: (bedId: number) =>
    request<{ captureRequested: boolean }>(`/api/camera/${bedId}/capture`, { method: 'POST' }),

  checkBedHealth: (bedId: number) =>
    request<{ health: BedHealthCheck }>(`/api/camera/${bedId}/health-check`, { method: 'POST' }),

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
