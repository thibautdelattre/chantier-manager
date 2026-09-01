"use client";

import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useProjectState } from "@/lib/useProjectState";
import { computeLayeredLayout } from "@/domain/layout";
import { TaskDetail } from "@/components/TaskDetail";

function nodeColor(t: {
  status: string;
  readiness: "BLOCKED" | "READY";
}): { bg: string; border: string; text: string } {
  if (t.status === "DONE") return { bg: "#4E7A4E", border: "#3d613d", text: "#fff" };
  if (t.status === "IN_PROGRESS") return { bg: "#1D4E89", border: "#153a66", text: "#fff" };
  if (t.readiness === "READY") return { bg: "#ffffff", border: "#4E7A4E", text: "#211F1B" };
  return { bg: "#ffffff", border: "#B33A2E", text: "#211F1B" };
}

export default function DependenciesPage() {
  const { state, error, loading, reload } = useProjectState();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const { nodes, edges } = useMemo((): { nodes: Node[]; edges: Edge[] } => {
    if (!state) return { nodes: [], edges: [] };
    const tasks = state.view.tasks.map((t) => t.task);
    const dependencies = state.view.tasks.flatMap((t) =>
      t.readiness.blockedBy.map((b) => ({
        id: `${t.task.id}__${b.taskId}`,
        taskId: t.task.id,
        dependsOnTaskId: b.taskId,
      }))
    );
    const positions = computeLayeredLayout(tasks, dependencies);
    const posById = new Map(positions.map((p) => [p.taskId, p]));

    const nodes: Node[] = state.view.tasks.map((t) => {
      const pos = posById.get(t.task.id) ?? { x: 0, y: 0 };
      const colors = nodeColor({ status: t.task.status, readiness: t.readiness.readiness });
      const dependents = state.view.tasks.filter((o) =>
        o.readiness.blockedBy.some((b) => b.taskId === t.task.id)
      ).length;
      return {
        id: t.task.id,
        position: { x: pos.x, y: pos.y },
        data: {
          label: (
            <div className="text-xs">
              <div className="font-mono text-[9px] opacity-70">{t.task.area}</div>
              <div className="font-medium">{t.task.title}</div>
              {dependents > 0 && (
                <div className="text-[9px] opacity-70 mt-0.5">débloque {dependents}</div>
              )}
            </div>
          ),
        },
        style: {
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          color: colors.text,
          borderRadius: 6,
          padding: 6,
          width: 200,
        },
      };
    });

    const edges: Edge[] = dependencies.map((d) => ({
      id: d.id,
      source: d.dependsOnTaskId,
      target: d.taskId,
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#948C7E" },
      style: { stroke: "#948C7E" },
    }));

    return { nodes, edges };
  }, [state]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-1">Dépendances</h1>
      <p className="text-sm text-ink/60 mb-4">
        Vert = disponible, rouge = bloquée, bleu = en cours, gris = terminée. Cliquer une tâche
        pour l&apos;ouvrir.
      </p>
      <div className="bg-panel border border-line rounded-md" style={{ height: "70vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setOpenTaskId(node.id)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#DBD5C6" gap={20} />
          <Controls />
        </ReactFlow>
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
