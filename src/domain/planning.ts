/**
 * PLANNING AVEC RESSOURCES (heuristique)
 *
 * ⚠️ Ceci est une ESTIMATION HEURISTIQUE, pas un solveur optimal.
 * Le problème "planifier N tâches avec dépendances sur K travailleurs pour
 * minimiser la durée totale" est un problème NP-difficile (resource-
 * constrained project scheduling problem). On ne prétend PAS résoudre ça de
 * façon optimale : on utilise une simulation gloutonne, priorité aux tâches
 * les plus contraignantes (algorithme "critical path first"), qui donne un
 * ORDRE DE GRANDEUR raisonnable et un planning jour par jour plausible.
 *
 * Ne jamais présenter `totalDurationHours` d'ici comme LA date de fin du
 * chantier — c'est une estimation, à recalculer au fur et à mesure.
 */

import type { Task, TaskDependency } from "./types";
import { directDependenciesOf, topologicalOrder } from "./graph";
import { computeCriticalPath } from "./criticalPath";

export interface PlanningStep {
  taskId: string;
  startHour: number;
  endHour: number;
}

export interface PlanningResult {
  steps: PlanningStep[];
  totalDurationHours: number;
  isEstimateOnly: true;
}

/**
 * Simulation gloutonne à événements discrets : à chaque étape, parmi les
 * tâches READY (dépendances satisfaites) et pas encore planifiées, on
 * démarre en priorité celles qui sont sur le chemin critique théorique, puis
 * les plus longues, tant qu'il reste assez de travailleurs libres.
 */
export function estimateResourcePlan(
  tasks: Task[],
  dependencies: TaskDependency[],
  teamSize: number
): PlanningResult {
  const pending = new Set(tasks.map((t) => t.id));
  const finished = new Map<string, number>(); // taskId -> endHour
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const critical = computeCriticalPath(tasks, dependencies);
  const criticalSet = new Set(critical.path);

  // Ordre topologique pour garantir qu'on ne planifie jamais une tâche avant
  // ses dépendances, même dans les égalités de priorité.
  const topo = topologicalOrder(tasks, dependencies);
  const topoIndex = new Map(topo.map((id, i) => [id, i]));

  const steps: PlanningStep[] = [];

  // "Occupations" = liste de (endHour) par créneau de travailleur libéré.
  // On simule le temps par petits pas = événements de fin de tâche.
  let freeWorkers = teamSize;
  const runningUntil: { taskId: string; endHour: number; workers: number }[] = [];
  let clock = 0;

  const isReady = (taskId: string): boolean => {
    const deps = directDependenciesOf(taskId, dependencies);
    return deps.every((d) => finished.has(d));
  };

  let guard = 0;
  while (pending.size > 0 && guard < tasks.length * 4 + 10) {
    guard++;

    const readyNow = [...pending].filter(isReady);
    readyNow.sort((a, b) => {
      const aCrit = criticalSet.has(a) ? 1 : 0;
      const bCrit = criticalSet.has(b) ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit; // chemin critique d'abord
      const aDur = taskById.get(a)?.estimatedDurationHours ?? 0;
      const bDur = taskById.get(b)?.estimatedDurationHours ?? 0;
      if (aDur !== bDur) return bDur - aDur; // plus longues d'abord
      return (topoIndex.get(a) ?? 0) - (topoIndex.get(b) ?? 0);
    });

    let started = false;
    for (const id of readyNow) {
      const task = taskById.get(id);
      if (!task) continue;
      if (task.requiredWorkers <= freeWorkers) {
        freeWorkers -= task.requiredWorkers;
        const endHour = clock + task.estimatedDurationHours;
        runningUntil.push({ taskId: id, endHour, workers: task.requiredWorkers });
        steps.push({ taskId: id, startHour: clock, endHour });
        pending.delete(id);
        started = true;
      }
    }

    if (runningUntil.length === 0) {
      // Plus rien ne peut démarrer (ressources insuffisantes même pour une
      // tâche isolée, ou situation bloquante) : on s'arrête pour éviter une
      // boucle infinie et on laisse le reste non planifié.
      if (!started) break;
      continue;
    }

    // Avancer l'horloge jusqu'à la prochaine fin de tâche.
    runningUntil.sort((a, b) => a.endHour - b.endHour);
    const next = runningUntil.shift();
    if (!next) break;
    clock = next.endHour;
    finished.set(next.taskId, next.endHour);
    freeWorkers += next.workers;

    // Libère aussi toute tâche qui se termine exactement au même instant.
    while (runningUntil.length > 0 && runningUntil[0]!.endHour === clock) {
      const also = runningUntil.shift() as { taskId: string; endHour: number; workers: number };
      finished.set(also.taskId, also.endHour);
      freeWorkers += also.workers;
    }
  }

  const totalDurationHours = steps.reduce((max, s) => Math.max(max, s.endHour), 0);

  return { steps, totalDurationHours, isEstimateOnly: true };
}
