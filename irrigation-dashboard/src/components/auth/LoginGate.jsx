import { useEffect, useRef, useState } from "react";

import { supabase } from "../../lib/supabase";

// Wraps the whole app: renders children only when there's a Supabase session.
// The backend requires a valid bearer token on every /api/* route, so without
// this the dashboard can only ever render 401s.
//
// Split-panel layout: the brand lockup sits on a dark panel on the left, the
// form on a light panel on the right. Below `md` the panel would eat the whole
// viewport, so it collapses to a compact logo above the form instead.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// A dead or unreachable auth host makes getSession() retry with backoff, which
// otherwise leaves the user on "Restoring session…" indefinitely. Past this we
// show the form: a stored session resolves from localStorage long before this,
// so anything slower is a network problem the form can report properly.
const RESTORE_TIMEOUT_MS = 6000;

// The brand lockup carries a lot of transparent padding below the artwork.
// Cropping to the content box (rather than object-contain) stops the logo
// sitting high in its panel with a dead band underneath.
const LOGO_CONTENT_ASPECT = "2492 / 990";
const LOGO_CONTENT_OFFSET = "center 42%";

function BrandLogo({ className = "" }) {
  return (
    <div className={`overflow-hidden ${className}`} style={{ aspectRatio: LOGO_CONTENT_ASPECT }}>
      <img
        src="/logo-header.png"
        alt="TelOne Centre for Learning — Goho Rakangwara"
        className="h-full w-full object-cover"
        style={{ objectPosition: LOGO_CONTENT_OFFSET }}
      />
    </div>
  );
}

function Field({ id, label, type, value, onChange, autoComplete, placeholder, action }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-[var(--color-muted)]">
          {label}
        </label>
        {action}
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border-0 border-b border-[var(--color-border-strong)] bg-transparent px-0 py-2 text-base text-[var(--color-ink)] transition-colors outline-none placeholder:text-[var(--color-border-strong)] focus:border-[var(--color-brand-strong)]"
      />
    </div>
  );
}

export default function LoginGate({ children }) {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  // "signin" | "signup" — the layout offers a sign-up affordance, so it toggles
  // the same form rather than linking somewhere that doesn't exist.
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;

    function settle(next) {
      settled.current = true;
      setSession(next);
      setRestoring(false);
    }

    supabase.auth.getSession().then(({ data }) => settle(data.session));

    const timer = setTimeout(() => {
      if (!settled.current) setRestoring(false);
    }, RESTORE_TIMEOUT_MS);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => settle(next));

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
  }

  async function handleForgotPassword() {
    setError(null);
    setNotice(null);

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      return setError("Enter your email address above, then choose Forgot password.");
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin,
    });
    setSubmitting(false);

    if (resetError) return setError(resetError.message);
    // Deliberately worded so it reads the same whether or not the address has
    // an account — otherwise this becomes an account-enumeration endpoint.
    setNotice("If that address has an account, a reset link is on its way.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    if (mode === "signup" && password.length < 6) {
      return setError("Choose a password of at least 6 characters.");
    }

    setSubmitting(true);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password,
      });
      setSubmitting(false);

      if (signUpError) return setError(signUpError.message);
      // With email confirmation on, signUp returns no session until the link is
      // followed — say so rather than appearing to do nothing.
      if (!data.session) {
        setNotice("Account created. Check your email for a confirmation link, then sign in.");
        setMode("signin");
        setPassword("");
      }
      return;
    }

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
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] font-display text-[var(--color-muted)]">
        Restoring session…
      </div>
    );
  }

  if (session) return children;

  const signingUp = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-4 font-display sm:p-6">
      <div className="grid w-full max-w-[960px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-pop)] md:min-h-[600px] md:grid-cols-2">
        {/* ---- Brand panel -------------------------------------------------
            Fixed dark ground in both themes: the lockup's glow artwork is drawn
            for a dark background and washes out on a light one. */}
        <div
          className="relative hidden flex-col items-center justify-center overflow-hidden p-10 md:flex"
          style={{ background: "linear-gradient(160deg, #0a1733 0%, #12294f 55%, #0a1c3a 100%)" }}
        >
          {/* Soft glows picking up the green of the leaf mark and the blue of
              the wordmark, so the panel isn't a flat rectangle. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 50% at 20% 85%, rgba(74, 222, 128, 0.20), transparent 70%), radial-gradient(60% 45% at 85% 10%, rgba(96, 165, 250, 0.22), transparent 70%)",
            }}
          />

          <div className="relative flex w-full max-w-[340px] flex-col items-center text-center">
            <BrandLogo className="w-full" />

            <h2 className="mt-10 text-2xl font-light tracking-[0.34em] text-white">WELCOME</h2>
            <div className="mt-5 h-px w-12 bg-white/25" />
            <p className="mt-5 text-sm leading-relaxed text-white/65">
              Smart irrigation, energy and crop monitoring for the Goho Rakangwara farm.
            </p>
          </div>
        </div>

        {/* ---- Form panel -------------------------------------------------- */}
        <div className="flex flex-col justify-center p-7 sm:p-12">
          {/* The brand panel is hidden on small screens, so the lockup appears
              here instead rather than dropping the branding entirely. */}
          <BrandLogo className="mx-auto mb-8 w-full max-w-[260px] md:hidden" />

          <h1 className="text-center text-3xl font-light text-[var(--color-ink)]">
            {signingUp ? "Sign up" : "Login"}
          </h1>

          <form onSubmit={handleSubmit} className="mt-10 space-y-7">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              action={
                signingUp ? null : (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={submitting}
                    className="cursor-pointer rounded text-xs font-semibold text-[var(--color-brand-text)] hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )
              }
            />

            <div aria-live="polite" className="space-y-2 empty:hidden">
              {error && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-danger)]"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-[var(--radius-sm)] bg-[var(--color-ok-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-ok)]">
                  {notice}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-brand)] text-sm font-bold text-[var(--color-brand-ink)] transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {submitting
                ? signingUp
                  ? "Creating account…"
                  : "Signing in…"
                : signingUp
                  ? "Create account"
                  : "Login"}
            </button>
          </form>

          <p className="mt-10 text-right text-xs text-[var(--color-muted)]">
            {signingUp ? "Already have an account?" : "Don’t have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(signingUp ? "signin" : "signup")}
              className="cursor-pointer rounded font-semibold text-[var(--color-brand-text)] hover:underline"
            >
              {signingUp ? "Login" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
