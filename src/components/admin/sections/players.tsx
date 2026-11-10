"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminAct, adminGet } from "@/components/admin/admin-api";
import {
  ConfirmModal,
  EmptyState,
  FactionBadge,
  Pagination,
  Panel,
  StatusBadge,
  dateTime,
} from "@/components/admin/ui";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { can, type Permission } from "@/lib/admin/permissions";
import { RESTRICTION_KINDS, type AdminIdentity, type Page, type PlayerDetail, type PlayerSummary, type RestrictionKind } from "@/lib/admin/types";

export function PlayersSection({
  admin,
  initialUserId = "",
}: {
  admin: AdminIdentity;
  initialUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Page<PlayerSummary> | null>(null);
  const [selected, setSelected] = useState(initialUserId);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      adminGet("players", { q: query, status, page: String(page) })
        .then((body) => {
          if (!active) return;
          setList(body.players as Page<PlayerSummary>);
          setError("");
        })
        .catch((err: Error) => active && setError(err.message));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, status, page]);

  return (
    <div className="admin-workspace">
      <Panel
        title="Players"
        actions={
          <div className="admin-filters">
            <input
              type="search"
              value={query}
              placeholder="Name, Player ID, Privy ID, wallet"
              aria-label="Search players"
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
            <select
              value={status}
              aria-label="Status filter"
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        }
      >
        {error ? <EmptyState title="Could not load players" body={error} /> : null}
        {!list ? <EmptyState title="Loading players…" /> : null}
        {list && list.rows.length === 0 ? <EmptyState title="No players found" /> : null}
        {list && list.rows.length > 0 ? (
          <>
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
                  {list.rows.map((player) => (
                    <tr
                      key={player.userId}
                      aria-selected={player.userId === selected}
                      tabIndex={0}
                      onClick={() => setSelected(player.userId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(player.userId);
                        }
                      }}
                    >
                      <td>
                        {player.username}
                        {player.monitored ? <StatusBadge status="planned" /> : null}
                      </td>
                      <td>{player.playerId}</td>
                      <td>{player.level}</td>
                      <td>{player.matches}</td>
                      <td>{dateTime.format(new Date(player.joinedAt))}</td>
                      <td>
                        <StatusBadge status={player.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list} onChange={setPage} />
          </>
        ) : null}
      </Panel>

      {selected ? (
        <PlayerDetailPanel
          key={selected}
          admin={admin}
          userId={selected}
          onClose={() => setSelected("")}
        />
      ) : (
        <section className="admin-panel admin-detail-empty">
          <p>Select a player to inspect and manage their record.</p>
        </section>
      )}
    </div>
  );
}

function PlayerDetailPanel({
  admin,
  userId,
  onClose,
}: {
  admin: AdminIdentity;
  userId: string;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | {
    title: string;
    body: string;
    confirmLabel: string;
    dangerous?: boolean;
    confirmWord?: string;
    needPassword?: boolean;
    needCode?: boolean;
    action: string;
    payload: Record<string, unknown>;
  }>(null);

  async function reload() {
    const body = await adminGet("player", { userId });
    setPlayer(body.player as PlayerDetail);
  }

  useEffect(() => {
    let active = true;
    adminGet("player", { userId })
      .then((body) => active && setPlayer(body.player as PlayerDetail))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [userId]);

  async function run(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await adminAct(action, { userId, ...payload });
      await reload();
      setModal(null);
      setMessage("Saved.");
      return true;
    } catch (err) {
      const text = err instanceof Error ? err.message : "Action failed.";
      if (modal) throw err;
      setMessage(text);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Panel title="Player"><EmptyState title={error} /></Panel>;
  if (!player) return <Panel title="Player"><EmptyState title="Loading player…" /></Panel>;

  const unlocked = new Set(player.achievements.map((item) => item.id));

  return (
    <section className="admin-panel admin-detail">
      <div className="admin-detail-head">
        <div>
          <button className="admin-link" type="button" onClick={onClose}>
            Close
          </button>
          <h2>{player.username}</h2>
          <p>
            {player.playerId} · Level {player.level} · {player.rank} ·{" "}
            <StatusBadge status={player.status} />
          </p>
          <code className="admin-code">{player.userId}</code>
        </div>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}

      <div className="admin-detail-grid">
        <div>
          <h3>Identity</h3>
          <dl className="admin-dl">
            <div><dt>Joined</dt><dd>{dateTime.format(new Date(player.joinedAt))}</dd></div>
            <div><dt>Last active</dt><dd>{player.lastActiveAt ? dateTime.format(new Date(player.lastActiveAt)) : "—"}</dd></div>
            <div><dt>Wallet</dt><dd>{player.walletAddress ?? "—"}</dd></div>
            <div><dt>Gender</dt><dd>{player.gender}</dd></div>
          </dl>
          {player.previousUsernames.length > 0 ? (
            <ul className="admin-feed">
              {player.previousUsernames.map((item, index) => (
                <li key={`${item.username}-${index}`}>
                  <strong>{item.username}</strong>
                  <span>{item.changedBy}</span>
                  <time>{dateTime.format(new Date(item.changedAt))}</time>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <h3>Game statistics</h3>
          <dl className="admin-dl">
            <div><dt>Matches</dt><dd>{player.matches}</dd></div>
            <div><dt>Wins</dt><dd>{player.wins}</dd></div>
            <div><dt>Losses</dt><dd>{player.losses}</dd></div>
            <div><dt>Win rate</dt><dd>{player.matches ? Math.round((player.wins / player.matches) * 100) : 0}%</dd></div>
            <div><dt>Correct votes</dt><dd>{player.correctVotes}</dd></div>
          </dl>
        </div>
      </div>

      {can(admin.permissions, "players.edit") ? (
        <form
          className="admin-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const username = String(form.get("username") ?? "");
            setModal({
              title: "Save player profile",
              body: "This updates username, level, XP and rank.",
              confirmLabel: "Save",
              action: username !== player.username ? "player.rename_and_stats" : "player.correct_stats",
              payload: {
                username,
                level: Number(form.get("level")),
                xp: Number(form.get("xp")),
                rank: String(form.get("rank") ?? ""),
              },
            });
          }}
        >
          <h3>Progression</h3>
          <div className="admin-fields">
            <label>Username<input name="username" defaultValue={player.username} maxLength={16} required /></label>
            <label>Level<input name="level" type="number" min={1} defaultValue={player.level} required /></label>
            <label>XP<input name="xp" type="number" min={0} defaultValue={player.xp} required /></label>
            <label>Rank<input name="rank" defaultValue={player.rank} required /></label>
          </div>
          <button className="admin-primary" type="submit" disabled={busy}>Save profile</button>
        </form>
      ) : null}

      <div className="admin-block">
        <h3>Faction & role stats</h3>
        <div className="admin-split">
          <table className="admin-table">
            <thead><tr><th>Faction</th><th>Games</th><th>Wins</th></tr></thead>
            <tbody>
              {(Object.keys(player.factions) as (keyof typeof player.factions)[]).map((faction) => (
                <tr key={faction}>
                  <td><FactionBadge faction={faction} /></td>
                  <td>{player.factions[faction].games}</td>
                  <td>{player.factions[faction].wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="admin-table">
            <thead><tr><th>Role</th><th>Games</th><th>Wins</th></tr></thead>
            <tbody>
              {player.roles.length === 0 ? (
                <tr><td colSpan={3}>No roles yet.</td></tr>
              ) : (
                player.roles.map((role) => (
                  <tr key={role.role}>
                    <td>{role.role}</td>
                    <td>{role.games}</td>
                    <td>{role.wins}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {can(admin.permissions, "achievements.grant") ? (
        <div className="admin-block">
          <h3>Achievements {unlocked.size} / {ACHIEVEMENTS.length}</h3>
          <ul className="admin-chip-list">
            {ACHIEVEMENTS.map((achievement) => {
              const has = unlocked.has(achievement.id);
              return (
                <li key={achievement.id}>
                  <button
                    type="button"
                    aria-pressed={has}
                    disabled={busy}
                    onClick={() =>
                      setModal({
                        title: has ? `Revoke ${achievement.name}` : `Grant ${achievement.name}`,
                        body: achievement.description,
                        confirmLabel: has ? "Revoke" : "Grant",
                        action: has ? "player.revoke_achievement" : "player.grant_achievement",
                        payload: { achievementId: achievement.id },
                      })
                    }
                  >
                    {achievement.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="admin-block">
        <h3>Recent matches</h3>
        {player.recentMatches.length === 0 ? (
          <EmptyState title="No matches" />
        ) : (
          <ul className="admin-feed">
            {player.recentMatches.map((match) => (
              <li key={match.id}>
                <strong>{match.result === "win" ? "Win" : "Loss"}</strong>
                <span>
                  {match.role} · <FactionBadge faction={match.faction} /> · +{match.xpEarned} XP
                </span>
                <time>{dateTime.format(new Date(match.playedAt))}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-block">
        <h3>Moderation</h3>
        <RestrictionForm
          disabled={busy || !can(admin.permissions, "players.moderate")}
          onSubmit={(payload) =>
            setModal({
              title: `Apply ${RESTRICTION_KINDS[payload.kind as RestrictionKind]}`,
              body: "This restriction will appear on the player record and in audit logs.",
              confirmLabel: "Apply",
              dangerous: ["suspension", "temp_ban", "perm_ban"].includes(String(payload.kind)),
              confirmWord: payload.kind === "perm_ban" ? "BAN" : undefined,
              needPassword: payload.kind === "perm_ban",
              needCode: payload.kind === "perm_ban" && admin.totpEnabled,
              action: "player.restrict",
              payload,
            })
          }
        />
        <ul className="admin-feed">
          {player.restrictions.map((item) => (
            <li key={item.id}>
              <strong>
                {RESTRICTION_KINDS[item.kind]} {item.active ? "" : "(ended)"}
              </strong>
              <span>
                {item.reason} · by {item.createdBy}
              </span>
              {item.active && can(admin.permissions, "players.moderate") ? (
                <button
                  className="admin-link"
                  type="button"
                  onClick={() =>
                    setModal({
                      title: "Lift restriction",
                      body: `Lift ${RESTRICTION_KINDS[item.kind]} for ${player.username}.`,
                      confirmLabel: "Lift",
                      action: "player.lift_restriction",
                      payload: { restrictionId: Number(item.id) },
                    })
                  }
                >
                  Lift
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {can(admin.permissions, "players.notes") ? (
        <form
          className="admin-block"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setModal({
              title: "Add admin note",
              body: "Notes are internal only.",
              confirmLabel: "Add note",
              action: "player.add_note",
              payload: { body: String(form.get("body") ?? "") },
            });
          }}
        >
          <h3>Admin notes</h3>
          <textarea name="body" rows={3} maxLength={2000} required placeholder="Internal note" />
          <button className="admin-secondary" type="submit" disabled={busy}>Add note</button>
          <ul className="admin-feed">
            {player.notes.map((note) => (
              <li key={note.id}>
                <strong>{note.adminName}</strong>
                <span>{note.body}</span>
                <time>{dateTime.format(new Date(note.createdAt))}</time>
              </li>
            ))}
          </ul>
        </form>
      ) : null}

      <div className="admin-block admin-danger-zone">
        <h3>Dangerous actions</h3>
        <div className="admin-danger-actions">
          {can(admin.permissions, "players.export") ? (
            <button
              className="admin-secondary"
              type="button"
              disabled={busy}
              onClick={async () => {
                const body = await adminGet("player-export", { userId });
                const blob = new Blob([JSON.stringify(body.export, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${player.playerId}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export player data
            </button>
          ) : null}
          {can(admin.permissions, "players.delete") ? (
            <button
              className="admin-danger"
              type="button"
              disabled={busy}
              onClick={() =>
                setModal({
                  title: "Delete player",
                  body: "Permanently deletes the profile, matches, achievements and moderation history.",
                  confirmLabel: "Delete forever",
                  dangerous: true,
                  confirmWord: player.username,
                  needPassword: true,
                  needCode: admin.totpEnabled,
                  action: "player.delete",
                  payload: { confirmation: player.username },
                })
              }
            >
              Delete account
            </button>
          ) : null}
        </div>
      </div>

      {modal ? (
        <ConfirmModal
          title={modal.title}
          body={modal.body}
          confirmLabel={modal.confirmLabel}
          dangerous={modal.dangerous}
          confirmWord={modal.confirmWord}
          needPassword={modal.needPassword}
          needCode={modal.needCode}
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={async ({ reason, password, code }) => {
            try {
              if (modal.action === "player.rename_and_stats") {
                await run("player.rename", {
                  username: modal.payload.username,
                  reason,
                  password,
                  code,
                });
                await run("player.correct_stats", {
                  level: modal.payload.level,
                  xp: modal.payload.xp,
                  rank: modal.payload.rank,
                  reason,
                  password,
                  code,
                });
                setModal(null);
                return;
              }
              await run(modal.action, {
                ...modal.payload,
                reason,
                body:
                  modal.action === "player.add_note"
                    ? String(modal.payload.body || reason)
                    : modal.payload.body,
                password,
                code,
              });
            } catch (err) {
              setMessage(err instanceof AdminApiError ? err.message : "Action failed.");
            }
          }}
        />
      ) : null}
    </section>
  );
}

function RestrictionForm({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="admin-match-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          kind: String(form.get("kind")),
          durationHours: Number(form.get("durationHours") || 0) || null,
        });
      }}
    >
      <select name="kind" aria-label="Restriction" defaultValue="warning" disabled={disabled}>
        {Object.entries(RESTRICTION_KINDS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="durationHours" type="number" min={0} placeholder="Hours (if timed)" disabled={disabled} />
      <button className="admin-primary" type="submit" disabled={disabled}>
        Queue restriction
      </button>
    </form>
  );
}

export function canPermission(permissions: readonly Permission[], permission: Permission) {
  return can(permissions, permission);
}
