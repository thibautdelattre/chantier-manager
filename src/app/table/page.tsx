"use client";

import { useMemo, useState } from "react";
import { useProjectState } from "@/lib/useProjectState";
import { TaskDetail } from "@/components/TaskDetail";
import { NewTaskModal } from "@/components/NewTaskModal";
import { ReadinessBadge, StaffingBadge, PriorityDot } from "@/components/badges";

export default function TablePage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filterArea, setFilterArea] = useState<string>("Toutes");

  const areas = useMemo(() => {
    if (!state) return [];
    return ["Toutes", ...Array.from(new Set(state.view.tasks.map((t) => t.task.area)))];
  }, [state]);

  const rows = useMemo(() => {
    if (!state) return [];
    return state.view.tasks
      .filter((t) => filterArea === "Toutes" || t.task.area === filterArea)
      .sort((a, b) => a.task.area.localeCompare(b.task.area) || a.task.title.localeCompare(b.task.title));
  }, [state, filterArea]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? "?";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="font-display font-bold text-xl">Tableau</h1>
          <p className="text-sm text-ink/60">Vue complète du chantier.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="border border-line rounded px-2 py-1.5 text-sm bg-white"
          >
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNew(true)}
            className="bg-chantier text-white text-sm font-medium rounded px-3 py-2"
          >
            + Tâche
          </button>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 font-mono border-b border-line">
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Tâche</th>
              <th className="px-3 py-2">Pièce</th>
              <th className="px-3 py-2">Disponibilité</th>
              <th className="px-3 py-2">Dépend de</th>
              <th className="px-3 py-2">Personnes</th>
              <th className="px-3 py-2">Affecté à</th>
              <th className="px-3 py-2">Durée</th>
              <th className="px-3 py-2">Coût</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.task.id}
                onClick={() => setOpenTaskId(r.task.id)}
                className="border-b border-line/60 last:border-0 hover:bg-paper cursor-pointer"
              >
                <td className="px-3 py-2">
                  <PriorityDot priority={r.task.priority} />
                </td>
                <td className="px-3 py-2 font-medium">{r.task.title}</td>
                <td className="px-3 py-2 text-ink/60">{r.task.area}</td>
                <td className="px-3 py-2">
                  <ReadinessBadge view={r} />
                </td>
                <td className="px-3 py-2 text-xs text-ink/60">
                  {r.readiness.blockedBy.length === 0
                    ? "—"
                    : r.readiness.blockedBy.map((b) => b.title).join(", ")}
                </td>
                <td className="px-3 py-2">
                  <StaffingBadge view={r} />
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.assignedMemberIds.length === 0
                    ? "—"
                    : r.assignedMemberIds.map(memberName).join(", ")}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.task.estimatedDurationHours}h</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.task.estimatedCost != null ? `${r.task.estimatedCost} €` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
