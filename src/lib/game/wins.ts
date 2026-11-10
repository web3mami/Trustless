import { WIN_RULES } from "./catalog";
import { ROLES_BY_ID } from "./catalog";
import type { EnginePlayer, RoleDefinition, Win } from "./types";

/**
 * Win checks live here, not in the interface.
 * Fool is immediate and only fires for a daytime Village vote.
 * A night kill or a Vigilante shot never counts as that vote.
 */
export function evaluateWins(
  players: EnginePlayer[],
  cause: { type: "lynch" | "night" | "day_kill" | "none"; playerId?: string } = { type: "none" },
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): Win[] {
  if (cause.type === "lynch" && cause.playerId) {
    const eliminated = players.find((player) => player.id === cause.playerId);
    const role = eliminated ? roles[eliminated.roleId] : undefined;
    if (role?.lynchWin) {
      return [
        {
          evaluator: "lynch",
          faction: role.faction,
          playerIds: [eliminated!.id],
          reason: `${role.name} wins by daytime vote.`,
        },
      ];
    }
  }

  const wins: Win[] = [];
  const living = players.filter((player) => player.alive);
  const wolves = living.filter((player) => roles[player.roleId]?.faction === "werewolf");

  if (WIN_RULES.werewolf === "parity_with_others" && wolves.length > 0 && wolves.length >= living.length - wolves.length) {
    wins.push({
      evaluator: "werewolf",
      faction: "werewolf",
      playerIds: wolves.map((player) => player.id),
      reason: "The pack is at least as large as the remaining table.",
    });
  }

  for (const player of living) {
    const role = roles[player.roleId];
    if (role?.winEvaluator === "last_alive" && living.length === 1) {
      wins.push({
        evaluator: "last_alive",
        faction: role.faction,
        playerIds: [player.id],
        reason: `${role.name} is the last living player.`,
      });
    }
  }

  const hostiles = living.filter((player) => roles[player.roleId]?.blocksVillageWin);
  if (hostiles.length === 0 && living.some((player) => roles[player.roleId]?.winEvaluator === "village")) {
    wins.push({
      evaluator: "village",
      faction: "village",
      playerIds: living
        .filter((player) => roles[player.roleId]?.winEvaluator === "village")
        .map((player) => player.id),
      reason: "No hostile threat is left alive.",
    });
  }

  return wins;
}

export function resolveVote(
  players: EnginePlayer[],
  ballots: { voterId: string; targetId: string }[],
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): { eliminatedId: string | null; wins: Win[] } {
  const weight = new Map<string, number>();
  for (const ballot of ballots) {
    const voter = players.find((player) => player.id === ballot.voterId);
    const target = players.find((player) => player.id === ballot.targetId);
    if (!voter?.alive || !target?.alive || voter.id === target.id) continue;
    const role = roles[voter.roleId];
    const power = !role || (role.revealActivatesVote && !voter.revealed) ? 1 : role.votePower;
    weight.set(target.id, (weight.get(target.id) ?? 0) + power);
  }

  let eliminatedId: string | null = null;
  let best = 0;
  let tied = false;
  for (const [playerId, votes] of weight) {
    if (votes > best) {
      best = votes;
      eliminatedId = playerId;
      tied = false;
    } else if (votes === best) {
      tied = true;
    }
  }
  if (tied || best === 0) eliminatedId = null;

  const next = players.map((player) =>
    player.id === eliminatedId ? { ...player, alive: false } : player,
  );
  return {
    eliminatedId,
    wins: evaluateWins(next, { type: "lynch", playerId: eliminatedId ?? undefined }, roles),
  };
}
