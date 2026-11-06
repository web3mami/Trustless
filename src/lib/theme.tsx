"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEME_KEY = "trustless-theme";

export type Theme = "day" | "blue-hour" | "moonlit" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: Exclude<Theme, "system">;
  setTheme: (theme: Theme) => void;
}>({
  theme: "day",
  resolvedTheme: "day",
  setTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "day";
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "night") return "moonlit";
      if (
        stored === "day" ||
        stored === "blue-hour" ||
        stored === "moonlit" ||
        stored === "system"
      ) {
        return stored;
      }
    } catch {
      /* private mode */
    }
    return "day";
  });
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resolvedTheme =
      theme === "system" ? (systemDark ? "moonlit" : "day") : theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [systemDark, theme]);

  const resolvedTheme =
    theme === "system" ? (systemDark ? "moonlit" : "day") : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
