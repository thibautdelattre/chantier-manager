/**
 * MOTEUR DE GRAPHE — dépendances entre tâches (DAG).
 *
 * Fonctions pures : elles ne mutent rien, ne connaissent ni React ni la DB.
 */

import type { Task, TaskDependency } from "./types";

/** Toutes les tâches dont `taskId` dépend directement. */
export function directDependenciesOf(
  taskId: string,
  dependencies: TaskDependency[]
): string[] {
  return dependencies.filter((d) => d.taskId === taskId).map((d) => d.dependsOnTaskId);
}

/** Toutes les tâches directement bloquées par `taskId` (celles qu'elle débloque). */
export function directDependentsOf(
  taskId: string,
  dependencies: TaskDependency[]
): string[] {
  return dependencies.filter((d) => d.dependsOnTaskId === taskId).map((d) => d.taskId);
}

/**
 * Vérifie si l'ajout d'une arête `taskId depends on dependsOnTaskId` créerait
 * un cycle dans le graphe existant + cette nouvelle arête.
 *
 * Algorithme : DFS 3-couleurs en partant de `dependsOnTaskId` en suivant les
 * arêtes "dépend de" ; si on retombe sur `taskId`, il existe déjà un chemin
 * dependsOnTaskId -> ... -> taskId, donc ajouter taskId -> dependsOnTaskId
 * fermerait un cycle.
 */
export function wouldCreateCycle(
  taskId: string,
  dependsOnTaskId: string,
  existingDependencies: TaskDependency[]
): boolean {
  if (taskId === dependsOnTaskId) return true;

  const visited = new Set<string>();
  const stack: string[] = [dependsOnTaskId];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of directDependenciesOf(current, existingDependencies)) {
      stack.push(next);
    }
  }
  return false;
}

export class CycleError extends Error {
  constructor(taskId: string, dependsOnTaskId: string) {
    super(
      `Ajouter "${taskId} dépend de ${dependsOnTaskId}" créerait un cycle de dépendances.`
    );
    this.name = "CycleError";
  }
}

/**
 * Ajoute une dépendance en refusant tout cycle. Fonction pure : retourne un
 * nouveau tableau, ne mute pas l'entrée.
 */
export function addDependency(
  taskId: string,
  dependsOnTaskId: string,
  existingDependencies: TaskDependency[],
  newId: string
): TaskDependency[] {
  if (wouldCreateCycle(taskId, dependsOnTaskId, existingDependencies)) {
    throw new CycleError(taskId, dependsOnTaskId);
  }
  const alreadyExists = existingDependencies.some(
    (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
  );
  if (alreadyExists) return existingDependencies;

  return [
    ...existingDependencies,
    { id: newId, taskId, dependsOnTaskId },
  ];
}

/**
 * Tri topologique du graphe de tâches. Lance une erreur si un cycle est
 * détecté (ne devrait jamais arriver si `addDependency` a toujours été
 * utilisé pour construire le graphe, mais on reste défensif).
 */
export function topologicalOrder(tasks: Task[], dependencies: TaskDependency[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>(); // dependsOnTaskId -> [taskId, ...]

  for (const t of tasks) {
    inDegree.set(t.id, 0);
    adjacency.set(t.id, []);
  }
  for (const d of dependencies) {
    inDegree.set(d.taskId, (inDegree.get(d.taskId) ?? 0) + 1);
    adjacency.get(d.dependsOnTaskId)?.push(d.taskId);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (order.length !== tasks.length) {
    throw new Error("Cycle détecté dans le graphe de tâches (état incohérent).");
  }
  return order;
}

/**
 * Que se passe-t-il si l'on supprime `taskId` ?
 * Retourne les dépendances orphelines qui devraient être supprimées
 * (jamais de suppression silencieuse : la couche appelante décide et informe
 * l'utilisateur).
 */
export function dependenciesAffectedByDeletion(
  taskId: string,
  dependencies: TaskDependency[]
): { asDependent: TaskDependency[]; asDependency: TaskDependency[] } {
  return {
    asDependent: dependencies.filter((d) => d.taskId === taskId),
    asDependency: dependencies.filter((d) => d.dependsOnTaskId === taskId),
  };
}
