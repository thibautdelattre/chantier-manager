"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Priority } from "@/domain/types";

export function NewTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("Général");
  const [duration, setDuration] = useState(1);
  const [workers, setWorkers] = useState(1);
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createTask({
        title: title.trim(),
        area,
        estimatedDurationHours: duration,
        requiredWorkers: workers,
        priority,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative bg-panel border border-line rounded-md w-full max-w-sm p-5">
        <h2 className="font-display font-bold text-base mb-3">Nouvelle tâche</h2>
        {error && <p className="text-xs text-warn mb-2">{error}</p>}
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Titre de la tâche"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-line rounded px-2 py-1.5 text-sm bg-white"
          />
          <input
            placeholder="Pièce / zone"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-line rounded px-2 py-1.5 text-sm bg-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink/60 flex flex-col gap-1">
              Durée (h)
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="border border-line rounded px-2 py-1.5 text-sm bg-white"
              />
            </label>
            <label className="text-xs text-ink/60 flex flex-col gap-1">
              Personnes
              <input
                type="number"
                min="1"
                max="3"
                value={workers}
                onChange={(e) => setWorkers(Number(e.target.value))}
                className="border border-line rounded px-2 py-1.5 text-sm bg-white"
              />
            </label>
          </div>
          <label className="text-xs text-ink/60 flex flex-col gap-1">
            Priorité
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="border border-line rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="LOW">Basse</option>
              <option value="NORMAL">Normale</option>
              <option value="HIGH">Haute</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 border border-line rounded py-2 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 bg-blueprint text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
