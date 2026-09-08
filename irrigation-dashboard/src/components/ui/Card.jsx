// The one card. Every panel in the app should be built from this rather than
// re-declaring a surface/border/shadow/radius combination inline, which is how
// the pages drifted apart from each other in the first place.
//
// Uses semantic tokens, so dark mode comes from re-pointing those tokens
// instead of a per-class override.

export function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Card header. `action` is the optional right-hand control (a "View all" link,
 * a filter, etc.). Renders an h3 so the page keeps a sane heading order.
 */
export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 pt-4 ${className}`}>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export default Card;
