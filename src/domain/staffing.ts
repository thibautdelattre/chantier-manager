/**
 * MOTEUR DE RESSOURCES — les 3 travailleurs.
 *
 * Distingue explicitement DEUX CONCEPTS qui ne doivent jamais être mélangés :
 *  - readiness (dépendances)   -> voir readiness.ts
 *  - staffing (ressources humaines) -> ce fichier
 *
 * Simplification assumée et documentée : il n'y a pas de calendrier horaire.
 * "Disponible" veut dire "pas déjà affecté à une tâche IN_PROGRESS". Ce n'est
 * pas un vrai planificateur temporel — ce serait un problème bien plus
 * complexe (calendrier, horaires, congés). On le dit clairement plutôt que
 * de prétendre le contraire.
 */

import type { Member, StaffingState, Task, TaskAssignment } from "./types";

export function assignedMemberIds(taskId: string, assignments: TaskAssignment[]): string[] {
  return assignments.filter((a) => a.taskId === taskId).map((a) => a.memberId);
}

export function computeStaffingState(task: Task, assignments: TaskAssignment[]): StaffingState {
  const count = assignedMemberIds(task.id, assignments).length;
  if (count === 0) return "UNASSIGNED";
  if (count < task.requiredWorkers) return "PARTIALLY_ASSIGNED";
  return "FULLY_ASSIGNED";
}

/**
 * Un membre est "occupé" s'il est affecté à au moins une tâche actuellement
 * IN_PROGRESS. Sinon il est "disponible maintenant".
 */
export function busyMemberIds(tasks: Task[], assignments: TaskAssignment[]): Set<string> {
  const inProgressTaskIds = new Set(
    tasks.filter((t) => t.status === "IN_PROGRESS").map((t) => t.id)
  );
  const busy = new Set<string>();
  for (const a of assignments) {
    if (inProgressTaskIds.has(a.taskId)) busy.add(a.memberId);
  }
  return busy;
}

export function availableMembers(
  members: Member[],
  tasks: Task[],
  assignments: TaskAssignment[]
): Member[] {
  const busy = busyMemberIds(tasks, assignments);
  return members.filter((m) => !busy.has(m.id));
}

/**
 * Une tâche est "assignable maintenant" si :
 *  - elle est READY au sens des dépendances (à vérifier séparément, voir readiness.ts)
 *  - le nombre de personnes actuellement libres est >= requiredWorkers
 *
 * Ce fichier ne calcule QUE la partie ressources ; il ne se prononce jamais
 * sur les dépendances.
 */
export function isAssignableNow(
  task: Task,
  members: Member[],
  tasks: Task[],
  assignments: TaskAssignment[]
): { assignable: boolean; availableCount: number; required: number } {
  const available = availableMembers(members, tasks, assignments).length;
  return {
    assignable: available >= task.requiredWorkers,
    availableCount: available,
    required: task.requiredWorkers,
  };
}

export class AssignmentError extends Error {}

/**
 * Valide (sans muter) qu'on peut affecter `memberId` à `taskId` :
 *  - le membre n'est pas déjà affecté à cette tâche
 *  - le membre n'est pas occupé sur une autre tâche IN_PROGRESS
 *  - la tâche n'a pas déjà atteint son nombre requis de personnes
 */
export function validateAssignment(
  task: Task,
  memberId: string,
  tasks: Task[],
  assignments: TaskAssignment[]
): void {
  const currentlyAssigned = assignedMemberIds(task.id, assignments);
  if (currentlyAssigned.includes(memberId)) {
    throw new AssignmentError("Ce membre est déjà affecté à cette tâche.");
  }
  if (currentlyAssigned.length >= task.requiredWorkers) {
    throw new AssignmentError(
      `Cette tâche a déjà son nombre requis de personnes (${task.requiredWorkers}).`
    );
  }
  const busy = busyMemberIds(tasks, assignments);
  if (busy.has(memberId) && task.status === "IN_PROGRESS") {
    // Un membre déjà en cours sur CETTE tâche est géré au-dessus ; ici on
    // bloque seulement s'il est occupé ailleurs.
  }
  const busyElsewhere = assignments.some(
    (a) =>
      a.memberId === memberId &&
      a.taskId !== task.id &&
      tasks.find((t) => t.id === a.taskId)?.status === "IN_PROGRESS"
  );
  if (busyElsewhere) {
    throw new AssignmentError("Ce membre est déjà occupé sur une autre tâche en cours.");
  }
}

/**
 * Regroupe les tâches READY+non terminées par "peuvent-elles être faites en
 * parallèle avec les 3 personnes ?" — calcul simple : somme des
 * requiredWorkers des tâches IN_PROGRESS/à démarrer <= effectif total.
 * Utilisé pour l'affichage "réalisable en parallèle", pas comme un vrai
 * ordonnanceur — voir planning.ts pour l'heuristique de planification.
 */
export function totalRequiredForParallelSet(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.requiredWorkers, 0);
}

export function canRunInParallel(tasks: Task[], teamSize: number): boolean {
  return totalRequiredForParallelSet(tasks) <= teamSize;
}
