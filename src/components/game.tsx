"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Character, type Gender } from "@/components/auth/character";
import { AUTH_PENDING_KEY, Login } from "@/components/auth/login";
import { Profile } from "@/components/auth/profile";
import { Settings } from "@/components/auth/settings";
import { Opening } from "@/components/opening/index";
import { hasPrivyApp } from "@/components/providers";
import { MainMenu } from "@/components/main-menu";
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

type Player = {
  userId: string;
  playerId: string;
  username: string;
  gender: Gender;
  memberSince: string;
  level: number;
  xp: number;
  rank: string;
  stats: {
    matches: number;
    wins: number;
    correctVotes: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }[];
  matchHistory: {
    id: string;
    result: "win" | "loss";
    role: string;
    faction: "good" | "werewolf" | "solo" | "neutral";
    xpEarned: number;
    playedAt: string;
  }[];
  factionRecord: Record<
    "good" | "werewolf" | "solo" | "neutral",
    { games: number; wins: number }
  >;
  mostPlayedRoles: {
    role: string;
    games: number;
  }[];
};

type ProfileLookup = {
  userId: string;
  status: "idle" | "ready" | "error";
};

type VillagePage =
  | "menu"
  | "play"
  | "play-coming"
  | "profile"
  | "settings"
  | "inventory"
  | "roles"
  | "shop";

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
  const [player, setPlayer] = useState<Player | null>(null);
  const [profileLookup, setProfileLookup] = useState<ProfileLookup>({
    userId: "",
    status: "idle",
  });
  const [profileRetry, setProfileRetry] = useState(0);
  const [page, setPage] = useState<VillagePage>("menu");
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

  const userId = user?.id ?? "";

  useEffect(() => {
    if (!authenticated || !userId) return;

    const controller = new AbortController();
    fetch(`/api/usernames?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile lookup failed");
        return response.json() as Promise<{
          profile?: {
            userId?: unknown;
            playerId?: unknown;
            username?: unknown;
            gender?: unknown;
            memberSince?: unknown;
            level?: unknown;
            xp?: unknown;
            rank?: unknown;
            stats?: {
              matches?: unknown;
              wins?: unknown;
              correctVotes?: unknown;
            };
            achievements?: unknown;
            matchHistory?: unknown;
            factionRecord?: unknown;
            mostPlayedRoles?: unknown;
          } | null;
        }>;
      })
      .then(({ profile }) => {
        if (
          profile &&
          profile.userId === userId &&
          typeof profile.username === "string" &&
          (profile.gender === "male" ||
            profile.gender === "female" ||
            profile.gender === "other")
        ) {
          setPlayer({
            userId,
            playerId:
              typeof profile.playerId === "string" ? profile.playerId : "",
            username: profile.username,
            gender: profile.gender,
            memberSince:
              typeof profile.memberSince === "string"
                ? profile.memberSince
                : new Date().toISOString(),
            level: typeof profile.level === "number" ? profile.level : 1,
            xp: typeof profile.xp === "number" ? profile.xp : 0,
            rank: typeof profile.rank === "string" ? profile.rank : "Unranked",
            stats: {
              matches:
                typeof profile.stats?.matches === "number"
                  ? profile.stats.matches
                  : 0,
              wins:
                typeof profile.stats?.wins === "number"
                  ? profile.stats.wins
                  : 0,
              correctVotes:
                typeof profile.stats?.correctVotes === "number"
                  ? profile.stats.correctVotes
                  : 0,
            },
            achievements: Array.isArray(profile.achievements)
              ? (profile.achievements as Player["achievements"])
              : [],
            matchHistory: Array.isArray(profile.matchHistory)
              ? (profile.matchHistory as Player["matchHistory"])
              : [],
            factionRecord:
              profile.factionRecord &&
              typeof profile.factionRecord === "object"
                ? (profile.factionRecord as Player["factionRecord"])
                : {
                    good: { games: 0, wins: 0 },
                    werewolf: { games: 0, wins: 0 },
                    solo: { games: 0, wins: 0 },
                    neutral: { games: 0, wins: 0 },
                  },
            mostPlayedRoles: Array.isArray(profile.mostPlayedRoles)
              ? (profile.mostPlayedRoles as Player["mostPlayedRoles"])
              : [],
          });
        } else {
          setPlayer(null);
        }
        sessionStorage.removeItem(AUTH_PENDING_KEY);
        setAuthPending(false);
        setProfileLookup({ userId, status: "ready" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        sessionStorage.removeItem(AUTH_PENDING_KEY);
        setAuthPending(false);
        setProfileLookup({ userId, status: "error" });
      });

    return () => controller.abort();
  }, [authenticated, profileRetry, userId]);

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
  if (
    !userId ||
    profileLookup.userId !== userId ||
    profileLookup.status === "idle"
  ) {
    return <Login ready={ready} verifying />;
  }
  if (profileLookup.status === "error") {
    return (
      <ProfileLookupError
        onRetry={() => {
          setProfileLookup({ userId: "", status: "idle" });
          setProfileRetry((current) => current + 1);
        }}
        onSignOut={() => void logout()}
      />
    );
  }

  const activePlayer = player?.userId === userId ? player : null;
  if (!activePlayer) {
    return (
      <Character
        userId={userId}
        onBack={() => {
          clearAuthPending();
          void logout();
        }}
        onDone={() => {
          clearAuthPending();
          setProfileLookup({ userId: "", status: "idle" });
          setProfileRetry((current) => current + 1);
        }}
      />
    );
  }

  if (page === "profile") {
    return <Profile player={activePlayer} onBack={() => setPage("menu")} />;
  }
  if (page === "settings") return <Settings onBack={() => setPage("menu")} />;
  if (
    page === "play-coming" ||
    page === "inventory" ||
    page === "roles" ||
    page === "shop"
  ) {
    return (
      <MenuPlaceholder
        title={page === "play-coming" ? "play" : page}
        onBack={() => setPage("menu")}
      />
    );
  }
  if (page === "menu") {
    return (
      <MainMenu
        gender={activePlayer.gender}
        onPlay={() => setPage("play-coming")}
        onInventory={() => setPage("inventory")}
        onProfile={() => setPage("profile")}
        onRoles={() => setPage("roles")}
        onShop={() => setPage("shop")}
        onSettings={() => setPage("settings")}
      />
    );
  }

  return (
    <Table
      you={activePlayer.username}
      onLeave={() => setPage("menu")}
      onProfile={() => setPage("profile")}
      onSettings={() => setPage("settings")}
    />
  );
}

function ProfileLookupError({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="room account">
      <ThemeToggle className="account-theme-toggle" />
      <div className="gate-card">
        <p className="kicker">Identity unavailable</p>
        <h1 className="display">Could not load your profile</h1>
        <p className="lede">Check your connection and try again.</p>
        <div className="account-actions">
          <button className="primary" type="button" onClick={onRetry}>
            Try again
          </button>
          <button className="text-btn" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

function MenuPlaceholder({
  title,
  onBack,
}: {
  title: "play" | "inventory" | "roles" | "shop";
  onBack: () => void;
}) {
  return (
    <main className="room account">
      <ThemeToggle className="account-theme-toggle" />
      <div className="gate-card">
        <p className="kicker">Main Menu</p>
        <h1 className="display">{title.toUpperCase()}</h1>
        <p className="lede">This section is coming soon.</p>
        <button className="text-btn" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
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
