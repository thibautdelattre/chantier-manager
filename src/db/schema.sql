-- Schéma PostgreSQL / Supabase de référence.
--
-- Le MVP livré ici fait tourner un repository JSON-fichier local (voir
-- README, section "Persistance") pour rester exécutable sans service
-- externe. Ce schéma est la cible de migration : la couche domaine et
-- l'interface Repository (repository.ts) sont écrites pour être
-- indépendantes du backend, donc migrer vers Postgres = écrire une nouvelle
-- classe qui implémente `ProjectRepository`, sans toucher au moteur métier.

create table if not exists project (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists member (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,
  name text not null
);

create table if not exists task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id) on delete cascade,

  title text not null,
  description text not null default '',
  area text not null default '',

  status text not null default 'TODO' check (status in ('TODO','IN_PROGRESS','DONE')),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','CRITICAL')),

  estimated_duration_hours numeric not null default 0,
  actual_duration_hours numeric,

  required_workers integer not null default 1 check (required_workers >= 1),

  estimated_cost numeric,
  actual_cost numeric,

  materials jsonb not null default '[]',
  notes text not null default '',
  checklist jsonb not null default '[]',
  custom_fields jsonb not null default '{}',

  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Une ligne = une arête du DAG : task_id "dépend de" depends_on_task_id.
create table if not exists task_dependency (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references task(id) on delete cascade,
  depends_on_task_id uuid not null references task(id) on delete cascade,
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create index if not exists idx_task_dependency_task on task_dependency(task_id);
create index if not exists idx_task_dependency_depends_on on task_dependency(depends_on_task_id);

-- Relation many-to-many Task <-> Member.
create table if not exists task_assignment (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references task(id) on delete cascade,
  member_id uuid not null references member(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (task_id, member_id)
);

create index if not exists idx_task_assignment_task on task_assignment(task_id);
create index if not exists idx_task_assignment_member on task_assignment(member_id);

-- NOTE: la détection de cycle N'EST PAS appliquée en contrainte SQL (un
-- CHECK ne peut pas exprimer "pas de cycle dans le graphe"). Elle reste de
-- la responsabilité du moteur applicatif (src/domain/graph.ts), qui DOIT
-- être le seul point d'entrée pour créer une task_dependency.
