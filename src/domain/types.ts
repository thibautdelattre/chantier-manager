/**
 * MODÈLE DE DONNÉES — DOMAINE
 *
 * Ce fichier ne dépend de rien d'autre (pas de React, pas de DB, pas de Next.js).
 * C'est la source de vérité sur la forme des données métier.
 */

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

/**
 * Mode de calcul du temps d'une tâche :
 *  - FORFAIT : `estimatedDurationHours` EST la durée totale de la tâche.
 *  - PER_UNIT : `estimatedDurationHours` est le temps PAR UNITÉ (par porte,
 *    par radiateur, par trou...) ; la durée totale = estimatedDurationHours
 *    × unitCount. Voir `taskTotalHours()` ci-dessous, qui est le seul point
 *    d'entrée que le reste du code doit utiliser pour connaître la durée
 *    réelle d'une tâche — ne jamais lire `estimatedDurationHours` seul pour
 *    des calculs de planning.
 */
export type DurationMode = "FORFAIT" | "PER_UNIT";

/**
 * "readiness" n'est JAMAIS stocké : il est toujours recalculé à partir des
 * dépendances (voir readiness.ts). On ne l'expose ici que comme type de retour.
 */
export type Readiness = "BLOCKED" | "READY";

/**
 * État de staffing d'une tâche : combien de personnes sont affectées par
 * rapport au besoin. Calculé, jamais stocké.
 */
export type StaffingState = "UNASSIGNED" | "PARTIALLY_ASSIGNED" | "FULLY_ASSIGNED";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

/**
 * Champs personnalisés libres, pour pouvoir étendre une tâche sans migration
 * de schéma. Stockés en JSON côté persistance.
 */
export type CustomFields = Record<string, string | number | boolean>;

export interface Task {
  id: string;
  projectId: string;

  title: string;
  description: string;
  area: string; // pièce / zone du chantier

  status: TaskStatus; // stocké — décision utilisateur (démarrer / terminer)
  priority: Priority; // stocké — priorité manuelle

  estimatedDurationHours: number;
  actualDurationHours: number | null;
  durationMode: DurationMode;
  /** Nombre d'unités si durationMode === "PER_UNIT" (portes, radiateurs...). Ignoré sinon. */
  unitCount: number | null;
  /** Libellé de l'unité si durationMode === "PER_UNIT" (ex: "porte", "trou"). */
  unitLabel: string | null;

  requiredWorkers: number; // >= 1

  estimatedCost: number | null;
  actualCost: number | null;

  materials: string[];
  notes: string;
  checklist: ChecklistItem[];
  customFields: CustomFields;

  createdAt: string; // ISO
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Relation normalisée : `taskId` dépend de `dependsOnTaskId`.
 * Une ligne = une arête du DAG. C'est la table qu'on interroge pour
 * "de quoi cette tâche dépend" et, en sens inverse, "qu'est-ce qu'elle bloque".
 */
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export interface Member {
  id: string;
  projectId: string;
  name: string;
}

/**
 * Relation many-to-many Task <-> Member.
 */
export interface TaskAssignment {
  id: string;
  taskId: string;
  memberId: string;
  assignedAt: string; // ISO
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Vue agrégée en mémoire de tout le projet : c'est ce que le moteur de
 * domaine consomme. La couche de persistance est responsable de produire
 * cet objet (peu importe le backend — JSON local, Postgres, etc.)
 */
export interface ProjectSnapshot {
  project: Project;
  tasks: Task[];
  dependencies: TaskDependency[];
  members: Member[];
  assignments: TaskAssignment[];
}

/**
 * Durée TOTALE réelle d'une tâche, seul point d'entrée à utiliser pour tout
 * calcul de planning (chemin critique, planning ressources, totaux). Ne
 * jamais lire `task.estimatedDurationHours` directement ailleurs que dans
 * l'UI d'édition — c'est un temps par unité si durationMode === "PER_UNIT".
 */
export function taskTotalHours(task: Task): number {
  if (task.durationMode === "PER_UNIT") {
    return task.estimatedDurationHours * (task.unitCount ?? 0);
  }
  return task.estimatedDurationHours;
}
