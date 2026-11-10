"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/components/admin/admin-api";
import { dateTime, EmptyState, FactionBadge, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import type { OverviewData } from "@/lib/admin/types";

export function OverviewSection() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminGet("overview")
      .then((body) => active && setData(body.overview as OverviewData))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  if (error) return <EmptyState title="Overview unavailable" body={error} />;
  if (!data) return <EmptyState title="Loading overview…" />;

  return (
    <div className="admin-stack">
      <div className="admin-stat-grid">
        <StatCard label="Registered players" value={data.players} />
        <StatCard label="New today" value={data.newToday} />
        <StatCard label="DAU" value={data.dau} note="Based on last_active_at" />
        <StatCard label="WAU" value={data.wau} />
        <StatCard label="MAU" value={data.mau} />
        <StatCard label="Results today" value={data.resultsToday} />
        <StatCard label="Results total" value={data.resultsTotal} />
        <StatCard label="Open reports" value={data.openReports} />
        <StatCard label="Suspended" value={data.suspended} />
        <StatCard label="Banned" value={data.banned} />
        <StatCard label="Monitored" value={data.monitored} />
        <StatCard label="Online now" value="—" note="Needs match server" />
        <StatCard label="Active matches" value="—" note="Needs match server" />
        <StatCard label="Avg queue time" value="—" note="Needs matchmaking" />
      </div>

      <div className="admin-split">
        <Panel title="Faction win rates">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Faction</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {data.factions.map((row) => (
                <tr key={row.faction}>
                  <td>
                    <FactionBadge faction={row.faction} />
                  </td>
                  <td>{row.games}</td>
                  <td>{row.wins}</td>
                  <td>{row.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="System status">
          <ul className="admin-status-list">
            {data.system.map((item) => (
              <li key={item.label}>
                <StatusBadge status={item.state === "ok" ? "active" : item.state === "down" ? "banned" : "suspended"} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="admin-split three">
        <Panel title="Most played roles">
          <RoleMini rows={data.mostPlayedRoles} />
        </Panel>
        <Panel title="Highest win-rate roles">
          <RoleMini rows={data.highestWinRoles} empty="Need 3+ games per role." />
        </Panel>
        <Panel title="Lowest win-rate roles">
          <RoleMini rows={data.lowestWinRoles} empty="Need 3+ games per role." />
        </Panel>
      </div>

      <div className="admin-split three">
        <Panel title="Recent admin activity">
          {data.recentAudit.length === 0 ? (
            <EmptyState title="No admin actions yet" />
          ) : (
            <ul className="admin-feed">
              {data.recentAudit.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.adminName}</strong>
                  <span>{entry.action}</span>
                  <time>{dateTime.format(new Date(entry.createdAt))}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent bans">
          {data.recentBans.length === 0 ? (
            <EmptyState title="No bans recorded" />
          ) : (
            <ul className="admin-feed">
              {data.recentBans.map((ban) => (
                <li key={ban.id}>
                  <strong>{ban.username ?? ban.userId}</strong>
                  <span>
                    {ban.kind} · {ban.reason}
                  </span>
                  <time>{dateTime.format(new Date(ban.createdAt))}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent reports">
          {data.recentReports.length === 0 ? (
            <EmptyState title="No reports yet" body="Reports appear once in-game reporting ships." />
          ) : (
            <ul className="admin-feed">
              {data.recentReports.map((report) => (
                <li key={report.id}>
                  <strong>{report.reportedName ?? report.reportedId}</strong>
                  <span>
                    {report.category} · {report.status}
                  </span>
                  <time>{dateTime.format(new Date(report.createdAt))}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RoleMini({
  rows,
  empty = "No role results yet.",
}: {
  rows: OverviewData["mostPlayedRoles"];
  empty?: string;
}) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Role</th>
          <th>Games</th>
          <th>WR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.role}-${row.faction}`}>
            <td>
              {row.role}
              <div>
                <FactionBadge faction={row.faction} />
              </div>
            </td>
            <td>{row.games}</td>
            <td>{row.winRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
