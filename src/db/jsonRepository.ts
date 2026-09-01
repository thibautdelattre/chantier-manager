/**
 * Implémentation MVP de ProjectRepository : un fichier JSON local
 * (data/db.json). Choisie à la place de Postgres/Supabase pour ce livrable
 * afin qu'il tourne immédiatement avec `npm install && npm run dev`, sans
 * service externe à créer/configurer. Voir schema.sql pour la structure
 * relationnelle cible si vous migrez vers Postgres — il suffit d'écrire une
 * autre classe qui implémente `ProjectRepository`.
 *
 * Toutes les écritures passent par une file d'attente en mémoire (`writeQueue`)
 * pour sérialiser les accès concurrents et éviter une corruption du fichier
 * si deux requêtes API arrivent en même temps.
 */

import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type {
  Member,
  Project,
  ProjectSnapshot,
  Task,
  TaskAssignment,
  TaskDependency,
} from "@/domain/types";
import type { ProjectRepository } from "./repository";
import { addDependency as addDependencyPure, dependenciesAffectedByDeletion } from "@/domain/graph";
import { buildSeedData } from "./seed";

interface DbShape {
  projects: Project[];
  tasks: Task[];
  dependencies: TaskDependency[];
  members: Member[];
  assignments: TaskAssignment[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function readDb(): DbShape {
  if (!fs.existsSync(DB_FILE)) {
    const seeded = buildSeedData();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw) as DbShape;
}

function writeDb(db: DbShape): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  fs.renameSync(tmpFile, DB_FILE); // écriture atomique
}

// File d'attente simple pour sérialiser les mutations concurrentes.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => T): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}

export class JsonFileRepository implements ProjectRepository {
  async ensureDefaultProject(): Promise<Project> {
    return enqueue(() => {
      const db = readDb();
      const existing = db.projects[0];
      if (existing) return existing;
      const project: Project = {
        id: uuid(),
        name: "Rénovation",
        createdAt: new Date().toISOString(),
      };
      db.projects.push(project);
      writeDb(db);
      return project;
    });
  }

  async getSnapshot(projectId: string): Promise<ProjectSnapshot> {
    return enqueue(() => {
      const db = readDb();
      const project = db.projects.find((p) => p.id === projectId);
      if (!project) throw new Error(`Projet introuvable: ${projectId}`);
      return {
        project,
        tasks: db.tasks.filter((t) => t.projectId === projectId),
        dependencies: db.dependencies.filter((d) =>
          db.tasks.some((t) => t.id === d.taskId && t.projectId === projectId)
        ),
        members: db.members.filter((m) => m.projectId === projectId),
        assignments: db.assignments.filter((a) =>
          db.tasks.some((t) => t.id === a.taskId && t.projectId === projectId)
        ),
      };
    });
  }

  async createTask(task: Task): Promise<Task> {
    return enqueue(() => {
      const db = readDb();
      db.tasks.push(task);
      writeDb(db);
      return task;
    });
  }

  async updateTask(taskId: string, patch: Partial<Task>): Promise<Task> {
    return enqueue(() => {
      const db = readDb();
      const idx = db.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) throw new Error(`Tâche introuvable: ${taskId}`);
      const current = db.tasks[idx] as Task;
      const updated: Task = { ...current, ...patch, id: current.id };
      db.tasks[idx] = updated;
      writeDb(db);
      return updated;
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      const { asDependent, asDependency } = dependenciesAffectedByDeletion(
        taskId,
        db.dependencies
      );
      const affectedIds = new Set([
        ...asDependent.map((d) => d.id),
        ...asDependency.map((d) => d.id),
      ]);
      db.dependencies = db.dependencies.filter((d) => !affectedIds.has(d.id));
      db.assignments = db.assignments.filter((a) => a.taskId !== taskId);
      db.tasks = db.tasks.filter((t) => t.id !== taskId);
      writeDb(db);
    });
  }

  async addDependency(dependency: TaskDependency): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      // Revalidation défensive côté persistance : même si l'appelant a déjà
      // vérifié via le moteur, on ne fait jamais confiance aveuglément à
      // l'appelant pour une invariant aussi critique.
      db.dependencies = addDependencyPure(
        dependency.taskId,
        dependency.dependsOnTaskId,
        db.dependencies,
        dependency.id
      );
      writeDb(db);
    });
  }

  async removeDependency(dependencyId: string): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      db.dependencies = db.dependencies.filter((d) => d.id !== dependencyId);
      writeDb(db);
    });
  }

  async removeDependenciesForTask(taskId: string): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      db.dependencies = db.dependencies.filter(
        (d) => d.taskId !== taskId && d.dependsOnTaskId !== taskId
      );
      writeDb(db);
    });
  }

  async createMember(member: Member): Promise<Member> {
    return enqueue(() => {
      const db = readDb();
      db.members.push(member);
      writeDb(db);
      return member;
    });
  }

  async updateMember(memberId: string, patch: Partial<Member>): Promise<Member> {
    return enqueue(() => {
      const db = readDb();
      const idx = db.members.findIndex((m) => m.id === memberId);
      if (idx === -1) throw new Error(`Membre introuvable: ${memberId}`);
      const updated = { ...(db.members[idx] as Member), ...patch, id: memberId };
      db.members[idx] = updated;
      writeDb(db);
      return updated;
    });
  }

  async assignMember(assignment: TaskAssignment): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      const alreadyAssigned = db.assignments.some(
        (a) => a.taskId === assignment.taskId && a.memberId === assignment.memberId
      );
      if (!alreadyAssigned) {
        db.assignments.push(assignment);
        writeDb(db);
      }
    });
  }

  async unassignMember(taskId: string, memberId: string): Promise<void> {
    return enqueue(() => {
      const db = readDb();
      db.assignments = db.assignments.filter(
        (a) => !(a.taskId === taskId && a.memberId === memberId)
      );
      writeDb(db);
    });
  }
}

// Instance unique côté serveur (process Next.js).
export const repository = new JsonFileRepository();
