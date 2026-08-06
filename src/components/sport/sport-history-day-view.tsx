"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import {
  StrengthExerciseDialog,
  type StrengthExerciseMeta,
} from "@/components/sport/strength-exercise-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { StrengthSet, UserStrengthSession } from "@/lib/sport";
import {
  STRENGTH_CATEGORY_ORDER,
  formatLastPerformedLabel,
  formatStrengthSetsSummary,
  getSportCategory,
  resolveStrengthExerciseTitle,
} from "@/lib/sport";

type SessionRow = UserStrengthSession;

function categorySortIndex(slug: string): number {
  const i = STRENGTH_CATEGORY_ORDER.indexOf(
    slug as (typeof STRENGTH_CATEGORY_ORDER)[number],
  );
  return i === -1 ? 99 : i;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SessionRow | null>(null);

  const dayLabel = formatLastPerformedLabel(date) ?? date;

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("user_strength_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("performed_at", date)
      .order("created_at", { ascending: true });

    if (qError) {
      setError(qError.message);
      setSessions([]);
      setLoading(false);
      return;
    }

    setError(null);
    setSessions(
      (data ?? []).map((row) => ({
        ...(row as SessionRow),
        sets: (row.sets ?? []) as StrengthSet[],
        performed_at: (row.performed_at as string).slice(0, 10),
      })),
    );
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

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
    // Si el día queda vacío, volver al listado
    const supabase2 = createClient();
    const { count } = await supabase2
      .from("user_strength_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("performed_at", date);
    if ((count ?? 0) === 0) {
      router.replace("/deporte/historial");
    }
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
            {dayLabel}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{date}</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-12 text-center">
            <p className="text-[var(--muted)]">Nada registrado este día.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
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
            const supabase = createClient();
            const { count } = await supabase
              .from("user_strength_sessions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("performed_at", date);
            if ((count ?? 0) === 0) {
              router.replace("/deporte/historial");
            }
          })();
        }}
      />
    </div>
  );
}
