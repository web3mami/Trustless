"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export const THEME_KEY = "trustless-theme";

export type Theme = "day" | "moonlit" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: Exclude<Theme, "system">;
  setTheme: (theme: Theme) => void;
}>({
  theme: "day",
  resolvedTheme: "day",
  setTheme: () => undefined,
});

const THEME_CHANGE_EVENT = "trustless-theme-change";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "night") return "moonlit";
    if (stored === "day" || stored === "moonlit" || stored === "system") {
      return stored;
    }
  } catch {
    /* private mode */
  }
  return "day";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getServerTheme = (): Theme => "day";
const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;
const getServerSystemTheme = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    getServerTheme,
  );
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getServerSystemTheme,
  );
  const setTheme = useCallback((nextTheme: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resolvedTheme =
      theme === "system" ? (systemDark ? "moonlit" : "day") : theme;
  }, [systemDark, theme]);

  const resolvedTheme =
    theme === "system" ? (systemDark ? "moonlit" : "day") : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
