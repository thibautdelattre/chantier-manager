import { describe, expect, it } from "vitest";
import { addDependency, topologicalOrder, wouldCreateCycle } from "@/domain/graph";
import { makeTask, dep } from "./testHelpers";

describe("wouldCreateCycle", () => {
  it("détecte un cycle indirect A -> B -> C -> A", () => {
    const deps = [dep("A", "B"), dep("B", "C")]; // A depends on B, B depends on C
    // proposer C dépend de A fermerait le cycle
    expect(wouldCreateCycle("C", "A", deps)).toBe(true);
  });

  it("une auto-dépendance est toujours un cycle", () => {
    expect(wouldCreateCycle("A", "A", [])).toBe(true);
  });

  it("n'affecte pas un graphe indépendant", () => {
    const deps = [dep("A", "B")];
    expect(wouldCreateCycle("X", "Y", deps)).toBe(false);
  });
});

describe("addDependency", () => {
  it("est idempotent si la dépendance existe déjà", () => {
    const deps = [dep("A", "B")];
    const result = addDependency("A", "B", deps, "new_id");
    expect(result).toHaveLength(1);
  });
});

describe("topologicalOrder", () => {
  it("place toujours une dépendance avant celle qui en dépend", () => {
    const a = makeTask({ id: "A", title: "A" });
    const b = makeTask({ id: "B", title: "B" });
    const c = makeTask({ id: "C", title: "C" });
    const deps = [dep("C", "A"), dep("C", "B"), dep("B", "A")];
    const order = topologicalOrder([a, b, c], deps);
    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
  });
});
