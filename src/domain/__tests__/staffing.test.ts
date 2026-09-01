import { describe, expect, it } from "vitest";
import {
  availableMembers,
  computeStaffingState,
  validateAssignment,
  AssignmentError,
} from "@/domain/staffing";
import type { Member, TaskAssignment } from "@/domain/types";
import { makeTask } from "./testHelpers";

const members: Member[] = [
  { id: "m1", projectId: "p", name: "Personne 1" },
  { id: "m2", projectId: "p", name: "Personne 2" },
  { id: "m3", projectId: "p", name: "Personne 3" },
];

describe("computeStaffingState", () => {
  it("UNASSIGNED / PARTIALLY_ASSIGNED / FULLY_ASSIGNED", () => {
    const task = makeTask({ id: "T", title: "T", requiredWorkers: 2 });
    expect(computeStaffingState(task, [])).toBe("UNASSIGNED");
    const partial: TaskAssignment[] = [{ id: "a1", taskId: "T", memberId: "m1", assignedAt: "" }];
    expect(computeStaffingState(task, partial)).toBe("PARTIALLY_ASSIGNED");
    const full: TaskAssignment[] = [
      { id: "a1", taskId: "T", memberId: "m1", assignedAt: "" },
      { id: "a2", taskId: "T", memberId: "m2", assignedAt: "" },
    ];
    expect(computeStaffingState(task, full)).toBe("FULLY_ASSIGNED");
  });
});

describe("availableMembers", () => {
  it("exclut les membres occupés sur une tâche IN_PROGRESS", () => {
    const t1 = makeTask({ id: "T1", title: "T1", status: "IN_PROGRESS" });
    const assignments: TaskAssignment[] = [
      { id: "a1", taskId: "T1", memberId: "m1", assignedAt: "" },
    ];
    const available = availableMembers(members, [t1], assignments);
    expect(available.map((m) => m.id)).toEqual(["m2", "m3"]);
  });
});

describe("validateAssignment", () => {
  it("refuse un membre déjà occupé sur une autre tâche en cours", () => {
    const running = makeTask({ id: "R", title: "R", status: "IN_PROGRESS", requiredWorkers: 1 });
    const target = makeTask({ id: "T", title: "T", requiredWorkers: 1 });
    const assignments: TaskAssignment[] = [
      { id: "a1", taskId: "R", memberId: "m1", assignedAt: "" },
    ];
    expect(() => validateAssignment(target, "m1", [running, target], assignments)).toThrow(
      AssignmentError
    );
  });

  it("refuse de dépasser le nombre requis de personnes", () => {
    const target = makeTask({ id: "T", title: "T", requiredWorkers: 1 });
    const assignments: TaskAssignment[] = [
      { id: "a1", taskId: "T", memberId: "m1", assignedAt: "" },
    ];
    expect(() => validateAssignment(target, "m2", [target], assignments)).toThrow(
      AssignmentError
    );
  });

  it("accepte une affectation valide", () => {
    const target = makeTask({ id: "T", title: "T", requiredWorkers: 2 });
    expect(() => validateAssignment(target, "m1", [target], [])).not.toThrow();
  });
});
