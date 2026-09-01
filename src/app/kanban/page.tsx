"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useProjectState } from "@/lib/useProjectState";
import { api } from "@/lib/api-client";
import { TaskDetail } from "@/components/TaskDetail";
import { NewTaskModal } from "@/components/NewTaskModal";
import type { TaskView } from "@/domain/projectView";

type ColumnId = "blocked" | "available" | "in_progress" | "done";

const COLUMNS: { id: ColumnId; label: string; color: string }[] = [
  { id: "blocked", label: "Bloqué", color: "text-warn" },
  { id: "available", label: "Disponible", color: "text-ok" },
  { id: "in_progress", label: "En cours", color: "text-blueprint" },
  { id: "done", label: "Terminé", color: "text-ink/50" },
];

function columnOf(t: TaskView): ColumnId {
  if (t.task.status === "DONE") return "done";
  if (t.task.status === "IN_PROGRESS") return "in_progress";
  return t.readiness.readiness === "READY" ? "available" : "blocked";
}

function Card({ view, onOpen }: { view: TaskView; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: view.task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`bg-panel border border-line rounded-md p-2.5 cursor-grab active:cursor-grabbing text-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <p className="text-[10px] font-mono text-ink/50">{view.task.area}</p>
      <p className="font-medium">{view.task.title}</p>
      <p className="text-xs text-ink/50 mt-1">
        👤 {view.assignedMemberIds.length}/{view.task.requiredWorkers} · ⏱{" "}
        {view.task.estimatedDurationHours}h
      </p>
    </div>
  );
}

function Column({
  id,
  label,
  color,
  items,
  onOpen,
}: {
  id: ColumnId;
  label: string;
  color: string;
  items: TaskView[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-paper border border-line rounded-md p-2 min-h-[200px] ${
        isOver ? "ring-2 ring-blueprint" : ""
      }`}
    >
      <div className="flex justify-between items-center px-1 mb-2">
        <h3 className={`text-xs font-mono uppercase tracking-wide ${color}`}>{label}</h3>
        <span className="text-xs font-mono text-ink/40">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((v) => (
          <Card key={v.task.id} view={v} onOpen={() => onOpen(v.task.id)} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<ColumnId, TaskView[]> = {
      blocked: [],
      available: [],
      in_progress: [],
      done: [],
    };
    if (!state) return g;
    for (const t of state.view.tasks) g[columnOf(t)].push(t);
    return g;
  }, [state]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const target = event.over?.id as ColumnId | undefined;
    if (!target || !state) return;

    const view = state.view.tasks.find((t) => t.task.id === taskId);
    if (!view) return;
    const current = columnOf(view);
    if (current === target) return;

    if (target === "blocked") {
      setNotice("La colonne « Bloqué » est calculée automatiquement à partir des dépendances — on ne peut pas y déplacer une carte à la main.");
      setTimeout(() => setNotice(null), 5000);
      return;
    }
    if (target === "available") {
      // revenir à TODO (annule le démarrage) — seulement valide depuis "en cours"
      if (current !== "in_progress") return;
      await api.setStatus(taskId, "TODO");
    } else if (target === "in_progress") {
      if (current !== "available" && current !== "done") return;
      if (current === "available" && !view.assignableNow.assignable) {
        setNotice("Pas assez de personnes disponibles pour démarrer cette tâche maintenant.");
        setTimeout(() => setNotice(null), 5000);
        return;
      }
      await api.setStatus(taskId, "IN_PROGRESS");
    } else if (target === "done") {
      const { unlocked } = await api.setStatus(taskId, "DONE");
      if (unlocked.length > 0) {
        setNotice(`✅ Débloque : ${unlocked.map((t) => t.title).join(", ")}`);
        setTimeout(() => setNotice(null), 6000);
      }
    }
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl">Kanban</h1>
          <p className="text-sm text-ink/60">
            Les colonnes reflètent l&apos;état métier — elles ne sont pas la source de vérité.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-chantier text-white text-sm font-medium rounded px-3 py-2"
        >
          + Tâche
        </button>
      </div>

      {notice && (
        <div className="bg-blueprint/10 border border-blueprint/30 text-blueprint text-sm rounded px-3 py-2 mb-4">
          {notice}
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COLUMNS.map((c) => (
            <Column
              key={c.id}
              id={c.id}
              label={c.label}
              color={c.color}
              items={grouped[c.id]}
              onOpen={setOpenTaskId}
            />
          ))}
        </div>
      </DndContext>

      {openTaskId && (
        <TaskDetail
          taskId={openTaskId}
          state={state}
          onClose={() => setOpenTaskId(null)}
          onChanged={reload}
        />
      )}
      {showNew && <NewTaskModal onClose={() => setShowNew(false)} onCreated={reload} />}
    </div>
  );
}
