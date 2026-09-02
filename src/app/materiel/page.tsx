"use client";

import { useMemo, useState } from "react";
import { useProjectState } from "@/lib/useProjectState";
import { api } from "@/lib/api-client";
import type { TaskView } from "@/domain/projectView";

function MaterialEditor({
  view,
  onChanged,
}: {
  view: TaskView;
  onChanged: () => void;
}) {
  const { task } = view;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(next: string[]) {
    setBusy(true);
    try {
      await api.updateTask(task.id, { materials: next });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const v = value.trim();
    if (!v) return;
    setValue("");
    save([...task.materials, v]);
  }

  function remove(idx: number) {
    save(task.materials.filter((_, i) => i !== idx));
  }

  const statusDot =
    task.status === "DONE" ? "bg-ok" : task.status === "IN_PROGRESS" ? "bg-blueprint" : "bg-ink/20";

  return (
    <div className="bg-panel border border-line rounded-md p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2">
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot}`} />
          <div>
            <p className="text-[10px] font-mono uppercase text-ink/40">{task.area}</p>
            <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
          </div>
        </div>
        {task.materials.length > 0 && (
          <span className="text-[10px] font-mono text-ink/40 shrink-0">{task.materials.length}</span>
        )}
      </div>

      {task.materials.length > 0 ? (
        <ul className="space-y-1 mb-2">
          {task.materials.map((m, idx) => (
            <li
              key={`${m}-${idx}`}
              className="flex items-center justify-between gap-2 text-xs bg-paper rounded px-2 py-1.5"
            >
              <span className="flex-1">{m}</span>
              <button
                onClick={() => remove(idx)}
                disabled={busy}
                className="text-ink/40 hover:text-warn text-sm leading-none"
                aria-label="Retirer"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink/40 mb-2 italic">Aucun matériel renseigné.</p>
      )}

      <div className="flex gap-1.5 mt-auto">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Ajouter…"
          className="flex-1 border border-line rounded px-2 py-1 text-xs bg-white"
        />
        <button
          onClick={add}
          disabled={!value.trim() || busy}
          className="bg-blueprint text-white text-xs rounded px-2.5 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function MaterielPage() {
  const { state, error, loading, reload } = useProjectState();
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const { rows, shoppingList } = useMemo(() => {
    if (!state) return { rows: [], shoppingList: [] as { label: string; count: number; tasks: string[] }[] };

    const stepByTaskId = new Map(state.view.resourcePlan.steps.map((s) => [s.taskId, s]));
    const rows = [...state.view.tasks].sort((a, b) => {
      const sa = stepByTaskId.get(a.task.id)?.startHour ?? Infinity;
      const sb = stepByTaskId.get(b.task.id)?.startHour ?? Infinity;
      return sa - sb || a.task.title.localeCompare(b.task.title);
    });

    const tally = new Map<string, { count: number; tasks: string[] }>();
    for (const t of state.view.tasks) {
      for (const m of t.task.materials) {
        const key = m.trim();
        if (!key) continue;
        const entry = tally.get(key) ?? { count: 0, tasks: [] };
        entry.count += 1;
        entry.tasks.push(t.task.title);
        tally.set(key, entry);
      }
    }
    const shoppingList = Array.from(tally.entries())
      .map(([label, v]) => ({ label, count: v.count, tasks: v.tasks }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { rows, shoppingList };
  }, [state]);

  if (loading) return <p className="text-sm text-ink/50">Chargement…</p>;
  if (error || !state) return <p className="text-sm text-warn">{error}</p>;

  const filteredRows = rows.filter((r) => {
    if (onlyMissing && r.task.materials.length > 0) return false;
    if (!query.trim()) return true;
    return r.task.title.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-1">Matériel</h1>
      <p className="text-sm text-ink/60 mb-4">
        Ce dont vous aurez besoin, tâche par tâche — ajoutez au fur et à mesure que vous savez ce
        qu&apos;il faut acheter.
      </p>

      {shoppingList.length > 0 && (
        <div className="bg-panel border border-line rounded-md p-4 mb-6">
          <h2 className="text-xs uppercase tracking-wide text-ink/50 font-mono mb-2">
            Liste consolidée ({shoppingList.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {shoppingList.map((s) => (
              <span
                key={s.label}
                title={s.tasks.join(", ")}
                className="text-xs bg-paper border border-line rounded-full px-2.5 py-1"
              >
                {s.label}
                {s.count > 1 && <span className="text-ink/40"> ×{s.count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une tâche…"
          className="border border-line rounded px-2 py-1.5 text-sm bg-white"
        />
        <label className="flex items-center gap-1.5 text-xs text-ink/60">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Seulement les tâches sans matériel renseigné
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRows.map((r) => (
          <MaterialEditor key={r.task.id} view={r} onChanged={reload} />
        ))}
      </div>
    </div>
  );
}
