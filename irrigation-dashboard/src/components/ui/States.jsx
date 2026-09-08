// Shared loading / empty / error states.
//
// Before this, "loading" was a single centred line of text and "error" was
// another one. Skeletons that match the shape of the incoming content stop the
// layout jumping when data lands, and give the user something to read the
// structure from while they wait.

import Button from "./Button";

/** Shimmering placeholder block. Sized by the caller to match real content. */
export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-neutral-bg)] ${className}`}
    />
  );
}

/** Card-shaped skeleton for a KPI tile. */
export function StatSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
      <Skeleton className="mt-4 h-8 w-full" />
    </div>
  );
}

/** Full-panel skeleton for a chart or list. */
export function PanelSkeleton({ height = "h-64" }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className={`mt-4 w-full ${height}`} />
    </div>
  );
}

/**
 * Nothing to show. Always says what would appear here and, where possible,
 * offers the action that would create it — a bare "No data" is a dead end.
 */
export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      {message && <p className="max-w-sm text-xs text-[var(--color-muted)]">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Something failed. Always pairs the cause with a way out, per the skill's
 * `error-recovery` rule — an error with no retry is just a dead end too.
 */
export function ErrorState({ title = "Something went wrong", message, onRetry, detail }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
    >
      <p className="text-sm font-semibold text-[var(--color-danger)]">{title}</p>
      {message && <p className="max-w-md text-xs text-[var(--color-muted)]">{message}</p>}
      {detail && <p className="text-[11px] text-[var(--color-muted)]">{detail}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}
