/**
 * Assemble toutes les fonctions de calcul du domaine en une vue prête à
 * consommer par l'UI. Reste une fonction pure : entrée = ProjectSnapshot,
 * sortie = objet sérialisable. Aucune connaissance de React/Next/DB ici.
 */

import type { ProjectSnapshot, Task } from "./types";
import { taskTotalHours } from "./types";
import { computeReadiness, type ReadinessResult } from "./readiness";
import {
  computeStaffingState,
  isAssignableNow,
  assignedMemberIds,
  availableMembers,
} from "./staffing";
import { computeCriticalPath, type CriticalPathResult } from "./criticalPath";
import { rankByPriority, type PriorityScore } from "./priority";
import { estimateResourcePlan, type PlanningResult } from "./planning";

export interface TaskView {
  task: Task;
  /** Durée totale réelle (déjà multipliée par le nombre d'unités si applicable). */
  totalHours: number;
  readiness: ReadinessResult;
  staffing: ReturnType<typeof computeStaffingState>;
  assignedMemberIds: string[];
  assignableNow: { assignable: boolean; availableCount: number; required: number };
  isOnCriticalPath: boolean;
  priorityScore: number;
  priorityReasons: string[];
}

export interface ProjectView {
  tasks: TaskView[];
  criticalPath: CriticalPathResult;
  availableMemberIds: string[];
  totalRemainingHours: number;
  resourcePlan: PlanningResult;
}

export function buildProjectView(snapshot: ProjectSnapshot): ProjectView {
  const { tasks, dependencies, members, assignments } = snapshot;

  const criticalPath = computeCriticalPath(tasks, dependencies);
  const priorities: PriorityScore[] = rankByPriority(tasks, dependencies, criticalPath);
  const priorityById = new Map(priorities.map((p) => [p.taskId, p]));

  const availableIds = availableMembers(members, tasks, assignments).map((m) => m.id);

  const taskViews: TaskView[] = tasks.map((task) => {
    const readiness = computeReadiness(task, tasks, dependencies);
    const staffing = computeStaffingState(task, assignments);
    const assignable = isAssignableNow(task, members, tasks, assignments);
    const priority = priorityById.get(task.id);

    return {
      task,
      totalHours: taskTotalHours(task),
      readiness,
      staffing,
      assignedMemberIds: assignedMemberIds(task.id, assignments),
      assignableNow: assignable,
      isOnCriticalPath: criticalPath.path.includes(task.id),
      priorityScore: priority?.score ?? 0,
      priorityReasons: priority?.reasons ?? [],
    };
  });

  const totalRemainingHours = tasks
    .filter((t) => t.status !== "DONE")
    .reduce((sum, t) => sum + taskTotalHours(t), 0);

  const resourcePlan = estimateResourcePlan(tasks, dependencies, members.length || 1);

  return {
    tasks: taskViews,
    criticalPath,
    availableMemberIds: availableIds,
    totalRemainingHours,
    resourcePlan,
  };
}
