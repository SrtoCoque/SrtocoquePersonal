"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Pause, Play, Plus, Square, Tag } from "lucide-react";
import { ProductivityHeader } from "@/components/layout/productivity-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  PRODUCTIVITY_TAG_COLORS,
  aggregateBlocksByTag,
  blocksFromSeconds,
  buildSquarePyramidPlacements,
  formatDurationHours,
  formatHoursDecimal,
  loadActiveTimer,
  monthFromDate,
  saveActiveTimer,
  timerElapsedSeconds,
  todayISODate,
  yearFromDate,
  type ActiveTimerState,
  type ProductivityPeriod,
  type ProductivitySessionWithTag,
  type ProductivityTag,
} from "@/lib/productivity";
import { cn } from "@/lib/utils";
import { AddManualSessionDialog } from "@/components/productivity/add-manual-session-dialog";
import { ManageTagsDialog } from "@/components/productivity/manage-tags-dialog";
import { TagSelect } from "@/components/productivity/tag-select";

const ProductivityPyramid3D = dynamic(
  () =>
    import("@/components/productivity/productivity-pyramid-3d").then(
      (m) => m.ProductivityPyramid3D,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,520px)] items-center justify-center text-sm text-[var(--muted)]">
        Cargando pirámide…
      </div>
    ),
  },
);

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

