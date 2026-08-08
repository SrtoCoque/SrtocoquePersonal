"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { ProductivityHeader } from "@/components/layout/productivity-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  formatDurationHours,
  monthFromDate,
  yearFromDate,
  type ProductivityPeriod,
  type ProductivitySessionWithTag,
  type ProductivityTag,
} from "@/lib/productivity";
import { cn } from "@/lib/utils";
import { EditSessionDialog } from "@/components/productivity/edit-session-dialog";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function ProductivityHistoryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [tags, setTags] = useState<ProductivityTag[]>([]);
  const [sessions, setSessions] = useState<ProductivitySessionWithTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ProductivityPeriod>("all");
  const [monthFilter, setMonthFilter] = useState<number | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductivitySessionWithTag | null>(
    null,
  );

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: tagData }, { data: sessionData, error: sessionError }] =
      await Promise.all([
        supabase
          .from("user_productivity_tags")
          .select("*")
          .eq("user_id", userId)
          .order("name"),
        supabase
          .from("user_productivity_sessions")
          .select("*, tag:user_productivity_tags(*)")
          .eq("user_id", userId)
          .order("performed_on", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    if (sessionError?.message.includes("user_productivity")) {
      setError(
        "Falta actualizar Supabase. Ejecuta supabase/schema-productivity.sql",
      );
      setLoading(false);
      return;
    }

    setTags((tagData as ProductivityTag[]) ?? []);
    setSessions(
      ((sessionData as ProductivitySessionWithTag[]) ?? []).map((s) => ({
        ...s,
        tag: Array.isArray(s.tag) ? s.tag[0] ?? null : s.tag,
      })),
    );
    setError(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const s of sessions) {
      const y = yearFromDate(s.performed_on);
      if (y != null) set.add(y);
    }
    return [...set].sort((a, b) => b - a);
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (period !== "all" && yearFromDate(s.performed_on) !== period)
        return false;
      if (
        typeof monthFilter === "number" &&
        monthFromDate(s.performed_on) !== monthFilter
      )
        return false;
      if (tagFilter !== "all" && s.tag_id !== tagFilter) return false;
      return true;
    });
  }, [sessions, period, monthFilter, tagFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductivitySessionWithTag[]>();
    for (const s of filtered) {
      const day = s.performed_on.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [filtered]);

  async function removeSession(id: string) {
    if (!confirm("¿Borrar esta sesión?")) return;
    const supabase = createClient();
    await supabase
      .from("user_productivity_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    await load();
  }

  return (
    <div className="min-h-screen">
      <ProductivityHeader email={email} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Historial
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sesiones por etiqueta, día y origen
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <Chip
            active={period === "all"}
            onClick={() => {
              setPeriod("all");
              setMonthFilter("all");
            }}
          >
            Todos
          </Chip>
          {years.map((y) => (
            <Chip key={y} active={period === y} onClick={() => setPeriod(y)}>
              {y}
            </Chip>
          ))}
        </div>
        {typeof period === "number" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip
              active={monthFilter === "all"}
              onClick={() => setMonthFilter("all")}
            >
              Todo el año
            </Chip>
            {MONTHS.map((label, i) => (
              <Chip
                key={label}
                active={monthFilter === i}
                onClick={() => setMonthFilter(i)}
              >
                {label}
              </Chip>
            ))}
          </div>
        ) : null}
        <div className="mb-6 flex flex-wrap gap-2">
          <Chip active={tagFilter === "all"} onClick={() => setTagFilter("all")}>
            Todas
          </Chip>
          {tags.map((t) => (
            <Chip
              key={t.id}
              active={tagFilter === t.id}
              onClick={() => setTagFilter(t.id)}
              color={t.color}
            >
              {t.name}
            </Chip>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : grouped.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
            No hay sesiones en este filtro
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">
                  {formatDayLabel(day)}
                </h2>
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:bg-[var(--surface-2)]/60"
                    >
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{
                              backgroundColor: s.tag?.color ?? "#6b7280",
                            }}
                          />
                          <span className="truncate">
                            {s.tag?.name ?? "Sin etiqueta"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {formatDurationHours(s.duration_seconds)}
                          {s.started_at
                            ? ` · ${formatTime(s.started_at)}`
                            : ""}
                          {" · "}
                          {s.source === "timer" ? "Cronómetro" : "Manual"}
                          {s.notes ? " · con notas" : ""}
                        </p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mr-1 shrink-0"
                        aria-label="Borrar sesión"
                        onClick={() => void removeSession(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <EditSessionDialog
        open={editing != null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        userId={userId}
        tags={tags}
        session={editing}
        onSaved={load}
        onDeleted={load}
      />
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
        active
          ? "border-teal-700 bg-teal-700/10 text-teal-800 dark:text-teal-300"
          : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]",
      )}
    >
      {color ? (
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {children}
    </button>
  );
}

function formatDayLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
