"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike, Footprints, Plus, Trash2 } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import { AddCardioWorkoutDialog } from "@/components/sport/add-cardio-workout-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { CardioActivitySlug, UserCardioWorkout } from "@/lib/sport";
import {
  formatDuration,
  formatPaceMinPerKm,
  getCardioActivity,
} from "@/lib/sport";

function formatDateEs(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CardioActivityView({
  email,
  userId,
  activity,
}: {
  email: string | null;
  userId: string;
  activity: CardioActivitySlug;
}) {
  const meta = getCardioActivity(activity);
  const [workouts, setWorkouts] = useState<UserCardioWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = activity === "correr" ? Footprints : Bike;

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("user_cardio_workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("activity", activity)
      .order("performed_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (qError) {
      setError(
        qError.message.includes("user_cardio_workouts") ||
          qError.code === "42P01" ||
          qError.message.toLowerCase().includes("schema cache")
          ? "Falta crear la tabla en Supabase. Ejecuta supabase/schema-sport.sql"
          : qError.message,
      );
      setWorkouts([]);
    } else {
      setError(null);
      setWorkouts(
        (data ?? []).map((row) => ({
          ...(row as UserCardioWorkout),
          distance_km: Number(row.distance_km),
          duration_seconds: Number(row.duration_seconds),
        })),
      );
    }
    setLoading(false);
  }, [userId, activity]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase
      .from("user_cardio_workouts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    load();
  }

  if (!meta) return null;

  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/deporte/cardio"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a cardio
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-in">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              {meta.title}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {workouts.length}{" "}
              {workouts.length === 1 ? "entreno" : "entrenos"}
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Añadir entreno
          </Button>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-16 text-center animate-slide-up">
            <Icon className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              Sin entrenos todavía
            </p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
              Añade distancia y tiempo; calculamos el ritmo en min/km.
            </p>
            <Button className="mt-5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Añadir entreno
            </Button>
          </div>
        ) : (
          <ul className="space-y-2 animate-slide-up">
            {workouts.map((w) => {
              const pace = formatPaceMinPerKm(
                w.distance_km,
                w.duration_seconds,
              );
              return (
                <li
                  key={w.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums">
                        {w.distance_km.toLocaleString("es-ES", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        km
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatDateEs(w.performed_at)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {formatDuration(w.duration_seconds)}
                      {pace ? (
                        <>
                          {" · "}
                          <span className="font-medium text-[var(--foreground)]">
                            {pace}
                          </span>
                        </>
                      ) : null}
                    </p>
                    {w.notes ? (
                      <p className="mt-1 truncate text-sm text-[var(--muted)]">
                        {w.notes}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar entreno"
                    onClick={() => handleDelete(w.id)}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--muted)]" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <AddCardioWorkoutDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        activity={activity}
        onSaved={load}
      />
    </div>
  );
}
