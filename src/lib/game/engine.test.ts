import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignRoles, viewFor } from "./assign";
import { ROLES_BY_ID, TEST_ROSTER } from "./catalog";
import { resolveNight } from "./resolve";
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
  player("seer", "chain-analyst"),
  player("blocker", "roleblocker"),
  player("detective", "investigator"),
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
      act("look", "seer", "read_role", ["wolf"]),
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
      quiet: { ...ROLES_BY_ID.villager, id: "quiet", aura: "unknown" as const },
    };
    const result = resolveNight(
      [player("auditor", "auditor"), player("quiet", "quiet")],
      [act("look", "auditor", "read_aura", ["quiet"])],
      { roles },
    );
    assert.equal(result.intel.find((entry) => entry.playerId === "auditor")?.text, "UNKNOWN");
  });

  it("records the target a blocked player attempted", () => {
    const result = resolveNight(table, [
      act("stop", "blocker", "block", ["seer"]),
      act("look", "seer", "read_role", ["other"]),
      act("follow", "tracker", "track", ["seer"]),
    ]);
    assert.equal(result.intel.find((entry) => entry.playerId === "tracker")?.text, "other");
    assert.equal(result.intel.find((entry) => entry.playerId === "seer")?.kind, "blocked");
  });
});

describe("rugpuller", () => {
  const players = [player("fool", "rugpuller"), player("a", "villager"), player("b", "villager")];

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

  it("does not win from a day kill", () => {
    const dead = players.map((entry) => (entry.id === "fool" ? { ...entry, alive: false } : entry));
    const wins = evaluateWins(dead, { type: "day_kill", playerId: "fool" });
    assert.equal(wins.some((win) => win.evaluator === "lynch"), false);
  });
});

describe("investigations", () => {
  it("names the exact role for the Chain Analyst", () => {
    const result = resolveNight(table, [act("look", "seer", "read_role", ["doc"])]);
    assert.equal(result.intel.find((entry) => entry.playerId === "seer")?.text, "Doctor");
  });

  it("reads good, bad, and unknown auras from any faction", () => {
    const roles = {
      ...ROLES_BY_ID,
      "town-unknown": { ...ROLES_BY_ID.villager, id: "town-unknown", aura: "unknown" as const },
      "wolf-unknown": { ...ROLES_BY_ID["alpha-werewolf"], id: "wolf-unknown", aura: "unknown" as const },
      "solo-unknown": { ...ROLES_BY_ID["serial-killer"], id: "solo-unknown", aura: "unknown" as const },
    };
    const seats = [
      player("auditor", "auditor"),
      player("doc", "doctor"),
      player("killer", "serial-killer"),
      player("town", "town-unknown"),
      player("wolf", "wolf-unknown"),
      player("solo", "solo-unknown"),
    ];
    const read = (target: string) =>
      resolveNight(seats, [act("look", "auditor", "read_aura", [target])], { roles }).intel.find(
        (entry) => entry.playerId === "auditor",
      )?.text;
    assert.equal(read("doc"), "GOOD");
    assert.equal(read("killer"), "BAD");
    assert.equal(read("town"), "UNKNOWN");
    assert.equal(read("wolf"), "UNKNOWN");
    assert.equal(read("solo"), "UNKNOWN");
  });
});

