import { v4 as uuid } from "uuid";
import type { Member, Project, Task, TaskDependency, DurationMode } from "@/domain/types";

interface RawTask {
  id: number;
  title: string;
  mode: DurationMode;
  hours: number; // total si FORFAIT, taux par unité si PER_UNIT
  unitLabel?: string;
  unitCount?: number; // nombre d'unités connu ; laissé à 0 ("à saisir") sinon
  after: number[]; // IDs des tâches prérequises (d'après "Doit être réalisée après")
  note?: string; // pour les durées non fournies ("à estimer", "durée manquante"...)
  noWorkerNeeded?: boolean; // temps de séchage : personne n'a besoin d'être présent
}

// Directement transcrit du tableau fourni (35 tâches, dépendances par ID).
const RAW: RawTask[] = [
  { id: 1, title: "Installation du lavabo de chantier", mode: "FORFAIT", hours: 1.5, after: [] },
  { id: 2, title: "Nettoyage initial et dégagement des pièces", mode: "FORFAIT", hours: 3.5, after: [1] },
  { id: 3, title: "Enlever les portes", mode: "PER_UNIT", hours: 0.33, unitLabel: "porte", after: [2] },
  { id: 4, title: "Déposer les anciens radiateurs si nécessaire", mode: "FORFAIT", hours: 0, after: [2], note: "Durée à estimer." },
  { id: 5, title: "Démolition des murs et évacuation", mode: "FORFAIT", hours: 36, after: [3, 4] },
  { id: 6, title: "Démolition des sols et évacuation", mode: "FORFAIT", hours: 12, after: [5] },
  { id: 7, title: "Rebouchage béton et remaçonnage", mode: "FORFAIT", hours: 4.5, after: [5, 6] },
  { id: 8, title: "Séchage de la maçonnerie", mode: "FORFAIT", hours: 24, after: [7], note: "Temps de séchage — à ajuster selon météo/produit.", noWorkerNeeded: true },
  { id: 9, title: "Préparation des évacuations d'eau", mode: "FORFAIT", hours: 0, after: [5, 6], note: "Durée manquante — à estimer." },
  { id: 10, title: "Préparation plomberie douche, vasque et WC", mode: "FORFAIT", hours: 0, after: [9], note: "Durée à estimer." },
  { id: 11, title: "Isolation des murs", mode: "FORFAIT", hours: 18, after: [7, 8, 9, 10], note: "18h (façade avant) ou 36h (avant + arrière) selon l'étendue — à ajuster." },
  { id: 12, title: "Pose des plaques de plâtre", mode: "FORFAIT", hours: 0, after: [11], note: "Durée manquante — dépend du nombre de plaques (voir page Matériel)." },
  { id: 13, title: "Rebouchage des trous dans le placo", mode: "PER_UNIT", hours: 1, unitLabel: "trou", after: [12] },
  { id: 14, title: "Bandes armées et enduit", mode: "FORFAIT", hours: 24, after: [12, 13], note: "24h si peu de découpes, 36h si beaucoup — à ajuster." },
  { id: 15, title: "Séchage de l'enduit", mode: "FORFAIT", hours: 24, after: [14], note: "Temps de séchage — à ajuster.", noWorkerNeeded: true },
  { id: 16, title: "Ponçage des murs", mode: "FORFAIT", hours: 18, after: [15] },
  { id: 17, title: "Ponçage des bâtis de porte", mode: "PER_UNIT", hours: 0.5, unitLabel: "bâti", after: [15] },
  { id: 18, title: "Ponçage de l'escalier", mode: "FORFAIT", hours: 18, after: [6] },
  { id: 19, title: "Pose des supports de radiateur", mode: "PER_UNIT", hours: 0.75, unitLabel: "radiateur", after: [16] },
  { id: 20, title: "Première couche de peinture", mode: "FORFAIT", hours: 18, after: [16, 17, 19] },
  { id: 21, title: "Séchage de la première couche", mode: "FORFAIT", hours: 12, after: [20], note: "Temps de séchage — à ajuster.", noWorkerNeeded: true },
  { id: 22, title: "Deuxième couche de peinture", mode: "FORFAIT", hours: 15, after: [21] },
  { id: 23, title: "Séchage de la deuxième couche", mode: "FORFAIT", hours: 12, after: [22], note: "Temps de séchage — à ajuster.", noWorkerNeeded: true },
  { id: 24, title: "Vitrification ou traitement de l'escalier", mode: "FORFAIT", hours: 18, after: [18] },
  { id: 25, title: "Séchage de l'escalier", mode: "FORFAIT", hours: 24, after: [24], note: "Temps de séchage — à ajuster.", noWorkerNeeded: true },
  { id: 26, title: "Sol du deuxième étage", mode: "FORFAIT", hours: 8, after: [23] },
  { id: 27, title: "Sol du premier étage", mode: "FORFAIT", hours: 18, after: [26] },
  { id: 28, title: "Sol du rez-de-chaussée", mode: "FORFAIT", hours: 18, after: [27] },
  { id: 29, title: "Installation des nouvelles portes", mode: "PER_UNIT", hours: 0.5, unitLabel: "porte", after: [23, 28] },
  { id: 30, title: "Changement des radiateurs", mode: "PER_UNIT", hours: 1.3, unitLabel: "radiateur", after: [23] },
  { id: 31, title: "Installation des toilettes", mode: "FORFAIT", hours: 3, after: [10, 22, 28] },
  { id: 32, title: "Installation cabine de douche et meuble vasque", mode: "FORFAIT", hours: 7.5, after: [10, 22, 28] },
  { id: 33, title: "Installation rangements, frigo et évier", mode: "FORFAIT", hours: 18, after: [23, 28, 10] },
  { id: 34, title: "Retouches et essais", mode: "FORFAIT", hours: 0, after: [29, 30, 31, 32, 33], note: "Durée à estimer." },
  { id: 35, title: "Nettoyage de fin de chantier", mode: "FORFAIT", hours: 18, after: [34] },
];

