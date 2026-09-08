import { useEffect, useState } from "react";
import { Leaf, LogIn } from "lucide-react";

import { supabase } from "../../lib/supabase";

// Wraps the whole app: renders children only when there's a Supabase session.
// The backend requires a valid bearer token on every /api/* route, so without
// this the dashboard can only ever render 401s.
//
// Deliberately plain — this restores functionality that the auth change broke;
// it is not the redesign.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginGate({ children }) {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setRestoring(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setRestoring(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      // Supabase returns one message for both "no such user" and "wrong
      // password" so the endpoint can't be used to enumerate accounts — keep
      // that property here.
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email or password is not correct."
          : signInError.message
      );
    }
  }

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-[var(--color-muted)] font-display">
        Restoring session…
      </div>
    );
  }

  if (session) return children;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 font-display">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <Leaf size={20} className="text-[#0f0f0f]" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight text-[var(--color-ink)]">Agri-Intelligence</h1>
            <p className="text-xs leading-tight text-[var(--color-muted)]">Sign in to your farm dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[var(--color-ink)]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-brand-strong focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-[var(--color-ink)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-brand-strong focus:ring-2 focus:ring-brand/40"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60"
          >
            <LogIn size={16} strokeWidth={2} />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
