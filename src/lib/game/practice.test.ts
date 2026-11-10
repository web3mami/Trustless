import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advancePracticePhase,
  createPracticeMatch,
  submitPracticeAction,
} from "./practice";

const NAMES = [
  "You",
  "Mara",
  "Ivo",
  "Sable",
  "Quinn",
  "Ren",
  "Hester",
  "Jules",
  "Anouk",
  "Beck",
  "Noor",
  "Cass",
  "Leif",
  "Willa",
  "Omar",
  "Petra",
];

function table() {
  return createPracticeMatch(NAMES);
}

describe("practice targeting", () => {
  it("compares factions without naming them", () => {
    const match = table();
    const same = submitPracticeAction(match, "ability", ["2", "3"]);
    assert.equal(same.ok, true);
    if (!same.ok) return;
    assert.equal(same.view.result?.kind, "compare");
    if (same.view.result?.kind === "compare") {
      assert.equal(same.view.result.same, true);
      assert.equal(same.view.result.leftName, "Mara");
      assert.equal(JSON.stringify(same.view.result).includes("village"), false);
      assert.equal(JSON.stringify(same.view.result).includes("Doctor"), false);
    }

    const next = table();
    const different = submitPracticeAction(next, "ability", ["2", "12"]);
    assert.equal(different.ok, true);
    if (different.ok && different.view.result?.kind === "compare") {
      assert.equal(different.view.result.same, false);
    }
  });

  it("rejects a second night action and a duplicate target", () => {
    const match = table();
    assert.equal(submitPracticeAction(match, "ability", ["2", "2"]).ok, false);
    const first = submitPracticeAction(match, "ability", ["2", "3"]);
    assert.equal(first.ok, true);
    const again = submitPracticeAction(match, "ability", ["4", "5"]);
    assert.equal(again.ok, false);
  });

  it("names the exact role for the Chain Analyst", () => {
    const match = table();
    match.players[0].roleId = "chain-analyst";
    const result = submitPracticeAction(match, "ability", ["5"]);
    assert.equal(result.ok, true);
    if (result.ok && result.view.result?.kind === "role") {
      assert.equal(result.view.result.roleName, "Aegis");
      assert.equal(result.view.result.faction, "Village");
      assert.equal(result.view.result.category, "Protective");
    }
  });

  it("returns only an aura, including unknown on any side", () => {
    const match = table();
    match.players[0].roleId = "auditor";
    const unknown = submitPracticeAction(match, "ability", ["16"]);
    assert.equal(unknown.ok, true);
    if (unknown.ok) {
      assert.equal(unknown.view.result?.kind, "aura");
      if (unknown.view.result?.kind === "aura") assert.equal(unknown.view.result.aura, "UNKNOWN");
      assert.equal(JSON.stringify(unknown.view.result).includes("Rugpuller"), false);
    }

    const again = table();
    again.players[0].roleId = "auditor";
    const good = submitPracticeAction(again, "ability", ["3"]);
    const badTable = table();
    badTable.players[0].roleId = "auditor";
    const bad = submitPracticeAction(badTable, "ability", ["12"]);
    if (good.ok && good.view.result?.kind === "aura") assert.equal(good.view.result.aura, "GOOD");
    if (bad.ok && bad.view.result?.kind === "aura") assert.equal(bad.view.result.aura, "BAD");
  });

  it("keeps the Werewolf Seer result private and separate from an exact role", () => {
    const match = table();
    match.players[0].roleId = "seer-werewolf";
    const result = submitPracticeAction(match, "ability", ["3"]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.view.result?.kind, "note");
      if (result.view.result?.kind === "note") {
        assert.match(result.view.result.text, /village/i);
        assert.equal(result.view.result.text.includes("Doctor"), false);
      }
    }
  });

  it("rejects a forbidden self target, a dead player, and a night action by day", () => {
    const match = table();
    match.players[0].roleId = "doctor";
    assert.equal(submitPracticeAction(match, "ability", ["1"]).ok, false);
    match.players[2].alive = false;
    assert.equal(submitPracticeAction(match, "ability", ["3"]).ok, false);
    advancePracticePhase(match);
    assert.equal(submitPracticeAction(match, "ability", ["2"]).ok, false);
    const vote = submitPracticeAction(match, "vote", ["2"]);
    assert.equal(vote.ok, true);
    if (vote.ok && vote.view.result?.kind === "vote") assert.equal(vote.view.result.targetName, "Mara");
    assert.equal(submitPracticeAction(match, "vote", ["1"]).ok, false);
  });

  it("submits a protection without revealing the target's role", () => {
    const match = table();
    match.players[0].roleId = "doctor";
    const result = submitPracticeAction(match, "ability", ["2"]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.view.result?.kind, "submitted");
      assert.equal(JSON.stringify(result.view.result).includes("Chain Analyst"), false);
    }
  });
});
