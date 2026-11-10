/**
 * Night resolution. One function, one order, no role logic in the interface.
 *
 * Default order (pass a different list to change it):
 * 1. Blocks. Every living player's block lands. Blocks do not cancel each other.
 * 2. Protections. A blocked protector does nothing. A landed protection
 *    covers the target for the whole night.
 * 3. Investigations and tracking. A blocked investigator gets no result.
 *    A tracker still reads the target the player selected, even if that
 *    action is blocked and will not resolve.
 * 4. Kills. The pack contributes one faction kill. Solo and other personal
 *    kills are separate. Protection stops every normal kill on that player;
 *    more attackers do not use it up.
 * 5. Special effects, such as the Medium's dead channel.
 *
 * An attempt is the action a player submitted. Resolution is what survives
 * the stages above. Those stay separate so tracking can see a failed attempt.
 *
 * Reserved later: convert, poison, burn, redirect, silence, resurrect,
 * immunity, delayed_kill. They are not stages yet, so they cannot slip
 * through this function.
 */
import { apparentFaction, DEFAULT_RESOLUTION_ORDER, ROLES_BY_ID } from "./catalog";
import type {
  EnginePlayer,
  NightAction,
  NightEvent,
  PrivateIntel,
  ResolutionStage,
  RoleDefinition,
} from "./types";
import { validateDayAction, validateNightAction } from "./validate";

export type NightResult = {
  players: EnginePlayer[];
  events: NightEvent[];
  intel: PrivateIntel[];
  deaths: string[];
};

const STAGE_FOR = {
  block: "block",
  protect: "protect",
  investigate: "investigate",
  compare: "investigate",
  track: "investigate",
  kill: "kill",
  special: "special",
  vote_modifier: "special",
} as const;

export function resolveNight(
  players: EnginePlayer[],
  actions: NightAction[],
  options?: {
    order?: ResolutionStage[];
    roles?: Record<string, RoleDefinition>;
  },
): NightResult {
  const roles = options?.roles ?? ROLES_BY_ID;
  const order = options?.order ?? DEFAULT_RESOLUTION_ORDER;
  const events: NightEvent[] = [];
  const intel: PrivateIntel[] = [];
  const accepted: NightAction[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const key = `${action.actorId}:${action.scope}`;
    if (seen.has(key)) {
      events.push(event(action, "invalid", false, "A player already submitted that kind of action."));
      continue;
    }
    const check = validateNightAction(players, action, roles);
    if (!check.ok) {
      events.push(event(action, "invalid", false, check.reason));
      continue;
    }
    seen.add(key);
    accepted.push(action);
  }

  const blocked = new Set<string>();
  if (order.includes("block")) {
    for (const action of inStage(accepted, "block")) {
      if (!isAlive(players, action.actorId)) continue;
      for (const targetId of action.targets) blocked.add(targetId);
      events.push(event(action, "resolved", false, "An active ability was stopped for the night."));
    }
  }

  const protectedIds = new Set<string>();
  if (order.includes("protect")) {
    for (const action of inStage(accepted, "protect")) {
      if (stopped(players, blocked, action, roles)) {
        events.push(event(action, "blocked", false, "The protection did not resolve."));
        continue;
      }
      protectedIds.add(action.targets[0]);
      events.push(event(action, "resolved", false, "A player is covered against normal kills tonight."));
    }
  }

  if (order.includes("investigate")) {
    for (const action of inStage(accepted, "investigate")) {
      if (stopped(players, blocked, action, roles)) {
        intel.push({ playerId: action.actorId, kind: "blocked", text: "Your action was blocked." });
        events.push(event(action, "blocked", false, "The investigation did not resolve."));
        continue;
      }
      readAction(action, accepted, players, roles, intel, events);
    }
  }

  const deaths = new Set<string>();
  if (order.includes("kill")) {
    const factionKills = accepted.filter((action) => action.type === "kill" && action.scope === "faction");
    const chosen = pickFactionKill(factionKills, players, blocked, roles);
    for (const action of factionKills) {
      if (action !== chosen) {
        events.push(event(action, "no_effect", false, "The pack uses a single kill."));
      }
    }
    const kills = [
      ...(chosen ? [chosen] : []),
      ...accepted.filter((action) => action.type === "kill" && action.scope === "personal"),
    ];
    for (const action of kills) {
      if (stopped(players, blocked, action, roles)) {
        events.push(event(action, "blocked", false, "The kill did not resolve."));
        continue;
      }
      const targetId = action.targets[0];
      if (protectedIds.has(targetId)) {
        events.push(event(action, "protected", true, `${nameOf(players, targetId)} survived the night.`));
        continue;
      }
      if (!isAlive(players, targetId) || deaths.has(targetId)) {
        events.push(event(action, "no_effect", false, "The target was already gone."));
        continue;
      }
      deaths.add(targetId);
      events.push(event(action, "resolved", true, `${nameOf(players, targetId)} was killed.`));
    }
  }

  if (order.includes("special")) {
    for (const action of inStage(accepted, "special")) {
      if (stopped(players, blocked, action, roles)) {
        intel.push({ playerId: action.actorId, kind: "blocked", text: "Your action was blocked." });
        events.push(event(action, "blocked", false, "The night ritual did not resolve."));
        continue;
      }
      if (roles[players.find((player) => player.id === action.actorId)?.roleId ?? ""]?.id === "medium") {
        const dead = players.filter((player) => !player.alive).map((player) => player.name);
        intel.push({
          playerId: action.actorId,
          kind: "note",
          text: dead.length ? `The dead answer: ${dead.join(", ")}.` : "The dead are silent.",
        });
        events.push(event(action, "resolved", false, "A channel with the dead was opened."));
      }
    }
  }

  const next = players.map((player) =>
    deaths.has(player.id) ? { ...player, alive: false } : player,
  );
  return { players: next, events, intel, deaths: [...deaths] };
}

