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
          Choose the light that follows you through the network.
        </p>
        <div className="theme-switch" role="group" aria-label="Theme">
          <button
            className={theme === "day" ? "primary" : "text-btn"}
            type="button"
            onClick={() => setTheme("day")}
          >
            Village Day
          </button>
          <button
            className={theme === "moonlit" ? "primary" : "text-btn"}
            type="button"
            onClick={() => setTheme("moonlit")}
          >
            Moonlit Night
          </button>
          <button
            className={theme === "system" ? "primary" : "text-btn"}
            type="button"
            onClick={() => setTheme("system")}
          >
            System
          </button>
        </div>
        <button className="text-btn" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  );
}
