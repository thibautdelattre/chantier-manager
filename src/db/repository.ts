/**
 * INTERFACE DE PERSISTANCE.
 *
 * Le reste de l'application (API routes, UI) ne parle JAMAIS directement au
 * fichier JSON ou à une base de données : tout passe par cette interface.
 * Migrer vers Postgres/Supabase = écrire une classe qui l'implémente
 * (en utilisant schema.sql comme cible), sans rien changer ailleurs.
 */

import type {
  Member,
  Project,
  ProjectSnapshot,
  Task,
  TaskAssignment,
  TaskDependency,
} from "@/domain/types";

export interface ProjectRepository {
  getSnapshot(projectId: string): Promise<ProjectSnapshot>;
  ensureDefaultProject(): Promise<Project>;

  createTask(task: Task): Promise<Task>;
  updateTask(taskId: string, patch: Partial<Task>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;

  addDependency(dependency: TaskDependency): Promise<void>;
  removeDependency(dependencyId: string): Promise<void>;
  removeDependenciesForTask(taskId: string): Promise<void>;

  createMember(member: Member): Promise<Member>;
  updateMember(memberId: string, patch: Partial<Member>): Promise<Member>;

  assignMember(assignment: TaskAssignment): Promise<void>;
  unassignMember(taskId: string, memberId: string): Promise<void>;
}
