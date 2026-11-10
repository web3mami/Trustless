"use client";

import { useEffect, useState } from "react";
import { adminAct, adminGet } from "@/components/admin/admin-api";
import {
  ConfirmModal,
  EmptyState,
  FactionBadge,
  Pagination,
  Panel,
  StatusBadge,
  dateTime,
} from "@/components/admin/ui";
import { FACTION_LABEL, type Faction } from "@/lib/roles";
import type {
  AdminIdentity,
  MatchRecord,
  Page,
  Report,
  Restriction,
} from "@/lib/admin/types";
import {
  FEATURE_FLAGS,
  GAME_NUMBER_LIMITS,
  type FeatureFlags,
  type GameSettings,
  type MaintenanceSettings,
  type ModerationSettings,
  type SettingsMap,
} from "@/lib/admin/settings";
import { can } from "@/lib/admin/permissions";
import type { AnalyticsData, RoleStatRow, FactionStat } from "@/lib/admin/types";
import { ACHIEVEMENTS } from "@/lib/achievements";

export function MatchesSection({ admin }: { admin: AdminIdentity }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Page<MatchRecord> | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | { matchId: string }>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    adminGet("matches", { q: query, page: String(page) })
      .then((body) => {
        if (!active) return;
        setList(body.matches as Page<MatchRecord>);
        setError("");
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [query, page]);

  async function reloadMatches() {
    const body = await adminGet("matches", { q: query, page: String(page) });
    setList(body.matches as Page<MatchRecord>);
  }

  return (
    <div className="admin-stack">
      <Panel
        title="Match history"
        actions={
          <input
            type="search"
            value={query}
            placeholder="Match ID, player, role"
            aria-label="Search matches"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
        }
      >
        <p className="admin-note">
          Live matches, timelines and spectating need the match server. Completed results from the database are below.
        </p>
        {error ? <EmptyState title={error} /> : null}
        {!list ? <EmptyState title="Loading matches…" /> : null}
        {list && list.rows.length === 0 ? <EmptyState title="No matches found" /> : null}
        {list && list.rows.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Player</th>
                    <th>Role</th>
                    <th>Faction</th>
                    <th>Result</th>
                    <th>XP</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((match) => (
                    <tr key={match.id}>
                      <td>{dateTime.format(new Date(match.playedAt))}</td>
                      <td>
                        {match.username}
                        <div className="admin-subtle">{match.playerId}</div>
                      </td>
                      <td>{match.role}</td>
                      <td>
                        <FactionBadge faction={match.faction} />
                      </td>
                      <td>{match.result}</td>
                      <td>+{match.xpEarned}</td>
                      <td>
                        {can(admin.permissions, "matches.edit") ? (
                          <button className="admin-link-danger" type="button" onClick={() => setModal({ matchId: match.id })}>
                            Invalidate
                          </button>
                        ) : null}
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

      {can(admin.permissions, "matches.edit") ? (
        <Panel title="Add test result">
          <MatchAddForm
            busy={busy}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                await adminAct("match.add", payload);
                await reloadMatches();
              } finally {
                setBusy(false);
              }
            }}
          />
        </Panel>
      ) : null}

      {modal ? (
        <ConfirmModal
          title="Invalidate match result"
          body="Deletes this result from the player's record. Use only for broken or fraudulent entries."
          confirmLabel="Invalidate"
          dangerous
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={async ({ reason }) => {
            setBusy(true);
            try {
              await adminAct("match.invalidate", { matchId: modal.matchId, reason });
              setModal(null);
              await reloadMatches();
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function MatchAddForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="admin-match-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await onSubmit({
          userId: String(form.get("userId") ?? ""),
          result: String(form.get("result")),
          role: String(form.get("role") ?? ""),
          faction: String(form.get("faction")),
          xpEarned: Number(form.get("xpEarned")),
          correctVotes: 0,
          reason: String(form.get("reason") ?? "Manual test result"),
        });
        event.currentTarget.reset();
      }}
    >
      <input name="userId" placeholder="Privy user ID" required disabled={busy} />
      <select name="result" defaultValue="win" disabled={busy}>
        <option value="win">Win</option>
        <option value="loss">Loss</option>
      </select>
      <input name="role" placeholder="Role" required disabled={busy} />
      <select name="faction" defaultValue="good" disabled={busy}>
        {(Object.keys(FACTION_LABEL) as Faction[]).map((faction) => (
          <option key={faction} value={faction}>
            {FACTION_LABEL[faction]}
          </option>
        ))}
      </select>
      <input name="xpEarned" type="number" min={0} defaultValue={0} disabled={busy} />
      <input name="reason" placeholder="Reason" defaultValue="Manual test result" required disabled={busy} />
      <button className="admin-primary" type="submit" disabled={busy}>
        Add match
      </button>
    </form>
  );
}

export function ModerationSection({ admin }: { admin: AdminIdentity }) {
  const [reports, setReports] = useState<Page<Report> | null>(null);
  const [restrictions, setRestrictions] = useState<Page<Restriction> | null>(null);
  const [settings, setSettings] = useState<ModerationSettings | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | { reportId: string; outcome: "dismissed" | "actioned" | "escalated" }>(null);

  async function reload() {
    const [reportBody, restrictionBody, settingsBody] = await Promise.all([
      adminGet("reports", { status: "open" }),
      adminGet("restrictions"),
      adminGet("settings", { key: "moderation" }),
    ]);
    setReports(reportBody.reports as Page<Report>);
    setRestrictions(restrictionBody.restrictions as Page<Restriction>);
    setSettings(settingsBody.settings as ModerationSettings);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      adminGet("reports", { status: "open" }),
      adminGet("restrictions"),
      adminGet("settings", { key: "moderation" }),
    ])
      .then(([reportBody, restrictionBody, settingsBody]) => {
        if (!active) return;
        setReports(reportBody.reports as Page<Report>);
        setRestrictions(restrictionBody.restrictions as Page<Restriction>);
        setSettings(settingsBody.settings as ModerationSettings);
        setError("");
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <EmptyState title={error} />;
  if (!reports || !restrictions || !settings) return <EmptyState title="Loading moderation…" />;

  return (
    <div className="admin-stack">
      <Panel title="Report queue">
        {reports.rows.length === 0 ? (
          <EmptyState title="No open reports" body="In-game reporting is not wired yet." />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Reported</th>
                <th>Category</th>
                <th>Reporter</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.rows.map((report) => (
                <tr key={report.id}>
                  <td>{dateTime.format(new Date(report.createdAt))}</td>
                  <td>{report.reportedName ?? report.reportedId}</td>
                  <td>{report.category}</td>
                  <td>{report.reporterName ?? "—"}</td>
                  <td className="admin-row-actions">
                    {can(admin.permissions, "moderation.act") ? (
                      <>
                        <button type="button" className="admin-link" onClick={() => setModal({ reportId: report.id, outcome: "dismissed" })}>
                          Dismiss
                        </button>
                        <button type="button" className="admin-link" onClick={() => setModal({ reportId: report.id, outcome: "escalated" })}>
                          Escalate
                        </button>
                        <button type="button" className="admin-link-danger" onClick={() => setModal({ reportId: report.id, outcome: "actioned" })}>
                          Actioned
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Active restrictions">
        {restrictions.rows.length === 0 ? (
          <EmptyState title="No active restrictions" />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Kind</th>
                <th>Reason</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {restrictions.rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.username ?? item.userId}</td>
                  <td>
                    <StatusBadge status={item.kind.includes("ban") ? "banned" : "restricted"} /> {item.kind}
                  </td>
                  <td>{item.reason}</td>
                  <td>{item.createdBy}</td>
                  <td>{dateTime.format(new Date(item.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {can(admin.permissions, "moderation.act") ? (
        <SettingsEditor
          title="Chat safety rules"
          busy={busy}
          onSave={async (value, reason, auth) => {
            setBusy(true);
            try {
              await adminAct("settings.update", { key: "moderation", value, reason, ...auth });
              await reload();
            } finally {
              setBusy(false);
            }
          }}
          render={(draft, setDraft) => {
            const value = draft as ModerationSettings;
            return (
              <div className="admin-fields">
                <label className="admin-span-2">
                  Banned words (comma separated)
                  <textarea
                    rows={4}
                    value={value.bannedWords.join(", ")}
                    onChange={(event) =>
                      setDraft({
                        ...value,
                        bannedWords: event.target.value
                          .split(",")
                          .map((word) => word.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
                <label>
                  Messages per minute
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={value.chatMessagesPerMinute}
                    onChange={(event) =>
                      setDraft({ ...value, chatMessagesPerMinute: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={value.blockLinks}
                    onChange={(event) => setDraft({ ...value, blockLinks: event.target.checked })}
                  />
                  Block links in chat
                </label>
              </div>
            );
          }}
          value={settings}
        />
      ) : null}

      {modal ? (
        <ConfirmModal
          title={`Mark report ${modal.outcome}`}
          body="Resolution is recorded in the audit log."
          confirmLabel="Save"
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={async ({ reason }) => {
            setBusy(true);
            try {
              await adminAct("report.resolve", {
                reportId: modal.reportId,
                outcome: modal.outcome,
                reason,
              });
              setModal(null);
              await reload();
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

export function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet("analytics")
      .then((body) => setData(body.analytics as AnalyticsData))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <EmptyState title={error} />;
  if (!data) return <EmptyState title="Loading analytics…" />;
  const peak = Math.max(1, ...data.signups.map((day) => day.count));

  return (
    <div className="admin-stack">
      <div className="admin-stat-grid">
        <div className="admin-stat"><span>DAU</span><strong>{data.dau}</strong></div>
        <div className="admin-stat"><span>WAU</span><strong>{data.wau}</strong></div>
        <div className="admin-stat"><span>MAU</span><strong>{data.mau}</strong></div>
        <div className="admin-stat"><span>Players</span><strong>{data.players}</strong></div>
        <div className="admin-stat"><span>Achievement completion</span><strong>{data.achievementCompletion}%</strong></div>
        <div className="admin-stat"><span>Reports</span><strong>{data.moderation.reports}</strong></div>
        <div className="admin-stat"><span>Mutes</span><strong>{data.moderation.mutes}</strong></div>
        <div className="admin-stat"><span>Bans</span><strong>{data.moderation.bans}</strong></div>
      </div>
      <Panel title="Sign-ups, last 14 days">
        <ol className="admin-signups">
          {data.signups.map((day) => (
            <li key={day.day} title={`${day.day}: ${day.count}`}>
              <span>{day.count || ""}</span>
              <span className="admin-bar" style={{ height: `${Math.max(4, (day.count / peak) * 100)}%` }} />
              <span>{day.day.slice(8)}</span>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="admin-split">
        <StatsTable title="Factions" rows={data.factions} />
        <StatsTable title="Roles" rows={data.roles.slice(0, 12)} role />
      </div>
      <Panel title="Retention">
        <table className="admin-table">
          <thead><tr><th>Cohort</th><th>Eligible</th><th>Returned</th></tr></thead>
          <tbody>
            {data.retention.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.eligible}</td>
                <td>{row.returned}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="admin-note">D1/D7/D30 session retention needs richer activity events from the match server.</p>
      </Panel>
    </div>
  );
}

function StatsTable({
  title,
  rows,
  role,
}: {
  title: string;
  rows: FactionStat[] | RoleStatRow[];
  role?: boolean;
}) {
  return (
    <Panel title={title}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{role ? "Role" : "Faction"}</th>
            <th>Games</th>
            <th>Win rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={"role" in row ? `${row.role}-${row.faction}` : row.faction}>
              <td>
                {"role" in row ? row.role : <FactionBadge faction={row.faction} />}
              </td>
              <td>{row.games}</td>
              <td>{row.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function RolesFactionsSection({ mode }: { mode: "roles" | "factions" }) {
  const [factions, setFactions] = useState<FactionStat[]>([]);
  const [roles, setRoles] = useState<RoleStatRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet(mode)
      .then((body) => {
        setFactions((body.factions as FactionStat[]) ?? []);
        setRoles((body.roles as RoleStatRow[]) ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, [mode]);

  if (error) return <EmptyState title={error} />;
  if (!factions.length && !roles.length) return <EmptyState title="Loading…" />;

  return (
    <div className="admin-stack">
      <p className="admin-note">
        Performance is derived from completed match history. Creating and editing role/faction definitions needs the content store.
      </p>
      {mode === "factions" ? <StatsTable title="Faction performance" rows={factions} /> : <StatsTable title="Role performance" rows={roles} role />}
    </div>
  );
}

export function AchievementsSection() {
  const [rows, setRows] = useState<
    { id: string; name: string; unlocked: number; unlockRate: number }[] | null
  >(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet("achievements")
      .then((body) =>
        setRows(
          body.achievements as {
            id: string;
            name: string;
            unlocked: number;
            unlockRate: number;
          }[],
        ),
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <EmptyState title={error} />;
  if (!rows) return <EmptyState title="Loading achievements…" />;

  return (
    <Panel title={`Achievements · ${ACHIEVEMENTS.length} defined`}>
      <p className="admin-note">Grant and revoke from a player record. Creating new achievements needs the content store.</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Unlocked</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.unlocked}</td>
              <td>{row.unlockRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function SettingsSection({
  kind,
  admin,
}: {
  kind: "game" | "flags" | "maintenance";
  admin: AdminIdentity;
}) {
  const [value, setValue] = useState<SettingsMap[typeof kind] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const permission =
    kind === "maintenance" ? "maintenance.edit" : kind === "flags" ? "flags.edit" : "config.edit";

  useEffect(() => {
    adminGet("settings", { key: kind })
      .then((body) => setValue(body.settings as SettingsMap[typeof kind]))
      .catch((err: Error) => setError(err.message));
  }, [kind]);

  if (error) return <EmptyState title={error} />;
  if (!value) return <EmptyState title="Loading settings…" />;
  if (!can(admin.permissions, permission)) {
    return <EmptyState title="Read-only" body="Your role can view this section but not edit it." />;
  }

  return (
    <SettingsEditor
      key={kind}
      title={kind === "game" ? "Game configuration" : kind === "flags" ? "Feature flags" : "Maintenance"}
      value={value}
      busy={busy}
      needPassword={kind === "maintenance"}
      needCode={kind === "maintenance" && admin.totpEnabled}
      onSave={async (next, reason, auth) => {
        setBusy(true);
        try {
          await adminAct("settings.update", { key: kind, value: next, reason, ...auth });
          setValue(next as SettingsMap[typeof kind]);
        } finally {
          setBusy(false);
        }
      }}
      render={(draft, setDraft) => {
        if (kind === "maintenance") {
          const settings = draft as MaintenanceSettings;
          return (
            <div className="admin-fields">
              {(["enabled", "blockNewMatches", "allowActiveToFinish", "forceUpdate"] as const).map((field) => (
                <label key={field} className="admin-check">
                  <input
                    type="checkbox"
                    checked={settings[field]}
                    onChange={(event) => setDraft({ ...settings, [field]: event.target.checked })}
                  />
                  {field}
                </label>
              ))}
              <label className="admin-span-2">
                Message
                <textarea
                  rows={3}
                  value={settings.message}
                  onChange={(event) => setDraft({ ...settings, message: event.target.value })}
                />
              </label>
              <label>
                Estimated return
                <input
                  value={settings.estimatedReturn}
                  onChange={(event) => setDraft({ ...settings, estimatedReturn: event.target.value })}
                />
              </label>
              <label>
                Minimum version
                <input
                  value={settings.minimumVersion}
                  onChange={(event) => setDraft({ ...settings, minimumVersion: event.target.value })}
                />
              </label>
            </div>
          );
        }
        if (kind === "flags") {
          const flags = draft as FeatureFlags;
          return (
            <div className="admin-flag-list">
              {(Object.keys(FEATURE_FLAGS) as (keyof typeof FEATURE_FLAGS)[]).map((key) => (
                <div key={key} className="admin-flag-row">
                  <strong>{FEATURE_FLAGS[key]}</strong>
                  <select
                    value={flags[key].state}
                    onChange={(event) =>
                      setDraft({
                        ...flags,
                        [key]: {
                          ...flags[key],
                          state: event.target.value as FeatureFlags[typeof key]["state"],
                        },
                      })
                    }
                  >
                    <option value="off">Off</option>
                    <option value="admin">Admin only</option>
                    <option value="test">Test users</option>
                    <option value="percentage">Percentage</option>
                    <option value="full">Full rollout</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={flags[key].percentage}
                    disabled={flags[key].state !== "percentage"}
                    onChange={(event) =>
                      setDraft({
                        ...flags,
                        [key]: { ...flags[key], percentage: Number(event.target.value) },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          );
        }
        const game = draft as GameSettings;
        return (
          <div className="admin-fields">
            {(Object.keys(GAME_NUMBER_LIMITS) as (keyof typeof GAME_NUMBER_LIMITS)[]).map((field) => (
              <label key={field}>
                {GAME_NUMBER_LIMITS[field].label}
                <input
                  type="number"
                  min={GAME_NUMBER_LIMITS[field].min}
                  max={GAME_NUMBER_LIMITS[field].max}
                  value={game[field]}
                  onChange={(event) => setDraft({ ...game, [field]: Number(event.target.value) })}
                />
              </label>
            ))}
            <label>
              Tie vote
              <select
                value={game.tieVote}
                onChange={(event) =>
                  setDraft({ ...game, tieVote: event.target.value as GameSettings["tieVote"] })
                }
              >
                <option value="no_lynch">No lynch</option>
                <option value="revote">Revote</option>
                <option value="random">Random</option>
              </select>
            </label>
            <label>
              Spectators
              <select
                value={game.spectators}
                onChange={(event) =>
                  setDraft({ ...game, spectators: event.target.value as GameSettings["spectators"] })
                }
              >
                <option value="off">Off</option>
                <option value="friends">Friends</option>
                <option value="anyone">Anyone</option>
              </select>
            </label>
            {(["allowSkipVote", "revealRoleOnDeath", "deadChat"] as const).map((field) => (
              <label key={field} className="admin-check">
                <input
                  type="checkbox"
                  checked={game[field]}
                  onChange={(event) => setDraft({ ...game, [field]: event.target.checked })}
                />
                {field}
              </label>
            ))}
          </div>
        );
      }}
    />
  );
}

function SettingsEditor<T>({
  title,
  value,
  busy,
  onSave,
  render,
  needPassword,
  needCode,
}: {
  title: string;
  value: T;
  busy: boolean;
  onSave: (value: T, reason: string, auth: { password: string; code: string }) => Promise<void>;
  render: (draft: T, setDraft: (next: T) => void) => React.ReactNode;
  needPassword?: boolean;
  needCode?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [modal, setModal] = useState(false);

  return (
    <Panel title={title}>
      {render(draft, setDraft)}
      <button className="admin-primary" type="button" disabled={busy} onClick={() => setModal(true)}>
        Save changes
      </button>
      {modal ? (
        <ConfirmModal
          title={`Save ${title.toLowerCase()}`}
          body="This change is audit logged and applies immediately."
          confirmLabel="Save"
          busy={busy}
          needPassword={needPassword}
          needCode={needCode}
          onClose={() => setModal(false)}
          onConfirm={async ({ reason, password, code }) => {
            await onSave(draft, reason, { password, code });
            setDraft(draft);
            setModal(false);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function AuditSection({ admin }: { admin: AdminIdentity }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Page<import("@/lib/admin/types").AuditEntry> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGet("audit", { q: query, page: String(page) })
      .then((body) => setList(body.audit as Page<import("@/lib/admin/types").AuditEntry>))
      .catch((err: Error) => setError(err.message));
  }, [query, page]);

  return (
    <Panel
      title="Audit logs"
      actions={
        <div className="admin-filters">
          <input
            type="search"
            value={query}
            placeholder="Action, admin, target"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
          {can(admin.permissions, "audit.export") ? (
            <button
              className="admin-secondary"
              type="button"
              onClick={async () => {
                const body = await adminGet("audit-export", { q: query });
                const blob = new Blob([JSON.stringify(body.export, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "trustless-audit.json";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <EmptyState title={error} /> : null}
      {!list ? <EmptyState title="Loading audit log…" /> : null}
      {list && list.rows.length === 0 ? <EmptyState title="No audit entries" /> : null}
      {list && list.rows.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>{dateTime.format(new Date(entry.createdAt))}</td>
                    <td>{entry.adminName}</td>
                    <td>{entry.action}</td>
                    <td>
                      {entry.targetType}
                      {entry.targetId ? ` · ${entry.targetId}` : ""}
                    </td>
                    <td>{entry.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={list} onChange={setPage} />
        </>
      ) : null}
    </Panel>
  );
}

export function AdminsSection({ admin }: { admin: AdminIdentity }) {
  const [admins, setAdmins] = useState<import("@/lib/admin/types").AdminAccount[] | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | { action: string; payload: Record<string, unknown>; title: string; body: string }>(null);

  useEffect(() => {
    let active = true;
    adminGet("admins")
      .then((body) => {
        if (!active) return;
        setAdmins(body.admins as import("@/lib/admin/types").AdminAccount[]);
        setRoles((body.roles as Record<string, string>) ?? {});
        setError("");
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    const body = await adminGet("admins");
    setAdmins(body.admins as import("@/lib/admin/types").AdminAccount[]);
    setRoles((body.roles as Record<string, string>) ?? {});
  }

  if (error) return <EmptyState title={error} />;
  if (!admins) return <EmptyState title="Loading admins…" />;

  return (
    <div className="admin-stack">
      <Panel title="Admin accounts">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>2FA</th>
              <th>Sessions</th>
              <th>Last login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{roles[account.role] ?? account.role}</td>
                <td>{account.totpEnabled ? "On" : "Off"}</td>
                <td>{account.activeSessions}</td>
                <td>{account.lastLoginAt ? dateTime.format(new Date(account.lastLoginAt)) : "—"}</td>
                <td>
                  <StatusBadge status={account.disabled ? "banned" : "active"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {can(admin.permissions, "admins.manage") ? (
        <Panel title="Create admin">
          <form
            className="admin-fields"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setModal({
                title: "Create admin",
                body: "Creates a new admin account with the chosen role.",
                action: "admin.create",
                payload: {
                  username: String(form.get("username") ?? ""),
                  newPassword: String(form.get("newPassword") ?? ""),
                  role: String(form.get("role") ?? ""),
                },
              });
            }}
          >
            <label>
              Username
              <input name="username" required maxLength={40} />
            </label>
            <label>
              Temporary password
              <input name="newPassword" type="password" required minLength={12} />
            </label>
            <label>
              Role
              <select name="role" defaultValue="moderator">
                {Object.entries(roles).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="admin-primary" type="submit">
              Create
            </button>
          </form>
        </Panel>
      ) : null}

      {modal ? (
        <ConfirmModal
          title={modal.title}
          body={modal.body}
          confirmLabel="Confirm"
          needPassword
          needCode={admin.totpEnabled}
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={async ({ reason, password, code }) => {
            setBusy(true);
            try {
              await adminAct(modal.action, { ...modal.payload, reason, password, code });
              setModal(null);
              await reload();
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

export function SupportSection({ onOpenPlayer }: { onOpenPlayer: (userId: string) => void }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<import("@/lib/admin/types").PlayerSummary[]>([]);
  const [error, setError] = useState("");

  return (
    <Panel title="Support tools">
      <form
        className="admin-filters"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const body = await adminGet("players", { q: query, status: "all", page: "1" });
            setRows((body.players as Page<import("@/lib/admin/types").PlayerSummary>).rows);
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed");
          }
        }}
      >
        <input
          type="search"
          value={query}
          placeholder="Find player by name, Player ID or wallet"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="admin-primary" type="submit">
          Search
        </button>
      </form>
      {error ? <EmptyState title={error} /> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Player ID</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={player.userId}>
              <td>{player.username}</td>
              <td>{player.playerId}</td>
              <td>
                <StatusBadge status={player.status} />
              </td>
              <td>
                <button className="admin-link" type="button" onClick={() => onOpenPlayer(player.userId)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="admin-note">Reward restore and error inspection need richer match and inventory services.</p>
    </Panel>
  );
}
