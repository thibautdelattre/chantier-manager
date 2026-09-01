import { describe, expect, it } from "vitest";
import { computeCriticalPath } from "@/domain/criticalPath";
import { estimateResourcePlan } from "@/domain/planning";
import { makeTask, dep } from "./testHelpers";

describe("computeCriticalPath", () => {
  it("choisit le chemin le plus long en durée, pas le plus court en nombre d'étapes", () => {
    // A -> C (short path), A -> B -> C (long path due to B's duration)
    const a = makeTask({ id: "A", title: "A", estimatedDurationHours: 1 });
    const b = makeTask({ id: "B", title: "B", estimatedDurationHours: 10 });
    const c = makeTask({ id: "C", title: "C", estimatedDurationHours: 1 });
    const deps = [dep("B", "A"), dep("C", "A"), dep("C", "B")];
    const result = computeCriticalPath([a, b, c], deps);
    expect(result.path).toEqual(["A", "B", "C"]);
    expect(result.totalDurationHours).toBe(12);
  });

  it("ignore totalement les contraintes de personnel", () => {
    const a = makeTask({ id: "A", title: "A", estimatedDurationHours: 5, requiredWorkers: 99 });
    const result = computeCriticalPath([a], []);
    expect(result.totalDurationHours).toBe(5);
  });
});

describe("estimateResourcePlan", () => {
  it("est toujours marqué comme estimation, jamais comme optimal", () => {
    const a = makeTask({ id: "A", title: "A", estimatedDurationHours: 2, requiredWorkers: 1 });
    const result = estimateResourcePlan([a], [], 3);
    expect(result.isEstimateOnly).toBe(true);
  });

  it("planifie deux tâches indépendantes en parallèle quand les ressources le permettent", () => {
    const a = makeTask({ id: "A", title: "A", estimatedDurationHours: 3, requiredWorkers: 1 });
    const b = makeTask({ id: "B", title: "B", estimatedDurationHours: 4, requiredWorkers: 1 });
    const result = estimateResourcePlan([a, b], [], 3);
    const stepA = result.steps.find((s) => s.taskId === "A");
    const stepB = result.steps.find((s) => s.taskId === "B");
    expect(stepA?.startHour).toBe(0);
    expect(stepB?.startHour).toBe(0);
    expect(result.totalDurationHours).toBe(4); // bounded by the longer of the two
  });

  it("respecte la contrainte de personnel: une tâche à 2 pers. attend si besoin", () => {
    const a = makeTask({ id: "A", title: "A", estimatedDurationHours: 2, requiredWorkers: 2 });
    const b = makeTask({ id: "B", title: "B", estimatedDurationHours: 2, requiredWorkers: 2 });
    // teamSize = 3: A and B together need 4, cannot run in parallel
    const result = estimateResourcePlan([a, b], [], 3);
    const stepA = result.steps.find((s) => s.taskId === "A");
    const stepB = result.steps.find((s) => s.taskId === "B");
    expect(stepA && stepB).toBeTruthy();
    // They cannot both start at hour 0 since 2+2 > 3
    const bothAtZero = stepA!.startHour === 0 && stepB!.startHour === 0;
    expect(bothAtZero).toBe(false);
  });
});
