"use client";

import { useEffect, useState } from "react";
import { RoleIcon } from "@/components/roles/role-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FACTION_NAME,
  ROLES,
  profileFaction,
  type RoleDefinition,
} from "@/lib/game";

export function RolesPage({ onBack }: { onBack: () => void }) {
  const [roles, setRoles] = useState<RoleDefinition[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roster = roles ?? [];
  const selected = roster.find((role) => role.id === selectedId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/roles", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<{ roles?: unknown }>;
      })
      .then((body) => {
        if (!Array.isArray(body.roles)) throw new Error("unavailable");
        setRoles(body.roles.filter(isRole));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRoles(ROLES.filter((role) => role.enabled));
      });
    return () => controller.abort();
  }, []);

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

      {roles === null ? <p className="lede">Loading the table…</p> : roster.length === 0 ? <p className="lede">No roles are on the table.</p> : null}
      <ul className="roles-grid">
        {roster.filter((role) => role.enabled).map((role) => (
          <li key={role.id}>
            <button
              type="button"
              className="roles-card"
              data-faction={profileFaction(role.faction)}
              onClick={() => setSelectedId(role.id)}
            >
              <RoleSymbol role={role} />
              <strong>{role.name}</strong>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <RoleDetail role={selected} onClose={() => setSelectedId(null)} /> : null}
    </main>
  );
}

function isRole(value: unknown): value is RoleDefinition {
  if (!value || typeof value !== "object") return false;
  const role = value as Partial<RoleDefinition>;
  return (
    typeof role.id === "string" &&
    typeof role.name === "string" &&
    typeof role.faction === "string" &&
    typeof role.abilityDescription === "string"
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
        <RoleSymbol role={role} />
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

function RoleSymbol({ role }: { role: RoleDefinition }) {
  return (
    <span className="roles-symbol" data-faction={profileFaction(role.faction)}>
      <RoleIcon role={role} />
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
