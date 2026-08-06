"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dumbbell, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { StrengthSet } from "@/lib/sport";
import { getExerciseImages } from "@/lib/sport";

export type StrengthExerciseMeta = {
  slug: string;
  title: string;
  image?: string | null;
  images?: readonly string[] | null;
  /** Ejercicio libre temporal (solo esta vez, no se guarda en el catálogo). */
  isNewLibre?: boolean;
  /** Resumen de la última sesión, si existe. */
  lastSetsSummary?: string | null;
  /** Series de la última sesión (referencia por fila). */
  lastSets?: StrengthSet[] | null;
};

type DraftSet = {
  weight: string;
  reps: string;
};

function emptySet(): DraftSet {
  return { weight: "", reps: "" };
}

function draftRowsForLast(lastSets: StrengthSet[] | null | undefined): DraftSet[] {
  if (lastSets && lastSets.length > 0) {
    return lastSets.map(() => emptySet());
  }
  return [emptySet(), emptySet(), emptySet()];
}

function draftFromSets(sets: StrengthSet[]): DraftSet[] {
  if (!sets.length) return [emptySet()];
  return sets.map((s) => ({
    weight: s.weight_kg != null ? String(s.weight_kg) : "",
    reps: s.reps != null ? String(s.reps) : "",
  }));
}

function lastHint(set: StrengthSet | undefined): string | null {
  if (!set) return null;
  const w = set.weight_kg;
  const r = set.reps;
  if (w != null && r != null) return `${w}×${r}`;
  if (w != null) return `${w} kg`;
  if (r != null) return `${r} reps`;
  return null;
}

function serializeDraftSets(sets: DraftSet[]): string {
  return JSON.stringify(
    sets.map((s) => ({
      weight: s.weight.trim(),
      reps: s.reps.trim(),
    })),
  );
}

function hasTypedSets(sets: DraftSet[]): boolean {
  return sets.some((s) => s.weight.trim() !== "" || s.reps.trim() !== "");
}

export type ExistingStrengthSession = {
  id: string;
  performed_at: string;
  sets: StrengthSet[];
  notes: string | null;
  exercise_title?: string | null;
};