function idOf(n: number): string {
  return `t${n}`;
}

/**
 * Construit le jeu de données du chantier à partir du tableau fourni par
 * l'utilisateur (35 tâches, séquence linéaire avec quelques embranchements
 * parallèles). Les tâches "séchage" ont requiredWorkers = 0 : personne n'a
 * besoin d'être présent, seul le temps doit s'écouler avant l'étape
 * suivante — mais elles bloquent quand même la disponibilité de ce qui suit.
 */
export function buildSeedData() {
  const projectId = "seed-project";
  const project: Project = {
    id: projectId,
    name: "Rénovation",
    createdAt: new Date().toISOString(),
  };

  const members: Member[] = [
    { id: "member-1", projectId, name: "Arthur" },
    { id: "member-2", projectId, name: "Victor" },
    { id: "member-3", projectId, name: "Tibo" },
  ];

  const now = new Date().toISOString();

  const tasks: Task[] = RAW.map((r) => ({
    id: idOf(r.id),
    projectId,
    title: r.title,
    description: "",
    area: "Général",
    status: "TODO",
    priority: "NORMAL",
    estimatedDurationHours: r.hours,
    actualDurationHours: null,
    durationMode: r.mode,
    unitCount: r.mode === "PER_UNIT" ? (r.unitCount ?? 0) : null,
    unitLabel: r.mode === "PER_UNIT" ? (r.unitLabel ?? null) : null,
    requiredWorkers: r.noWorkerNeeded ? 0 : 1,
    estimatedCost: null,
    actualCost: null,
    materials: [],
    notes: r.note ?? "",
    checklist: [],
    customFields: {},
    createdAt: now,
    startedAt: null,
    completedAt: null,
  }));

  const dependencies: TaskDependency[] = RAW.flatMap((r) =>
    r.after.map((a) => ({ id: uuid(), taskId: idOf(r.id), dependsOnTaskId: idOf(a) }))
  );

  return {
    projects: [project],
    tasks,
    dependencies,
    members,
    assignments: [],
  };
}
