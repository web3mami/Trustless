"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminAct, adminGet } from "@/components/admin/admin-api";
import { ConfirmModal, EmptyState, FactionBadge, Panel } from "@/components/admin/ui";
import { can, type Permission } from "@/lib/admin/permissions";
import type { AdminIdentity } from "@/lib/admin/types";
import { FACTION_NAME, FACTION_ORDER, profileFaction } from "@/lib/game/catalog";
import type { ActionScope, ActionType, GameFaction, RoleCategory, RoleDefinition, RolePhase, TargetType, WinEvaluator } from "@/lib/game/types";

const CATEGORIES: { id: RoleCategory; label: string }[] = [
  { id: "investigative", label: "Investigative" },
  { id: "protective", label: "Protective" },
  { id: "support", label: "Support" },
  { id: "killing", label: "Killing" },
  { id: "special", label: "Special" },
];

const PHASES: { id: RolePhase; label: string }[] = [
  { id: "night", label: "Night" },
  { id: "day", label: "Day" },
  { id: "both", label: "Day and night" },
  { id: "passive", label: "Passive" },
];

const ACTIONS: { id: ActionType | "none"; label: string }[] = [
  { id: "none", label: "No action" },
  { id: "kill", label: "Kill" },
  { id: "protect", label: "Protect" },
  { id: "investigate", label: "Investigate" },
  { id: "compare", label: "Compare two players" },
  { id: "block", label: "Block an action" },
  { id: "track", label: "Track" },
  { id: "vote_modifier", label: "Extra vote" },
  { id: "special", label: "Special" },
];

const TARGETS: { id: TargetType; label: string }[] = [
  { id: "single", label: "One player" },
  { id: "multiple", label: "Several players" },
  { id: "self", label: "Themselves only" },
  { id: "none", label: "No target" },
];

const WINS: { id: WinEvaluator; label: string }[] = [
  { id: "village", label: "With the Village" },
  { id: "werewolf", label: "With the Werewolves" },
  { id: "last_alive", label: "By being the last alive" },
  { id: "lynch", label: "On their own terms" },
];

const WIN_COPY: Record<GameFaction, { text: string; evaluator: WinEvaluator; hostile: boolean }> = {
  village: {
    text: "Win when every living hostile threat is gone.",
    evaluator: "village",
    hostile: false,
  },
  werewolf: {
    text: "Win when the living pack is at least as large as every other living player.",
    evaluator: "werewolf",
    hostile: true,
  },
  solo: {
    text: "Win by being the last living player.",
    evaluator: "last_alive",
    hostile: true,
  },
  neutral: {
    text: "This role wins on its own terms.",
    evaluator: "lynch",
    hostile: false,
  },
};

type RoleDraft = {
  id: string;
  name: string;
  faction: GameFaction;
  category: RoleCategory;
  description: string;
  abilityDescription: string;
  phase: RolePhase;
  targetType: TargetType;
  maxTargets: string;
  charges: string;
  canSelfTarget: boolean;
  winCondition: string;
  actionType: ActionType | "none";
  actionScope: ActionScope;
  actionPriority: string;
  enabled: boolean;
  votePower: string;
  revealActivatesVote: boolean;
  blockable: boolean;
  blocksVillageWin: boolean;
  winEvaluator: WinEvaluator;
  lynchWin: boolean;
  aliveOnly: boolean;
  deadOnly: boolean;
  werewolfOnly: boolean;
  otherFactionOnly: boolean;
  investigationResult: "" | GameFaction;
  notes: string;
  reason: string;
};

