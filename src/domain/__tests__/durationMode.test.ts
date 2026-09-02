import { describe, expect, it } from "vitest";
import { taskTotalHours } from "@/domain/types";
import { computeCriticalPath } from "@/domain/criticalPath";
import { makeTask, dep } from "./testHelpers";

describe("taskTotalHours", () => {
  it("FORFAIT: la durée totale est estimatedDurationHours tel quel", () => {
    const t = makeTask({ id: "A", title: "A", durationMode: "FORFAIT", estimatedDurationHours: 18 });
    expect(taskTotalHours(t)).toBe(18);
  });

  it("PER_UNIT: la durée totale est estimatedDurationHours × unitCount", () => {
    const t = makeTask({
      id: "A",
      title: "A",
      durationMode: "PER_UNIT",
      estimatedDurationHours: 0.5,
      unitCount: 6,
    });
    expect(taskTotalHours(t)).toBe(3);
  });

  it("PER_UNIT sans unitCount renseigné vaut 0", () => {
    const t = makeTask({
      id: "A",
      title: "A",
      durationMode: "PER_UNIT",
      estimatedDurationHours: 0.5,
      unitCount: null,
    });
    expect(taskTotalHours(t)).toBe(0);
  });

  it("le chemin critique utilise bien la durée totale PER_UNIT, pas le taux unitaire", () => {
    const a = makeTask({ id: "A", title: "A", durationMode: "FORFAIT", estimatedDurationHours: 1 });
    const b = makeTask({
      id: "B",
      title: "B",
      durationMode: "PER_UNIT",
      estimatedDurationHours: 0.5,
      unitCount: 8, // 4h au total, pas 0.5h
    });
    const deps = [dep("B", "A")];
    const result = computeCriticalPath([a, b], deps);
    expect(result.totalDurationHours).toBe(5); // 1h + (0.5*8)h
  });
});
