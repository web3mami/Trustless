"use client";

import { useEffect, useState } from "react";
import { FactionIcon } from "@/components/faction-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FACTION_NAME,
  ROLES,
  profileFaction,
  type RoleDefinition,
} from "@/lib/game";

const ROLE_ART: Partial<Record<string, string>> = {
  villager: "/roles/villager.jpg",
  seer: "/roles/seer.jpg",
  doctor: "/roles/doctor.jpg",
  detective: "/roles/detective.jpg",
  roleblocker: "/roles/roleblocker.jpg",
};

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
              <RolePortrait role={role} />
              <span className="roles-card-copy">
                <strong>{role.name}</strong>
                <span>{FACTION_NAME[role.faction]}</span>
                <p>{role.abilityDescription}</p>
              </span>
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
      <RoleEmblem id={role.id} />
    </span>
  );
}

function RoleEmblem({ id }: { id: string }) {
  const mark =
    id === "seer" ? (
      <>
        <path d="M15.2 6.2a6.6 6.6 0 1 0 0 11.6" />
        <path d="M6.4 12c1.4-2 3-3 4.8-3s3.4 1 4.8 3c-1.4 2-3 3-4.8 3s-3.4-1-4.8-3Z" />
        <circle cx="11.2" cy="12" r="1.05" fill="currentColor" stroke="none" />
      </>
    ) : id === "doctor" ? (
      <>
        <path d="M10 3.6h4M11.2 3.6v2.6L9 10.2a3.2 3.2 0 0 0 2.8 4.7h.4a3.2 3.2 0 0 0 2.8-4.7L12.8 6.2V3.6" />
        <path d="M9.4 12.2h5.2" />
      </>
    ) : id === "detective" ? (
      <>
        <circle cx="10.2" cy="10.2" r="4.6" />
        <path d="m13.6 13.6 4.2 4.2" />
        <circle cx="8.8" cy="9.6" r=".7" fill="currentColor" stroke="none" />
        <circle cx="11.8" cy="9.6" r=".7" fill="currentColor" stroke="none" />
      </>
    ) : id === "roleblocker" ? (
      <>
        <circle cx="7.2" cy="8" r="2.1" />
        <path d="m9 9.2 7.2 7.2M14.2 14.6h2.3M14.2 16.6h1.7" />
        <path d="M16.4 6.4 8.6 15.6" />
        <circle cx="16.6" cy="6.2" r="1.15" />
        <circle cx="14.2" cy="8.8" r="1.15" />
      </>
    ) : null;

  if (!mark) return null;

  return (
    <span className="roles-emblem" aria-hidden="true">
      <svg viewBox="0 0 24 24">{mark}</svg>
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
