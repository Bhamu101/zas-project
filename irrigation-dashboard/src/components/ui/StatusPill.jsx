// One status indicator for the whole app. Previously each page invented its
// own coloured pill, so "critical" looked different depending on where you
// were standing.
//
// Tones are semantic and never the lime brand colour — status has to mean
// something independently of "this is our colour". Each pill carries a text
// label as well as colour, so meaning survives for colourblind users and in
// greyscale print.

const TONES = {
  ok: "text-[var(--color-ok)] bg-[var(--color-ok-bg)]",
  warn: "text-[var(--color-warn)] bg-[var(--color-warn-bg)]",
  critical: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  info: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
  /** Deliberately distinct from `critical`: unknown is not the same as bad. */
  offline: "text-[var(--color-neutral)] bg-[var(--color-neutral-bg)]",
  idle: "text-[var(--color-neutral)] bg-[var(--color-neutral-bg)]",
};

const SIZES = {
  sm: "text-[11px] px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

export default function StatusPill({
  tone = "info",
  label,
  pulse = false,
  size = "md",
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${TONES[tone] ?? TONES.info} ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}
