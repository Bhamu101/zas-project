// The one place the dashboard talks to the FastAPI backend.
//
// Previously five files each hardcoded "http://localhost:8021" and sent no
// credentials, which broke entirely once the backend started requiring auth.
// Everything now goes through here so the base URL and the bearer token are
// defined once.

import { supabase } from "./supabase";

// Vite only exposes VITE_-prefixed vars to the client. Falls back to the local
// dev backend so `npm run dev` works with no .env.
const API_ROOT = (import.meta.env.VITE_API_URL ?? "http://localhost:8021").replace(/\/+$/, "");

export function getApiRoot() {
  return API_ROOT;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function authHeader() {
  // getSession() transparently refreshes an expired access token, so a long
  // open tab keeps working without a re-login.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * @param {string} path  e.g. "/api/dashboard"
 * @param {RequestInit} [init]
 */
export async function apiFetch(path, init = {}) {
  const auth = await authHeader();

  let res;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...auth, ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(`Could not reach the backend at ${API_ROOT}`, 0);
  }

  if (res.status === 401) {
    // Token rejected and refreshing didn't help — the session is genuinely
    // gone. Clear it so the auth gate returns the user to the login screen
    // instead of every widget spinning on repeated failures.
    await supabase.auth.signOut();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (!res.ok) {
    let detail = `Server responded ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* keep the status-code message */
    }
    throw new ApiError(detail, res.status);
  }

  return res.json();
}
