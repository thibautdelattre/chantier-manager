import clsx from "clsx";
import type { TaskView } from "@/domain/projectView";

export function ReadinessBadge({ view }: { view: TaskView }) {
  if (view.task.status === "DONE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
        ✅ Terminée
      </span>
    );
  }
  if (view.task.status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blueprint">
        ▶️ En cours
      </span>
    );
  }
  if (view.readiness.readiness === "READY") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
        ✅ Disponible
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-warn">
      🔒 Bloquée ({view.readiness.missingCount})
    </span>
  );
}

export function StaffingBadge({ view }: { view: TaskView }) {
  const { required, availableCount, assignable } = view.assignableNow;
  const assignedCount = view.assignedMemberIds.length;

  if (assignedCount >= required) {
    return (
      <span className="text-xs font-mono text-ok">
        👥 {assignedCount}/{required} affecté(s)
      </span>
    );
  }
  if (view.readiness.readiness !== "READY" || view.task.status !== "TODO") {
    return (
      <span className="text-xs font-mono text-ink-soft">
        👥 {assignedCount}/{required}
      </span>
    );
  }
  if (assignable) {
    return (
      <span className="text-xs font-mono text-blueprint">
        👥 {assignedCount}/{required} — {availableCount} libre(s)
      </span>
    );
  }
  return (
    <span
      className={clsx("text-xs font-mono text-warn")}
      title={`Besoin de ${required}, seulement ${availableCount} disponible(s)`}
    >
      ⚠️ besoin {required} / {availableCount} libre(s)
    </span>
  );
}

export function PriorityDot({ priority }: { priority: TaskView["task"]["priority"] }) {
  const color =
    priority === "CRITICAL"
      ? "bg-warn"
      : priority === "HIGH"
        ? "bg-chantier"
        : priority === "LOW"
          ? "bg-ink/20"
          : "bg-blueprint/40";
  return <span className={clsx("inline-block w-2 h-2 rounded-full", color)} title={priority} />;
}
