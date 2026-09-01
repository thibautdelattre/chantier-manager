import { v4 as uuid } from "uuid";
import { repository } from "@/db/jsonRepository";
import type { Task, Member, TaskStatus, Priority } from "@/domain/types";
import { wouldCreateCycle, CycleError } from "@/domain/graph";
import { validateAssignment, AssignmentError } from "@/domain/staffing";
import { tasksUnlockedBy } from "@/domain/readiness";
import { buildProjectView, type ProjectView } from "@/domain/projectView";

async function getDefaultProjectId(): Promise<string> {
  const project = await repository.ensureDefaultProject();
  return project.id;
}

export async function getState(): Promise<{
  projectId: string;
  view: ProjectView;
  members: Member[];
}> {
  const projectId = await getDefaultProjectId();
  const snapshot = await repository.getSnapshot(projectId);
  return { projectId, view: buildProjectView(snapshot), members: snapshot.members };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  area?: string;
  priority?: Priority;
  estimatedDurationHours?: number;
  requiredWorkers?: number;
  estimatedCost?: number | null;
  materials?: string[];
  notes?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const projectId = await getDefaultProjectId();
  const task: Task = {
    id: uuid(),
    projectId,
    title: input.title,
    description: input.description ?? "",
    area: input.area ?? "Général",
    status: "TODO",
    priority: input.priority ?? "NORMAL",
    estimatedDurationHours: input.estimatedDurationHours ?? 1,
    actualDurationHours: null,
    requiredWorkers: Math.max(1, input.requiredWorkers ?? 1),
    estimatedCost: input.estimatedCost ?? null,
    actualCost: null,
    materials: input.materials ?? [],
    notes: input.notes ?? "",
    checklist: [],
    customFields: {},
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };
  return repository.createTask(task);
}

export async function updateTask(taskId: string, patch: Partial<Task>): Promise<Task> {
  return repository.updateTask(taskId, patch);
}

export async function deleteTask(taskId: string): Promise<void> {
  return repository.deleteTask(taskId);
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<{ task: Task; unlocked: Task[] }> {
  const projectId = await getDefaultProjectId();
  const now = new Date().toISOString();
  const patch: Partial<Task> = { status };
  if (status === "IN_PROGRESS") patch.startedAt = now;
  if (status === "DONE") patch.completedAt = now;

  const task = await repository.updateTask(taskId, patch);

  let unlocked: Task[] = [];
  if (status === "DONE") {
    const snapshot = await repository.getSnapshot(projectId);
    unlocked = tasksUnlockedBy(taskId, snapshot.tasks, snapshot.dependencies);
  }
  return { task, unlocked };
}

export async function addDependency(
  taskId: string,
  dependsOnTaskId: string
): Promise<void> {
  const projectId = await getDefaultProjectId();
  const snapshot = await repository.getSnapshot(projectId);
  if (wouldCreateCycle(taskId, dependsOnTaskId, snapshot.dependencies)) {
    throw new CycleError(taskId, dependsOnTaskId);
  }
  await repository.addDependency({ id: uuid(), taskId, dependsOnTaskId });
}

export async function removeDependency(dependencyId: string): Promise<void> {
  return repository.removeDependency(dependencyId);
}

export async function createMember(name: string): Promise<Member> {
  const projectId = await getDefaultProjectId();
  return repository.createMember({ id: uuid(), projectId, name });
}

export async function renameMember(memberId: string, name: string): Promise<Member> {
  return repository.updateMember(memberId, { name });
}

export async function assignMember(taskId: string, memberId: string): Promise<void> {
  const projectId = await getDefaultProjectId();
  const snapshot = await repository.getSnapshot(projectId);
  const task = snapshot.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Tâche introuvable.");

  validateAssignment(task, memberId, snapshot.tasks, snapshot.assignments);
  await repository.assignMember({ id: uuid(), taskId, memberId, assignedAt: new Date().toISOString() });
}

export async function unassignMember(taskId: string, memberId: string): Promise<void> {
  return repository.unassignMember(taskId, memberId);
}

export { AssignmentError, CycleError };
