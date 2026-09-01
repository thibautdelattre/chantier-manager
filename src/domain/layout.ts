/**
 * Layout en couches pour le graphe de dépendances (utilisé par la vue
 * React Flow). Placement pur : colonne = distance topologique depuis les
 * racines (tâches sans dépendance), ligne = position dans la couche.
 */

import type { Task, TaskDependency } from "./types";
import { directDependenciesOf } from "./graph";

export interface NodePosition {
  taskId: string;
  column: number;
  row: number;
  x: number;
  y: number;
}

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 110;

export function computeLayeredLayout(
  tasks: Task[],
  dependencies: TaskDependency[]
): NodePosition[] {
  const depthCache = new Map<string, number>();
  const taskIds = new Set(tasks.map((t) => t.id));

  function depthOf(id: string, visiting: Set<string>): number {
    if (depthCache.has(id)) return depthCache.get(id) as number;
    if (visiting.has(id)) return 0; // sécurité anti-cycle, ne devrait pas arriver
    visiting.add(id);

    const deps = directDependenciesOf(id, dependencies).filter((d) => taskIds.has(d));
    const depth = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => depthOf(d, visiting)));
    depthCache.set(id, depth);
    return depth;
  }

  const columns = new Map<number, string[]>();
  for (const t of tasks) {
    const col = depthOf(t.id, new Set());
    const arr = columns.get(col) ?? [];
    arr.push(t.id);
    columns.set(col, arr);
  }

  const positions: NodePosition[] = [];
  for (const [col, ids] of columns.entries()) {
    ids.forEach((id, row) => {
      positions.push({
        taskId: id,
        column: col,
        row,
        x: col * COLUMN_WIDTH,
        y: row * ROW_HEIGHT,
      });
    });
  }
  return positions;
}
