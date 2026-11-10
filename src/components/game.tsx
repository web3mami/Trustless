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
import { RolesPage } from "@/components/roles/roles-page";
import type { RoleStat } from "@/lib/roles";
import type { TableIntent, TableResult, TableView } from "@/lib/game/practice";

type Message = {
  id: string;
  author: string;
  text: string;
  system?: boolean;
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
  roleStats: RoleStat[];
};

type ProfileLookup = {
  userId: string;
  status: "idle" | "ready" | "error" | "banned";
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
  const { ready, authenticated, logout, user, getAccessToken } = usePrivy();
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
    getAccessToken()
      .then((token) =>
        fetch("/api/usernames", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token ?? ""}` },
          signal: controller.signal,
        }),
      )
      .then(async (response) => {
        if (response.status === 403) return { banned: true as const };
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
            roleStats?: unknown;
          } | null;
        }>;
      })
      .then((body) => {
        if ("banned" in body) {
          sessionStorage.removeItem(AUTH_PENDING_KEY);
          setAuthPending(false);
          setProfileLookup({ userId, status: "banned" });
          return;
        }
        const { profile } = body;
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
            roleStats: Array.isArray(profile.roleStats)
              ? (profile.roleStats as Player["roleStats"])
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
  }, [authenticated, getAccessToken, profileRetry, userId]);

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
  if (profileLookup.status === "banned") {
    return <AccountSuspended onSignOut={() => void logout()} />;
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

  if (page === "roles") {
    return <RolesPage onBack={() => setPage("menu")} />;
  }
  if (page === "profile") {
    return <Profile player={activePlayer} onBack={() => setPage("menu")} />;
  }
  if (page === "settings") return <Settings onBack={() => setPage("menu")} />;
  if (
    page === "play-coming" ||
    page === "inventory" ||
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
        onPlay={() => setPage("play")}
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
      gender={activePlayer.gender}
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

function AccountSuspended({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="room account">
      <ThemeToggle className="account-theme-toggle" />
      <div className="gate-card">
        <p className="kicker">Account suspended</p>
        <h1 className="display">This account can’t play right now</h1>
        <p className="lede">It has been suspended from TRUSTLESS.</p>
        <div className="account-actions">
          <button className="primary" type="button" onClick={onSignOut}>
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
  title: "play" | "inventory" | "shop";
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
  gender,
  onLeave,
  onProfile,
  onSettings,
}: {
  you: string;
  gender: Gender;
  onLeave: () => void;
  onProfile: () => void;
  onSettings: () => void;
}) {
  const dealRef = useRef<HTMLDialogElement>(null);
  const [table, setTable] = useState<TableView | null>(null);
  const [intent, setIntent] = useState<TableIntent>("ability");
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>(OPENING);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "start", you }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("The table did not open.");
        return response.json() as Promise<TableView>;
      })
      .then((view) => {
        setTable(view);
        setIntent(view.you.intents[0] ?? "vote");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("The table did not open.");
      });
    return () => controller.abort();
  }, [you]);

  const phase = table?.phase ?? "night";
  const needed = intent === "vote" ? 1 : (table?.you.abilityTargets ?? 0);
  const locked = pending || (intent === "ability" && Boolean(table?.you.submitted));

  function speak(author: string, text: string, system = false) {
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, author, text, system },
    ]);
  }

  async function postTable(body: Record<string, unknown>) {
    if (!table) return false;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: table.matchId, ...body }),
      });
      const payload = (await response.json()) as TableView & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "The table refused that action.");
        return false;
      }
      setTable(payload);
      setPicked([]);
      if (!payload.you.intents.includes(intent)) setIntent(payload.you.intents[0] ?? "vote");
      return true;
    } catch {
      setError("The table did not answer.");
      return false;
    } finally {
      setPending(false);
    }
  }

  function shiftPhase() {
    const leaving = phase;
    const day = table?.day ?? 1;
    void postTable({ op: "advance" }).then((ok) => {
      if (!ok) return;
      speak("Table", leaving === "night" ? `Dawn. Day ${day} is in session.` : "Dusk. The village closes.", true);
    });
  }

  function pickSeat(id: string) {
    if (!table || locked) return;
    const seat = table.seats.find((entry) => entry.id === id);
    if (!seat) return;
    const valid = intent === "vote" ? seat.validVote : seat.validAbility;
    setPicked((current) => {
      const existing = current.indexOf(id);
      if (existing >= 0) return current.filter((entry) => entry !== id);
      if (!valid || needed === 0) return current;
      if (current.length >= needed) return current;
      return [...current, id];
    });
    setError("");
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
            {phase === "night" ? "Night" : "Day"} {table?.day ?? 1}
          </strong>
          <span className="alive">{table?.alive ?? 16} alive</span>
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
        <ol className="board" aria-label="Players">
          {(table?.seats ?? []).map((seat, index) => {
            const order = picked.indexOf(seat.id) + 1;
            const valid = intent === "vote" ? seat.validVote : seat.validAbility;
            const voted = table?.you.votedName === seat.name && phase === "day";
            return (
              <li key={seat.id}>
                <SeatButton
                  seat={seat}
                  look={index}
                  gender={index === 0 ? gender : (BOARD_LOOKS[index]?.gender ?? "other")}
                  you={seat.id === "1"}
                  order={order}
                  showOrder={needed > 1}
                  voted={voted}
                  invalid={!valid && order === 0}
                  disabled={locked || (!valid && order === 0) || (intent === "ability" && needed === 0)}
                  onPick={() => pickSeat(seat.id)}
                />
              </li>
            );
          })}
        </ol>

        <aside className="side">
          <section>
            <h2>Your role</h2>
            {table ? (
              <>
                <p className="role-name display">{table.you.roleName}</p>
                <p>{table.you.ability}</p>
                <span className="tag">{table.you.faction} · {table.you.category}</span>
              </>
            ) : (
              <p className="hint">Taking your seat…</p>
            )}
          </section>

          <ActionPanel
            table={table}
            intent={intent}
            picked={picked}
            needed={needed}
            pending={pending}
            error={error}
            onIntent={(next) => {
              setIntent(next);
              setPicked([]);
              setError("");
            }}
            onClear={() => {
              setPicked([]);
              setError("");
            }}
            onConfirm={() => void postTable({ op: "act", intent, targets: picked })}
          />
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
        {(table?.setup ?? []).map((group) => (
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

const BOARD_LOOKS: { gender: Gender; hair: string; coat: string; skin: string }[] = [
  { gender: "male", hair: "#1b2832", coat: "#3e5964", skin: "#c48b6a" },
  { gender: "female", hair: "#2a160f", coat: "#6d4c3d", skin: "#e0b08a" },
  { gender: "male", hair: "#101820", coat: "#2f4a44", skin: "#a86d4e" },
  { gender: "other", hair: "#241c28", coat: "#4a4458", skin: "#d7a784" },
  { gender: "female", hair: "#1a140e", coat: "#5c4632", skin: "#c98962" },
  { gender: "male", hair: "#0e161c", coat: "#3d4e5c", skin: "#b97b58" },
  { gender: "female", hair: "#2c1814", coat: "#6a5360", skin: "#e4b894" },
  { gender: "other", hair: "#16141c", coat: "#3e5348", skin: "#c48b6a" },
  { gender: "male", hair: "#24180f", coat: "#58483a", skin: "#d09a72" },
  { gender: "female", hair: "#12161c", coat: "#445868", skin: "#e0b08a" },
  { gender: "other", hair: "#201610", coat: "#5a4038", skin: "#b97b58" },
  { gender: "male", hair: "#0c1418", coat: "#2c3e48", skin: "#a86d4e" },
  { gender: "female", hair: "#2a1c16", coat: "#6a5848", skin: "#e4b894" },
  { gender: "male", hair: "#1c1814", coat: "#4a4038", skin: "#c98962" },
  { gender: "other", hair: "#18141e", coat: "#3a4a56", skin: "#d7a784" },
  { gender: "female", hair: "#140e0c", coat: "#5e463c", skin: "#c48b6a" },
];

function SeatButton({
  seat,
  look,
  gender,
  you,
  order,
  showOrder,
  voted,
  invalid,
  disabled,
  onPick,
}: {
  seat: TableView["seats"][number];
  look: number;
  gender: Gender;
  you: boolean;
  order: number;
  showOrder: boolean;
  voted: boolean;
  invalid: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const appearance = BOARD_LOOKS[look] ?? BOARD_LOOKS[0];
  return (
    <button
      type="button"
      className={you ? "board-seat you" : "board-seat"}
      data-selected={order > 0}
      data-invalid={invalid}
      data-dead={!seat.alive}
      data-vote={voted}
      aria-pressed={order > 0}
      aria-label={`${seat.name}${you ? ", you" : ""}${seat.alive ? "" : ", dead"}`}
      disabled={disabled}
      onClick={onPick}
    >
      <span className="board-avatar">
        <span className="board-face">
          <BoardPortrait gender={gender} hair={appearance.hair} coat={appearance.coat} skin={appearance.skin} />
          <span className="name">{seat.id.padStart(2, "0")} {seat.name}</span>
          {!seat.alive ? <span className="tag">Dead</span> : null}
        </span>
        {order > 0 && showOrder ? <span className="seat-order">{order}</span> : null}
        {voted ? <span className="seat-vote">Vote</span> : null}
      </span>
    </button>
  );
}

function BoardPortrait({
  gender,
  hair,
  coat,
  skin,
}: {
  gender: Gender;
  hair: string;
  coat: string;
  skin: string;
}) {
  return (
    <svg className="board-portrait" viewBox="4 12 56 66" aria-hidden="true">
      {gender === "female" ? (
        <path fill={hair} d="M14 42c-1-22 6-34 18-35 13 0 20 12 19 34 0 16-2 26-7 32-4-12-8-16-12-16s-8 4-12 16c-4-8-6-18-6-31Z" />
      ) : null}
      <path fill={coat} d="M2 78c4-28 14-40 30-42 16 2 26 14 30 42Z" />
      <path fill={skin} d="M27 46h10v8c-1.4 4-8.6 4-10 0Z" />
      <ellipse cx="20" cy="36" rx="2.4" ry="3.4" fill={skin} />
      <ellipse cx="44" cy="36" rx="2.4" ry="3.4" fill={skin} />
      <ellipse cx="32" cy="34" rx="12.2" ry="14.2" fill={skin} />
      {gender === "female" ? (
        <path fill={hair} d="M18 30c1-16 6-24 14-25 9 1 15 9 15 23l-6-10-8-6-9 5-6 13Z" />
      ) : gender === "other" ? (
        <path fill={hair} d="M18 31c1-16 7-24 15-25 10 1 15 10 14 24l-5-9-9-8-10 6-5 12Z" />
      ) : (
        <path fill={hair} d="M19 33c1-15 6-23 13-24 9 0 14 8 14 22l-6-8-8-8-8 6-5 12Z" />
      )}
      <path stroke="#3a241c" strokeWidth="1.1" fill="none" d="M25.5 34.5c2.2-1.5 4.2-1.3 6 .2M34 34.7c2.2-1.5 4.2-1.3 6 .2" />
      <circle cx="28" cy="36.6" r="1.05" fill="#24160f" />
      <circle cx="37.4" cy="36.6" r="1.05" fill="#24160f" />
      <path d="M27.5 44.2c3 1.8 6 1.8 9 0" fill="none" stroke="#7a4e3c" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="32" cy="60" r="2.1" fill="#d4b66c" />
    </svg>
  );
}

function ActionPanel({
  table,
  intent,
  picked,
  needed,
  pending,
  error,
  onIntent,
  onClear,
  onConfirm,
}: {
  table: TableView | null;
  intent: TableIntent;
  picked: string[];
  needed: number;
  pending: boolean;
  error: string;
  onIntent: (intent: TableIntent) => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  if (!table) return <section className="action"><p className="hint">Taking your seat…</p></section>;
  const names = picked.map((id) => table.seats.find((seat) => seat.id === id)?.name ?? id);
  const acted = intent === "ability" && table.you.submitted;
  const ready = picked.length === needed && !acted;
  const title = intent === "vote" ? "Vote" : table.you.roleName;
  return (
    <section className="action">
      {table.you.intents.length > 1 ? (
        <div className="intent-switch">
          {table.you.intents.map((item) => (
            <button key={item} className="text-btn" type="button" aria-pressed={intent === item} onClick={() => onIntent(item)}>
              {item === "vote" ? "Vote" : "Ability"}
            </button>
          ))}
        </div>
      ) : null}
      <h2>{title}</h2>
      <p>{intent === "vote" ? "Vote for one living player." : table.you.ability}</p>
      <p>
        {needed === 0
          ? "No target. Confirm when you are ready."
          : names.length
            ? names.join(", ")
            : "Tap an avatar."}
      </p>
      <ResultView result={intent === "ability" || intent === "vote" ? table.result : null} />
      {error ? <p className="hint">{error}</p> : null}
      <div className="action-row">
        <button className="primary" type="button" disabled={!ready || pending} onClick={onConfirm}>
          {intent === "vote" ? "Confirm vote" : "Confirm"}
        </button>
        <button className="text-btn" type="button" disabled={picked.length === 0 || pending} onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}

function ResultView({ result }: { result: TableResult | null }) {
  if (!result) return null;
  if (result.kind === "compare") {
    return (
      <p className="target-result">
        <span>{result.leftName}</span>
        <span>{result.same ? "=" : "≠"}</span>
        <span>{result.rightName}</span>
      </p>
    );
  }
  if (result.kind === "role") {
    return (
      <p className="target-result">
        <span>{result.targetName}</span>
        <span>Analysis result</span>
        <strong>{result.roleName}</strong>
        <span>{result.faction} · {result.category}</span>
      </p>
    );
  }
  if (result.kind === "aura") {
    return (
      <p className="target-result">
        <span>{result.targetName}</span>
        <strong>{result.aura}</strong>
      </p>
    );
  }
  if (result.kind === "vote") return <p>Your vote is on {result.targetName}.</p>;
  if (result.kind === "submitted") return <p>{result.text}</p>;
  return <p>{result.text}</p>;
}
