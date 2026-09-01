"use client";

import { useMemo, useState } from "react";
import { useProjectState } from "@/lib/useProjectState";
import { api } from "@/lib/api-client";
import { TaskDetail } from "@/components/TaskDetail";
import { NewTaskModal } from "@/components/NewTaskModal";

export default function TodayPage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const availableNow = useMemo(() => {
    if (!state) return [];
    return state.view.tasks
      .filter((t) => t.task.status === "TODO" && t.readiness.readiness === "READY")
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [state]);

  const inProgress = useMemo(() => {
    if (!state) return [];
    return state.view.tasks.filter((t) => t.task.status === "IN_PROGRESS");
  }, [state]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  async function complete(taskId: string) {
    const { unlocked } = await api.setStatus(taskId, "DONE");
    if (unlocked.length > 0) {
      setBanner(
        `✅ Tâche terminée. ${unlocked.length} nouvelle(s) tâche(s) disponible(s) : ${unlocked
          .map((t) => t.title)
          .join(", ")}`
      );
    } else {
      setBanner("✅ Tâche terminée.");
    }
    reload();
    setTimeout(() => setBanner(null), 6000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl">Disponible maintenant</h1>
          <p className="text-sm text-ink/60">
            Ce qu&apos;on peut faire tout de suite, trié par priorité.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-chantier text-white text-sm font-medium rounded px-3 py-2"
        >
          + Tâche
        </button>
      </div>

      {banner && (
        <div className="bg-ok/10 border border-ok/30 text-ok text-sm rounded px-3 py-2 mb-4">
          {banner}
        </div>
      )}

      {inProgress.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-2">
            En cours ({inProgress.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {inProgress.map((t) => (
              <div
                key={t.task.id}
                onClick={() => setOpenTaskId(t.task.id)}
                className="cursor-pointer bg-panel border border-blueprint/40 rounded-md p-3"
              >
                <p className="text-[11px] font-mono text-ink/50">{t.task.area}</p>
                <p className="font-medium text-sm">{t.task.title}</p>
                <p className="text-xs text-blueprint mt-1">
                  👤 {t.assignedMemberIds.length}/{t.task.requiredWorkers} · ⏱{" "}
                  {t.task.estimatedDurationHours}h
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-2">
          Disponible maintenant ({availableNow.length})
        </h2>
        {availableNow.length === 0 ? (
          <p className="text-sm text-ink/50 bg-panel border border-line rounded-md p-4">
            Rien de disponible pour l&apos;instant — toutes les tâches restantes sont bloquées ou en
            cours.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableNow.map((t) => (
              <div
                key={t.task.id}
                className="bg-panel border border-line rounded-md p-3 flex flex-col gap-2"
              >
                <div onClick={() => setOpenTaskId(t.task.id)} className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-mono text-ink/50">{t.task.area}</p>
                    {t.isOnCriticalPath && (
                      <span className="text-[10px] font-mono text-chantier">chemin critique</span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{t.task.title}</p>
                  <p className="text-xs text-ink/60 mt-1">
                    👤 {t.task.requiredWorkers} pers. · ⏱ {t.task.estimatedDurationHours}h
                  </p>
                  {!t.assignableNow.assignable && (
                    <p className="text-xs text-warn mt-1">
                      ⚠️ besoin {t.assignableNow.required}, {t.assignableNow.availableCount}{" "}
                      libre(s)
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => api.setStatus(t.task.id, "IN_PROGRESS").then(reload)}
                    disabled={!t.assignableNow.assignable}
                    className="flex-1 bg-blueprint text-white text-xs font-medium rounded py-1.5 disabled:opacity-40"
                  >
                    ▶️ Démarrer
                  </button>
                  <button
                    onClick={() => complete(t.task.id)}
                    className="flex-1 border border-line text-xs font-medium rounded py-1.5"
                  >
                    ✅ Terminer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
