"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import { AddCardioWorkoutDialog } from "@/components/sport/add-cardio-workout-dialog";
import {
  StrengthExerciseDialog,
  type StrengthExerciseMeta,
} from "@/components/sport/strength-exercise-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type {
  CardioActivitySlug,
  StrengthSet,
  UserCardioWorkout,
  UserStrengthSession,
} from "@/lib/sport";
import {
  STRENGTH_CATEGORY_ORDER,
  formatDuration,
  formatLastPerformedLabel,
  formatPaceMinPerKm,
  formatStrengthSetsSummary,
  getCardioActivity,
  getSportCategory,
  isCardioActivitySlug,
  resolveStrengthExerciseTitle,
} from "@/lib/sport";

type SessionRow = UserStrengthSession;

function categorySortIndex(slug: string): number {
  const i = STRENGTH_CATEGORY_ORDER.indexOf(
    slug as (typeof STRENGTH_CATEGORY_ORDER)[number],
  );
  return i === -1 ? 99 : i;
}

async function dayHasAnyRecords(
  userId: string,
  date: string,
): Promise<boolean> {
  const supabase = createClient();
  const [strength, cardio] = await Promise.all([
    supabase
      .from("user_strength_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("performed_at", date),
    supabase
      .from("user_cardio_workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("performed_at", date),
  ]);
  return (strength.count ?? 0) + (cardio.count ?? 0) > 0;
}

export function SportHistoryDayView({
  email,
  userId,
  date,
}: {
  email: string | null;
  userId: string;
  date: string;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [cardioWorkouts, setCardioWorkouts] = useState<UserCardioWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [editingCardio, setEditingCardio] = useState<UserCardioWorkout | null>(
    null,
  );

  const dayLabel = formatLastPerformedLabel(date) ?? date;

  const load = useCallback(async () => {
    const supabase = createClient();
    const [strengthRes, cardioRes] = await Promise.all([
      supabase
        .from("user_strength_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("performed_at", date)
        .order("created_at", { ascending: true }),
      supabase
        .from("user_cardio_workouts")
        .select("*")
        .eq("user_id", userId)
        .eq("performed_at", date)
        .order("created_at", { ascending: true }),
    ]);

    if (strengthRes.error) {
      setError(strengthRes.error.message);
      setSessions([]);
      setCardioWorkouts([]);
      setLoading(false);
      return;
    }

    if (
      cardioRes.error &&
      !cardioRes.error.message.includes("user_cardio_workouts") &&
      cardioRes.error.code !== "42P01" &&
      !cardioRes.error.message.toLowerCase().includes("schema cache")
    ) {
      setError(cardioRes.error.message);
      setSessions([]);
      setCardioWorkouts([]);
      setLoading(false);
      return;
    }

    setError(null);
    setSessions(
      (strengthRes.data ?? []).map((row) => ({
        ...(row as SessionRow),
        sets: (row.sets ?? []) as StrengthSet[],
        performed_at: (row.performed_at as string).slice(0, 10),
      })),
    );
    setCardioWorkouts(
      (cardioRes.data ?? []).map((row) => ({
        ...(row as UserCardioWorkout),
        distance_km: Number(row.distance_km),
        duration_seconds: Number(row.duration_seconds),
        performed_at: (row.performed_at as string).slice(0, 10),
      })),
    );
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const groupsTitle = useMemo(() => {
    const titles: string[] = [];
    if (cardioWorkouts.length > 0) titles.push("Cardio");
    const strengthCats = new Set(sessions.map((s) => s.category));
    const ordered = [...strengthCats].sort(
      (a, b) => categorySortIndex(a) - categorySortIndex(b),
    );
    for (const cat of ordered) {
      titles.push(getSportCategory(cat)?.title ?? cat);
    }
    return titles.join(" · ") || dayLabel;
  }, [cardioWorkouts.length, sessions, dayLabel]);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => categorySortIndex(a) - categorySortIndex(b))
      .map(([category, items]) => ({
        category,
        title: getSportCategory(category)?.title ?? category,
        items,
      }));
  }, [sessions]);

  async function redirectIfEmpty() {
    if (!(await dayHasAnyRecords(userId, date))) {
      router.replace("/deporte/historial");
    }
  }

  async function handleDelete(session: SessionRow) {
    const title = resolveStrengthExerciseTitle(
      session.exercise_slug,
      session.exercise_title,
    );
    const ok = window.confirm(
      `¿Eliminar «${title}» de este día?\n\nSe borrará este registro de series.`,
    );
    if (!ok) return;

    const supabase = createClient();
    await supabase
      .from("user_strength_sessions")
      .delete()
      .eq("id", session.id)
      .eq("user_id", userId);

    await load();
    await redirectIfEmpty();
  }

  async function handleDeleteCardio(workout: UserCardioWorkout) {
    const activityTitle =
      getCardioActivity(workout.activity)?.title ?? workout.activity;
    const ok = window.confirm(
      `¿Eliminar «${activityTitle}» de este día?\n\nSe borrará este entreno de cardio.`,
    );
    if (!ok) return;

    const supabase = createClient();
    await supabase
      .from("user_cardio_workouts")
      .delete()
      .eq("id", workout.id)
      .eq("user_id", userId);

    await load();
    await redirectIfEmpty();
  }

  const editExercise: StrengthExerciseMeta | null = editing
    ? {
        slug: editing.exercise_slug,
        title: resolveStrengthExerciseTitle(
          editing.exercise_slug,
          editing.exercise_title,
        ),
        image: null,
      }
    : null;

  const empty = sessions.length === 0 && cardioWorkouts.length === 0;

  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/deporte/historial"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </Link>

        <div className="mb-6 animate-fade-in">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            {groupsTitle}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            <span className="font-medium text-[var(--foreground)]">
              {dayLabel}
            </span>
            {dayLabel !== date ? (
              <>
                {" · "}
                {date}
              </>
            ) : null}
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nada registrado este día.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            {cardioWorkouts.length > 0 ? (
              <section>
                <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  Cardio
                  <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                    {cardioWorkouts.length}{" "}
                    {cardioWorkouts.length === 1 ? "entreno" : "entrenos"}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {cardioWorkouts.map((workout) => {
                    const activityTitle =
                      getCardioActivity(workout.activity)?.title ??
                      workout.activity;
                    const pace = formatPaceMinPerKm(
                      workout.distance_km,
                      workout.duration_seconds,
                    );
                    return (
                      <li
                        key={workout.id}
                        className="flex items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight">
                            {activityTitle}
                          </p>
                          <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">
                            {workout.distance_km.toLocaleString("es-ES", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            km · {formatDuration(workout.duration_seconds)}
                            {pace ? (
                              <>
                                {" · "}
                                <span className="font-medium text-[var(--foreground)]">
                                  {pace}
                                </span>
                              </>
                            ) : null}
                          </p>
                          {workout.notes ? (
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {workout.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${activityTitle}`}
                            onClick={() => setEditingCardio(workout)}
                          >
                            <Pencil className="h-4 w-4 text-[var(--muted)]" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${activityTitle}`}
                            onClick={() => void handleDeleteCardio(workout)}
                          >
                            <Trash2 className="h-4 w-4 text-[var(--muted)]" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {grouped.map((group) => (
              <section key={group.category}>
                <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {group.title}
                  <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "ejercicio" : "ejercicios"}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {group.items.map((session) => {
                    const title = resolveStrengthExerciseTitle(
                      session.exercise_slug,
                      session.exercise_title,
                    );
                    const summary = formatStrengthSetsSummary(session.sets);
                    return (
                      <li
                        key={session.id}
                        className="flex items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight">
                            {title}
                          </p>
                          {summary ? (
                            <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">
                              {summary}
                            </p>
                          ) : null}
                          {session.notes ? (
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {session.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${title}`}
                            onClick={() => setEditing(session)}
                          >
                            <Pencil className="h-4 w-4 text-[var(--muted)]" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${title}`}
                            onClick={() => void handleDelete(session)}
                          >
                            <Trash2 className="h-4 w-4 text-[var(--muted)]" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <StrengthExerciseDialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        userId={userId}
        category={editing?.category ?? ""}
        exercise={editExercise}
        existingSession={
          editing
            ? {
                id: editing.id,
                performed_at: editing.performed_at,
                sets: editing.sets,
                notes: editing.notes,
                exercise_title: editing.exercise_title,
              }
            : null
        }
        onSaved={(result) => {
          setEditing(null);
          void (async () => {
            await load();
            const newDate = result?.performed_at?.slice(0, 10);
            if (newDate && newDate !== date) {
              router.replace(`/deporte/historial/${newDate}`);
              return;
            }
            await redirectIfEmpty();
          })();
        }}
      />

      {editingCardio && isCardioActivitySlug(editingCardio.activity) ? (
        <AddCardioWorkoutDialog
          open={!!editingCardio}
          onOpenChange={(o) => {
            if (!o) setEditingCardio(null);
          }}
          userId={userId}
          activity={editingCardio.activity as CardioActivitySlug}
          existingWorkout={editingCardio}
          onSaved={(result) => {
            setEditingCardio(null);
            void (async () => {
              await load();
              const newDate = result?.performed_at?.slice(0, 10);
              if (newDate && newDate !== date) {
                router.replace(`/deporte/historial/${newDate}`);
                return;
              }
              await redirectIfEmpty();
            })();
          }}
        />
      ) : null}
    </div>
  );
}
