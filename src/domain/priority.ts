/**
 * SCORE DE PRIORITÉ — heuristique simple et transparente.
 *
 * Utilisé uniquement pour SUGGÉRER un ordre dans la vue "Disponible
 * maintenant". L'utilisateur garde toujours la main : c'est un tri par
 * défaut, pas une contrainte.
 *
 * Facteurs (tous documentés, aucune boîte noire) :
 *  - priorité manuelle (poids fort)
 *  - nombre de tâches débloquées si celle-ci est terminée (poids fort)
 *  - présence sur le chemin critique théorique (poids moyen)
 *  - durée courte favorisée à égalité (poids faible, pour dégager vite des tâches rapides)
 */

import type { Priority, Task } from "./types";
import { taskTotalHours } from "./types";
import { countTransitiveDependents } from "./readiness";
import type { TaskDependency } from "./types";
import type { CriticalPathResult } from "./criticalPath";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  LOW: 0,
  NORMAL: 10,
  HIGH: 25,
  CRITICAL: 50,
};

export interface PriorityScore {
  taskId: string;
  score: number;
  reasons: string[];
}

export function computePriorityScore(
  task: Task,
  dependencies: TaskDependency[],
  criticalPath: CriticalPathResult
): PriorityScore {
  const reasons: string[] = [];
  let score = 0;

  const manual = PRIORITY_WEIGHT[task.priority];
  score += manual;
  if (task.priority !== "NORMAL") reasons.push(`priorité manuelle: ${task.priority}`);

  const dependents = countTransitiveDependents(task.id, dependencies);
  score += dependents * 8;
  if (dependents > 0) reasons.push(`débloque ${dependents} tâche(s) en aval`);

  if (criticalPath.path.includes(task.id)) {
    score += 20;
    reasons.push("sur le chemin critique théorique");
  }

  // À égalité, favorise les tâches courtes (petit bonus inversement
  // proportionnel à la durée, plafonné pour ne pas dominer les autres facteurs).
  const shortBonus = Math.max(0, 5 - taskTotalHours(task) / 4);
  score += shortBonus;

  return { taskId: task.id, score, reasons };
}

export function rankByPriority(
  tasks: Task[],
  dependencies: TaskDependency[],
  criticalPath: CriticalPathResult
): PriorityScore[] {
  return tasks
    .map((t) => computePriorityScore(t, dependencies, criticalPath))
    .sort((a, b) => b.score - a.score);
}
