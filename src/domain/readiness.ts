/**
 * MOTEUR DE DISPONIBILITÉ (readiness)
 *
 * `readiness` n'est jamais stocké. Il est toujours recalculé à partir des
 * dépendances + de leur statut. C'est la garantie qu'on ne peut jamais avoir
 * une tâche "coincée" dans un mauvais état par erreur humaine.
 */

import type { Readiness, Task, TaskDependency } from "./types";
import { directDependencyEdgesOf, directDependentsOf } from "./graph";

export interface BlockingInfo {
  taskId: string;
  title: string;
  done: boolean;
  /** id de l'arête TaskDependency correspondante, pour permettre sa suppression. */
  dependencyId: string;
}

export interface ReadinessResult {
  readiness: Readiness;
  /** Le détail de CHAQUE dépendance directe et si elle est terminée. */
  blockedBy: BlockingInfo[];
  /** Nombre de prérequis encore manquants. */
  missingCount: number;
}

/**
 * Calcule la disponibilité d'une tâche à partir de ses dépendances directes.
 * Une tâche déjà IN_PROGRESS ou DONE est considérée READY par définition
 * (la question "peut-elle démarrer" ne se pose plus).
 */
export function computeReadiness(
  task: Task,
  allTasks: Task[],
  dependencies: TaskDependency[]
): ReadinessResult {
  const edges = directDependencyEdgesOf(task.id, dependencies);
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  const blockedBy: BlockingInfo[] = edges.map((edge) => {
    const dep = taskById.get(edge.dependsOnTaskId);
    return {
      taskId: edge.dependsOnTaskId,
      title: dep?.title ?? "(tâche supprimée)",
      done: dep?.status === "DONE",
      dependencyId: edge.id,
    };
  });

  const missingCount = blockedBy.filter((b) => !b.done).length;

  if (task.status !== "TODO") {
    return { readiness: "READY", blockedBy, missingCount: 0 };
  }

  return {
    readiness: missingCount === 0 ? "READY" : "BLOCKED",
    blockedBy,
    missingCount,
  };
}

/**
 * Étant donné qu'une tâche vient de passer à DONE, quelles tâches
 * directement dépendantes deviennent maintenant READY (toutes leurs autres
 * dépendances étant elles aussi DONE) ?
 */
export function tasksUnlockedBy(
  completedTaskId: string,
  allTasks: Task[],
  dependencies: TaskDependency[]
): Task[] {
  const dependentIds = directDependentsOf(completedTaskId, dependencies);
  const unlocked: Task[] = [];

  for (const id of dependentIds) {
    const t = allTasks.find((task) => task.id === id);
    if (!t || t.status !== "TODO") continue;
    const { readiness } = computeReadiness(t, allTasks, dependencies);
    if (readiness === "READY") unlocked.push(t);
  }
  return unlocked;
}

/** Combien de tâches (directes + transitives) dépendent de cette tâche. */
export function countTransitiveDependents(
  taskId: string,
  dependencies: TaskDependency[]
): number {
  const visited = new Set<string>();
  const stack = [...directDependentsOf(taskId, dependencies)];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...directDependentsOf(current, dependencies));
  }
  return visited.size;
}
