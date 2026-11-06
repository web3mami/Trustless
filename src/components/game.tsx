"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Character, type Gender } from "@/components/auth/character";
import { AUTH_PENDING_KEY, Login } from "@/components/auth/login";
import { Profile } from "@/components/auth/profile";
import { Settings } from "@/components/auth/settings";
import { Opening } from "@/components/opening/index";
import { hasPrivyApp } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AURA_LABEL,
  DEAL,
  SEATS,
  type Aura,
  type Phase,
  type Seat,
} from "@/lib/table";

type Message = {
  id: string;
  author: string;
  text: string;
  system?: boolean;
};

type Read = {
  round: number;
  seatId: number;
  aura: Aura;
};

const OPENING: Message[] = [
  {
    id: "m1",
    author: "Mara",
    text: "If you have a night read, say the seat and the word. Signed, unsigned, or blind.",
  },
  {
    id: "m2",
    author: "Ren",
    text: "I am not claiming until someone is actually checked.",
  },
  {
    id: "m3",
    author: "Quinn",
    text: "The first name in the chat is bait. Read the roll before you pile on.",
  },
];

const OPENING_SEEN_KEY = "trustless-opening-seen";
const AUTH_VERIFY_TIMEOUT = 20_000;
const subscribeToHydration = () => () => {};
const getClientHydration = () => true;
const getServerHydration = () => false;

export function Game({ initialOpened = false }: { initialOpened?: boolean }) {
  const [opened, setOpened] = useState(initialOpened);

  if (!opened) {
    return (
      <Opening
        onDone={() => {
          sessionStorage.setItem(OPENING_SEEN_KEY, "true");
          document.cookie = `${OPENING_SEEN_KEY}=true; path=/; SameSite=Lax`;
          setOpened(true);
        }}
      />
    );
  }

  if (!hasPrivyApp()) {
    return <Login />;
  }

  return <Village />;
}

