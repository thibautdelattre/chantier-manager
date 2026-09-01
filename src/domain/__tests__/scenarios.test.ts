import { describe, expect, it } from "vitest";
import { addDependency, wouldCreateCycle, CycleError, dependenciesAffectedByDeletion } from "@/domain/graph";
import { computeReadiness, tasksUnlockedBy } from "@/domain/readiness";
import { canRunInParallel } from "@/domain/staffing";
import { isAssignableNow } from "@/domain/staffing";
import type { Member, TaskAssignment } from "@/domain/types";
import { makeTask, dep } from "./testHelpers";

describe("Scénario 1 — deux dépendances, l'une puis l'autre terminée", () => {
  it("C reste BLOCKED tant que A et B ne sont pas toutes les deux DONE", () => {
    const a = makeTask({ id: "A", title: "A" });
    const b = makeTask({ id: "B", title: "B" });
    const c = makeTask({ id: "C", title: "C" });
    const deps = [dep("C", "A"), dep("C", "B")];
    let tasks = [a, b, c];

    expect(computeReadiness(a, tasks, deps).readiness).toBe("READY");
    expect(computeReadiness(b, tasks, deps).readiness).toBe("READY");
    expect(computeReadiness(c, tasks, deps).readiness).toBe("BLOCKED");

    // A passe DONE
    tasks = tasks.map((t) => (t.id === "A" ? { ...t, status: "DONE" } : t));
    expect(computeReadiness(tasks[1]!, tasks, deps).readiness).toBe("READY"); // B
    expect(computeReadiness(tasks[2]!, tasks, deps).readiness).toBe("BLOCKED"); // C still blocked

    // B passe DONE
    tasks = tasks.map((t) => (t.id === "B" ? { ...t, status: "DONE" } : t));
    expect(computeReadiness(tasks[2]!, tasks, deps).readiness).toBe("READY"); // C now ready
  });
});

describe("Scénario 2 — chaîne linéaire A -> B -> C", () => {
  it("débloque B puis C au fur et à mesure", () => {
    const a = makeTask({ id: "A", title: "A" });
    const b = makeTask({ id: "B", title: "B" });
    const c = makeTask({ id: "C", title: "C" });
    const deps = [dep("B", "A"), dep("C", "B")];
    let tasks = [a, b, c];

    expect(computeReadiness(b, tasks, deps).readiness).toBe("BLOCKED");
    expect(computeReadiness(c, tasks, deps).readiness).toBe("BLOCKED");

    tasks = tasks.map((t) => (t.id === "A" ? { ...t, status: "DONE" } : t));
    const unlocked1 = tasksUnlockedBy("A", tasks, deps);
    expect(unlocked1.map((t) => t.id)).toEqual(["B"]);
    expect(computeReadiness(tasks[2]!, tasks, deps).readiness).toBe("BLOCKED"); // C still

    tasks = tasks.map((t) => (t.id === "B" ? { ...t, status: "DONE" } : t));
    const unlocked2 = tasksUnlockedBy("B", tasks, deps);
    expect(unlocked2.map((t) => t.id)).toEqual(["C"]);
  });
});

describe("Scénario 3 — refus des cycles", () => {
  it("refuse de faire dépendre B de A si A dépend déjà de B", () => {
    const deps = [dep("A", "B")]; // A depends on B
    expect(wouldCreateCycle("B", "A", deps)).toBe(true);
    expect(() => addDependency("B", "A", deps, "dep_x")).toThrow(CycleError);
  });

  it("accepte une dépendance qui ne crée pas de cycle", () => {
    const deps = [dep("A", "B")];
    expect(wouldCreateCycle("C", "A", deps)).toBe(false);
    expect(() => addDependency("C", "A", deps, "dep_y")).not.toThrow();
  });
});

describe("Scénario 4 — deux tâches en parallèle avec 3 travailleurs", () => {
  it("A (2 pers.) et B (1 pers.) peuvent tourner simultanément", () => {
    const a = makeTask({ id: "A", title: "A", requiredWorkers: 2 });
    const b = makeTask({ id: "B", title: "B", requiredWorkers: 1 });
    expect(canRunInParallel([a, b], 3)).toBe(true);
  });
});

describe("Scénario 5 — READY au sens dépendances mais pas assignable (ressources)", () => {
  it("C est READY mais ne peut pas démarrer faute de personnel libre", () => {
    const members: Member[] = [
      { id: "m1", projectId: "p", name: "Personne 1" },
      { id: "m2", projectId: "p", name: "Personne 2" },
      { id: "m3", projectId: "p", name: "Personne 3" },
    ];
    const a = makeTask({ id: "A", title: "A", requiredWorkers: 2, status: "IN_PROGRESS" });
    const b = makeTask({ id: "B", title: "B", requiredWorkers: 1, status: "IN_PROGRESS" });
    const c = makeTask({ id: "C", title: "C", requiredWorkers: 2, status: "TODO" });
    const tasks = [a, b, c];
    const assignments: TaskAssignment[] = [
      { id: "as1", taskId: "A", memberId: "m1", assignedAt: "" },
      { id: "as2", taskId: "A", memberId: "m2", assignedAt: "" },
      { id: "as3", taskId: "B", memberId: "m3", assignedAt: "" },
    ];

    const readiness = computeReadiness(c, tasks, []);
    expect(readiness.readiness).toBe("READY"); // no dependencies at all

    const staffing = isAssignableNow(c, members, tasks, assignments);
    expect(staffing.assignable).toBe(false);
    expect(staffing.availableCount).toBe(0);
    expect(staffing.required).toBe(2);
  });
});

describe("Scénario 6 — bloquée par un seul prérequis manquant, message précis", () => {
  it("indique précisément 'Bloquée par C'", () => {
    const a = makeTask({ id: "A", title: "A", status: "DONE" });
    const b = makeTask({ id: "B", title: "B", status: "DONE" });
    const c = makeTask({ id: "C", title: "C", status: "TODO" });
    const target = makeTask({ id: "T", title: "Cible" });
    const tasks = [a, b, c, target];
    const deps = [dep("T", "A"), dep("T", "B"), dep("T", "C")];

    const result = computeReadiness(target, tasks, deps);
    expect(result.readiness).toBe("BLOCKED");
    expect(result.missingCount).toBe(1);
    const stillMissing = result.blockedBy.filter((b) => !b.done);
    expect(stillMissing.map((b) => b.taskId)).toEqual(["C"]);
  });
});

describe("Scénario 7 — suppression d'une tâche utilisée comme dépendance", () => {
  it("expose les dépendances affectées pour un nettoyage explicite, ne laisse rien d'orphelin en silence", () => {
    const deps = [dep("T", "X"), dep("Y", "T")];
    const affected = dependenciesAffectedByDeletion("T", deps);
    expect(affected.asDependent).toHaveLength(1); // T depends on X
    expect(affected.asDependency).toHaveLength(1); // Y depends on T
  });
});
