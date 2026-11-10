"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { FACTION_LABEL, type Faction } from "@/lib/roles";
import type { AdminOverview, AdminPlayerDetail, AdminPlayerRow } from "@/lib/admin";

type Access = "checking" | "signed-out" | "ok" | "error";
type Api = (path: string, init?: RequestInit) => Promise<Response>;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const api: Api = (path, init) =>
  fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });

export function AdminConsole() {
  const [access, setAccess] = useState<Access>("checking");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [selected, setSelected] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    api("/api/admin?view=overview")
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setAccess("signed-out");
          return;
        }
        if (!response.ok) throw new Error("Overview failed");
        const body = (await response.json()) as { overview: AdminOverview };
        if (!active) return;
        setOverview(body.overview);
        setAccess("ok");
      })
      .catch(() => active && setAccess("error"));
    return () => {
      active = false;
    };
  }, [refresh]);

  async function signOut() {
    await api("/api/admin/session", { method: "DELETE" }).catch(() => null);
    setSelected("");
    setOverview(null);
    setAccess("signed-out");
  }

  if (access === "checking") {
    return <AdminGate title="Loading" body="Checking your admin session…" />;
  }
  if (access === "signed-out") {
    return (
      <AdminLogin
        onSignedIn={() => {
          setAccess("checking");
          setRefresh((value) => value + 1);
        }}
      />
    );
  }
  if (access === "error" || !overview) {
    return (
      <AdminGate title="Admin unavailable" body="The admin service could not be reached.">
        <button
          className="primary"
          type="button"
          onClick={() => {
            setAccess("checking");
            setRefresh((value) => value + 1);
          }}
        >
          Try again
        </button>
      </AdminGate>
    );
  }

  return (
    <main className="admin">
      <header className="admin-top">
        <div>
          <p className="kicker">Trustless</p>
          <h1 className="display">Admin</h1>
        </div>
        <div className="admin-top-actions">
          <Link className="text-btn" href="/">
            Back to game
          </Link>
          <button className="text-btn" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <OverviewPanel overview={overview} />

      <div className="admin-workspace">
        <PlayersPanel
          api={api}
          selected={selected}
          refresh={refresh}
          onSelect={setSelected}
        />
        {selected ? (
          <PlayerDetail
            key={`${selected}-${refresh}`}
            api={api}
            userId={selected}
            onChanged={() => setRefresh((value) => value + 1)}
            onDeleted={() => {
              setSelected("");
              setRefresh((value) => value + 1);
            }}
          />
        ) : (
          <section className="admin-panel admin-detail-empty">
            <p>Select a player to view and edit their record.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await api("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      if (response.ok) {
        onSignedIn();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        retryAfterMinutes?: number;
      };
      setError(
        response.status === 401
          ? "Wrong username or password."
          : response.status === 429
            ? `Too many attempts. Try again in ${body.retryAfterMinutes ?? 15} minutes.`
            : response.status === 503
              ? "Admin login isn't set up on this server yet."
              : "Could not sign in. Try again.",
      );
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="room account">
      <form className="gate-card admin-login" onSubmit={submit}>
        <p className="kicker">Trustless admin</p>
        <h1 className="display">Admin sign-in</h1>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="admin-login-error" role="alert">{error}</p> : null}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}

function AdminGate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="room account">
      <div className="gate-card">
        <p className="kicker">Trustless admin</p>
        <h1 className="display">{title}</h1>
        <p className="lede">{body}</p>
        {children ? <div className="account-actions admin-gate-actions">{children}</div> : null}
      </div>
    </main>
  );
}