function emptyDraft(): RoleDraft {
  return {
    id: "",
    name: "",
    faction: "village",
    category: "support",
    description: "",
    abilityDescription: "",
    phase: "night",
    targetType: "single",
    maxTargets: "1",
    charges: "",
    canSelfTarget: false,
    winCondition: WIN_COPY.village.text,
    actionType: "none",
    actionScope: "personal",
    actionPriority: "10",
    enabled: true,
    votePower: "1",
    revealActivatesVote: false,
    blockable: true,
    blocksVillageWin: false,
    winEvaluator: "village",
    lynchWin: false,
    aliveOnly: true,
    deadOnly: false,
    werewolfOnly: false,
    otherFactionOnly: false,
    investigationResult: "",
    notes: "",
    reason: "",
  };
}

function draftFromRole(role: RoleDefinition): RoleDraft {
  return {
    id: role.id,
    name: role.name,
    faction: role.faction,
    category: role.category,
    description: role.description,
    abilityDescription: role.abilityDescription,
    phase: role.phase,
    targetType: role.targetType,
    maxTargets: String(role.maxTargets || 2),
    charges: role.charges === null ? "" : String(role.charges),
    canSelfTarget: role.canSelfTarget,
    winCondition: role.winCondition,
    actionType: role.actionType ?? "none",
    actionScope: role.actionScope,
    actionPriority: String(role.actionPriority),
    enabled: role.enabled,
    votePower: String(role.votePower),
    revealActivatesVote: Boolean(role.revealActivatesVote),
    blockable: role.blockable,
    blocksVillageWin: role.blocksVillageWin,
    winEvaluator: role.winEvaluator,
    lynchWin: role.lynchWin,
    aliveOnly: role.targetRules.aliveOnly,
    deadOnly: Boolean(role.targetRules.deadOnly),
    werewolfOnly: Boolean(role.targetRules.werewolfOnly),
    otherFactionOnly: Boolean(role.targetRules.otherFactionOnly),
    investigationResult: role.investigationResult ?? "",
    notes: role.notes.join("\n"),
    reason: "",
  };
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function roleBody(draft: RoleDraft) {
  const charges = draft.charges.trim() === "" ? null : Number(draft.charges);
  const needsTarget = draft.actionType !== "none" && draft.actionType !== "vote_modifier";
  const targetType = needsTarget ? draft.targetType : "none";
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    faction: draft.faction,
    category: draft.category,
    description: draft.description.trim(),
    abilityDescription: draft.abilityDescription.trim(),
    phase: draft.phase,
    targetType,
    maxTargets: targetType === "multiple" ? Number(draft.maxTargets) : targetType === "none" ? 0 : 1,
    charges,
    cooldown: null,
    canSelfTarget: draft.canSelfTarget,
    winCondition: draft.winCondition.trim(),
    investigationResult: draft.investigationResult || null,
    actionType: draft.actionType === "none" ? null : draft.actionType,
    actionScope: draft.faction === "werewolf" && draft.actionType === "kill" ? draft.actionScope : "personal",
    actionPriority: Number(draft.actionPriority),
    enabled: draft.enabled,
    votePower: Number(draft.votePower),
    revealActivatesVote: draft.revealActivatesVote,
    blockable: draft.revealActivatesVote ? false : draft.blockable,
    blocksVillageWin: draft.blocksVillageWin,
    winEvaluator: draft.lynchWin ? "lynch" : draft.winEvaluator,
    lynchWin: draft.lynchWin,
    targetRules: {
      excludeSelf: !draft.canSelfTarget,
      aliveOnly: draft.aliveOnly,
      deadOnly: draft.deadOnly,
      werewolfOnly: draft.werewolfOnly,
      otherFactionOnly: draft.otherFactionOnly,
    },
    notes: draft.notes.split("\n"),
  };
}

function actionLabel(role: RoleDefinition) {
  if (!role.actionType) return "None";
  const name = ACTIONS.find((item) => item.id === role.actionType)?.label ?? role.actionType;
  return role.actionScope === "faction" ? `${name} · shared` : name;
}

