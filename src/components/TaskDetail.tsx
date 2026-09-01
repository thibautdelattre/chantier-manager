"use client";

import { useState } from "react";
import type { StateResponse } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { ReadinessBadge, StaffingBadge } from "./badges";
import type { ChecklistItem, TaskDependency } from "@/domain/types";
import { wouldCreateCycle } from "@/domain/graph";

export function TaskDetail({
  taskId,
  state,
  onClose,
  onChanged,
}: {
  taskId: string;
  state: StateResponse;
  onClose: () => void;
  onChanged: () => void;
}) {
  const view = state.view.tasks.find((t) => t.task.id === taskId);
  const [depTarget, setDepTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");

  if (!view) return null;
  const { task } = view;

  const otherTasks = state.view.tasks
    .filter((t) => t.task.id !== taskId)
    .sort((a, b) => a.task.title.localeCompare(b.task.title));

  // Reconstruit la liste des arêtes du graphe à partir des vues (chaque
  // "blockedBy" d'une tâche EST une dépendance) pour pouvoir filtrer, côté
  // client, les choix qui n'ont aucune chance d'aboutir : déjà présents ou
  // créant un cycle. Ça évite de proposer un choix voué à échouer.
  const allDependencyEdges: TaskDependency[] = state.view.tasks.flatMap((t) =>
    t.readiness.blockedBy.map((b) => ({
      id: `${t.task.id}__${b.taskId}`,
      taskId: t.task.id,
      dependsOnTaskId: b.taskId,
    }))
  );
  const alreadyDependsOnIds = new Set(view.readiness.blockedBy.map((b) => b.taskId));
  const selectableTasks = otherTasks.filter(
    (t) =>
      !alreadyDependsOnIds.has(t.task.id) &&
      !wouldCreateCycle(task.id, t.task.id, allDependencyEdges)
  );

  const dependsOnViews = state.view.tasks.filter((t) =>
    view.readiness.blockedBy.some((b) => b.taskId === t.task.id)
  );

  const unlocks = state.view.tasks.filter((t) =>
    t.readiness.blockedBy.some((b) => b.taskId === task.id)
  );

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saveChecklist(next: ChecklistItem[]) {
    return withBusy(() => api.updateTask(task.id, { checklist: next }));
  }

  function addChecklistItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      label,
      done: false,
    };
    setNewItemLabel("");
    saveChecklist([...task.checklist, item]);
  }

  function toggleChecklistItem(id: string) {
    saveChecklist(
      task.checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    );
  }

  function deleteChecklistItem(id: string) {
    saveChecklist(task.checklist.filter((i) => i.id !== id));
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-panel border-l border-line overflow-y-auto p-5 pb-24">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink/50 font-mono">
              {task.area}
            </p>
            <input
              className="font-display font-bold text-lg bg-transparent border-b border-transparent focus:border-line outline-none w-full"
              defaultValue={task.title}
              onBlur={(e) =>
                e.target.value !== task.title &&
                withBusy(() => api.updateTask(task.id, { title: e.target.value }))
              }
            />
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <ReadinessBadge view={view} />
          <StaffingBadge view={view} />
        </div>

        {error && (
          <p className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1 mb-3">
            {error}
          </p>
        )}

        {/* Status actions */}
        <div className="flex gap-2 mb-5">
          {task.status !== "IN_PROGRESS" && task.status !== "DONE" && (
            <button
              disabled={busy}
              onClick={() => withBusy(() => api.setStatus(task.id, "IN_PROGRESS").then(() => {}))}
              className="flex-1 bg-blueprint text-white text-sm font-medium rounded py-2 disabled:opacity-50"
            >
              ▶️ Démarrer
            </button>
          )}
          {task.status !== "DONE" && (
            <button
              disabled={busy}
              onClick={() => withBusy(() => api.setStatus(task.id, "DONE").then(() => {}))}
              className="flex-1 bg-ok text-white text-sm font-medium rounded py-2 disabled:opacity-50"
            >
              ✅ Terminer
            </button>
          )}
          {task.status === "DONE" && (
            <button
              disabled={busy}
              onClick={() => withBusy(() => api.setStatus(task.id, "TODO").then(() => {}))}
              className="flex-1 border border-line text-sm font-medium rounded py-2"
            >
              Rouvrir
            </button>
          )}
        </div>

        {/* Bloquée par */}
        {view.readiness.blockedBy.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">
              Dépend de
            </h3>
            <ul className="space-y-1">
              {dependsOnViews.map((d) => (
                <li key={d.task.id} className="flex justify-between text-sm border-b border-line/60 py-1">
                  <span>{d.task.title}</span>
                  <span>{d.task.status === "DONE" ? "✅" : "❌"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ajouter une dépendance */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">
            Ajouter une dépendance
          </h3>
          {selectableTasks.length === 0 ? (
            <p className="text-xs text-ink/50">
              Aucune tâche disponible à ajouter (déjà liées, ou créeraient un cycle).
            </p>
          ) : (
            <div className="flex gap-2">
              <select
                value={depTarget}
                onChange={(e) => setDepTarget(e.target.value)}
                className="flex-1 border border-line rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Choisir une tâche…</option>
                {selectableTasks.map((t) => (
                  <option key={t.task.id} value={t.task.id}>
                    {t.task.area} — {t.task.title}
                  </option>
                ))}
              </select>
              <button
                disabled={!depTarget || busy}
                onClick={() =>
                  withBusy(async () => {
                    await api.addDependency(task.id, depTarget);
                    setDepTarget("");
                  })
                }
                className="bg-blueprint text-white text-sm rounded px-3 disabled:opacity-40"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Débloque */}
        {unlocks.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">
              Débloque
            </h3>
            <ul className="text-sm space-y-1">
              {unlocks.map((u) => (
                <li key={u.task.id} className="border-b border-line/60 py-1">
                  {u.task.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Affectation */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">
            Affectation ({view.assignedMemberIds.length}/{task.requiredWorkers})
          </h3>
          <div className="space-y-1.5">
            {state.members.map((m) => {
              const isAssigned = view.assignedMemberIds.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-sm border border-line rounded px-2 py-1.5 bg-white"
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    disabled={busy}
                    onChange={(e) =>
                      withBusy(() =>
                        e.target.checked
                          ? api.assignMember(task.id, m.id)
                          : api.unassignMember(task.id, m.id)
                      )
                    }
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
        </div>

        {/* Checklist */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">
            Checklist
            {task.checklist.length > 0 && (
              <span className="text-ink/40 normal-case tracking-normal ml-1">
                ({task.checklist.filter((i) => i.done).length}/{task.checklist.length})
              </span>
            )}
          </h3>

          {task.checklist.length > 0 && (
            <ul className="space-y-1 mb-2">
              {task.checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 border border-line rounded px-2 py-1.5 bg-white text-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={busy}
                    onChange={() => toggleChecklistItem(item.id)}
                  />
                  <span className={item.done ? "flex-1 line-through text-ink/40" : "flex-1"}>
                    {item.label}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    disabled={busy}
                    className="text-ink/40 hover:text-warn text-base leading-none"
                    aria-label="Supprimer cette étape"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
              placeholder="Ajouter une étape…"
              className="flex-1 border border-line rounded px-2 py-1.5 text-sm bg-white"
            />
            <button
              disabled={!newItemLabel.trim() || busy}
              onClick={addChecklistItem}
              className="bg-blueprint text-white text-sm rounded px-3 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-1.5">Notes</h3>
          <textarea
            defaultValue={task.notes}
            rows={3}
            className="w-full border border-line rounded px-2 py-1.5 text-sm bg-white"
            onBlur={(e) =>
              e.target.value !== task.notes &&
              withBusy(() => api.updateTask(task.id, { notes: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink/50 font-mono">Durée estimée (h)</span>
            <input
              type="number"
              step="0.5"
              defaultValue={task.estimatedDurationHours}
              className="border border-line rounded px-2 py-1.5 bg-white"
              onBlur={(e) =>
                withBusy(() =>
                  api.updateTask(task.id, { estimatedDurationHours: Number(e.target.value) })
                )
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink/50 font-mono">Personnes nécessaires</span>
            <input
              type="number"
              min={1}
              max={3}
              defaultValue={task.requiredWorkers}
              className="border border-line rounded px-2 py-1.5 bg-white"
              onBlur={(e) =>
                withBusy(() =>
                  api.updateTask(task.id, { requiredWorkers: Number(e.target.value) })
                )
              }
            />
          </label>
        </div>

        <button
          onClick={() =>
            withBusy(async () => {
              if (confirm("Supprimer cette tâche ? Les dépendances liées seront nettoyées.")) {
                await api.deleteTask(task.id);
                onClose();
              }
            })
          }
          className="text-xs text-warn hover:underline"
        >
          Supprimer la tâche
        </button>
      </div>
    </div>
  );
}
