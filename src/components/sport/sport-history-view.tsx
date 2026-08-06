"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, History } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import { createClient } from "@/lib/supabase/client";
import {
  STRENGTH_CATEGORY_ORDER,
  formatLastPerformedLabel,
  getSportCategory,
} from "@/lib/sport";

type DayCategorySummary = {
  category: string;
  title: string;
  count: number;
};

type HistoryDay = {
  date: string;
  categories: DayCategorySummary[];
  totalExercises: number;
};

function categorySortIndex(slug: string): number {
  const i = STRENGTH_CATEGORY_ORDER.indexOf(
    slug as (typeof STRENGTH_CATEGORY_ORDER)[number],
  );
  return i === -1 ? 99 : i;
}

export function SportHistoryView({
  email,
  userId,
}: {
  email: string | null;
  userId: string;
}) {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("user_strength_sessions")
      .select("category, performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false });

    if (qError) {
      setError(
        qError.message.includes("user_strength_sessions") ||
          qError.code === "42P01" ||
          qError.message.toLowerCase().includes("schema cache")
          ? "Falta crear la tabla en Supabase. Ejecuta supabase/schema-strength.sql"
          : qError.message,
      );
      setDays([]);
      setLoading(false);
      return;
    }

    const byDate = new Map<string, Map<string, number>>();
    for (const row of data ?? []) {
      const day = (row.performed_at as string)?.slice(0, 10);
      const category = row.category as string;
      if (!day || !category) continue;
      if (!byDate.has(day)) byDate.set(day, new Map());
      const cats = byDate.get(day)!;
      cats.set(category, (cats.get(category) ?? 0) + 1);
    }

    const list: HistoryDay[] = [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, cats]) => {
        const categories = [...cats.entries()]
          .map(([category, count]) => ({
            category,
            title: getSportCategory(category)?.title ?? category,
            count,
          }))
          .sort(
            (a, b) =>
              categorySortIndex(a.category) - categorySortIndex(b.category),
          );
        return {
          date,
          categories,
          totalExercises: categories.reduce((sum, c) => sum + c.count, 0),
        };
      });

    setError(null);
    setDays(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

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
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Historial
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Cada día con lo que entrenaste · toca para editar o borrar
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-16 text-center animate-slide-up">
            <History className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              Sin entrenos todavía
            </p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
              Cuando registres series en pecho, espalda u otros grupos,
              aparecerán aquí por día.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 animate-slide-up">
            {days.map((day) => {
              const label =
                formatLastPerformedLabel(day.date) ?? day.date;
              return (
                <li key={day.date}>
                  <Link
                    href={`/deporte/historial/${day.date}`}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                          {label}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          {day.date}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {day.categories.map((c, i) => (
                          <span key={c.category}>
                            {i > 0 ? " · " : null}
                            <span className="font-medium text-[var(--foreground)]">
                              {c.title}
                            </span>
                            {" "}
                            {c.count}{" "}
                            {c.count === 1 ? "ejercicio" : "ejercicios"}
                          </span>
                        ))}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
