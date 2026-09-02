"use client";

import { useMemo, useState } from "react";
import { useProjectState } from "@/lib/useProjectState";
import { TaskDetail } from "@/components/TaskDetail";
import type { TaskView } from "@/domain/projectView";

// Le planning affiché vient de l'estimation avec ressources (3 personnes) —
// pas du chemin critique théorique, sinon les barres se chevaucheraient
// comme si l'équipe était illimitée. Le chemin critique reste indiqué
// visuellement (bordure), mais les DATES viennent du planning réaliste.
const HOURS_PER_DAY = 7; // journée de chantier type, cohérente avec l'estimation de temps
const DAY_WIDTH = 46; // px
const ROW_HEIGHT = 38; // px
const LABEL_WIDTH = 220; // px, colonne de gauche fixe

function statusColor(t: TaskView): { bg: string; border: string; text: string } {
  if (t.task.status === "DONE") return { bg: "#4E7A4E", border: "#3d613d", text: "#fff" };
  if (t.task.status === "IN_PROGRESS") return { bg: "#1D4E89", border: "#153a66", text: "#fff" };
  if (t.readiness.readiness === "READY") return { bg: "#ffffff", border: "#4E7A4E", text: "#211F1B" };
  return { bg: "#ffffff", border: "#B33A2E", text: "#211F1B" };
}

export default function DependenciesPage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const chart = useMemo(() => {
    if (!state) return null;
    const { tasks, resourcePlan } = state.view;
    const stepByTaskId = new Map(resourcePlan.steps.map((s) => [s.taskId, s]));

    const rows = tasks
      .filter((t) => stepByTaskId.has(t.task.id))
      .map((t) => ({ view: t, step: stepByTaskId.get(t.task.id)! }))
      .sort(
        (a, b) =>
          a.step.startHour - b.step.startHour || a.view.task.title.localeCompare(b.view.task.title)
      );

    const unscheduled = tasks.filter((t) => !stepByTaskId.has(t.task.id));

    const totalHours = resourcePlan.totalDurationHours;
    const totalDays = Math.max(1, Math.ceil(totalHours / HOURS_PER_DAY));
    const chartWidth = totalDays * DAY_WIDTH;
    const chartHeight = rows.length * ROW_HEIGHT;

    const xForHour = (h: number) => (h / HOURS_PER_DAY) * DAY_WIDTH;

    // Dépendances → segments à tracer entre la fin de la barre "amont" et le
    // début de la barre "aval", reconstruites depuis les vues (comme pour
    // le graphe précédent).
    const rowIndexByTaskId = new Map(rows.map((r, i) => [r.view.task.id, i]));
    const connectors = rows.flatMap((r) =>
      r.view.readiness.blockedBy
        .map((b) => {
          const fromIdx = rowIndexByTaskId.get(b.taskId);
          const toIdx = rowIndexByTaskId.get(r.view.task.id);
          const fromStep = stepByTaskId.get(b.taskId);
          if (fromIdx === undefined || toIdx === undefined || !fromStep) return null;
          return {
            key: `${b.taskId}__${r.view.task.id}`,
            x1: xForHour(fromStep.endHour),
            y1: fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
            x2: xForHour(r.step.startHour),
            y2: toIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
    );

    return { rows, unscheduled, totalDays, chartWidth, chartHeight, xForHour, connectors };
  }, [state]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state || !chart) return <p className="text-sm text-warn">{error}</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-1">Gantt</h1>
      <p className="text-sm text-ink/60 mb-1">
        Planning estimé avec vos 3 personnes — les barres qui se suivent au lieu de se chevaucher
        montrent où l&apos;équipe est le facteur limitant, pas seulement les dépendances.
      </p>
      <p className="text-xs text-ink/40 mb-4">
        ⚠️ Estimation heuristique, pas un planning optimal garanti. Bordure orange = tâche sur le
        chemin critique théorique (déterminerait la durée minimale si l&apos;équipe était
        illimitée). Vert = terminée, bleu = en cours, contour vert = disponible, contour rouge =
        bloquée.
      </p>

      <div className="bg-panel border border-line rounded-md overflow-auto" style={{ maxHeight: "72vh" }}>
        <div style={{ width: LABEL_WIDTH + chart.chartWidth, minWidth: "100%" }}>
          {/* En-tête : numéros de jour */}
          <div className="flex sticky top-0 z-10 bg-panel border-b border-line">
            <div
              className="shrink-0 border-r border-line font-mono text-[10px] text-ink/40 flex items-end px-2 pb-1"
              style={{ width: LABEL_WIDTH, height: 28 }}
            >
              TÂCHE
            </div>
            <div className="relative" style={{ width: chart.chartWidth, height: 28 }}>
              {Array.from({ length: chart.totalDays }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-line/60 text-[10px] font-mono text-ink/40 pl-1"
                  style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                >
                  J{i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Lignes */}
          <div className="relative">
            {chart.rows.map((r) => {
              const colors = statusColor(r.view);
              const x = chart.xForHour(r.step.startHour);
              const w = Math.max(6, chart.xForHour(r.step.endHour) - x);
              return (
                <div key={r.view.task.id} className="flex" style={{ height: ROW_HEIGHT }}>
                  <div
                    className="shrink-0 border-r border-b border-line/60 flex items-center px-2 text-xs"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span className="truncate">
                      <span className="text-ink/40 font-mono text-[10px] mr-1">{r.view.task.area}</span>
                      {r.view.task.title}
                    </span>
                  </div>
                  <div className="relative border-b border-line/60" style={{ width: chart.chartWidth }}>
                    {/* grille verticale des jours */}
                    {Array.from({ length: chart.totalDays }).map((_, d) => (
                      <div
                        key={d}
                        className="absolute top-0 bottom-0 border-r border-line/30"
                        style={{ left: d * DAY_WIDTH }}
                      />
                    ))}
                    <button
                      onClick={() => setOpenTaskId(r.view.task.id)}
                      className="absolute rounded text-[11px] font-medium px-1.5 flex items-center overflow-hidden"
                      style={{
                        left: x,
                        width: w,
                        top: 6,
                        height: ROW_HEIGHT - 12,
                        background: colors.bg,
                        border: `2px solid ${r.view.isOnCriticalPath ? "#E1601F" : colors.border}`,
                        color: colors.text,
                      }}
                      title={`${r.view.task.title} — ${r.view.totalHours}h`}
                    >
                      <span className="truncate">{r.view.task.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Flèches de dépendance, superposées */}
            <svg
              className="absolute pointer-events-none"
              style={{ left: LABEL_WIDTH, top: 0, width: chart.chartWidth, height: chart.chartHeight }}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#948C7E" />
                </marker>
              </defs>
              {chart.connectors.map((c) => {
                const midX = (c.x1 + c.x2) / 2;
                return (
                  <path
                    key={c.key}
                    d={`M ${c.x1} ${c.y1} C ${midX} ${c.y1}, ${midX} ${c.y2}, ${c.x2} ${c.y2}`}
                    fill="none"
                    stroke="#948C7E"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {chart.unscheduled.length > 0 && (
        <p className="text-xs text-warn mt-3">
          {chart.unscheduled.length} tâche(s) non placée(s) dans l&apos;estimation (situation de
          blocage à vérifier) : {chart.unscheduled.map((t) => t.task.title).join(", ")}
        </p>
      )}

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
