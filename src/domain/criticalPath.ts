/**
 * CHEMIN CRITIQUE THÉORIQUE
 *
 * Basé UNIQUEMENT sur le graphe de dépendances + les durées estimées.
 * Suppose des ressources illimitées (aucune contrainte de personnel).
 * C'est une BORNE MINIMALE théorique, pas une prévision réaliste de
 * planning — pour ça, voir planning.ts qui tient compte des 3 travailleurs.
 */

import type { Task, TaskDependency } from "./types";
import { taskTotalHours } from "./types";
import { directDependenciesOf, topologicalOrder } from "./graph";

export interface CriticalPathResult {
  /** Durée totale minimale théorique, en heures. */
  totalDurationHours: number;
  /** Les tâches sur le chemin critique, dans l'ordre. */
  path: string[];
  /** Pour chaque tâche : date de fin au plus tôt (en heures depuis le début), en supposant ressources illimitées. */
  earliestFinish: Map<string, number>;
}

export function computeCriticalPath(
  tasks: Task[],
  dependencies: TaskDependency[]
): CriticalPathResult {
  if (tasks.length === 0) {
    return { totalDurationHours: 0, path: [], earliestFinish: new Map() };
  }

  const order = topologicalOrder(tasks, dependencies);
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const earliestFinish = new Map<string, number>();
  const predecessorOnPath = new Map<string, string | null>();

  for (const id of order) {
    const task = taskById.get(id);
    if (!task) continue;
    const deps = directDependenciesOf(id, dependencies);
    let maxDepFinish = 0;
    let bestPred: string | null = null;
    for (const depId of deps) {
      const f = earliestFinish.get(depId) ?? 0;
      if (f > maxDepFinish) {
        maxDepFinish = f;
        bestPred = depId;
      }
    }
    earliestFinish.set(id, maxDepFinish + taskTotalHours(task));
    predecessorOnPath.set(id, bestPred);
  }

  // Le dernier point du chemin critique = la tâche avec le plus grand earliestFinish.
  let endTaskId: string | null = null;
  let maxFinish = 0;
  for (const [id, finish] of earliestFinish.entries()) {
    if (finish > maxFinish) {
      maxFinish = finish;
      endTaskId = id;
    }
  }

  const path: string[] = [];
  let cursor = endTaskId;
  while (cursor) {
    path.unshift(cursor);
    cursor = predecessorOnPath.get(cursor) ?? null;
  }

  return { totalDurationHours: maxFinish, path, earliestFinish };
}

/** Est-ce que cette tâche fait partie du chemin critique théorique ? */
export function isOnCriticalPath(taskId: string, result: CriticalPathResult): boolean {
  return result.path.includes(taskId);
}
