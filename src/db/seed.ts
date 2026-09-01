import { v4 as uuid } from "uuid";
import type { Member, Project, Task, TaskDependency } from "@/domain/types";

function task(partial: {
  id: string;
  title: string;
  area: string;
  duration: number;
  workers?: number;
  status?: Task["status"];
  priority?: Task["priority"];
}): Task {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    projectId: "seed-project",
    title: partial.title,
    description: "",
    area: partial.area,
    status: partial.status ?? "TODO",
    priority: partial.priority ?? "NORMAL",
    estimatedDurationHours: partial.duration,
    actualDurationHours: null,
    requiredWorkers: partial.workers ?? 1,
    estimatedCost: null,
    actualCost: null,
    materials: [],
    notes: "",
    checklist: [],
    customFields: {},
    createdAt: now,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Construit un jeu de données de démonstration réaliste, correspondant à
 * l'exemple donné dans le brief : chaîne linéaire de préparation, puis
 * embranchement plomberie/électricité en parallèle convergeant vers
 * l'isolation, et plusieurs pièces pour vérifier le travail simultané.
 */
export function buildSeedData() {
  const projectId = "seed-project";
  const project: Project = {
    id: projectId,
    name: "Rénovation — Maison",
    createdAt: new Date().toISOString(),
  };

  const members: Member[] = [
    { id: "member-1", projectId, name: "Personne 1" },
    { id: "member-2", projectId, name: "Personne 2" },
    { id: "member-3", projectId, name: "Personne 3" },
  ];

  const tasks: Task[] = [
    task({ id: "t-debarras", title: "Débarrasser", area: "Général", duration: 3, status: "DONE" }),
    task({ id: "t-nettoyage", title: "Nettoyage initial", area: "Général", duration: 3.5 }),
    task({ id: "t-demolition", title: "Démolition", area: "Général", duration: 8, workers: 2 }),
    task({ id: "t-evacuation", title: "Évacuation des gravats", area: "Général", duration: 4 }),
    task({ id: "t-maconnerie", title: "Maçonnerie", area: "Général", duration: 12, workers: 2, priority: "HIGH" }),

    task({ id: "t-plomberie-cuisine", title: "Plomberie", area: "Cuisine", duration: 10, priority: "HIGH" }),
    task({ id: "t-electricite-cuisine", title: "Électricité", area: "Cuisine", duration: 8, priority: "HIGH" }),
    task({ id: "t-isolation-cuisine", title: "Isolation", area: "Cuisine", duration: 6, workers: 2 }),
    task({ id: "t-placo-cuisine", title: "Placo", area: "Cuisine", duration: 16, workers: 2 }),
    task({ id: "t-enduit-cuisine", title: "Bandes / Enduit", area: "Cuisine", duration: 24 }),
    task({ id: "t-poncage-cuisine", title: "Ponçage", area: "Cuisine", duration: 18 }),
    task({ id: "t-peinture-cuisine", title: "Peinture", area: "Cuisine", duration: 18 }),
    task({ id: "t-radiateurs-cuisine", title: "Pose radiateurs", area: "Cuisine", duration: 3 }),

    task({ id: "t-plomberie-sdb", title: "Plomberie", area: "Salle de bain", duration: 12, priority: "CRITICAL" }),
    task({ id: "t-electricite-sdb", title: "Électricité", area: "Salle de bain", duration: 6 }),
    task({ id: "t-carrelage-sdb", title: "Carrelage", area: "Salle de bain", duration: 20, workers: 2 }),
    task({ id: "t-sanitaires-sdb", title: "Installation sanitaires", area: "Salle de bain", duration: 8 }),

    task({ id: "t-nettoyage-salon", title: "Nettoyage", area: "Salon", duration: 2 }),
    task({ id: "t-sol-salon", title: "Changer le sol", area: "Salon", duration: 8 }),
    task({ id: "t-peinture-salon", title: "Peinture", area: "Salon", duration: 12 }),

    task({ id: "t-nettoyage-ch1", title: "Nettoyage", area: "Chambre 1", duration: 2 }),
    task({ id: "t-peinture-ch1", title: "Peinture", area: "Chambre 1", duration: 10 }),
    task({ id: "t-sol-ch1", title: "Changer le sol", area: "Chambre 1", duration: 6 }),

    task({ id: "t-nettoyage-ch2", title: "Nettoyage", area: "Chambre 2", duration: 2 }),
    task({ id: "t-peinture-ch2", title: "Peinture", area: "Chambre 2", duration: 10 }),
  ];

  const dependencies: TaskDependency[] = [
    dep("t-nettoyage", "t-debarras"),
    dep("t-demolition", "t-nettoyage"),
    dep("t-evacuation", "t-demolition"),
    dep("t-maconnerie", "t-evacuation"),

    // Cuisine : plomberie + électricité en parallèle, convergent vers isolation
    dep("t-plomberie-cuisine", "t-maconnerie"),
    dep("t-electricite-cuisine", "t-maconnerie"),
    dep("t-isolation-cuisine", "t-plomberie-cuisine"),
    dep("t-isolation-cuisine", "t-electricite-cuisine"),
    dep("t-placo-cuisine", "t-isolation-cuisine"),
    dep("t-enduit-cuisine", "t-placo-cuisine"),
    dep("t-poncage-cuisine", "t-enduit-cuisine"),
    dep("t-peinture-cuisine", "t-poncage-cuisine"),
    dep("t-radiateurs-cuisine", "t-placo-cuisine"),

    // Salle de bain : chaîne indépendante de la cuisine (peut avancer en parallèle)
    dep("t-plomberie-sdb", "t-maconnerie"),
    dep("t-electricite-sdb", "t-maconnerie"),
    dep("t-carrelage-sdb", "t-plomberie-sdb"),
    dep("t-carrelage-sdb", "t-electricite-sdb"),
    dep("t-sanitaires-sdb", "t-carrelage-sdb"),

    // Salon et chambres : indépendants de la cuisine/SdB, juste après nettoyage général
    dep("t-sol-salon", "t-nettoyage-salon"),
    dep("t-peinture-salon", "t-sol-salon"),
    dep("t-nettoyage-salon", "t-evacuation"),

    dep("t-peinture-ch1", "t-nettoyage-ch1"),
    dep("t-sol-ch1", "t-peinture-ch1"),
    dep("t-nettoyage-ch1", "t-evacuation"),

    dep("t-peinture-ch2", "t-nettoyage-ch2"),
    dep("t-nettoyage-ch2", "t-evacuation"),
  ];

  return {
    projects: [project],
    tasks,
    dependencies,
    members,
    assignments: [],
  };
}

function dep(taskId: string, dependsOnTaskId: string): TaskDependency {
  return { id: uuid(), taskId, dependsOnTaskId };
}
