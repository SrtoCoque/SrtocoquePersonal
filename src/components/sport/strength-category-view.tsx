"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Plus, Trash2 } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import { AddCustomExerciseDialog } from "@/components/sport/add-custom-exercise-dialog";
import {
  StrengthExerciseDialog,
  type StrengthExerciseMeta,
} from "@/components/sport/strength-exercise-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { StrengthSet } from "@/lib/sport";
import {
  formatLastPerformedLabel,
  formatStrengthSetsSummary,
} from "@/lib/sport";

export type StrengthExerciseItem = {
  slug: string;
  title: string;
  image?: string | null;
};

type LastInfo = {
  date: string;
  summary: string | null;
};

export function StrengthCategoryView({
  email,
  userId,
  category,
  title,
  exercises,
}: {
  email: string | null;
  userId: string;
  category: string;
  title: string;
  exercises: readonly StrengthExerciseItem[];
}) {
  const [lastByExercise, setLastByExercise] = useState<
    Record<string, LastInfo>
  >({});
  const [customExercises, setCustomExercises] = useState<
    StrengthExerciseMeta[]
  >([]);
  const [selected, setSelected] = useState<StrengthExerciseMeta | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const catalogSlugs = useMemo(
    () => new Set(exercises.map((e) => e.slug)),
    [exercises],
  );

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [sessionsRes, customsRes] = await Promise.all([
      supabase
        .from("user_strength_sessions")
        .select("exercise_slug, performed_at, sets")
        .eq("user_id", userId)
        .eq("category", category)
        .order("performed_at", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("user_custom_exercises")
        .select("exercise_slug, title")
        .eq("user_id", userId)
        .eq("category", category)
        .order("title", { ascending: true }),
    ]);

    const lastMap: Record<string, LastInfo> = {};
    for (const row of sessionsRes.data ?? []) {
      const slug = row.exercise_slug as string;
      if (!slug || lastMap[slug]) continue;
      // Saltar temporales
      if (slug.startsWith("temp-")) continue;
      const day = (row.performed_at as string)?.slice(0, 10);
      if (!day) continue;
      const sets = (row.sets ?? []) as StrengthSet[];
      lastMap[slug] = {
        date: day,
        summary: formatStrengthSetsSummary(sets),
      };
    }
    setLastByExercise(lastMap);

    const customs: StrengthExerciseMeta[] = (customsRes.data ?? [])
      .map((row) => ({
        slug: row.exercise_slug as string,
        title: (row.title as string).trim(),
        image: null,
      }))
      .filter((e) => e.slug && e.title && !catalogSlugs.has(e.slug));

    setCustomExercises(customs);
  }, [userId, category, catalogSlugs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteCustom(slug: string, exerciseTitle: string) {
    const ok = window.confirm(
      `¿Seguro que quieres eliminar «${exerciseTitle}» de esta sección?\n\nSe quitará de tu lista (el historial de series no se borra).`,
    );
    if (!ok) return;

    const supabase = createClient();
    await supabase
      .from("user_custom_exercises")
      .delete()
      .eq("user_id", userId)
      .eq("category", category)
      .eq("exercise_slug", slug);
    loadData();
  }

  function openExercise(exercise: StrengthExerciseMeta) {
    const last = lastByExercise[exercise.slug];
    setSelected({
      ...exercise,
      lastSetsSummary: last?.summary ?? null,
    });
  }

  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/deporte"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </Link>

        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <Button
              type="button"
              size="icon"
              aria-label="Añadir ejercicio permanente"
              onClick={() => setAddOpen(true)}
              className="shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-[var(--muted)]">
            Toca un ejercicio para series · + añade permanentes · Libre es solo
            una vez
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 animate-slide-up">
          {exercises.map((exercise) => {
            const last = lastByExercise[exercise.slug];
            const lastLabel = formatLastPerformedLabel(last?.date);
            return (
              <button
                key={exercise.slug}
                type="button"
                onClick={() => openExercise(exercise)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                {lastLabel ? (
                  <span className="absolute left-2 top-2 z-10 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {lastLabel}
                  </span>
                ) : null}
                <div className="relative flex aspect-square w-full items-center justify-center bg-white">
                  {exercise.image ? (
                    <Image
                      src={exercise.image}
                      alt={exercise.title}
                      fill
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width:640px) 50vw, 200px"
                      unoptimized
                    />
                  ) : (
                    <Dumbbell className="h-10 w-10 text-[var(--muted)] opacity-60" />
                  )}
                </div>
                <div className="border-t border-[var(--border)] px-2.5 py-2">
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold leading-snug tracking-tight sm:text-base">
                    {exercise.title}
                  </p>
                  {last?.summary ? (
                    <p className="mt-0.5 truncate text-[11px] tabular-nums text-[var(--muted)]">
                      Última: {last.summary}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}

          {customExercises.map((exercise) => {
            const last = lastByExercise[exercise.slug];
            const lastLabel = formatLastPerformedLabel(last?.date);
            return (
              <div
                key={exercise.slug}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                {lastLabel ? (
                  <span className="absolute left-2 top-2 z-10 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {lastLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 z-10 rounded-md bg-black/55 p-1.5 text-white hover:bg-black/75"
                  aria-label={`Eliminar ${exercise.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteCustom(exercise.slug, exercise.title);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openExercise(exercise)}
                  className="flex flex-1 flex-col text-left"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center bg-[var(--surface-2)]">
                    <Dumbbell className="h-10 w-10 text-[var(--muted)] opacity-60" />
                  </div>
                  <div className="border-t border-[var(--border)] px-2.5 py-2">
                    <p className="font-[family-name:var(--font-display)] text-sm font-semibold leading-snug tracking-tight sm:text-base">
                      {exercise.title}
                    </p>
                    {last?.summary ? (
                      <p className="mt-0.5 truncate text-[11px] tabular-nums text-[var(--muted)]">
                        Última: {last.summary}
                      </p>
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setSelected({
                slug: "libre-temp",
                title: "Libre",
                image: null,
                isNewLibre: true,
              })
            }
            className="group flex flex-col overflow-hidden rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:bg-[var(--surface)]"
          >
            <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-2 bg-[var(--surface-2)]/50">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Dumbbell className="h-6 w-6" />
              </span>
            </div>
            <div className="border-t border-[var(--border)] px-2.5 py-2">
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold leading-snug tracking-tight sm:text-base">
                Libre
              </p>
              <p className="text-[11px] text-[var(--muted)]">Solo esta vez</p>
            </div>
          </button>
        </div>
      </main>

      <AddCustomExerciseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        category={category}
        onAdded={() => {
          loadData();
        }}
      />

      <StrengthExerciseDialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        userId={userId}
        category={category}
        exercise={selected}
        onSaved={loadData}
      />
    </div>
  );
}
