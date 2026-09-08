import { createClient } from "@supabase/supabase-js";

// Supabase Auth for the dashboard. Sign-in happens here; the resulting access
// token is sent to our FastAPI backend, which verifies it against this
// project's public JWKS (see backend/auth.py). No password ever reaches our
// backend, and the backend holds no token-minting secret.
//
// The publishable key is designed to ship in browser clients — it grants
// nothing on its own. The service_role key must never appear here.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set — " +
      "copy irrigation-dashboard/.env.example to .env. Sign-in will fail until they are."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Browser default: session in localStorage, scoped to this origin.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
