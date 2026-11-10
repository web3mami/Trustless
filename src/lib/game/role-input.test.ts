import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROLES } from "./catalog";
import { parseRoleInput } from "./role-input";

describe("role input", () => {
  it("accepts every built-in role", () => {
    for (const role of ROLES) {
      const parsed = parseRoleInput(role);
      assert.equal(typeof parsed, "object", `${role.id}: ${parsed}`);
      if (typeof parsed === "object") {
        assert.equal(parsed.id, role.id);
        const again = parseRoleInput(parsed);
        assert.equal(typeof again, "object", `${role.id} again: ${again}`);
      }
    }
  });

  it("rejects a reserved action", () => {
    const sample = { ...ROLES[0], actionType: "poison", phase: "night", targetType: "single" };
    assert.match(String(parseRoleInput(sample)), /reserved/i);
  });

  it("rejects a shared action that is not the pack kill", () => {
    const doctor = ROLES.find((role) => role.id === "doctor");
    assert.match(String(parseRoleInput({ ...doctor, actionScope: "faction" })), /Werewolf kill/);
  });

  it("accepts a new personal role", () => {
    const parsed = parseRoleInput({
      id: "night-guard",
      name: "Night Guard",
      faction: "village",
      category: "protective",
      description: "Stands in the lane and keeps one neighbor breathing until dawn.",
      abilityDescription: "Protect one other player for the night.",
      phase: "night",
      targetType: "single",
      maxTargets: 1,
      charges: null,
      cooldown: null,
      canSelfTarget: false,
      winCondition: "Win when every living hostile threat is gone.",
      actionType: "protect",
      actionScope: "personal",
      actionPriority: 10,
      enabled: true,
      votePower: 1,
      blockable: true,
      blocksVillageWin: false,
      winEvaluator: "village",
      lynchWin: false,
      targetRules: { excludeSelf: true, aliveOnly: true },
      notes: ["A roleblock stops the watch."],
    });
    assert.equal(typeof parsed, "object");
    if (typeof parsed === "object") {
      assert.equal(parsed.id, "night-guard");
      assert.equal(parsed.actionType, "protect");
      assert.equal(parsed.targetRules.excludeSelf, true);
    }
  });
});
