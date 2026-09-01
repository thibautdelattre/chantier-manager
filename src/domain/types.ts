/**
 * MODÈLE DE DONNÉES — DOMAINE
 *
 * Ce fichier ne dépend de rien d'autre (pas de React, pas de DB, pas de Next.js).
 * C'est la source de vérité sur la forme des données métier.
 */

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

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