export function resolveDay(
  players: EnginePlayer[],
  actions: NightAction[],
  context: { day: number; voteResolved: boolean },
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): { players: EnginePlayer[]; intel: PrivateIntel[]; deaths: string[] } {
  const intel: PrivateIntel[] = [];
  const deaths: string[] = [];
  const next = players.map((player) => ({ ...player }));

  for (const action of actions) {
    const check = validateDayAction(next, action, context, roles);
    if (!check.ok) continue;
    const actor = next.find((player) => player.id === action.actorId);
    const role = actor ? roles[actor.roleId] : undefined;
    if (!actor || !role) continue;
    if (role.charges !== null) {
      actor.chargesLeft = (actor.chargesLeft ?? 0) - 1;
    }
    if (role.id === "vigilante" && action.choice === "reveal") {
      const target = next.find((player) => player.id === action.targets[0]);
      const targetRole = target ? roles[target.roleId] : undefined;
      intel.push({
        playerId: actor.id,
        kind: "reveal",
        text: targetRole ? `${target!.name} is the ${targetRole.name}.` : "Nothing answers.",
      });
    }
    if (role.id === "vigilante" && action.choice === "kill") {
      const target = next.find((player) => player.id === action.targets[0]);
      if (target?.alive) {
        target.alive = false;
        deaths.push(target.id);
      }
    }
  }

  return { players: next, intel, deaths };
}

function readAction(
  action: NightAction,
  accepted: NightAction[],
  players: EnginePlayer[],
  roles: Record<string, RoleDefinition>,
  intel: PrivateIntel[],
  events: NightEvent[],
) {
  const target = (id: string) => players.find((player) => player.id === id);
  if (action.type === "investigate") {
    const player = target(action.targets[0]);
    const role = player ? roles[player.roleId] : undefined;
    const actorRole = roles[players.find((entry) => entry.id === action.actorId)?.roleId ?? ""];
    const faction = role ? apparentFaction(role) : "village";
    const text =
      actorRole?.id === "seer-werewolf" && role
        ? `${faction}, ${role.category}`
        : faction;
    intel.push({ playerId: action.actorId, kind: "faction", text });
  } else if (action.type === "compare") {
    const first = target(action.targets[0]);
    const second = target(action.targets[1]);
    const same =
      first &&
      second &&
      apparentFaction(roles[first.roleId]) === apparentFaction(roles[second.roleId]);
    intel.push({
      playerId: action.actorId,
      kind: "comparison",
      text: same ? "SAME FACTION" : "DIFFERENT FACTION",
    });
  } else if (action.type === "track") {
    const attempts = accepted.filter((entry) => entry.actorId === action.targets[0]);
    const names = attempts.flatMap((entry) => entry.targets.map((id) => nameOf(players, id)));
    intel.push({
      playerId: action.actorId,
      kind: "track",
      text: names.length ? names.join(", ") : "They chose no one.",
    });
  }
  events.push(event(action, "resolved", false, "A private result was delivered."));
}

function pickFactionKill(
  actions: NightAction[],
  players: EnginePlayer[],
  blocked: Set<string>,
  roles: Record<string, RoleDefinition>,
) {
  const ready = actions.filter((action) => !stopped(players, blocked, action, roles));
  return (
    ready.find((action) => roles[players.find((player) => player.id === action.actorId)?.roleId ?? ""]?.id === "alpha-werewolf") ??
    ready.sort((a, b) => a.actorId.localeCompare(b.actorId))[0] ??
    null
  );
}

function stopped(
  players: EnginePlayer[],
  blocked: Set<string>,
  action: NightAction,
  roles: Record<string, RoleDefinition>,
) {
  const actor = players.find((player) => player.id === action.actorId);
  const role = actor ? roles[actor.roleId] : undefined;
  if (!actor?.alive) return true;
  if (!role?.blockable) return false;
  return blocked.has(actor.id);
}

function inStage(actions: NightAction[], stage: ResolutionStage) {
  return actions
    .filter((action) => STAGE_FOR[action.type] === stage)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function isAlive(players: EnginePlayer[], playerId: string) {
  return players.some((player) => player.id === playerId && player.alive);
}

function nameOf(players: EnginePlayer[], playerId: string) {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}

function event(
  action: NightAction,
  outcome: NightEvent["outcome"],
  isPublic: boolean,
  message: string,
): NightEvent {
  return {
    actionId: action.id,
    actorId: action.actorId,
    targetIds: action.targets,
    outcome,
    public: isPublic,
    message,
  };
}