describe("aegis", () => {
  const seats = () => [
    player("aegis", "aegis"),
    player("b", "villager"),
    player("c", "villager"),
    player("d", "villager"),
    player("sk", "serial-killer"),
    player("wolf", "alpha-werewolf"),
  ];
  const shield = (result: ReturnType<typeof resolveNight>) =>
    result.players.find((entry) => entry.id === "aegis")?.shieldsRemaining;
  const told = (result: ReturnType<typeof resolveNight>) =>
    result.intel.find((entry) => entry.playerId === "aegis")?.text ?? "";

  it("starts with two shields", () => {
    const night = resolveNight(seats(), [act("cover", "aegis", "protect", ["b"])]);
    assert.equal(shield(night), 2);
    assert.equal(night.deaths.length, 0);
  });

  it("absorbs the first attack on Aegis and leaves one shield", () => {
    const night = resolveNight(seats(), [
      act("cover", "aegis", "protect", ["b"]),
      act("knife", "sk", "kill", ["aegis"]),
    ]);
    assert.equal(night.deaths.includes("aegis"), false);
    assert.equal(night.deaths.includes("b"), false);
    assert.equal(shield(night), 1);
    assert.equal(told(night), "Your protection was struck. 1 shield remains.");
    assert.equal(told(night).includes("aegis"), false);
    assert.equal(told(night).includes("b"), false);
  });

  it("absorbs the first attack on the guarded player without naming the target", () => {
    const night = resolveNight(seats(), [
      act("cover", "aegis", "protect", ["b"]),
      act("knife", "sk", "kill", ["b"]),
    ]);
    assert.equal(night.deaths.includes("b"), false);
    assert.equal(night.deaths.includes("aegis"), false);
    assert.equal(shield(night), 1);
    assert.equal(told(night), "Your protection was struck. 1 shield remains.");
    assert.equal(JSON.stringify(night.intel).includes("b"), false);
    assert.equal(night.events.filter((entry) => entry.public).some((entry) => entry.message.includes("b")), false);
  });

  it("kills Aegis when the last shield meets an attack on Aegis", () => {
    const armed = seats().map((entry) => (entry.id === "aegis" ? { ...entry, shieldsRemaining: 1 } : entry));
    const night = resolveNight(armed, [
      act("cover", "aegis", "protect", ["d"]),
      act("knife", "sk", "kill", ["aegis"]),
    ]);
    assert.deepEqual(night.deaths, ["aegis"]);
    assert.equal(night.players.find((entry) => entry.id === "d")?.alive, true);
  });

  it("lets Aegis die in place of the guarded player", () => {
    const armed = seats().map((entry) => (entry.id === "aegis" ? { ...entry, shieldsRemaining: 1 } : entry));
    const night = resolveNight(armed, [
      act("cover", "aegis", "protect", ["c"]),
      act("knife", "sk", "kill", ["c"]),
    ]);
    assert.deepEqual(night.deaths, ["aegis"]);
    assert.equal(night.players.find((entry) => entry.id === "c")?.alive, true);
    assert.equal(night.events.some((entry) => entry.public && entry.message.includes("c")), false);
  });

  it("keeps the remaining shield across nights", () => {
    const first = resolveNight(seats(), [
      act("cover", "aegis", "protect", ["b"]),
      act("knife", "sk", "kill", ["b"]),
    ]);
    const quiet = resolveNight(first.players, [act("cover", "aegis", "protect", ["c"])]);
    assert.equal(shield(quiet), 1);
    assert.equal(quiet.deaths.length, 0);
    const later = resolveNight(quiet.players, [
      act("cover", "aegis", "protect", ["c"]),
      act("knife", "sk", "kill", ["c"]),
    ]);
    assert.deepEqual(later.deaths, ["aegis"]);
    assert.equal(later.players.find((entry) => entry.id === "c")?.alive, true);
  });

  it("ends the guard as soon as Aegis dies", () => {
    const armed = seats().map((entry) => (entry.id === "aegis" ? { ...entry, shieldsRemaining: 1 } : entry));
    const night = resolveNight(armed, [
      act("cover", "aegis", "protect", ["c"]),
      act("pack", "wolf", "kill", ["c"], "faction"),
      act("knife", "sk", "kill", ["c"]),
    ]);
    assert.equal(night.deaths.includes("aegis"), true);
    assert.equal(night.deaths.includes("c"), true);
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
    assert.equal(hidden.includes("rugpuller"), false);
    assert.equal(hidden.includes("alpha-werewolf"), false);
  });

  it("shows werewolf teammates and nobody else", () => {
    const wolf = assigned.players.find((player) => player.roleId === "alpha-werewolf");
    assert.ok(wolf);
    const view = viewFor(assigned.players, wolf.id);
    const idsSeen = view.teammates.map((teammate) => teammate.roleId).sort();
    assert.deepEqual(idsSeen, ["guardian-werewolf", "roleblocker-werewolf", "seer-werewolf"]);
    assert.equal(JSON.stringify(view).includes("serial-killer"), false);
    assert.equal(JSON.stringify(view).includes("rugpuller"), false);
  });
});

describe("governor", () => {
  function seat(id: string, roleId = "villager"): EnginePlayer {
    return { id, name: id, roleId, alive: true, chargesLeft: null };
  }

  it("counts the configured vote power without a reveal", () => {
    const ballots = [
      { voterId: "governor", targetId: "a" },
      { voterId: "b", targetId: "governor" },
    ];
    const vote = resolveVote([seat("governor", "governor"), seat("a"), seat("b")], ballots);
    assert.equal(vote.eliminatedId, "a");
  });
});
