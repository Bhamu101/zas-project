// Buttons. Lime is reserved for the ONE primary action on a screen; everything
// else is secondary, ghost or danger, so the eye has somewhere to land.
//
// Every variant keeps a min-height of 44px at `md` to meet the touch-target
// minimum, disables cleanly (real `disabled`, not just faded), and shows a
// spinner while busy rather than silently accepting a second click.

const VARIANTS = {
  primary:
    "bg-[var(--color-brand)] text-[var(--color-brand-ink)] hover:brightness-95 active:brightness-90 border border-transparent",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]",
  ghost:
    "bg-transparent text-[var(--color-ink-2)] border border-transparent hover:bg-[var(--color-neutral-bg)]",
  danger:
    "bg-[var(--color-danger)] text-white border border-transparent hover:brightness-95 active:brightness-90",
};

const SIZES = {
  sm: "h-9 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-sm gap-2",
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export default function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  children,
  type = "button",
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      // Communicates busy state to assistive tech, not just visually.
      aria-busy={loading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] font-semibold transition-[filter,background-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] ?? VARIANTS.secondary} ${SIZES[size] ?? SIZES.md} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : Icon ? <Icon size={16} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
