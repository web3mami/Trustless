"use client";

import { useState } from "react";
import { EmptyState, Panel } from "@/components/admin/ui";

const CHANNELS = ["Lobby", "Match", "Dead players", "Werewolf team", "Party"];
const SIGNALS = [
  "Impossible actions",
  "Abnormal timing",
  "Coordinated voting",
  "Teaming",
  "Multi-account",
  "AFK farming",
  "XP farming",
  "Win trading",
  "Exploit abuse",
  "Client tampering",
  "Rate-limit violations",
];

export function ServiceShell({
  title,
  filters,
  columns,
  empty,
}: {
  title: string;
  filters: string[];
  columns: string[];
  empty: string;
}) {
  return (
    <Panel
      title={title}
      actions={
        <div className="admin-filters">
          {filters.map((filter) => (
            <input key={filter} placeholder={filter} aria-label={filter} disabled />
          ))}
        </div>
      }
    >
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title="Service not connected" body={empty} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ChatSection() {
  const [channel, setChannel] = useState(CHANNELS[0]);
  return (
    <div className="admin-stack">
      <div className="admin-tabs">
        {CHANNELS.map((item) => (
          <button key={item} type="button" className={channel === item ? "is-active" : undefined} onClick={() => setChannel(item)}>
            {item}
          </button>
        ))}
      </div>
      <ServiceShell
        title={`${channel} log`}
        filters={["Player", "Match ID", "From", "To"]}
        columns={["Time", "Player", "Channel", "Match", "Message", "Flags"]}
        empty="Chat logs appear when the chat service is connected. Opening Werewolf team chat will be audit logged."
      />
    </div>
  );
}

export function SocialSection() {
  return (
    <ServiceShell
      title="Social inspector"
      filters={["Player", "Player ID"]}
      columns={["Friends", "Blocked", "Recent parties", "Repeat grouping", "Reports"]}
      empty="Friends, blocks and parties are not stored yet. One teaming signal will never auto-punish a player."
    />
  );
}

export function AntiCheatSection() {
  return (
    <div className="admin-stack">
      <ServiceShell
        title="Anti-cheat cases"
        filters={["Player", "Signal", "Severity", "Status"]}
        columns={["Case", "Player", "Signal", "Severity", "Confidence", "Matches", "Status"]}
        empty="No cases yet. Signals include timing, teaming, farming and client tampering. A single weak signal never becomes a permanent ban."
      />
      <Panel title="Signal catalogue">
        <div className="admin-chip-list">
          {SIGNALS.map((signal) => (
            <span key={signal} className="admin-badge">
              {signal}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function MatchmakingSection() {
  return (
    <div className="admin-stack">
      <div className="admin-stat-grid">
        {["Queued", "Average wait", "Longest wait", "Failed attempts"].map((label) => (
          <div key={label} className="admin-stat">
            <span>{label}</span>
            <strong>—</strong>
            <em>Not connected</em>
          </div>
        ))}
      </div>
      <ServiceShell
        title="Queues"
        filters={["Mode", "Region", "Rank"]}
        columns={["Mode", "Region", "Waiting", "Fill rate", "Lobby timeout"]}
        empty="Queue telemetry needs the matchmaking service. MMR range and expansion controls will sit here."
      />
    </div>
  );
}

export function RankedSection() {
  const [tab, setTab] = useState("Ranks");
  return (
    <div className="admin-stack">
      <div className="admin-tabs">
        {["Ranks", "Season", "Rating rules", "Leaderboard", "Corrections"].map((item) => (
          <button key={item} type="button" className={tab === item ? "is-active" : undefined} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>
      <EmptyState
        title={`${tab} not connected`}
        body="Rank names, seasons, rating corrections and the leaderboard need the ranked service. Corrections will require a reason and an audit entry."
      />
    </div>
  );
}

export function GameModesSection() {
  const modes = ["Quick Match", "Ranked", "Casual", "Custom"];
  return (
    <div className="admin-stat-grid">
      {modes.map((mode) => (
        <div key={mode} className="admin-stat">
          <span>{mode}</span>
          <strong>Off</strong>
          <em>Mode editor not connected</em>
        </div>
      ))}
    </div>
  );
}
