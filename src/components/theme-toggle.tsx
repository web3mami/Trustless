"use client";

import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const night = resolvedTheme === "moonlit";

  return (
    <button
      className={className}
      type="button"
      aria-label={night ? "Switch to Village Day" : "Switch to Moonlit Night"}
      title={night ? "Village Day" : "Moonlit Night"}
      onClick={() => setTheme(night ? "day" : "moonlit")}
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.6v2.1m0 14.6v2.1M2.6 12h2.1m14.6 0h2.1M5.35 5.35l1.48 1.48m10.34 10.34 1.48 1.48m0-13.3-1.48 1.48M6.83 17.17l-1.48 1.48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.7 15.5A7.6 7.6 0 0 1 8.5 5.3 7.7 7.7 0 1 0 18.7 15.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
