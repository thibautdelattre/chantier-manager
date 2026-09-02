import type { ProjectView } from "@/domain/projectView";
import type { Priority, Task, TaskStatus, Member, DurationMode } from "@/domain/types";

export interface StateResponse {
  projectId: string;
  view: ProjectView;
  members: Member[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getState: (): Promise<StateResponse> => fetch("/api/state").then((r) => json(r)),

  createTask: (input: {
    title: string;
    area?: string;
    priority?: Priority;
    estimatedDurationHours?: number;
    durationMode?: DurationMode;
    unitCount?: number | null;
    unitLabel?: string | null;
    requiredWorkers?: number;
    description?: string;
    notes?: string;
  }): Promise<Task> =>
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json(r)),

  updateTask: (id: string, patch: Partial<Task>): Promise<Task> =>
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json(r)),

  deleteTask: (id: string): Promise<void> =>
    fetch(`/api/tasks/${id}`, { method: "DELETE" }).then((r) => json(r)),

  setStatus: (id: string, status: TaskStatus): Promise<{ task: Task; unlocked: Task[] }> =>
    fetch(`/api/tasks/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then((r) => json(r)),

  addDependency: (taskId: string, dependsOnTaskId: string): Promise<void> =>
    fetch("/api/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, dependsOnTaskId }),
    }).then((r) => json(r)),

  removeDependency: (id: string): Promise<void> =>
    fetch(`/api/dependencies/${id}`, { method: "DELETE" }).then((r) => json(r)),

  createMember: (name: string): Promise<void> =>
    fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => json(r)),

  renameMember: (id: string, name: string): Promise<void> =>
    fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => json(r)),

  assignMember: (taskId: string, memberId: string): Promise<void> =>
    fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, memberId }),
    }).then((r) => json(r)),

  unassignMember: (taskId: string, memberId: string): Promise<void> =>
    fetch("/api/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, memberId }),
    }).then((r) => json(r)),
};
