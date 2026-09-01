"use client";

import { useState } from "react";
import { useProjectState } from "@/lib/useProjectState";
import { api } from "@/lib/api-client";
import { TaskDetail } from "@/components/TaskDetail";

export default function TeamPage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  const { members } = state;

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-1">Équipe</h1>
      <p className="text-sm text-ink/60 mb-4">
        Ce que fait chacune des {members.length} personnes, et qui est libre.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {members.map((m) => {
          const assignedTasks = state.view.tasks.filter(
            (t) => t.assignedMemberIds.includes(m.id) && t.task.status !== "DONE"
          );
          const busyOnInProgress = assignedTasks.some((t) => t.task.status === "IN_PROGRESS");

          return (
            <div key={m.id} className="bg-panel border border-line rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                {renaming === m.id ? (
                  <input
                    autoFocus
                    defaultValue={m.name}
                    onBlur={(e) => {
                      api.renameMember(m.id, e.target.value).then(reload);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="font-display font-bold text-base border-b border-line bg-transparent outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setRenaming(m.id)}
                    className="font-display font-bold text-base cursor-pointer"
                    title="Cliquer pour renommer"
                  >
                    {m.name}
                  </h2>
                )}
                <span
                  className={
                    busyOnInProgress
                      ? "text-xs font-mono text-blueprint"
                      : "text-xs font-mono text-ok"
                  }
                >
                  {busyOnInProgress ? "occupée" : "disponible"}
                </span>
              </div>

              {assignedTasks.length === 0 ? (
                <p className="text-sm text-ink/50">Aucune tâche affectée.</p>
              ) : (
                <ul className="space-y-2">
                  {assignedTasks.map((t) => (
                    <li
                      key={t.task.id}
                      onClick={() => setOpenTaskId(t.task.id)}
                      className="cursor-pointer border border-line rounded px-2 py-1.5 text-sm hover:bg-paper"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{t.task.title}</span>
                        <span className="text-xs text-ink/50">
                          {t.task.status === "IN_PROGRESS" ? "▶️" : "⏳"}
                        </span>
                      </div>
                      <span className="text-xs text-ink/50">
                        {t.task.area} · {t.task.estimatedDurationHours}h
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {openTaskId && (
        <TaskDetail
          taskId={openTaskId}
          state={state}
          onClose={() => setOpenTaskId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
