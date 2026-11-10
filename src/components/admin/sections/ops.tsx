"use client";

import { Fragment, useEffect, useState } from "react";
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
import { FACTION_NAME, ROLES, profileFaction } from "@/lib/game";
import { FACTION_LABEL, type Faction } from "@/lib/roles";
import { REPORT_CATEGORIES, RESTRICTION_KINDS, type AdminIdentity, type MatchRecord, type Page, type Report, type Restriction } from "@/lib/admin/types";
import {
  FEATURE_FLAGS,
  GAME_NUMBER_LIMITS,
  GAME_TOGGLE_FIELDS,
  MAINTENANCE_FIELDS,
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
  const [tab, setTab] = useState<"live" | "completed" | "dev">("completed");
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
      <div className="admin-tabs" role="tablist">
        <button type="button" className={tab === "live" ? "is-active" : undefined} onClick={() => setTab("live")}>
          Live matches
        </button>
        <button type="button" className={tab === "completed" ? "is-active" : undefined} onClick={() => setTab("completed")}>
          Completed matches
        </button>
        {can(admin.permissions, "matches.edit") ? (
          <button type="button" className={tab === "dev" ? "is-active" : undefined} onClick={() => setTab("dev")}>
            Development tools
          </button>
        ) : null}
      </div>
      {tab === "live" ? (
        <Panel title="Live matches">
          <EmptyState
            title="Match server not connected"
            body="Phase, votes, night actions and spectate will show here. Ending a live match will require a reason and an audit entry."
          />
        </Panel>
      ) : null}
      {tab === "completed" ? (
      <Panel
        title="Completed matches"
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
      ) : null}

      {tab === "dev" && can(admin.permissions, "matches.edit") ? (
        <Panel title="Add test result">
          <p className="admin-note">Development only. These rows are real match results and should not be used in production operations.</p>
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
  const [selectedId, setSelectedId] = useState("");

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
  const selected = reports.rows.find((report) => report.id === selectedId) ?? null;

  return (
    <div className="admin-stack">
      <Panel title="Report queue">
        {reports.rows.length === 0 ? (
          <EmptyState title="No open reports" body="In-game reporting is not wired yet." />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>When</th>
                <th>Reported</th>
                <th>Category</th>
                <th>Match</th>
                <th>Reporter</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.rows.map((report) => (
                <tr key={report.id}>
                  <td>
                    <button className="admin-link" type="button" onClick={() => setSelectedId(report.id)}>
                      {report.id}
                    </button>
                  </td>
                  <td>{dateTime.format(new Date(report.createdAt))}</td>
                  <td>{report.reportedName ?? report.reportedId}</td>
                  <td>{REPORT_CATEGORIES[report.category]}</td>
                  <td>{report.matchRef ?? "—"}</td>
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

      {selected ? (
        <Panel title={`Report ${selected.id}`}>
          <dl className="admin-dl">
            <div><dt>Category</dt><dd>{REPORT_CATEGORIES[selected.category]}</dd></div>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            <div><dt>Match</dt><dd>{selected.matchRef ?? "Not attached"}</dd></div>
            <div><dt>Evidence</dt><dd>Chat and match evidence are not connected yet.</dd></div>
          </dl>
          <p>{selected.details || "No description."}</p>
        </Panel>
      ) : null}

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
                    <StatusBadge status={item.kind.includes("ban") ? "banned" : "restricted"} /> {RESTRICTION_KINDS[item.kind] ?? item.kind}
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

      <Panel title="Appeals">
        <EmptyState title="No appeals" body="Appeal review is not connected yet." />
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
                <label>
                  Banned phrases
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
  const [tab, setTab] = useState<"players" | "matches" | "balance" | "progression" | "moderation">("players");
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
      <div className="admin-tabs">
        {(["players", "matches", "balance", "progression", "moderation"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? "is-active" : undefined} onClick={() => setTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === "players" ? (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat"><span>DAU</span><strong>{data.dau}</strong></div>
            <div className="admin-stat"><span>WAU</span><strong>{data.wau}</strong></div>
            <div className="admin-stat"><span>MAU</span><strong>{data.mau}</strong></div>
            <div className="admin-stat"><span>Players</span><strong>{data.players}</strong></div>
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
          </Panel>
        </>
      ) : null}
      {tab === "matches" ? (
        <EmptyState title="Match telemetry not connected" body="Started games, duration, queue time and disconnect rate need the match server." />
      ) : null}
      {tab === "balance" ? (
        <div className="admin-split">
          <StatsTable title="Factions" rows={data.factions} />
          <StatsTable title="Roles" rows={data.roles.slice(0, 12)} role />
        </div>
      ) : null}
      {tab === "progression" ? (
        <div className="admin-stat-grid">
          <div className="admin-stat"><span>Achievement completion</span><strong>{data.achievementCompletion}%</strong></div>
        </div>
      ) : null}
      {tab === "moderation" ? (
        <div className="admin-stat-grid">
          <div className="admin-stat"><span>Reports</span><strong>{data.moderation.reports}</strong></div>
          <div className="admin-stat"><span>Mutes</span><strong>{data.moderation.mutes}</strong></div>
          <div className="admin-stat"><span>Bans</span><strong>{data.moderation.bans}</strong></div>
        </div>
      ) : null}
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
  const [tab, setTab] = useState<"performance" | "definitions">("performance");
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

  return (
    <div className="admin-stack">
      <div className="admin-tabs">
        <button type="button" className={tab === "definitions" ? "is-active" : undefined} onClick={() => setTab("definitions")}>
          {mode === "roles" ? "Role definitions" : "Faction definitions"}
        </button>
        <button type="button" className={tab === "performance" ? "is-active" : undefined} onClick={() => setTab("performance")}>
          Performance
        </button>
      </div>
      {tab === "definitions" ? (
        mode === "roles" ? <RoleDefinitions /> : <FactionDefinitions />
      ) : !factions.length && !roles.length ? (
        <EmptyState title="No completed results yet" />
      ) : mode === "factions" ? (
        <StatsTable title="Faction performance" rows={factions} />
      ) : (
        <StatsTable title="Role performance" rows={roles} role />
      )}
    </div>
  );
}

function FactionDefinitions() {
  const factions = [
    { name: "Village", note: "Good-aligned. Wins by eliminating every hostile threat." },
    { name: "Werewolf", note: "Team-aligned. Shares night chat and wins by reaching parity with the village." },
    { name: "Solo", note: "Independent. Can be a killer, a converter, or both. Does not share a team win." },
    { name: "Neutral", note: "Independent wildcard. Not inherently convertible. Some Neutral roles stay independent; a Fool-style role wins if the village lynches them." },
  ];
  return (
    <Panel title="Faction definitions">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Faction</th>
            <th>Win logic</th>
            <th>Editor</th>
          </tr>
        </thead>
        <tbody>
          {factions.map((faction) => (
            <tr key={faction.name}>
              <td>{faction.name}</td>
              <td>{faction.note}</td>
              <td><StatusBadge status="planned" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="admin-note">Editing names, icons and colours needs the content store. Performance above uses completed matches.</p>
    </Panel>
  );
}

function RoleDefinitions() {
  return (
    <div className="admin-stack">
      <p className="admin-note">
        This is the canonical 16-player roster. Names, factions, charges, and resolution priority are locked here so a partial edit cannot break the night.
      </p>
      {(["village", "werewolf", "solo", "neutral"] as const).map((faction) => (
        <Panel key={faction} title={FACTION_NAME[faction]}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Category</th>
                <th>Phase</th>
                <th>Action</th>
                <th>Targets</th>
                <th>Charges</th>
                <th>Priority</th>
                <th>Win</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.filter((role) => role.faction === faction).map((role) => (
                <tr key={role.id}>
                  <td>
                    <FactionBadge faction={profileFaction(faction)} /> {role.name}
                  </td>
                  <td>{role.category}</td>
                  <td>{role.phase}</td>
                  <td>{role.actionType ? `${role.actionScope} ${role.actionType}` : "None"}</td>
                  <td>{role.targetType === "none" ? "None" : role.maxTargets}</td>
                  <td>{role.charges ?? "Unlimited"}</td>
                  <td>{role.actionPriority}</td>
                  <td>{role.winCondition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}
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
      describe={
        kind === "maintenance"
          ? (draft) => {
              const next = draft as MaintenanceSettings;
              const current = value as MaintenanceSettings;
              if (next.forceUpdate && !current.forceUpdate) {
                return "Enable force client update? Older clients will be locked out until they update. This writes an audit entry.";
              }
              if (next.enabled && !current.enabled) {
                return "Enable maintenance mode? New matches will be blocked. Active matches will continue if allowed.";
              }
              return "Saving maintenance changes asks for your password and writes an audit entry.";
            }
          : undefined
      }
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
          const turningOn = settings.enabled && !(value as MaintenanceSettings).enabled;
          const forcing = settings.forceUpdate && !(value as MaintenanceSettings).forceUpdate;
          return (
            <div className="admin-fields">
              {MAINTENANCE_FIELDS.map((field) => (
                <label key={field.key} className="admin-check admin-span-2">
                  <input
                    type="checkbox"
                    checked={settings[field.key]}
                    onChange={(event) => setDraft({ ...settings, [field.key]: event.target.checked })}
                  />
                  <span>
                    <strong>{field.label}</strong>
                    <em className="admin-help">{field.help}</em>
                  </span>
                </label>
              ))}
              <label className="admin-span-2">
                Maintenance message
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
                  placeholder="Tonight at 22:00 UTC"
                  onChange={(event) => setDraft({ ...settings, estimatedReturn: event.target.value })}
                />
              </label>
              <label>
                Minimum version
                <input
                  value={settings.minimumVersion}
                  placeholder="1.2.0"
                  onChange={(event) => setDraft({ ...settings, minimumVersion: event.target.value })}
                />
              </label>
              <p className="admin-note admin-span-2">
                {forcing
                  ? "Force client update will lock out older clients. Saving asks for your password."
                  : turningOn
                    ? "Enabling maintenance blocks new matches. Active matches finish only if that option stays on."
                    : "Saving maintenance changes asks for your password and writes an audit entry."}
              </p>
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
                    <option value="test">Testers</option>
                    <option value="percentage">Percentage</option>
                    <option value="full">Everyone</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={flags[key].percentage}
                    hidden={flags[key].state !== "percentage"}
                    disabled={flags[key].state !== "percentage"}
                    aria-label={`${FEATURE_FLAGS[key]} percentage`}
                    onChange={(event) =>
                      setDraft({
                        ...flags,
                        [key]: { ...flags[key], percentage: Number(event.target.value) },
                      })
                    }
                  />
                  <span className="admin-subtle">
                    {flags[key].state === "full"
                      ? "Everyone"
                      : flags[key].state === "off"
                        ? "Off"
                        : flags[key].state === "admin"
                          ? "Admins only"
                          : flags[key].state === "test"
                            ? "Testers"
                            : `${flags[key].percentage}% of players`}
                  </span>
                </div>
              ))}
            </div>
          );
        }
        const game = draft as GameSettings;
        const groups: { title: string; fields: (keyof typeof GAME_NUMBER_LIMITS)[] }[] = [
          { title: "Phase timers", fields: ["dayDuration", "nightDuration", "discussionDuration", "votingDuration", "deathAnimationDuration"] },
          { title: "Player limits", fields: ["minPlayers", "maxPlayers"] },
          { title: "Disconnects", fields: ["afkTimeout", "disconnectGrace"] },
        ];
        return (
          <div className="admin-stack">
            {groups.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                <div className="admin-fields">
                  {group.fields.map((field) => (
                    <label key={field}>
                      {GAME_NUMBER_LIMITS[field].label}
                      <input
                        type="number"
                        min={GAME_NUMBER_LIMITS[field].min}
                        max={GAME_NUMBER_LIMITS[field].max}
                        value={game[field]}
                        onChange={(event) => setDraft({ ...game, [field]: Number(event.target.value) })}
                      />
                      <em className="admin-help">{game[field]} {GAME_NUMBER_LIMITS[field].unit === "s" ? "seconds" : ""}</em>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <h3>Voting</h3>
              <div className="admin-fields">
                <label>
                  Tie vote behavior
                  <select
                    value={game.tieVote}
                    onChange={(event) =>
                      setDraft({ ...game, tieVote: event.target.value as GameSettings["tieVote"] })
                    }
                  >
                    <option value="no_lynch">No lynch</option>
                    <option value="revote">Revote</option>
                    <option value="random">Random player</option>
                  </select>
                </label>
                {GAME_TOGGLE_FIELDS.filter((field) => field.key === "allowSkipVote").map((field) => (
                  <label key={field.key} className="admin-check">
                    <input
                      type="checkbox"
                      checked={game[field.key]}
                      onChange={(event) => setDraft({ ...game, [field.key]: event.target.checked })}
                    />
                    <span>
                      <strong>{field.label}</strong>
                      <em className="admin-help">{field.help}</em>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3>Death and spectating</h3>
              <div className="admin-fields">
                <label>
                  Spectator mode
                  <select
                    value={game.spectators}
                    onChange={(event) =>
                      setDraft({ ...game, spectators: event.target.value as GameSettings["spectators"] })
                    }
                  >
                    <option value="off">Off</option>
                    <option value="friends">Friends only</option>
                    <option value="anyone">Anyone</option>
                  </select>
                </label>
                {GAME_TOGGLE_FIELDS.filter((field) => field.key !== "allowSkipVote").map((field) => (
                  <label key={field.key} className="admin-check admin-span-2">
                    <input
                      type="checkbox"
                      checked={game[field.key]}
                      onChange={(event) => setDraft({ ...game, [field.key]: event.target.checked })}
                    />
                    <span>
                      <strong>{field.label}</strong>
                      <em className="admin-help">{field.help}</em>
                    </span>
                  </label>
                ))}
              </div>
            </div>
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
  describe,
}: {
  title: string;
  value: T;
  busy: boolean;
  onSave: (value: T, reason: string, auth: { password: string; code: string }) => Promise<void>;
  render: (draft: T, setDraft: (next: T) => void) => React.ReactNode;
  needPassword?: boolean;
  needCode?: boolean;
  describe?: (draft: T) => string;
}) {
  const [draft, setDraft] = useState(value);
  const [modal, setModal] = useState(false);
  const [saved, setSaved] = useState("");

  return (
    <Panel title={title}>
      {render(draft, (next) => {
        setSaved("");
        setDraft(next);
      })}
      {saved ? <p className="admin-message">{saved}</p> : null}
      <button className="admin-primary" type="button" disabled={busy} onClick={() => setModal(true)}>
        Save changes
      </button>
      {modal ? (
        <ConfirmModal
          title={`Save ${title.toLowerCase()}`}
          body={describe?.(draft) ?? "This change is audit logged and applies immediately."}
          confirmLabel="Save"
          busy={busy}
          needPassword={needPassword}
          needCode={needCode}
          onClose={() => setModal(false)}
          onConfirm={async ({ reason, password, code }) => {
            await onSave(draft, reason, { password, code });
            setSaved("Saved.");
            setModal(false);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function AuditSection({ admin }: { admin: AdminIdentity }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [adminName, setAdminName] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState("");
  const [list, setList] = useState<Page<import("@/lib/admin/types").AuditEntry> | null>(null);
  const [error, setError] = useState("");
  const filters = { q: query, action, admin: adminName, targetType, from, to, page: String(page) };

  useEffect(() => {
    adminGet("audit", { q: query, action, admin: adminName, targetType, from, to, page: String(page) })
      .then((body) => setList(body.audit as Page<import("@/lib/admin/types").AuditEntry>))
      .catch((err: Error) => setError(err.message));
  }, [query, action, adminName, targetType, from, to, page]);

  return (
    <Panel
      title="Audit logs"
      actions={
        <div className="admin-filters">
          <input
            type="search"
            value={query}
            placeholder="Search"
            aria-label="Search audit log"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
          <input
            value={adminName}
            placeholder="Admin"
            aria-label="Filter by admin"
            onChange={(event) => {
              setPage(1);
              setAdminName(event.target.value);
            }}
          />
          <input
            value={action}
            placeholder="Action"
            aria-label="Filter by action"
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
          />
          <input
            value={targetType}
            placeholder="Target type"
            aria-label="Filter by target type"
            onChange={(event) => {
              setPage(1);
              setTargetType(event.target.value);
            }}
          />
          <input type="date" value={from} aria-label="From" onChange={(event) => { setPage(1); setFrom(event.target.value); }} />
          <input type="date" value={to} aria-label="To" onChange={(event) => { setPage(1); setTo(event.target.value); }} />
          {can(admin.permissions, "audit.export") ? (
            <button
              className="admin-secondary"
              type="button"
              onClick={async () => {
                const body = await adminGet("audit-export", filters);
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
                  <th>Session</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.rows.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr>
                      <td>{dateTime.format(new Date(entry.createdAt))}</td>
                      <td>{entry.adminName}</td>
                      <td>{entry.action}</td>
                      <td>
                        {entry.targetType ?? "—"}
                        {entry.targetId ? ` · ${entry.targetId}` : ""}
                      </td>
                      <td>{entry.reason ?? "—"}</td>
                      <td>{entry.ip ?? "—"}</td>
                      <td>
                        <button className="admin-link" type="button" onClick={() => setOpenId(openId === entry.id ? "" : entry.id)}>
                          {openId === entry.id ? "Hide" : "Values"}
                        </button>
                      </td>
                    </tr>
                    {openId === entry.id ? (
                      <tr key={`${entry.id}-values`}>
                        <td colSpan={7}>
                          <strong>Previous</strong>
                          <pre className="admin-code">{JSON.stringify(entry.previousValue ?? null, null, 2)}</pre>
                          <strong>New</strong>
                          <pre className="admin-code">{JSON.stringify(entry.newValue ?? null, null, 2)}</pre>
                          <span className="admin-subtle">Session {entry.sessionRef ?? "—"}</span>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={list} onChange={setPage} />
          <p className="admin-note">Audit entries are append-only. This screen cannot edit or delete them.</p>
        </>
      ) : null}
    </Panel>
  );
}

export function AdminsSection({ admin }: { admin: AdminIdentity }) {
  const [admins, setAdmins] = useState<import("@/lib/admin/types").AdminAccount[] | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [inspectId, setInspectId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | {
    action: string;
    payload: Record<string, unknown>;
    title: string;
    body: string;
    extra?: boolean;
  }>(null);

  useEffect(() => {
    let active = true;
    adminGet("admins")
      .then((body) => {
        if (!active) return;
        setAdmins(body.admins as import("@/lib/admin/types").AdminAccount[]);
        setRoles((body.roles as Record<string, string>) ?? {});
        setRolePermissions((body.rolePermissions as Record<string, string[]>) ?? {});
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
    setRolePermissions((body.rolePermissions as Record<string, string[]>) ?? {});
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>
                  {can(admin.permissions, "admins.manage") && account.id !== admin.id ? (
                    <select
                      aria-label={`Role for ${account.username}`}
                      value={account.role}
                      onChange={(event) =>
                        setModal({
                          title: `Change ${account.username} to ${roles[event.target.value] ?? event.target.value}`,
                          body: "Their sessions will be revoked so the new role takes effect.",
                          action: "admin.update_role",
                          payload: { adminId: account.id, role: event.target.value },
                        })
                      }
                    >
                      {Object.entries(roles).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roles[account.role] ?? account.role
                  )}
                </td>
                <td>{account.totpEnabled ? "On" : "Off"}</td>
                <td>{account.activeSessions}</td>
                <td>{account.lastLoginAt ? dateTime.format(new Date(account.lastLoginAt)) : "—"}</td>
                <td>
                  <StatusBadge status={account.disabled ? "banned" : "active"} />
                </td>
                <td className="admin-row-actions">
                  {can(admin.permissions, "admins.manage") && account.id !== admin.id ? (
                    <>
                      <button
                        className="admin-link"
                        type="button"
                        onClick={() =>
                          setModal({
                            title: account.disabled ? `Enable ${account.username}` : `Disable ${account.username}`,
                            body: account.disabled
                              ? "This restores the admin account."
                              : "This signs them out and blocks new admin sessions.",
                            action: "admin.set_disabled",
                            payload: { adminId: account.id, disabled: !account.disabled },
                          })
                        }
                      >
                        {account.disabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        className="admin-link"
                        type="button"
                        onClick={() =>
                          setModal({
                            title: `Revoke sessions for ${account.username}`,
                            body: "They will need to sign in again.",
                            action: "admin.revoke_sessions",
                            payload: { adminId: account.id },
                          })
                        }
                      >
                        Revoke sessions
                      </button>
                      <button
                        className="admin-link"
                        type="button"
                        onClick={() => {
                          setNewPassword("");
                          setModal({
                            title: `Reset password for ${account.username}`,
                            body: "They will be signed out. The new password must be at least 12 characters.",
                            action: "admin.reset_password",
                            extra: true,
                            payload: { adminId: account.id },
                          });
                        }}
                      >
                        Reset password
                      </button>
                      <button
                        className="admin-link"
                        type="button"
                        onClick={() =>
                          setModal({
                            title: `Reset 2FA for ${account.username}`,
                            body: "This turns 2FA off until they enroll again.",
                            action: "admin.reset_2fa",
                            payload: { adminId: account.id },
                          })
                        }
                      >
                        Reset 2FA
                      </button>
                    </>
                  ) : null}
                  <button className="admin-link" type="button" onClick={() => setInspectId(inspectId === account.id ? null : account.id)}>
                    Permissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inspectId !== null ? (
          <p className="admin-note">
            {(rolePermissions[admins.find((item) => item.id === inspectId)?.role ?? ""] ?? []).join(" · ") || "No permissions listed."}
          </p>
        ) : null}
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
          extraLabel={modal.extra ? "Temporary password" : undefined}
          extraValue={newPassword}
          onExtraChange={setNewPassword}
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={async ({ reason, password, code }) => {
            setBusy(true);
            try {
              await adminAct(modal.action, {
                ...modal.payload,
                ...(modal.extra ? { newPassword } : {}),
                reason,
                password,
                code,
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