export function RoleEditor({ admin }: { admin: AdminIdentity }) {
  const canEdit = can(admin.permissions, "roles.edit" satisfies Permission);
  const [roles, setRoles] = useState<RoleDefinition[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [idEdited, setIdEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<RoleDefinition | null>(null);

  useEffect(() => {
    let active = true;
    adminGet("role-definitions")
      .then((body) => {
        if (!active) return;
        setRoles((body.roles as RoleDefinition[]) ?? []);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setCreating(true);
    setIdEdited(false);
    setFormError("");
    setNotice("");
    setDraft(emptyDraft());
  }

  function openEdit(role: RoleDefinition) {
    setCreating(false);
    setIdEdited(true);
    setFormError("");
    setNotice("");
    setDraft(draftFromRole(role));
  }

  async function reload() {
    const body = await adminGet("role-definitions");
    setRoles((body.roles as RoleDefinition[]) ?? []);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setFormError("");
    try {
      await adminAct(creating ? "role.create" : "role.update", {
        id: draft.id.trim(),
        role: roleBody(draft),
        reason: draft.reason.trim(),
      });
      await reload();
      setDraft(null);
      setNotice(creating ? `${draft.name.trim()} was added.` : `${draft.name.trim()} was saved.`);
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save that role.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(reason: string) {
    if (!removeTarget) return;
    setBusy(true);
    setFormError("");
    try {
      await adminAct("role.delete", { id: removeTarget.id, reason });
      await reload();
      if (draft?.id === removeTarget.id) setDraft(null);
      setNotice(`${removeTarget.name} was removed.`);
      setRemoveTarget(null);
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not remove that role.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <EmptyState title={error} />;
  if (!roles) return <EmptyState title="Loading roles…" />;

  return (
    <div className="admin-stack">
      <Panel
        title="Role roster"
        actions={
          canEdit ? (
            <button className="admin-primary" type="button" onClick={openCreate}>
              Add role
            </button>
          ) : null
        }
      >
        <p className="admin-note">
          Add a role from the actions the night already understands, or remove one from the roster.
          Poison, conversion and resurrection stay unavailable. Finished matches keep the role name they were played with.
          {!canEdit ? " Your admin role can view this roster but not change it." : ""}
        </p>
        {notice ? <p className="admin-message">{notice}</p> : null}
      </Panel>

      {draft ? (
        <RoleForm
          draft={draft}
          creating={creating}
          idEdited={idEdited}
          busy={busy}
          error={formError}
          onIdEdited={() => setIdEdited(true)}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSubmit={save}
        />
      ) : null}

      {FACTION_ORDER.map((faction) => {
        const rows = roles.filter((role) => role.faction === faction);
        if (!rows.length) return null;
        return (
          <Panel key={faction} title={FACTION_NAME[faction]}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Phase</th>
                  <th>Action</th>
                  <th>Roster</th>
                  {canEdit ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <FactionBadge faction={profileFaction(role.faction)} /> {role.name}
                    </td>
                    <td>{PHASES.find((item) => item.id === role.phase)?.label ?? role.phase}</td>
                    <td>{actionLabel(role)}</td>
                    <td>{role.enabled ? "Shown" : "Hidden"}</td>
                    {canEdit ? (
                      <td className="admin-row-actions">
                        <button className="admin-link" type="button" onClick={() => openEdit(role)}>
                          Edit
                        </button>
                        <button className="admin-link-danger" type="button" onClick={() => setRemoveTarget(role)}>
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        );
      })}

      {removeTarget ? (
        <ConfirmModal
          title={`Remove ${removeTarget.name}`}
          body={`${removeTarget.name} leaves the roster. Players will no longer see it. This is written to the audit log.`}
          confirmLabel="Remove role"
          confirmWord={removeTarget.name}
          dangerous
          busy={busy}
          error={formError}
          onClose={() => {
            if (!busy) setRemoveTarget(null);
          }}
          onConfirm={({ reason }) => void remove(reason)}
        />
      ) : null}
    </div>
  );
}

function RoleForm({
  draft,
  creating,
  idEdited,
  busy,
  error,
  onIdEdited,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: RoleDraft;
  creating: boolean;
  idEdited: boolean;
  busy: boolean;
  error: string;
  onIdEdited: () => void;
  onChange: (next: RoleDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const needsTarget = draft.actionType !== "none" && draft.actionType !== "vote_modifier";
  const packKill = draft.faction === "werewolf" && draft.actionType === "kill";

  function update(patch: Partial<RoleDraft>) {
    onChange({ ...draft, ...patch });
  }

  function changeName(name: string) {
    const next: Partial<RoleDraft> = { name };
    if (creating && !idEdited) next.id = slug(name);
    update(next);
  }

  function changeFaction(faction: GameFaction) {
    const win = WIN_COPY[faction];
    update({
      faction,
      winCondition: win.text,
      winEvaluator: win.evaluator,
      blocksVillageWin: win.hostile,
      lynchWin: false,
      actionScope: faction === "werewolf" ? draft.actionScope : "personal",
    });
  }

  function changeAction(actionType: ActionType | "none") {
    const next: Partial<RoleDraft> = { actionType };
    if (actionType === "none" || actionType === "vote_modifier") {
      next.targetType = "none";
      if (actionType === "vote_modifier" && draft.phase !== "passive") next.phase = "passive";
    } else if (draft.targetType === "none") {
      next.targetType = "single";
    }
    if (actionType !== "kill") next.actionScope = "personal";
    if (draft.phase === "passive" && actionType !== "none" && actionType !== "vote_modifier") {
      next.phase = "night";
    }
    update(next);
  }

  return (
    <Panel title={creating ? "Add a role" : `Edit ${draft.name || "role"}`}>
      <form
        className="admin-fields"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Name
          <input value={draft.name} onChange={(event) => changeName(event.target.value)} maxLength={40} required />
        </label>
        <label>
          Id
          <input
            value={draft.id}
            onChange={(event) => {
              onIdEdited();
              update({ id: event.target.value.toLowerCase() });
            }}
            maxLength={40}
            required
            readOnly={!creating}
            spellCheck={false}
          />
        </label>
        <label>
          Faction
          <select value={draft.faction} onChange={(event) => changeFaction(event.target.value as GameFaction)}>
            {FACTION_ORDER.map((faction) => (
              <option key={faction} value={faction}>
                {FACTION_NAME[faction]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={draft.category} onChange={(event) => update({ category: event.target.value as RoleCategory })}>
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-span-2">
          Description
          <textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={2} maxLength={400} required />
        </label>
        <label className="admin-span-2">
          Ability
          <textarea value={draft.abilityDescription} onChange={(event) => update({ abilityDescription: event.target.value })} rows={2} maxLength={280} required />
        </label>
        <label className="admin-span-2">
          Win condition
          <textarea value={draft.winCondition} onChange={(event) => update({ winCondition: event.target.value })} rows={2} maxLength={280} required />
        </label>
        <label>
          Phase
          <select value={draft.phase} onChange={(event) => update({ phase: event.target.value as RolePhase })}>
            {PHASES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Action
          <select value={draft.actionType} onChange={(event) => changeAction(event.target.value as ActionType | "none")}>
            {ACTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {packKill ? (
          <label>
            Kill
            <select value={draft.actionScope} onChange={(event) => update({ actionScope: event.target.value as ActionScope })}>
              <option value="faction">Shared pack kill</option>
              <option value="personal">Personal kill</option>
            </select>
          </label>
        ) : null}
        {needsTarget ? (
          <label>
            Target
            <select
              value={draft.targetType}
              onChange={(event) => update({ targetType: event.target.value as TargetType })}
            >
              {TARGETS.filter((item) => item.id !== "none" || draft.actionType === "special").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {needsTarget && draft.targetType === "multiple" ? (
          <label>
            How many
            <input value={draft.maxTargets} inputMode="numeric" onChange={(event) => update({ maxTargets: event.target.value.replace(/\D/g, "").slice(0, 1) })} />
          </label>
        ) : null}
        <label>
          Charges
          <input
            value={draft.charges}
            inputMode="numeric"
            placeholder="Unlimited"
            onChange={(event) => update({ charges: event.target.value.replace(/\D/g, "").slice(0, 2) })}
          />
        </label>
        <label>
          Vote power
          <input value={draft.votePower} inputMode="numeric" onChange={(event) => update({ votePower: event.target.value.replace(/\D/g, "").slice(0, 1) })} />
        </label>
        <label className="admin-check admin-span-2">
          <input
            type="checkbox"
            checked={draft.revealActivatesVote}
            onChange={(event) => {
              if (!event.target.checked) {
                update({ revealActivatesVote: false });
                return;
              }
              update({
                revealActivatesVote: true,
                phase: "day",
                actionType: "special",
                targetType: "none",
                blockable: false,
                votePower: Number(draft.votePower) > 1 ? draft.votePower : "2",
                charges: draft.charges.trim() === "" ? "1" : draft.charges,
              });
            }}
          />
          <span>Reveal during the day before this vote counts</span>
        </label>
        <label>
          Priority
          <input value={draft.actionPriority} inputMode="numeric" onChange={(event) => update({ actionPriority: event.target.value.replace(/\D/g, "").slice(0, 3) })} />
        </label>
        <label>
          Personal win
          <select value={draft.winEvaluator} onChange={(event) => update({ winEvaluator: event.target.value as WinEvaluator })}>
            {WINS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Investigators see
          <select
            value={draft.investigationResult}
            onChange={(event) => update({ investigationResult: event.target.value as RoleDraft["investigationResult"] })}
          >
            <option value="">Their real faction</option>
            {FACTION_ORDER.map((faction) => (
              <option key={faction} value={faction}>
                {FACTION_NAME[faction]}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
          <span>Show on the roster</span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.blocksVillageWin} onChange={(event) => update({ blocksVillageWin: event.target.checked })} />
          <span>Village cannot win while this role is alive</span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.lynchWin} onChange={(event) => update({ lynchWin: event.target.checked, winEvaluator: event.target.checked ? "lynch" : draft.winEvaluator })} />
          <span>Wins if the village lynches them</span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.canSelfTarget} onChange={(event) => update({ canSelfTarget: event.target.checked })} />
          <span>Can choose themselves</span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.blockable} onChange={(event) => update({ blockable: event.target.checked })} />
          <span>A roleblock stops this action</span>
        </label>
        {needsTarget ? (
          <>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.aliveOnly}
                onChange={(event) => update({ aliveOnly: event.target.checked, deadOnly: event.target.checked ? false : draft.deadOnly })}
              />
              <span>Living targets only</span>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.deadOnly}
                onChange={(event) => update({ deadOnly: event.target.checked, aliveOnly: event.target.checked ? false : draft.aliveOnly })}
              />
              <span>Dead targets only</span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={draft.werewolfOnly} onChange={(event) => update({ werewolfOnly: event.target.checked })} />
              <span>Werewolves only</span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={draft.otherFactionOnly} onChange={(event) => update({ otherFactionOnly: event.target.checked })} />
              <span>Another faction only</span>
            </label>
          </>
        ) : null}
        <label className="admin-span-2">
          Notes
          <textarea value={draft.notes} onChange={(event) => update({ notes: event.target.value })} rows={3} placeholder="One note per line" />
        </label>
        <label className="admin-span-2">
          Reason for this change
          <textarea value={draft.reason} onChange={(event) => update({ reason: event.target.value })} rows={2} minLength={4} maxLength={500} required />
        </label>
        {error ? <p className="admin-message admin-span-2">{error}</p> : null}
        <div className="admin-form-actions admin-span-2">
          <button className="admin-primary" type="submit" disabled={busy || draft.reason.trim().length < 4}>
            {creating ? "Add role" : "Save role"}
          </button>
          <button className="admin-link" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}