function OverviewPanel({ overview }: { overview: AdminOverview }) {
  const peak = Math.max(1, ...overview.signups.map((day) => day.count));
  return (
    <section className="admin-overview">
      <dl className="admin-metrics">
        <div>
          <dt>Players</dt>
          <dd>{overview.players}</dd>
        </div>
        <div>
          <dt>Matches played</dt>
          <dd>{overview.matches}</dd>
        </div>
        <div>
          <dt>New this week</dt>
          <dd>{overview.newThisWeek}</dd>
        </div>
        <div>
          <dt>Banned</dt>
          <dd>{overview.banned}</dd>
        </div>
      </dl>
      <div className="admin-panel admin-signups">
        <h2>Sign-ups, last 14 days</h2>
        <ol>
          {overview.signups.map((day) => (
            <li key={day.day} title={`${day.day}: ${day.count}`}>
              <span className="admin-bar-value">{day.count || ""}</span>
              <span
                className="admin-bar"
                style={{ height: `${Math.max(4, (day.count / peak) * 100)}%` }}
              />
              <span className="admin-bar-label">{day.day.slice(8)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PlayersPanel({
  api,
  selected,
  refresh,
  onSelect,
}: {
  api: Api;
  selected: string;
  refresh: number;
  onSelect: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<AdminPlayerRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      api(`/api/admin?view=players&q=${encodeURIComponent(query)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Players failed");
          const body = (await response.json()) as { players: AdminPlayerRow[] };
          if (!active) return;
          setPlayers(body.players);
          setFailed(false);
        })
        .catch(() => active && setFailed(true));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [api, query, refresh]);

  return (
    <section className="admin-panel admin-players">
      <div className="admin-panel-heading">
        <h2>Players</h2>
        <input
          type="search"
          value={query}
          placeholder="Search name, Player ID or account ID"
          aria-label="Search players"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {failed ? (
        <p className="admin-note">Could not load players.</p>
      ) : !players ? (
        <p className="admin-note">Loading players…</p>
      ) : players.length === 0 ? (
        <p className="admin-note">No players found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Player ID</th>
                <th>Level</th>
                <th>Matches</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.userId}
                  aria-selected={player.userId === selected}
                  tabIndex={0}
                  onClick={() => onSelect(player.userId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(player.userId);
                    }
                  }}
                >
                  <td>{player.username}</td>
                  <td>{player.playerId}</td>
                  <td>{player.level}</td>
                  <td>{player.matches}</td>
                  <td>{dateFormat.format(new Date(player.joinedAt))}</td>
                  <td>
                    <span className="admin-status" data-banned={Boolean(player.bannedAt)}>
                      {player.bannedAt ? "Banned" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlayerDetail({
  api,
  userId,
  onChanged,
  onDeleted,
}: {
  api: Api;
  userId: string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [player, setPlayer] = useState<AdminPlayerDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api(`/api/admin?view=player&userId=${encodeURIComponent(userId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Player failed");
        const body = (await response.json()) as { player: AdminPlayerDetail };
        if (active) setPlayer(body.player);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [api, userId]);

  async function act(action: string, fields: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await api("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action, userId, ...fields }),
      });
      if (response.status === 409) {
        setMessage("That username is already taken.");
        return false;
      }
      if (!response.ok) {
        setMessage(response.status === 400 ? "Check the values and try again." : "Action failed.");
        return false;
      }
      return true;
    } catch {
      setMessage("Action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <section className="admin-panel">
        <p className="admin-note">Could not load this player.</p>
      </section>
    );
  }
  if (!player) {
    return (
      <section className="admin-panel">
        <p className="admin-note">Loading player…</p>
      </section>
    );
  }

  const unlocked = new Set(player.achievements.map((achievement) => achievement.id));

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await act("update", {
      username: String(form.get("username") ?? ""),
      level: Number(form.get("level")),
      xp: Number(form.get("xp")),
      rank: String(form.get("rank") ?? ""),
    });
    if (ok) onChanged();
  }

  async function recordMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await act("add-match", {
      result: String(form.get("result")),
      role: String(form.get("role") ?? ""),
      faction: String(form.get("faction")),
      xpEarned: Number(form.get("xpEarned")),
    });
    if (ok) onChanged();
  }

  return (
    <section className="admin-panel admin-detail">
      <div className="admin-detail-head">
        <div>
          <h2>{player.username}</h2>
          <p>
            {player.playerId} · Joined {dateFormat.format(new Date(player.joinedAt))} ·{" "}
            {player.matches} matches, {player.wins} wins
          </p>
          <code className="admin-code">{player.userId}</code>
        </div>
        <span className="admin-status" data-banned={Boolean(player.bannedAt)}>
          {player.bannedAt ? "Banned" : "Active"}
        </span>
      </div>
      {message ? <p className="admin-message" role="alert">{message}</p> : null}

      <form className="admin-form" onSubmit={saveProfile}>
        <h3>Profile</h3>
        <div className="admin-fields">
          <label>
            Username
            <input name="username" defaultValue={player.username} maxLength={16} required />
          </label>
          <label>
            Level
            <input name="level" type="number" min={1} defaultValue={player.level} required />
          </label>
          <label>
            XP
            <input name="xp" type="number" min={0} defaultValue={player.xp} required />
          </label>
          <label>
            Rank
            <input name="rank" defaultValue={player.rank} required />
          </label>
        </div>
        <button className="primary" type="submit" disabled={busy}>
          Save profile
        </button>
      </form>

      <div className="admin-block">
        <h3>
          Achievements <span>{unlocked.size} / {ACHIEVEMENTS.length}</span>
        </h3>
        <ul className="admin-achievements">
          {ACHIEVEMENTS.map((achievement) => {
            const has = unlocked.has(achievement.id);
            return (
              <li key={achievement.id}>
                <button
                  type="button"
                  aria-pressed={has}
                  disabled={busy}
                  title={achievement.description}
                  onClick={async () => {
                    const ok = await act(has ? "revoke-achievement" : "grant-achievement", {
                      achievementId: achievement.id,
                    });
                    if (ok) onChanged();
                  }}
                >
                  {achievement.name}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="admin-note">Click an achievement to grant or remove it.</p>
      </div>

      <div className="admin-block">
        <h3>Matches</h3>
        <form className="admin-match-form" onSubmit={recordMatch}>
          <select name="result" aria-label="Result" defaultValue="win">
            <option value="win">Win</option>
            <option value="loss">Loss</option>
          </select>
          <input name="role" placeholder="Role name" aria-label="Role name" maxLength={40} required />
          <select name="faction" aria-label="Faction" defaultValue="good">
            {(Object.keys(FACTION_LABEL) as Faction[]).map((faction) => (
              <option key={faction} value={faction}>
                {FACTION_LABEL[faction]}
              </option>
            ))}
          </select>
          <input
            name="xpEarned"
            type="number"
            min={0}
            defaultValue={0}
            aria-label="XP earned"
            title="XP earned"
          />
          <button className="primary" type="submit" disabled={busy}>
            Add match
          </button>
        </form>
        {player.matchHistory.length === 0 ? (
          <p className="admin-note">No matches recorded.</p>
        ) : (
          <ul className="admin-matches">
            {player.matchHistory.map((match) => (
              <li key={match.id}>
                <span data-result={match.result}>{match.result === "win" ? "Win" : "Loss"}</span>
                <strong>{match.role}</strong>
                <span>{FACTION_LABEL[match.faction]}</span>
                <span>+{match.xpEarned} XP</span>
                <time dateTime={match.playedAt}>{dateFormat.format(new Date(match.playedAt))}</time>
                <button
                  className="admin-link-danger"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Delete this match?")) return;
                    const ok = await act("delete-match", { matchId: match.id });
                    if (ok) onChanged();
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-block admin-danger">
        <h3>Moderation</h3>
        <div className="admin-danger-actions">
          <button
            className="text-btn"
            type="button"
            disabled={busy}
            onClick={async () => {
              const banning = !player.bannedAt;
              if (banning && !window.confirm(`Ban ${player.username}? They will be blocked from playing.`)) {
                return;
              }
              const ok = await act(banning ? "ban" : "unban");
              if (ok) onChanged();
            }}
          >
            {player.bannedAt ? "Unban player" : "Ban player"}
          </button>
          <button
            className="admin-delete"
            type="button"
            disabled={busy}
            onClick={async () => {
              const typed = window.prompt(
                `This permanently deletes ${player.username}'s profile, matches and achievements. Type the username to confirm.`,
              );
              if (typed !== player.username) return;
              const ok = await act("delete-player");
              if (ok) onDeleted();
            }}
          >
            Delete player
          </button>
        </div>
      </div>
    </section>
  );
}
