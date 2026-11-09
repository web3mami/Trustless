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

export function PlayerCharacter({
  gender,
  className = "main-menu-character",
}: {
  gender: Gender;
  className?: string;
}) {
  return (
    <div
      className={className}
      role="img"
      aria-label={`Default ${gender} player character`}
    >
      <svg viewBox="0 0 320 520" aria-hidden="true">
        <defs>
          <linearGradient id="character-skin-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop className="character-skin-light" offset="0" />
            <stop className="character-skin-dark" offset="1" />
          </linearGradient>
          <linearGradient id="character-coat-gradient" x1="0" y1="0" x2="0.9" y2="1">
            <stop className="character-coat-light" offset="0" />
            <stop className="character-coat-dark" offset="1" />
          </linearGradient>
        </defs>

        <ellipse className="character-shadow" cx="160" cy="497" rx="104" ry="15" />

        <g className="character-bottom-layer" data-layer="bottom">
          <path className="character-trouser" d="M117 414h43v79H99l11-50Zm43 0h43l7 29 11 50h-61Z" />
          <path className="character-boot" d="M98 493h62v9H88c0-5 4-8 10-9Zm62 0h62c6 1 10 4 10 9h-72Z" />
        </g>

        <g className="character-hair-back-layer character-head-idle" data-layer="hair-back">
          {gender === "female" ? (
            <path className="character-hair" d="M101 214c-2-63 24-101 63-101 46 0 67 39 61 111l-11 89-27-20 8-78c-7-34-26-52-53-53-17 16-26 39-27 68l11 68-25 19Z" />
          ) : gender === "other" ? (
            <path className="character-hair" d="M100 219c1-67 27-106 67-106 43 0 65 37 58 108l-13 62-25-15 8-65-31-43-36 14-14 46-2 72-20-14Z" />
          ) : null}
        </g>

        <g className="character-body-idle">
          <g className="character-top-layer" data-layer="top">
            <path className="character-cloak" d="M67 492c4-83 14-134 37-164 13-18 30-27 51-29h10c22 2 39 11 52 29 23 30 33 81 37 164Z" />
            <path className="character-sleeve" d="M104 330c-27 21-36 75-38 162h45l15-152Zm112 0c27 21 36 75 38 162h-45l-15-152Z" />
            <path className="character-coat" d="M111 492c2-83 8-139 28-183l21 25 21-25c20 44 27 100 29 183Z" />
            <path className="character-lapel" d="m138 309 22 26 22-26-8 58-14-20-14 20Z" />
            <path className="character-seam" d="M160 347v145m-34-100h68M116 450h88" />
          </g>
        </g>

        <g className="character-skin-layer character-head-idle" data-layer="skin">
          <path className="character-neck" d="M138 272v45c10 13 34 13 44 0v-45Z" />
          <path className="character-neck-shadow" d="M145 275c8 10 22 13 37 7v27c-11 10-25 10-37 2Z" />
          <path className="character-ear" d="M108 222c-11-4-15 5-11 18 3 11 9 17 17 14Zm104 0c11-4 15 5 11 18-3 11-9 17-17 14Z" />
          <path className="character-face" d="M111 210c2-53 19-80 50-82 33 1 50 30 50 82l-5 34c-4 25-19 46-45 55-25-8-42-29-47-55Z" />
          <path className="character-cheek-shade" d="M116 250c9 9 18 12 29 10-7 11-16 15-26 11Zm90 0c-9 9-18 12-29 10 7 11 16 15 26 11Z" />
          <path className="character-jaw-shade" d="M132 281c19 12 39 12 58 0-8 11-18 17-29 20-12-3-22-9-29-20Z" />
        </g>

        <g className="character-face-layer character-head-idle" data-layer="face">
          <path className="character-brow" d="M126 211c10-6 20-6 30-1m11 0c10-5 20-5 29 1" />
          <g className="character-eyes">
            <path className="character-eye-line" d="M128 226c8-7 18-7 27 0-9 6-18 6-27 0Zm39 0c8-7 18-7 27 0-9 6-18 6-27 0Z" />
            <circle className="character-eye" cx="142" cy="226" r="2.7" />
            <circle className="character-eye" cx="181" cy="226" r="2.7" />
          </g>
          <path className="character-nose" d="M161 230c-1 10-3 18-7 24 4 3 9 4 14 1" />
          <path className="character-mouth" d="M145 272c10 4 21 4 31-1" />
        </g>

        <g className="character-hair-front-layer character-head-idle" data-layer="hair">
          {gender === "female" ? (
            <>
              <path className="character-hair" d="M107 205c2-59 22-91 58-92 37 1 59 32 58 89l-20-30-15-25-28 15-30-8-17 26Z" />
              <path className="character-hair-highlight" d="M129 139c24-15 50-9 67 14m-72 23c17-6 31-13 43-23" />
            </>
          ) : gender === "male" ? (
            <>
              <path className="character-hair" d="M105 207c2-61 23-93 60-94 39 1 60 31 58 90l-17-23-13-34-29 15-32-9-17 27Z" />
              <path className="character-hair-highlight" d="M126 143c24-15 49-12 68 8m-70 27c15-5 29-13 41-23" />
            </>
          ) : (
            <>
              <path className="character-hair" d="M104 209c2-62 25-96 63-96 40 1 61 34 57 96l-19-32-17-31-26 16-33-9-16 29Z" />
              <path className="character-hair-highlight" d="M127 141c24-14 50-9 68 14m-74 24c19-6 34-15 47-27" />
            </>
          )}
        </g>

        <g className="character-accessory-layer" data-layer="accessories">
          <path className="character-network-detail" d="M129 391c21-13 42-13 63 0m-47 13 15-13 16 13" />
          <circle className="character-node" cx="129" cy="391" r="3.5" />
          <circle className="character-node" cx="192" cy="391" r="3.5" />
          <path className="character-badge" d="M151 372h18l5 9-14 15-14-15Z" />
          <circle className="character-node" cx="160" cy="381" r="4" />
        </g>
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
