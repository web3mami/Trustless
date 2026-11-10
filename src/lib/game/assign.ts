import { ROLES_BY_ID } from "./catalog";
import type { EnginePlayer, RoleDefinition } from "./types";

export type Assignment = {
  players: EnginePlayer[];
};

export type PlayerView = {
  self: {
    playerId: string;
    roleId: string;
    roleName: string;
    faction: RoleDefinition["faction"];
    abilityDescription: string;
    winCondition: string;
  };
  teammates: { playerId: string; roleId: string; roleName: string }[];
  aliveIds: string[];
};

export function assignRoles(
  playerIds: string[],
  roster: string[] ,
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
  random: () => number = cryptoRandom,
): Assignment {
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Duplicate player.");
  }
  if (playerIds.length !== roster.length) {
    throw new Error("The roster must fill every seat.");
  }
  for (const roleId of roster) {
    const role = roles[roleId];
    if (!role?.enabled) throw new Error(`Disabled role: ${roleId}`);
  }

  const dealt = shuffle(roster, random);
  return {
    players: playerIds.map((id, index) => {
      const role = roles[dealt[index]];
      return {
        id,
        name: id,
        roleId: role.id,
        alive: true,
        chargesLeft: role.charges,
      };
    }),
  };
}

/**
 * What one client is allowed to know.
 * Werewolves see living pack-mates. Nobody else receives a hidden role.
 */
export function viewFor(
  players: EnginePlayer[],
  viewerId: string,
  roles: Record<string, RoleDefinition> = ROLES_BY_ID,
): PlayerView {
  const viewer = players.find((player) => player.id === viewerId);
  if (!viewer) throw new Error("Unknown player.");
  const role = roles[viewer.roleId];
  const teammates =
    role.faction === "werewolf"
      ? players
          .filter((player) => player.id !== viewer.id && roles[player.roleId]?.faction === "werewolf")
          .map((player) => ({
            playerId: player.id,
            roleId: player.roleId,
            roleName: roles[player.roleId].name,
          }))
      : [];

  return {
    self: {
      playerId: viewer.id,
      roleId: role.id,
      roleName: role.name,
      faction: role.faction,
      abilityDescription: role.abilityDescription,
      winCondition: role.winCondition,
    },
    teammates,
    aliveIds: players.filter((player) => player.alive).map((player) => player.id),
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function cryptoRandom() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}
