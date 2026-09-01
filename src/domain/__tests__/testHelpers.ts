import type { Task, TaskDependency } from "@/domain/types";

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    projectId: "proj_1",
    description: "",
    area: "Général",
    status: "TODO",
    priority: "NORMAL",
    estimatedDurationHours: 1,
    actualDurationHours: null,
    requiredWorkers: 1,
    estimatedCost: null,
    actualCost: null,
    materials: [],
    notes: "",
    checklist: [],
    customFields: {},
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

export function dep(taskId: string, dependsOnTaskId: string): TaskDependency {
  return { id: nextId("dep"), taskId, dependsOnTaskId };
}