export function StrengthExerciseDialog({
  open,
  onOpenChange,
  userId,
  category,
  exercise,
  existingSession = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  category: string;
  exercise: StrengthExerciseMeta | null;
  /** Si hay sesión, se edita (update) en lugar de crear. */
  existingSession?: ExistingStrengthSession | null;
  onSaved: (result?: { performed_at: string }) => void;
}) {
  const isEdit = !!existingSession;
  const showNameField = !!exercise?.isNewLibre && !isEdit;

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
  const initialSetsRef = useRef<string>("");

  useEffect(() => {
    if (!open || !exercise) return;
    let nextSets: DraftSet[];
    if (existingSession) {
      setCustomTitle(
        existingSession.exercise_title?.trim() || exercise.title,
      );
      setDate(existingSession.performed_at.slice(0, 10));
      nextSets = draftFromSets(existingSession.sets);
      setSets(nextSets);
      setNotes(existingSession.notes ?? "");
    } else {
      setCustomTitle(exercise.isNewLibre ? "" : exercise.title);
      setDate(new Date().toISOString().slice(0, 10));
      nextSets = draftRowsForLast(exercise.lastSets);
      setSets(nextSets);
      setNotes("");
    }
    initialSetsRef.current = serializeDraftSets(nextSets);
    setError(null);
    setSaving(false);
  }, [open, exercise, existingSession]);

  function hasUnsavedSets(): boolean {
    if (isEdit) {
      return serializeDraftSets(sets) !== initialSetsRef.current;
    }
    return hasTypedSets(sets);
  }

  function requestClose() {
    if (hasUnsavedSets()) {
      const ok = window.confirm(
        "Tienes series escritas sin guardar.\n\n¿Seguro que quieres cerrar?",
      );
      if (!ok) return;
    }
    onOpenChange(false);
  }

  function updateSet(index: number, patch: Partial<DraftSet>) {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise) return;

    const title = exercise.isNewLibre && !isEdit
      ? customTitle.trim()
      : (isEdit ? customTitle.trim() || exercise.title : exercise.title);
    if (exercise.isNewLibre && !isEdit && !title) {
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

    const slug = exercise.isNewLibre && !isEdit
      ? `temp-${Date.now()}`
      : exercise.slug;

    setSaving(true);
    setError(null);
    const supabase = createClient();

    let saveError: { message: string } | null = null;

    if (isEdit && existingSession) {
      const { error: updateError } = await supabase
        .from("user_strength_sessions")
        .update({
          performed_at: date,
          sets: meaningful,
          notes: notes.trim() || null,
          exercise_title: title,
        })
        .eq("id", existingSession.id)
        .eq("user_id", userId);
      saveError = updateError;
    } else {
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
      saveError = insertError;
    }

    setSaving(false);
    if (saveError) {
      const msg = saveError.message.toLowerCase();
      setError(
        saveError.message.includes("user_strength_sessions") ||
          msg.includes("schema cache") ||
          msg.includes("exercise_title")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-strength-exercise-title.sql (o schema-strength.sql)"
          : saveError.message,
      );
      return;
    }
    onOpenChange(false);
    onSaved({ performed_at: date });
  }

  const dialogTitle = isEdit
    ? (exercise?.title ?? "Editar ejercicio")
    : exercise?.isNewLibre
      ? "Ejercicio libre"
      : (exercise?.title ?? "Ejercicio");

  const showLastHints = !isEdit;
  const exerciseImgs = exercise ? getExerciseImages(exercise) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogHeader onClose={requestClose}>
        <DialogTitle className="pr-2 leading-snug">{dialogTitle}</DialogTitle>
      </DialogHeader>

      {exercise ? (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSave}
        >
          <DialogBody className="space-y-3">
            {exerciseImgs.length > 1 ? (
              <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
                {exerciseImgs.map((src) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                      sizes="160px"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            ) : exerciseImgs.length === 1 ? (
              <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-xl bg-[var(--surface-2)] sm:h-36 sm:w-36">
                <Image
                  src={exerciseImgs[0]}
                  alt={exercise.title}
                  fill
                  className="object-contain p-1.5"
                  sizes="144px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--surface-2)] sm:h-28 sm:w-28">
                <Dumbbell className="h-8 w-8 text-[var(--muted)] opacity-50" />
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
                {sets.map((set, index) => {
                  const prev = showLastHints
                    ? exercise.lastSets?.[index]
                    : undefined;
                  const hint = lastHint(prev);
                  const weightPh =
                    prev?.weight_kg != null ? String(prev.weight_kg) : "kg";
                  const repsPh =
                    prev?.reps != null ? String(prev.reps) : "reps";
                  return (
                    <div key={index} className="space-y-0.5">
                      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-1.5 sm:gap-2">
                        <span className="text-center text-xs font-medium text-[var(--muted)]">
                          {index + 1}
                        </span>
                        <Input
                          inputMode="decimal"
                          placeholder={weightPh}
                          aria-label={`Peso serie ${index + 1}`}
                          value={set.weight}
                          onChange={(e) =>
                            updateSet(index, { weight: e.target.value })
                          }
                          className="min-w-0 px-2"
                        />
                        <Input
                          inputMode="numeric"
                          placeholder={repsPh}
                          aria-label={`Reps serie ${index + 1}`}
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(index, {
                              reps: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="min-w-0 px-2"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          aria-label={`Quitar serie ${index + 1}`}
                          disabled={sets.length <= 1}
                          onClick={() =>
                            setSets((prevSets) =>
                              prevSets.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-[var(--muted)]" />
                        </Button>
                      </div>
                      {hint ? (
                        <p className="pl-7 text-[11px] tabular-nums text-[var(--muted)]">
                          Última: {hint}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
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
          </DialogBody>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Guardar ejercicio"
              )}
            </Button>
          </DialogFooter>
        </form>
      ) : null}
    </Dialog>
  );
}
