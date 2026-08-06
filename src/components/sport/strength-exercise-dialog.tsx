"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { StrengthSet } from "@/lib/sport";

export type StrengthExerciseMeta = {
  slug: string;
  title: string;
  image?: string | null;
  /** Ejercicio libre temporal (solo esta vez, no se guarda en el catálogo). */
  isNewLibre?: boolean;
  /** Resumen de la última sesión, si existe. */
  lastSetsSummary?: string | null;
};

type DraftSet = {
  weight: string;
  reps: string;
};

function emptySet(): DraftSet {
  return { weight: "", reps: "" };
}

export function StrengthExerciseDialog({
  open,
  onOpenChange,
  userId,
  category,
  exercise,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  category: string;
  exercise: StrengthExerciseMeta | null;
  onSaved: () => void;
}) {
  const showNameField = !!exercise?.isNewLibre;

  const [customTitle, setCustomTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sets, setSets] = useState<DraftSet[]>([
    emptySet(),
    emptySet(),
    emptySet(),
  ]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !exercise) return;
    setCustomTitle(exercise.isNewLibre ? "" : exercise.title);
    setDate(new Date().toISOString().slice(0, 10));
    setSets([emptySet(), emptySet(), emptySet()]);
    setNotes("");
    setError(null);
    setSaving(false);
  }, [open, exercise]);

  function updateSet(index: number, patch: Partial<DraftSet>) {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise) return;

    const title = exercise.isNewLibre
      ? customTitle.trim()
      : exercise.title;
    if (exercise.isNewLibre && !title) {
      setError("Pon un nombre al ejercicio");
      return;
    }

    const parsed: StrengthSet[] = sets.map((s) => {
      const weightRaw = s.weight.trim().replace(",", ".");
      const repsRaw = s.reps.trim();
      const weight = weightRaw === "" ? null : Number(weightRaw);
      const reps = repsRaw === "" ? null : Number(repsRaw);
      return {
        weight_kg:
          weight != null && Number.isFinite(weight) && weight >= 0
            ? weight
            : null,
        reps:
          reps != null && Number.isFinite(reps) && reps > 0
            ? Math.round(reps)
            : null,
      };
    });

    const meaningful = parsed.filter(
      (s) => s.weight_kg != null || s.reps != null,
    );
    if (meaningful.length === 0) {
      setError("Añade al menos una serie (reps y/o peso)");
      return;
    }

    // Temporal: slug único. Permanente/catálogo: slug del ejercicio.
    const slug = exercise.isNewLibre
      ? `temp-${Date.now()}`
      : exercise.slug;

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("user_strength_sessions")
      .insert({
        user_id: userId,
        category,
        exercise_slug: slug,
        exercise_title: title,
        performed_at: date,
        sets: meaningful,
        notes: notes.trim() || null,
      });

    setSaving(false);
    if (insertError) {
      const msg = insertError.message.toLowerCase();
      setError(
        insertError.message.includes("user_strength_sessions") ||
          msg.includes("schema cache") ||
          msg.includes("exercise_title")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-strength-exercise-title.sql (o schema-strength.sql)"
          : insertError.message,
      );
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  const dialogTitle = exercise?.isNewLibre
    ? "Ejercicio libre"
    : (exercise?.title ?? "Ejercicio");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>{dialogTitle}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        {exercise ? (
          <form className="space-y-4" onSubmit={handleSave}>
            {exercise.image ? (
              <div className="relative mx-auto aspect-[4/3] w-full max-w-[220px] overflow-hidden rounded-xl bg-[var(--surface-2)]">
                <Image
                  src={exercise.image}
                  alt={exercise.title}
                  fill
                  className="object-contain p-2"
                  sizes="220px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="mx-auto flex aspect-[4/3] w-full max-w-[220px] items-center justify-center rounded-xl bg-[var(--surface-2)]">
                <Dumbbell className="h-12 w-12 text-[var(--muted)] opacity-50" />
              </div>
            )}

            {showNameField ? (
              <div className="space-y-1.5">
                <Label htmlFor="strength-title">Nombre del ejercicio</Label>
                <Input
                  id="strength-title"
                  placeholder="Ej. Face pulls"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-[var(--muted)]">
                  Solo para esta vez · no se añade a tu lista
                </p>
              </div>
            ) : null}

            {exercise.lastSetsSummary ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Última vez
                </p>
                <p className="mt-0.5 text-sm font-medium tabular-nums">
                  {exercise.lastSetsSummary}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="strength-date">Fecha</Label>
              <Input
                id="strength-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Series</Label>
                <button
                  type="button"
                  onClick={() => setSets((prev) => [...prev, emptySet()])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Serie
                </button>
              </div>

              <div className="space-y-2">
                {sets.map((set, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2"
                  >
                    <span className="text-center text-xs font-medium text-[var(--muted)]">
                      {index + 1}
                    </span>
                    <Input
                      inputMode="decimal"
                      placeholder="Peso kg"
                      aria-label={`Peso serie ${index + 1}`}
                      value={set.weight}
                      onChange={(e) =>
                        updateSet(index, { weight: e.target.value })
                      }
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="Reps"
                      aria-label={`Reps serie ${index + 1}`}
                      value={set.reps}
                      onChange={(e) =>
                        updateSet(index, {
                          reps: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar serie ${index + 1}`}
                      disabled={sets.length <= 1}
                      onClick={() =>
                        setSets((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-[var(--muted)]" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">
                El peso es opcional.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="strength-notes">Notas (opcional)</Label>
              <Input
                id="strength-notes"
                placeholder="Sensaciones…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar ejercicio"
              )}
            </Button>
          </form>
        ) : null}
      </DialogBody>
    </Dialog>
  );
}
