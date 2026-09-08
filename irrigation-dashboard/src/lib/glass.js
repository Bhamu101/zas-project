// Shared surface classes.
//
// The name is historical — there is no glass effect any more. These are kept as
// the single definition of a card/dropdown surface because they're referenced
// across every page; pointing them at the design tokens migrates the whole app
// to the new system (and to token-driven dark mode) in one place.
//
// New components should prefer <Card> from components/ui/Card.jsx. These
// constants remain for the pages that haven't been rebuilt yet.

export const GLASS_CARD =
  "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] rounded-[var(--radius-lg)]";

export const SOLID_DROPDOWN =
  "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-pop)] rounded-[var(--radius-lg)]";
