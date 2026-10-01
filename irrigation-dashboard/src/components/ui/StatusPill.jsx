// One status indicator for the whole app. Previously each page invented its
// own coloured pill, so "critical" looked different depending on where you
// were standing.
//
// Tones are semantic and never the lime brand colour — status has to mean
// something independently of "this is our colour". Each pill carries a text
// label as well as colour, so meaning survives for colourblind users and in
// greyscale print.

// No tinted chip behind the label: the dot and the text carry the status on
// their own. The tokens below are the same semantic colours as before, and they
// were already chosen to clear 4.5:1 as text on a plain surface, so dropping the
// tint raises contrast rather than lowering it.
const TONES = {
  ok: "text-[var(--color-ok-strong)]",
  warn: "text-[var(--color-warn-strong)]",
  critical: "text-[var(--color-danger-strong)]",
  info: "text-[var(--color-info-strong)]",
  /** Deliberately distinct from `critical`: unknown is not the same as bad. */
  offline: "text-[var(--color-neutral-strong)]",
  idle: "text-[var(--color-neutral-strong)]",
};

// Horizontal padding went with the chip — without a background it just pushed
// the label out of alignment with whatever it sits next to. Sizes step up the
// shared type scale rather than picking arbitrary pixel values.
const SIZES = {
  sm: "text-xs py-0.5 gap-1.5",
  md: "text-sm py-1 gap-2",
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
      className={`inline-flex items-center rounded-full font-bold whitespace-nowrap ${TONES[tone] ?? TONES.info} ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {/* Dot scales with the label so it doesn't read as a stray speck next to
          the larger text. */}
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}
