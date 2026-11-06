"use client";

import { DayScene } from "@/components/auth/day-scene";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Gender } from "@/components/auth/character";

export function MainMenu({
  gender,
  onPlay,
  onInventory,
  onProfile,
  onRoles,
  onShop,
  onSettings,
}: {
  gender: Gender;
  onPlay: () => void;
  onInventory: () => void;
  onProfile: () => void;
  onRoles: () => void;
  onShop: () => void;
  onSettings: () => void;
}) {
  return (
    <main className="login main-menu">
      <DayScene />
      <header className="main-menu-top">
        <div className="main-menu-tools">
          <button className="main-menu-icon" type="button" aria-label="Friends" title="Friends">
            <FriendsIcon />
          </button>
          <button
            className="main-menu-icon"
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={onSettings}
          >
            <SettingsIcon />
          </button>
          <ThemeToggle className="main-menu-icon" />
        </div>
      </header>

      <section className="main-menu-nav" aria-label="Main menu">
        <nav>
          <button className="main-menu-play" type="button" onClick={onPlay}>
            Play
          </button>
          <button type="button" onClick={onInventory}>Inventory</button>
          <button type="button" onClick={onProfile}>Profile</button>
          <button type="button" onClick={onRoles}>Roles</button>
          <button type="button" onClick={onShop}>Shop</button>
        </nav>
      </section>

      <PlayerCharacter gender={gender} />
    </main>
  );
}

function PlayerCharacter({ gender }: { gender: Gender }) {
  return (
    <div
      className="main-menu-character"
      role="img"
      aria-label={`Default ${gender} player character`}
    >
      <svg viewBox="0 0 320 520" aria-hidden="true">
        <ellipse className="character-shadow" cx="160" cy="497" rx="104" ry="15" />
        <path className="character-cloak" d="M71 492c8-106 32-178 73-209h32c42 30 66 103 73 209Z" />
        <path className="character-coat" d="M113 492c3-91 15-151 47-194 31 43 44 103 47 194Z" />
        <path className="character-neck" d="M139 281v38h42v-38Z" />
        <ellipse className="character-face" cx="160" cy="226" rx="57" ry="69" />
        {gender === "female" ? (
          <path className="character-hair" d="M102 226c-2-71 23-105 62-105 45 0 65 39 58 111l-18 76-22-24 13-75c-8-25-25-41-52-45-13 17-21 39-22 67l15 54-25 25Z" />
        ) : gender === "male" ? (
          <path className="character-hair" d="M103 218c1-65 25-98 61-98 39 0 60 30 59 91l-19-21-13-28-26 9-30-8-17 32Z" />
        ) : (
          <path className="character-hair" d="M101 221c2-66 26-101 64-101 42 0 63 34 58 101l-17-29-16-30-27 11-31-9-16 30-5 68Z" />
        )}
        <path className="character-brow" d="M128 221c9-5 18-5 27 0m12 0c9-5 18-5 26 0" />
        <circle className="character-eye" cx="142" cy="232" r="3" />
        <circle className="character-eye" cx="180" cy="232" r="3" />
        <path className="character-face-line" d="M160 236v15l-6 5m-10 18c10 6 21 6 32 0" />
        <path className="character-lapel" d="m139 309 21 36 21-36m-21 36v147" />
        <path className="character-network-detail" d="M128 374c22-14 43-14 65 0m-49 15 16-14 17 14" />
        <circle className="character-node" cx="128" cy="374" r="4" />
        <circle className="character-node" cx="193" cy="374" r="4" />
        <circle className="character-node" cx="160" cy="375" r="5" />
      </svg>
    </div>
  );
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 18c.8-3 2.6-4.5 5.2-4.5s4.4 1.5 5.2 4.5M14 14.3c2.8-.5 4.8.7 5.7 3.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