export function ProductivityHubView({
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
  const [timerTagId, setTimerTagId] = useState<string>("");
  const [timer, setTimer] = useState<ActiveTimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [manualOpen, setManualOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTimer, setSavingTimer] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          .order("performed_on", { ascending: false }),
      ]);

    if (sessionError?.message.includes("user_productivity")) {
      setError(
        "Falta actualizar Supabase. Ejecuta supabase/schema-productivity.sql",
      );
      setLoading(false);
      return;
    }

    const nextTags = (tagData as ProductivityTag[]) ?? [];
    setTags(nextTags);
    setSessions(
      ((sessionData as ProductivitySessionWithTag[]) ?? []).map((s) => ({
        ...s,
        tag: Array.isArray(s.tag) ? s.tag[0] ?? null : s.tag,
      })),
    );
    setTimerTagId((prev) => prev || nextTags[0]?.id || "");
    setError(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTimer(loadActiveTimer());
  }, []);

  useEffect(() => {
    if (!timer || timer.runningSince == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const s of sessions) {
      const y = yearFromDate(s.performed_on);
      if (y != null) set.add(y);
    }
    return [...set].sort((a, b) => b - a);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
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

  const totalSeconds = useMemo(
    () => filteredSessions.reduce((sum, s) => sum + s.duration_seconds, 0),
    [filteredSessions],
  );

  const byTagSeconds = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filteredSessions) {
      map.set(s.tag_id, (map.get(s.tag_id) ?? 0) + s.duration_seconds);
    }
    return map;
  }, [filteredSessions]);

  const pyramidPlacements = useMemo(
    () => buildSquarePyramidPlacements(aggregateBlocksByTag(filteredSessions)),
    [filteredSessions],
  );

  const elapsed = timer ? timerElapsedSeconds(timer, now) : 0;

  function persistTimer(next: ActiveTimerState | null) {
    setTimer(next);
    saveActiveTimer(next);
    setNow(Date.now());
  }

  function startTimer() {
    if (!timerTagId) {
      setTagsOpen(true);
      return;
    }
    const startedAtISO = new Date().toISOString();
    persistTimer({
      tagId: timerTagId,
      runningSince: Date.now(),
      accumulatedSeconds: 0,
      startedAtISO,
    });
  }

  function pauseTimer() {
    if (!timer || timer.runningSince == null) return;
    const acc = timerElapsedSeconds(timer);
    persistTimer({
      ...timer,
      runningSince: null,
      accumulatedSeconds: acc,
    });
  }

  function resumeTimer() {
    if (!timer || timer.runningSince != null) return;
    persistTimer({
      ...timer,
      runningSince: Date.now(),
    });
  }

  async function finishTimer() {
    if (!timer) return;
    const seconds = timerElapsedSeconds(timer);
    if (seconds < 5) {
      persistTimer(null);
      return;
    }
    setSavingTimer(true);
    const supabase = createClient();
    const ended = new Date();
    const { error: insertError } = await supabase
      .from("user_productivity_sessions")
      .insert({
        user_id: userId,
        tag_id: timer.tagId,
        duration_seconds: seconds,
        performed_on: todayISODate(),
        started_at: timer.startedAtISO,
        ended_at: ended.toISOString(),
        source: "timer",
      });
    setSavingTimer(false);
    if (insertError) {
      setError(
        insertError.message.includes("user_productivity")
          ? "Falta actualizar Supabase. Ejecuta supabase/schema-productivity.sql"
          : insertError.message,
      );
      return;
    }
    persistTimer(null);
    await load();
  }

  const activeTag =
    tags.find((t) => t.id === (timer?.tagId ?? timerTagId)) ?? null;

  return (
    <div className="min-h-screen">
      <ProductivityHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Bloques
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cada hora de foco es un bloque en la pirámide
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTagsOpen(true)}
            >
              <Tag className="h-4 w-4" />
              Etiquetas
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setManualOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Manual
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {/* Cronómetro */}
        <section
          className={cn(
            "mb-8 rounded-2xl border bg-[var(--surface)] p-3 sm:p-4",
            !activeTag && "border-[var(--border)]",
          )}
          style={
            activeTag
              ? {
                  borderColor: `${activeTag.color}66`,
                  boxShadow: `inset 4px 0 0 ${activeTag.color}`,
                }
              : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {tags.length === 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="h-10 min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none"
                disabled={Boolean(timer)}
                onClick={() => setTagsOpen(true)}
              >
                <Tag className="h-4 w-4" />
                Crear etiqueta…
              </Button>
            ) : (
              <TagSelect
                className="min-w-0 flex-1 sm:max-w-[14rem] sm:flex-none"
                tags={tags}
                value={timer?.tagId ?? timerTagId}
                disabled={Boolean(timer)}
                aria-label="Etiqueta del cronómetro"
                onChange={setTimerTagId}
              />
            )}

            {!timer ? (
              <Button
                type="button"
                onClick={startTimer}
                disabled={!timerTagId}
                style={
                  activeTag
                    ? {
                        backgroundColor: activeTag.color,
                        borderColor: activeTag.color,
                        color: "#fff",
                      }
                    : undefined
                }
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            ) : (
              <>
                {timer.runningSince != null ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={pauseTimer}
                  >
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                ) : (
                  <Button type="button" onClick={resumeTimer}>
                    <Play className="h-4 w-4" />
                    Reanudar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void finishTimer()}
                  disabled={savingTimer}
                >
                  <Square className="h-4 w-4" />
                  Finalizar
                </Button>
              </>
            )}

            <p
              className="ml-auto font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl"
              style={activeTag ? { color: activeTag.color } : undefined}
            >
              {formatTimerClock(elapsed)}
            </p>
          </div>
        </section>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip
            active={period === "all"}
            onClick={() => {
              setPeriod("all");
              setMonthFilter("all");
            }}
          >
            Todos
          </FilterChip>
          {years.map((y) => (
            <FilterChip
              key={y}
              active={period === y}
              onClick={() => setPeriod(y)}
            >
              {y}
            </FilterChip>
          ))}
        </div>
        {typeof period === "number" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              active={monthFilter === "all"}
              onClick={() => setMonthFilter("all")}
            >
              Todo el año
            </FilterChip>
            {MONTHS.map((label, i) => (
              <FilterChip
                key={label}
                active={monthFilter === i}
                onClick={() => setMonthFilter(i)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        ) : null}
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip
            active={tagFilter === "all"}
            onClick={() => setTagFilter("all")}
          >
            Todas las etiquetas
          </FilterChip>
          {tags.map((t) => (
            <FilterChip
              key={t.id}
              active={tagFilter === t.id}
              onClick={() => setTagFilter(t.id)}
              color={t.color}
            >
              {t.name}
            </FilterChip>
          ))}
        </div>

        {/* Conteos */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <StatBox
            label="Horas"
            value={formatHoursDecimal(totalSeconds)}
          />
          <StatBox
            label="Bloques"
            value={String(blocksFromSeconds(totalSeconds))}
          />
          <StatBox
            label="Sesiones"
            value={String(filteredSessions.length)}
          />
        </div>

        {tags.length > 0 ? (
          <div className="mb-8 flex flex-wrap gap-3">
            {tags.map((t) => {
              const sec = byTagSeconds.get(t.id) ?? 0;
              if (tagFilter !== "all" && tagFilter !== t.id) return null;
              return (
                <div
                  key={t.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span>{t.name}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {formatDurationHours(sec)} · {blocksFromSeconds(sec)} bl.
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Pirámide */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold">
            Pirámide
          </h2>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
              Cargando…
            </div>
          ) : pyramidPlacements.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">
              <p>Aún no hay bloques en este periodo.</p>
              <p>Inicia el cronómetro o añade horas a mano (mín. 1 h por bloque).</p>
            </div>
          ) : (
            <ProductivityPyramid3D placements={pyramidPlacements} />
          )}
        </section>
      </main>

      <ManageTagsDialog
        open={tagsOpen}
        onOpenChange={setTagsOpen}
        userId={userId}
        tags={tags}
        colors={PRODUCTIVITY_TAG_COLORS}
        onChanged={load}
      />
      <AddManualSessionDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        userId={userId}
        tags={tags}
        onSaved={load}
        onNeedTags={() => setTagsOpen(true)}
      />
    </div>
  );
}

function formatTimerClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function FilterChip({
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

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
