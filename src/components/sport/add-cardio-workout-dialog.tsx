"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { CardioActivitySlug, UserCardioWorkout } from "@/lib/sport";
import {
  durationFromParts,
  formatPaceMinPerKm,
  getCardioActivity,
} from "@/lib/sport";

function splitDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return {
    hours: String(Math.floor(s / 3600) || ""),
    minutes: String(Math.floor((s % 3600) / 60) || ""),
    seconds: String(s % 60 || ""),
  };
}

export function AddCardioWorkoutDialog({
  open,
  onOpenChange,
  userId,
  activity,
  existingWorkout = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  activity: CardioActivitySlug;
  existingWorkout?: UserCardioWorkout | null;
  onSaved: (result?: { performed_at: string }) => void;
}) {
  const meta = getCardioActivity(activity);
  const editing = !!existingWorkout;
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingWorkout) {
      setDistance(String(existingWorkout.distance_km));
      const parts = splitDuration(existingWorkout.duration_seconds);
      setHours(parts.hours);
      setMinutes(parts.minutes);
      setSeconds(parts.seconds);
      setDate(existingWorkout.performed_at.slice(0, 10));
      setNotes(existingWorkout.notes ?? "");
    } else {
      setDistance("");
      setHours("");
      setMinutes("");
      setSeconds("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
    setError(null);
    setSaving(false);
  }, [open, activity, existingWorkout]);

  const distanceKm = Number(distance.replace(",", "."));
  const durationSeconds = durationFromParts(
    Number(hours) || 0,
    Number(minutes) || 0,
    Number(seconds) || 0,
  );
  const pace = useMemo(
    () =>
      Number.isFinite(distanceKm) && distanceKm > 0 && durationSeconds > 0
        ? formatPaceMinPerKm(distanceKm, durationSeconds)
        : null,
    [distanceKm, durationSeconds],
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError("Indica una distancia en km válida");
      return;
    }
    if (durationSeconds <= 0) {
      setError("Indica el tiempo del entreno");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      distance_km: distanceKm,
      duration_seconds: durationSeconds,
      performed_at: date,
      notes: notes.trim() || null,
    };

    const { error: saveError } = existingWorkout
      ? await supabase
          .from("user_cardio_workouts")
          .update(payload)
          .eq("id", existingWorkout.id)
          .eq("user_id", userId)
      : await supabase.from("user_cardio_workouts").insert({
          user_id: userId,
          activity,
          ...payload,
        });

    setSaving(false);
    if (saveError) {
      setError(
        saveError.message.includes("user_cardio_workouts")
          ? "Falta crear la tabla en Supabase. Ejecuta supabase/schema-sport.sql"
          : saveError.message,
      );
      return;
    }
    onOpenChange(false);
    onSaved({ performed_at: date });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>
          {editing ? "Editar" : "Añadir"} · {meta?.title ?? "Cardio"}
        </DialogTitle>
      </DialogHeader>
      <form
        className="flex min-h-0 flex-1 flex-col"
        data-skip-keyboard-nav
        onSubmit={handleSave}
      >
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cardio-distance">Distancia (km)</Label>
            <Input
              id="cardio-distance"
              inputMode="decimal"
              placeholder="Ej. 5.2"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tiempo</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  inputMode="numeric"
                  placeholder="h"
                  aria-label="Horas"
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))}
                />
                <p className="mt-1 text-center text-[10px] text-[var(--muted)]">
                  horas
                </p>
              </div>
              <div>
                <Input
                  inputMode="numeric"
                  placeholder="min"
                  aria-label="Minutos"
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(e.target.value.replace(/\D/g, ""))
                  }
                />
                <p className="mt-1 text-center text-[10px] text-[var(--muted)]">
                  min
                </p>
              </div>
              <div>
                <Input
                  inputMode="numeric"
                  placeholder="seg"
                  aria-label="Segundos"
                  value={seconds}
                  onChange={(e) =>
                    setSeconds(e.target.value.replace(/\D/g, ""))
                  }
                />
                <p className="mt-1 text-center text-[10px] text-[var(--muted)]">
                  seg
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Ritmo
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
              {pace ?? "—"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardio-date">Fecha</Label>
            <Input
              id="cardio-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardio-notes">Notas (opcional)</Label>
            <Input
              id="cardio-notes"
              placeholder="Sensaciones, ruta…"
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
            ) : (
              "Guardar entreno"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
