"use client";

import { useState } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FACTION_NAME,
  FACTION_ORDER,
  ROLES,
  profileFaction,
  type RoleDefinition,
} from "@/lib/game";

const ROLE_ART: Partial<Record<string, string>> = {
  villager: "/roles/villager.jpg",
  seer: "/roles/seer.jpg",
};

export function RolesPage({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = ROLES.find((role) => role.id === selectedId) ?? null;

  return (
    <main className="room account roles-page">
      <ThemeToggle className="account-theme-toggle" />
      <header className="roles-head">
        <div>
          <p className="kicker">The table</p>
          <h1 className="display">Roles</h1>
          <p className="lede">Sixteen seats. Four sides. No one is marked.</p>
        </div>
        <button className="text-btn" type="button" onClick={onBack}>
          Back
        </button>
      </header>

      {FACTION_ORDER.map((faction) => (
        <section className="roles-faction" key={faction} data-faction={profileFaction(faction)}>
          <h2>{FACTION_NAME[faction]}</h2>
          <ul className="roles-grid">
            {ROLES.filter((role) => role.faction === faction && role.enabled).map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  className="roles-card"
                  data-faction={profileFaction(role.faction)}
                  onClick={() => setSelectedId(role.id)}
                >
                  <RolePortrait role={role} />
                  <span className="roles-card-copy">
                    <strong>{role.name}</strong>
                    <span>{label(role.category)}</span>
                    <p>{role.abilityDescription}</p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {selected ? <RoleDetail role={selected} onClose={() => setSelectedId(null)} /> : null}
    </main>
  );
}

function RoleDetail({ role, onClose }: { role: RoleDefinition; onClose: () => void }) {
  return (
    <div className="roles-shade" role="presentation" onClick={onClose}>
      <article
        className="roles-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="roles-detail-head">
          <p className="kicker">{FACTION_NAME[role.faction]} · {label(role.category)}</p>
          <button className="text-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <RolePortrait role={role} />
        <h2 id="role-detail-title" className="display">{role.name}</h2>
        <p>{role.description}</p>
        <dl>
          <div>
            <dt>Ability</dt>
            <dd>{role.abilityDescription}</dd>
          </div>
          <div>
            <dt>Phase</dt>
            <dd>{label(role.phase)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{targetCopy(role)}</dd>
          </div>
          <div>
            <dt>Win</dt>
            <dd>{role.winCondition}</dd>
          </div>
        </dl>
        {role.notes.length > 0 ? (
          <ul>
            {role.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

function RolePortrait({ role }: { role: RoleDefinition }) {
  const art = ROLE_ART[role.id];
  return (
    <span className="roles-portrait" data-faction={profileFaction(role.faction)}>
      {art ? (
        <img src={art} alt="" />
      ) : (
        <FactionIcon faction={profileFaction(role.faction)} className="roles-mark" />
      )}
    </span>
  );
}

function targetCopy(role: RoleDefinition) {
  if (role.targetType === "none") return "No target.";
  if (role.targetType === "multiple") return `${role.maxTargets} players.`;
  if (role.canSelfTarget) return "One player, including yourself.";
  return "One other player.";
}

function label(value: string) {
  return value.replaceAll("_", " ");
}
