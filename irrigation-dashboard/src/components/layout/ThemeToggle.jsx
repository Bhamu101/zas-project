import { useState } from "react";

// Light / dark switch. The initial theme is applied pre-paint by the inline
// script in index.html (reads localStorage, falls back to the OS preference),
// so this just reflects and updates document.documentElement[data-theme].

function currentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);

  const apply = (next) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — theme still applies for this session */
    }
  };

  return (
    <div className="hidden sm:flex items-center rounded-lg border border-[var(--color-border)] p-0.5 text-xs font-semibold">
      {["light", "dark"].map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          aria-pressed={theme === t}
          className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
            theme === t ? "bg-brand text-[#0f0f0f]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