function Village() {
  const { ready, authenticated, logout, user } = usePrivy();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydration,
    getServerHydration,
  );
  const [player, setPlayer] = useState<{ username: string; gender: Gender } | null>(null);
  const [page, setPage] = useState<"play" | "profile" | "settings">("play");
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(() => {
    if (typeof window === "undefined") return false;
    const started = Number(sessionStorage.getItem(AUTH_PENDING_KEY));
    const pending =
      Number.isFinite(started) && Date.now() - started < AUTH_VERIFY_TIMEOUT;
    if (!pending) sessionStorage.removeItem(AUTH_PENDING_KEY);
    return pending;
  });

  useEffect(() => {
    if (!authPending || authenticated) return;
    const started = Number(sessionStorage.getItem(AUTH_PENDING_KEY));
    const remaining = Math.max(
      0,
      AUTH_VERIFY_TIMEOUT - (Date.now() - started),
    );
    const timeout = window.setTimeout(() => {
      sessionStorage.removeItem(AUTH_PENDING_KEY);
      setAuthPending(false);
      setAuthError("Google sign-in did not complete. Please try again.");
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [authPending, authenticated]);

  function clearAuthPending() {
    sessionStorage.removeItem(AUTH_PENDING_KEY);
    setAuthPending(false);
  }

  if (!hydrated || !ready || (authPending && !authenticated)) {
    return (
      <Login
        ready={ready}
        verifying
        onOAuthError={(message) => {
          clearAuthPending();
          setAuthError(message);
        }}
      />
    );
  }
  if (!authenticated) {
    return (
      <Login
        authError={authError}
        onOAuthError={(message) => {
          clearAuthPending();
          setAuthError(message);
        }}
      />
    );
  }
  if (page === "profile") return <Profile onBack={() => setPage("play")} />;
  if (page === "settings") return <Settings onBack={() => setPage("play")} />;
  if (!player) {
    return (
      <Character
        userId={user?.id ?? ""}
        onBack={() => {
          clearAuthPending();
          void logout();
        }}
        onDone={(nextPlayer) => {
          clearAuthPending();
          setPlayer(nextPlayer);
        }}
      />
    );
  }

  return (
    <Table
      you={player.username}
      onLeave={() => setPlayer(null)}
      onProfile={() => setPage("profile")}
      onSettings={() => setPage("settings")}
    />
  );
}

function Table({
  you,
  onLeave,
  onProfile,
  onSettings,
}: {
  you: string;
  onLeave: () => void;
  onProfile: () => void;
  onSettings: () => void;
}) {
  const dealRef = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("night");
  const [round, setRound] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reads, setReads] = useState<Read[]>([]);
  const [votes, setVotes] = useState<{ round: number; seatId: number }[]>([]);
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState("");

  const seats = SEATS.map((seat) =>
    seat.id === 1 ? { ...seat, name: you } : seat,
  );
  const selected = seats.find((seat) => seat.id === selectedId) ?? null;
  const nightRead = reads.find((read) => read.round === round) ?? null;
  const vote = votes.find((entry) => entry.round === round) ?? null;
  const votedSeat = seats.find((seat) => seat.id === vote?.seatId) ?? null;

  function speak(author: string, text: string, system = false) {
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, author, text, system },
    ]);
  }

  function shiftPhase() {
    setSelectedId(null);
    if (phase === "night") {
      setPhase("day");
      speak("Table", `Dawn. Day ${round} is in session.`, true);
      return;
    }
    setPhase("night");
    setRound((current) => current + 1);
    speak("Table", "Dusk. The village closes.", true);
  }

  function readSignature() {
    if (phase !== "night" || !selected || selected.id === 1 || nightRead) return;
    setReads((current) => [
      ...current,
      { round, seatId: selected.id, aura: selected.aura },
    ]);
  }

  function castVote() {
    if (phase !== "day" || !selected || selected.id === 1) return;
    setVotes((current) => [
      ...current.filter((entry) => entry.round !== round),
      { round, seatId: selected.id },
    ]);
  }

  return (
    <main className="room" data-phase={phase}>
      <header className="top">
        <div className="brand">
          <p className="kicker">Table 04</p>
          <h1 className="display">Trustless</h1>
        </div>
        <div className="phase-block">
          <strong className="display">
            {phase === "night" ? "Night" : "Day"} {round}
          </strong>
          <span className="alive">16 alive</span>
        </div>
        <div className="top-actions">
          <button className="text-btn" type="button" onClick={() => dealRef.current?.showModal()}>
            The deal
          </button>
          <button className="text-btn" type="button" onClick={shiftPhase}>
            {phase === "night" ? "Dawn" : "Dusk"}
          </button>
          <button className="text-btn" type="button" onClick={onProfile}>
            Profile
          </button>
          <button className="text-btn" type="button" onClick={onSettings}>
            Settings
          </button>
          <button className="text-btn" type="button" onClick={onLeave}>
            Leave
          </button>
          <ThemeToggle className="room-theme-toggle" />
        </div>
      </header>

      <div className="stage">
        <ol className="roll">
          {seats.map((seat) => (
            <li key={seat.id}>
              <SeatButton
                seat={seat}
                you={seat.id === 1}
                pressed={selectedId === seat.id}
                revealed={open}
                onPick={() => setSelectedId(seat.id === selectedId ? null : seat.id)}
              />
            </li>
          ))}
        </ol>

        <aside className="side">
          <section>
            <h2>Your role</h2>
            {open ? (
              <>
                <p className="role-name display">Auditor</p>
                <p>
                  Each night, check one player. Signed is village. Unsigned is a
                  wolf. Blind is a solo, Phantom, or a villager who kills.
                </p>
                <span className="aura aura-signed">Signed</span>
              </>
            ) : (
              <>
                <button className="seal-btn" type="button" onClick={() => setOpen(true)}>
                  Open
                </button>
                <p className="hint">The seal is still closed.</p>
              </>
            )}
          </section>

          <section className="action">
            <h2>{phase === "night" ? "Night check" : "Vote"}</h2>
            {phase === "night" ? (
              <NightCheck
                selected={selected}
                read={nightRead}
                seats={seats}
                onRead={readSignature}
              />
            ) : (
              <DayVote selected={selected} voted={votedSeat} onVote={castVote} />
            )}
            {reads.length > 0 ? (
              <ul className="log">
                {reads.map((read) => {
                  const seat = seats.find((item) => item.id === read.seatId);
                  return (
                    <li key={`${read.round}-${read.seatId}`}>
                      Night {read.round} · {seat?.name} ·{" "}
                      <span className={`aura aura-${read.aura}`}>
                        {AURA_LABEL[read.aura]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </aside>
      </div>

      <section className="transcript">
        <h2>Village</h2>
        <ul className="messages">
          {messages.map((message) =>
            message.system ? (
              <li key={message.id} className="system">
                {message.text}
              </li>
            ) : (
              <li key={message.id}>
                <span className="author">{message.author}</span>
                <span>{message.text}</span>
              </li>
            ),
          )}
        </ul>
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            speak(you, text);
            setDraft("");
          }}
        >
          <input
            aria-label="Message the village"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Speak to the village"
          />
          <button className="text-btn" type="submit">
            Send
          </button>
        </form>
      </section>

      <dialog className="deal" ref={dealRef}>
        <p className="kicker">Public setup</p>
        <h2 className="display">The deal</h2>
        {DEAL.map((group) => (
          <div className="deal-group" key={group.side}>
            <h3>{group.side}</h3>
            <ul>
              {group.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
        ))}
        <button
          className="text-btn"
          type="button"
          onClick={() => dealRef.current?.close()}
        >
          Close
        </button>
      </dialog>
    </main>
  );
}

function SeatButton({
  seat,
  you,
  pressed,
  revealed,
  onPick,
}: {
  seat: Seat;
  you: boolean;
  pressed: boolean;
  revealed: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={you ? "seat you" : "seat"}
      aria-pressed={pressed}
      disabled={you}
      onClick={onPick}
    >
      <span className="num">{String(seat.id).padStart(2, "0")}</span>
      <span className="who">
        <span className="name">{seat.name}</span>
        {you ? <span className="tag">{revealed ? "You · Auditor" : "You"}</span> : null}
      </span>
    </button>
  );
}

function NightCheck({
  selected,
  read,
  seats,
  onRead,
}: {
  selected: Seat | null;
  read: Read | null;
  seats: Seat[];
  onRead: () => void;
}) {
  const readSeat = seats.find((seat) => seat.id === read?.seatId);

  return (
    <>
      <p>
        {read && readSeat
          ? `${readSeat.name} reads ${AURA_LABEL[read.aura].toLowerCase()}.`
          : selected
            ? `Ready to read ${selected.name}.`
            : "Pick a seat from the roll."}
      </p>
      <button
        className="primary"
        type="button"
        disabled={!selected || selected.id === 1 || Boolean(read)}
        onClick={onRead}
      >
        Read signature
      </button>
    </>
  );
}

function DayVote({
  selected,
  voted,
  onVote,
}: {
  selected: Seat | null;
  voted: Seat | null;
  onVote: () => void;
}) {
  return (
    <>
      <p>
        {voted
          ? `Your vote is on ${voted.name}.`
          : selected
            ? `Ready to vote ${selected.name}.`
            : "Pick a seat from the roll."}
      </p>
      <button
        className="primary"
        type="button"
        disabled={!selected || selected.id === 1}
        onClick={onVote}
      >
        Cast vote
      </button>
    </>
  );
}
