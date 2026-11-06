"use client";

import { useId, useState } from "react";
import { DayScene } from "@/components/auth/day-scene";

export type Gender = "male" | "female" | "other";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function Character({
  userId,
  onBack,
  onDone,
}: {
  userId: string;
  onBack: () => void;
  onDone: (player: { username: string; gender: Gender }) => void;
}) {
  const genderName = useId();
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = username.trim();
  const ready = Boolean(trimmed && gender && userId && !busy);

  async function claim(name: string, chosen: Gender) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/usernames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, userId, gender: chosen }),
      });
      if (response.status === 409) {
        setError("This username already exists.");
        setBusy(false);
        return;
      }
      if (!response.ok) {
        setError("Could not check that username.");
        setBusy(false);
        return;
      }
      onDone({ username: name, gender: chosen });
    } catch {
      setError("Could not check that username.");
      setBusy(false);
    }
  }

  return (
    <main className="login create">
      <DayScene />
      <button className="create-back" type="button" onClick={onBack} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.5 6.5 9 12l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="create-stack">
        <h1 className="display create-mark">Trustless</h1>
        <form
          className="create-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed || !gender || !userId || busy) return;
            void claim(trimmed, gender);
          }}
        >
          <label className="create-label" htmlFor="character-name">
            Username
          </label>
          <div className="create-user">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M6.2 18.2c1.2-2.4 3.2-3.6 5.8-3.6s4.6 1.2 5.8 3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <input
              id="character-name"
              autoFocus
              autoComplete="nickname"
              maxLength={16}
              value={username}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "username-error" : undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              placeholder="Username"
            />
          </div>
          {error ? (
            <p id="username-error" className="create-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="create-gender">
            <div className="create-label" id="gender-label">
              Gender
              <button
                className="create-help"
                type="button"
                aria-label="About gender"
                aria-expanded={help}
                aria-controls="gender-help"
                onClick={() => setHelp((open) => !open)}
              >
                ?
              </button>
            </div>
            {help ? (
              <p id="gender-help" className="create-note">
                This is for character creation and costumes.
              </p>
            ) : null}
            <div className="create-options" role="radiogroup" aria-labelledby="gender-label">
              {GENDERS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name={genderName}
                    value={option.value}
                    checked={gender === option.value}
                    onChange={() => setGender(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <button className="create-ok" type="submit" disabled={!ready}>
            OK
          </button>
        </form>
      </div>
    </main>
  );
}
