import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignRoles, viewFor } from "./assign";
import { ROLES_BY_ID, TEST_ROSTER } from "./catalog";
import { resolveDay, resolveNight } from "./resolve";
import { validateDayAction, validateNightAction } from "./validate";
import type { EnginePlayer, NightAction } from "./types";
import { evaluateWins, resolveVote } from "./wins";

function player(id: string, roleId: string, alive = true): EnginePlayer {
  return { id, name: id, roleId, alive, chargesLeft: ROLES_BY_ID[roleId]?.charges ?? null };
}

function act(
  id: string,
  actorId: string,
  type: NightAction["type"],
  targets: string[],
  scope: NightAction["scope"] = "personal",
): NightAction {
  return { id, actorId, type, scope, targets };
}

const table = [
  player("doc", "doctor"),
  player("wolf", "alpha-werewolf"),
  player("sk", "serial-killer"),
  player("town", "villager"),
  player("seer", "seer"),
  player("blocker", "roleblocker"),
  player("detective", "detective"),
  player("tracker", "tracker"),
  player("other", "villager"),
];

describe("night resolution", () => {
  it("protects against one werewolf kill", () => {
    const result = resolveNight(table, [
      act("kill", "wolf", "kill", ["town"], "faction"),
      act("save", "doc", "protect", ["town"]),
    ]);
    assert.equal(result.players.find((entry) => entry.id === "town")?.alive, true);
  });

  it("protects against one solo kill", () => {
    const result = resolveNight(table, [
      act("kill", "sk", "kill", ["town"]),
      act("save", "doc", "protect", ["town"]),
    ]);
    assert.equal(result.players.find((entry) => entry.id === "town")?.alive, true);
  });

  it("protects against a werewolf and a solo on the same night", () => {
    const result = resolveNight(table, [
      act("pack", "wolf", "kill", ["town"], "faction"),
      act("knife", "sk", "kill", ["town"]),
      act("save", "doc", "protect", ["town"]),
    ]);
    assert.equal(result.deaths.includes("town"), false);
    assert.equal(result.events.filter((entry) => entry.outcome === "protected").length, 2);
  });

  it("kills an unprotected player", () => {
    const result = resolveNight(table, [act("kill", "wolf", "kill", ["town"], "faction")]);
    assert.deepEqual(result.deaths, ["town"]);
  });

  it("stops a roleblocked killer", () => {
    const result = resolveNight(table, [
      act("stop", "blocker", "block", ["sk"]),
      act("knife", "sk", "kill", ["town"]),
    ]);
    assert.equal(result.players.find((entry) => entry.id === "town")?.alive, true);
  });

  it("gives a roleblocked investigator no result", () => {
    const result = resolveNight(table, [
      act("stop", "blocker", "block", ["seer"]),
      act("look", "seer", "investigate", ["wolf"]),
    ]);
    const intel = result.intel.find((entry) => entry.playerId === "seer");
    assert.equal(intel?.kind, "blocked");
    assert.equal(intel?.text.includes("werewolf"), false);
  });

  it("compares two players of the same faction", () => {
    const result = resolveNight(table, [act("pair", "detective", "compare", ["town", "other"])]);
    assert.equal(result.intel.find((entry) => entry.playerId === "detective")?.text, "SAME FACTION");
  });

  it("compares two players of different factions", () => {
    const result = resolveNight(table, [act("pair", "detective", "compare", ["town", "wolf"])]);
    assert.equal(result.intel.find((entry) => entry.playerId === "detective")?.text, "DIFFERENT FACTION");
  });

  it("reports unknown when a role hides its faction", () => {
    const roles = {
      ...ROLES_BY_ID,
      auditor: { ...ROLES_BY_ID.villager, id: "auditor", name: "Auditor", investigationResult: "unknown" as const },
    };
    const result = resolveNight(
      [player("seer", "seer"), player("quiet", "auditor")],
      [act("look", "seer", "investigate", ["quiet"])],
      { roles },
    );
    assert.equal(result.intel.find((entry) => entry.playerId === "seer")?.text, "unknown");
  });

  it("records the target a blocked player attempted", () => {
    const result = resolveNight(table, [
      act("stop", "blocker", "block", ["seer"]),
      act("look", "seer", "investigate", ["other"]),
      act("follow", "tracker", "track", ["seer"]),
    ]);
    assert.equal(result.intel.find((entry) => entry.playerId === "tracker")?.text, "other");
    assert.equal(result.intel.find((entry) => entry.playerId === "seer")?.kind, "blocked");
  });
});

