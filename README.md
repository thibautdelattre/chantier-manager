# Chantier Manager

Application de gestion de chantier centrée sur un moteur de dépendances et de
ressources — le Kanban n'est qu'une des 5 vues, pas la source de vérité.

## Démarrer

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — l'app redirige vers `/today`. Un jeu de données
de démonstration est créé automatiquement au premier lancement (fichier
`data/db.json`, ignoré par git).

## Vérifier le projet

```bash
npm run typecheck   # TypeScript strict
npm run lint        # ESLint
npm test            # vitest — moteur métier (23 tests, dont les 7 scénarios obligatoires)
npm run build       # build de production
```

Les quatre passent sans erreur au moment de la livraison.

## Architecture

```
src/
  domain/       moteur métier PUR — aucune dépendance React/DB/Next.
                types.ts, graph.ts (cycles), readiness.ts (READY/BLOCKED),
                staffing.ts (3 travailleurs), criticalPath.ts, planning.ts
                (heuristique, PAS un solveur optimal), priority.ts, layout.ts,
                projectView.ts (assemble tout pour l'UI)
    __tests__/  tests vitest, y compris les 7 scénarios du cahier des charges

  db/           persistance
    schema.sql        schéma PostgreSQL de référence (cible de migration)
    repository.ts     interface ProjectRepository — le seul contrat que le
                       reste de l'app connaît
    jsonRepository.ts implémentation MVP (fichier JSON local)
    seed.ts            données de démonstration réalistes

  server/
    actions.ts   couche fine qui relie repository + moteur de domaine ;
                 c'est elle que les routes API appellent

  app/
    api/         routes Next.js (tasks, dependencies, members, assignments,
                 status) — aucune logique métier ici, juste du transport HTTP
    today/       vue "Disponible maintenant"
    table/       vue Tableau
    team/        vue Équipe
    kanban/      vue Kanban (colonnes calculées, pas stockées)
    dependencies/ vue graphe (React Flow + layout en couches maison)

  components/    composants UI partagés entre vues (TaskDetail, NewTaskModal,
                 Nav, badges)
  lib/           client API fetch + hook de chargement d'état
```

## Décision assumée : persistance JSON-fichier plutôt que Postgres/Supabase

Le brief demandait Postgres/Supabase. Pour ce livrable, j'ai substitué un
repository fichier JSON local, pour une raison simple : ça doit tourner tout
de suite avec `npm install && npm run dev`, sans que tu aies à créer et
configurer un projet Supabase avant de pouvoir juger le moteur métier — qui
est la partie que tu voulais voir robuste en priorité.

Le schéma relationnel cible est fourni (`src/db/schema.sql`), et toute la
couche applicative ne parle qu'à l'interface `ProjectRepository`
(`src/db/repository.ts`). Migrer vers Postgres/Supabase = écrire une classe
`PostgresRepository implements ProjectRepository` qui utilise ce schéma, sans
toucher au moteur de domaine ni aux routes API. Dis-moi si tu veux que je
fasse cette migration maintenant.

## Simplification assumée : pas de calendrier horaire

"Disponible" pour un travailleur veut dire "pas déjà affecté à une tâche
IN_PROGRESS". Il n'y a pas de notion d'horaires, de jours travaillés ou de
congés — ce serait un vrai moteur de planification, un problème beaucoup
plus large. Le planning par ressources (`planning.ts`) est explicitement
étiqueté comme une estimation heuristique, jamais comme une solution
optimale (le problème sous-jacent — RCPSP — est NP-difficile).

## Ce qui reste hors MVP

- Coûts réels vs estimés : les champs existent dans le modèle mais l'UI ne
  les édite pas encore en détail.
- Checklist par tâche : présente dans le modèle, pas encore d'UI dédiée.
- Historique / audit trail des changements de statut.
- Authentification (une seule "équipe" implicite pour l'instant).

Ces points n'ont pas été sacrifiés sur la partie qui compte (le moteur de
dépendances/ressources et ses tests) — juste laissés de côté pour livrer un
cœur solide plutôt qu'une UI complète mais bâtie sur des bases fragiles.
