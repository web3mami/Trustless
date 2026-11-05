"use client";

import { useTheme } from "@/lib/theme";

export function Settings({ onBack }: { onBack: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <main className="room account">
      <div className="gate-card">
        <p className="kicker">Settings</p>
        <h1 className="display">The village hour</h1>
        <p className="lede">
          The sign-in page stays in daylight. After you register, the rest of
          the village can follow day or night.
        </p>
        <div className="theme-switch" role="group" aria-label="Theme">
          <button
            className={theme === "day" ? "primary" : "text-btn"}
            type="button"
            onClick={() => setTheme("day")}
          >
            Day
          </button>
          <button
            className={theme === "night" ? "primary" : "text-btn"}
            type="button"
            onClick={() => setTheme("night")}
          >
            Night
          </button>
        </div>
        <button className="text-btn" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  );
}