describe("fool", () => {
  const players = [player("fool", "fool"), player("a", "villager"), player("b", "villager")];

  it("wins when the daytime vote eliminates them", () => {
    const vote = resolveVote(players, [
      { voterId: "a", targetId: "fool" },
      { voterId: "b", targetId: "fool" },
    ]);
    assert.equal(vote.eliminatedId, "fool");
    assert.equal(vote.wins[0]?.evaluator, "lynch");
    assert.deepEqual(vote.wins[0]?.playerIds, ["fool"]);
  });

  it("does not win when killed at night", () => {
    const night = resolveNight(
      [...players, player("sk", "serial-killer")],
      [act("knife", "sk", "kill", ["fool"])],
    );
    assert.deepEqual(night.deaths, ["fool"]);
    const wins = evaluateWins(night.players, { type: "night", playerId: "fool" });
    assert.equal(wins.some((win) => win.evaluator === "lynch"), false);
  });
});

describe("assignment", () => {
  const ids = Array.from({ length: 16 }, (_, index) => `p${index + 1}`);
  const assigned = assignRoles(ids, TEST_ROSTER, ROLES_BY_ID, () => 0);

  it("deals exactly one role to each of 16 players", () => {
    assert.equal(assigned.players.length, 16);
    assert.equal(new Set(assigned.players.map((player) => player.id)).size, 16);
    assert.deepEqual(
      assigned.players.map((player) => player.roleId).sort(),
      [...TEST_ROSTER].sort(),
    );
  });

  it("hides other roles from a player who is not on the pack", () => {
    const villager = assigned.players.find((player) => player.roleId === "villager");
    assert.ok(villager);
    const view = viewFor(assigned.players, villager.id);
    const hidden = JSON.stringify(view);
    assert.equal(view.teammates.length, 0);
    assert.equal(view.self.roleId, "villager");
    assert.equal(hidden.includes("serial-killer"), false);
    assert.equal(hidden.includes("fool"), false);
    assert.equal(hidden.includes("alpha-werewolf"), false);
  });

  it("shows werewolf teammates and nobody else", () => {
    const wolf = assigned.players.find((player) => player.roleId === "alpha-werewolf");
    assert.ok(wolf);
    const view = viewFor(assigned.players, wolf.id);
    const idsSeen = view.teammates.map((teammate) => teammate.roleId).sort();
    assert.deepEqual(idsSeen, ["guardian-werewolf", "roleblocker-werewolf", "seer-werewolf"]);
    assert.equal(JSON.stringify(view).includes("serial-killer"), false);
    assert.equal(JSON.stringify(view).includes("fool"), false);
  });
});

describe("mayor", () => {
  function seat(id: string, roleId = "villager"): EnginePlayer {
    return { id, name: id, roleId, alive: true, chargesLeft: roleId === "mayor" ? 1 : null };
  }

  const reveal = {
    id: "reveal",
    actorId: "mayor",
    type: "special" as const,
    scope: "personal" as const,
    targets: [] as string[],
  };

  it("counts as one vote until the daytime reveal", () => {
    const ballots = [
      { voterId: "mayor", targetId: "a" },
      { voterId: "b", targetId: "mayor" },
    ];
    const hidden = resolveVote([seat("mayor", "mayor"), seat("a"), seat("b")], ballots);
    assert.equal(hidden.eliminatedId, null);

    const shown = resolveVote(
      [seat("mayor", "mayor"), seat("a"), seat("b")].map((player) =>
        player.id === "mayor" ? { ...player, revealed: true } : player,
      ),
      ballots,
    );
    assert.equal(shown.eliminatedId, "a");
  });

  it("reveals during the day and cannot reveal at night", () => {
    const day = resolveDay([seat("mayor", "mayor"), seat("a")], [reveal], {
      day: 1,
      voteResolved: false,
    });
    assert.equal(day.players.find((player) => player.id === "mayor")?.revealed, true);
    assert.equal(day.announcements[0], "mayor reveals themself as the Mayor.");
    const night = validateNightAction(day.players, reveal);
    assert.equal(night.ok, false);
    const again = validateDayAction(day.players, reveal, { day: 1, voteResolved: false });
    assert.equal(again.ok, false);
  });
});
