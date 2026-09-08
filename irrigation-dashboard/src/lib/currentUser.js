// Centralised current-user / role helper.
//
// Identity now comes from the real Supabase session (see LoginGate) rather than
// a hardcoded stub. `role` is read from the user's app_metadata and is one of:
// "administrator" | "operator" | "viewer".
//
// IMPORTANT: this is a *UI convenience only*. Roles live in app_metadata, which
// a user cannot edit themselves, but the checks below still run in the browser
// and must never be the only thing protecting a privileged action. The backend
// currently authenticates every request but does not yet authorise by role —
// until it does, treat these as "hide the button", not "enforce the rule".
//
// System-critical settings (irrigation thresholds, pump protection, energy
// cut-offs, maintenance actions) are gated on "administrator"; everyone else
// gets a read-only view of the same page.

import { supabase } from "./supabase";

const DEFAULT_ROLE = "administrator";

let cachedUser = null;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = session?.user
    ? {
        name:
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Farm User",
        email: session.user.email ?? "",
        role: session.user.app_metadata?.role ?? DEFAULT_ROLE,
      }
    : null;
});

export function getCurrentUser() {
  return cachedUser;
}

/** Kept as a named export for the call sites that read it directly. */
export const CURRENT_USER = new Proxy(
  {},
  {
    get(_target, prop) {
      return (cachedUser ?? { name: "Farm User", email: "", role: DEFAULT_ROLE })[prop];
    },
  }
);

export function isAdmin(user = getCurrentUser()) {
  return (user?.role ?? DEFAULT_ROLE) === "administrator";
}

export function canEditSettings(user = getCurrentUser()) {
  return isAdmin(user);
}

export function signOut() {
  return supabase.auth.signOut();
}
