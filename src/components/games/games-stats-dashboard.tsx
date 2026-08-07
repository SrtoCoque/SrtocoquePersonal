"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Clock, Gamepad2, Trophy, Wallet } from "lucide-react";
import { GamesHeader } from "@/components/layout/games-header";
import {
  StatsYearFilter,
  collectYearsFromDates,
  periodLabel,
  type StatsPeriod,
  yearFromDate,
} from "@/components/stats/stats-year-filter";
import { createClient } from "@/lib/supabase/client";
import type { UserGame, UserGamePlaythrough } from "@/lib/types";
import {
  normalizeGamePrices,
  sumGamePrices,
} from "@/lib/game-prices";
import { cn } from "@/lib/utils";

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

type CompletionEvent = {
  id: string;
  finish_date: string | null;
  hours_played: number;
  user_game_id: string;
};

type ChartGame = {
  key: string;
  title: string;
  cover_url: string | null;
};

type ChartBucket = {
  label: string;
  games: ChartGame[];
};

function formatHours(value: number): string {
  if (value === 0) return "0";
  if (Number.isInteger(value)) return value.toLocaleString("es-ES");
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function formatEuros(value: number): string {
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

export function GamesStatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [games, setGames] = useState<UserGame[]>([]);
  const [playthroughs, setPlaythroughs] = useState<UserGamePlaythrough[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [hovered, setHovered] = useState<{
    label: string;
    games: ChartGame[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: gameData }, { data: playthroughData }] = await Promise.all(
        [
          supabase.from("user_games").select("*").eq("user_id", userId),
          supabase
            .from("user_game_playthroughs")
            .select("*")
            .eq("user_id", userId),
        ],
      );
      if (gameData) setGames(gameData as UserGame[]);
      if (playthroughData) {
        setPlaythroughs(playthroughData as UserGamePlaythrough[]);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  const gamesById = useMemo(() => {
    const map = new Map<string, UserGame>();
    for (const g of games) map.set(g.id, g);
    return map;
  }, [games]);

  /** Completados + rejugadas del historial, y juegos completados sin historial aún */
  const completionEvents = useMemo(() => {
    const events: CompletionEvent[] = playthroughs.map((p) => ({
      id: p.id,
      finish_date: p.finish_date,
      hours_played: Number(p.hours_played) || 0,
      user_game_id: p.user_game_id,
    }));

    const gamesWithHistory = new Set(playthroughs.map((p) => p.user_game_id));
    for (const g of games) {
      if (g.status !== "completed") continue;
      if (gamesWithHistory.has(g.id)) continue;
      if (!g.finish_date) continue;
      events.push({
        id: `legacy-${g.id}`,
        finish_date: g.finish_date,
        hours_played: Number(g.hours_played) || 0,
        user_game_id: g.id,
      });
    }
    return events;
  }, [games, playthroughs]);

  /**
   * Horas por año, sin duplicar:
   * - historial (completados / rejugadas)
   * - partidas activas (jugando / rejugando)
   * - sin terminar
   * - completados antiguos sin historial
   */
  const hourSlices = useMemo(() => {
    const slices: { year: number | null; hours: number }[] = [];
    const gamesWithHistory = new Set(playthroughs.map((p) => p.user_game_id));

    for (const p of playthroughs) {
      const hours = Number(p.hours_played) || 0;
      if (hours <= 0) continue;
      slices.push({ year: yearFromDate(p.finish_date), hours });
    }

    for (const g of games) {
      const hours = Number(g.hours_played) || 0;
      if (hours <= 0) continue;

      if (g.status === "playing" || g.status === "replaying") {
        slices.push({
          year:
            yearFromDate(g.start_date) ??
            yearFromDate(g.updated_at) ??
            yearFromDate(g.created_at),
          hours,
        });
        continue;
      }

      if (g.status === "dropped") {
        slices.push({
          year:
            yearFromDate(g.finish_date) ??
            yearFromDate(g.start_date) ??
            yearFromDate(g.updated_at) ??
            yearFromDate(g.created_at),
          hours,
        });
        continue;
      }

      if (g.status === "completed" && !gamesWithHistory.has(g.id)) {
        slices.push({
          year:
            yearFromDate(g.finish_date) ??
            yearFromDate(g.start_date) ??
            yearFromDate(g.created_at),
          hours,
        });
      }
    }

    return slices;
  }, [games, playthroughs]);

  const years = useMemo(() => {
    const dates: Array<string | null | undefined> = [
      ...completionEvents.map((e) => e.finish_date),
      ...playthroughs.map((p) => p.start_date),
    ];
    for (const g of games) {
      if (g.status === "wishlist") continue;
      dates.push(g.finish_date, g.start_date, g.updated_at, g.created_at);
    }
    // Años con horas registradas (p. ej. jugando en 2026)
    for (const slice of hourSlices) {
      if (slice.year != null && slice.hours > 0) {
        dates.push(`${slice.year}-01-01`);
      }
    }
    return collectYearsFromDates(dates);
  }, [completionEvents, playthroughs, games, hourSlices]);

  const stats = useMemo(() => {
    const library = games.filter((g) => g.status !== "wishlist");
    const eventsInPeriod =
      period === "all"
        ? completionEvents
        : completionEvents.filter(
            (e) => yearFromDate(e.finish_date) === period,
          );

    function toChartGames(events: CompletionEvent[]): ChartGame[] {
      return events.map((e) => {
        const game = gamesById.get(e.user_game_id);
        return {
          key: e.id,
          title: game?.title ?? "Juego",
          cover_url: game?.cover_url ?? null,
        };
      });
    }

    const chartBuckets: ChartBucket[] =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => ({
              label: String(y),
              games: toChartGames(
                completionEvents.filter(
                  (e) => yearFromDate(e.finish_date) === y,
                ),
              ),
            }))
            // Solo años con al menos un completado/rejugada en la gráfica
            .filter((b) => b.games.length > 0)
        : MONTHS.map((label, i) => ({
            label,
            games: toChartGames(
              eventsInPeriod.filter((e) => {
                const d = e.finish_date ? new Date(e.finish_date) : null;
                return d && d.getMonth() === i;
              }),
            ),
          }));

    // Horas: todas las partidas (cualquier estado), filtradas por año
    const totalHours = hourSlices
      .filter((s) => period === "all" || s.year === period)
      .reduce((sum, s) => sum + s.hours, 0);

    const eventGameIds = new Set(eventsInPeriod.map((e) => e.user_game_id));
    const spentGames =
      period === "all"
        ? library
        : games.filter((g) => eventGameIds.has(g.id));

    const totalSpent = spentGames.reduce(
      (sum, g) => sum + sumGamePrices(normalizeGamePrices(g.prices)),
      0,
    );

    const libraryAddedInPeriod =
      period === "all"
        ? library.length
        : games.filter(
            (g) =>
              g.status !== "wishlist" &&
              yearFromDate(g.created_at) === period,
          ).length;

    return {
      totalCompleted: eventsInPeriod.length,
      totalHours,
      totalSpent,
      chartBuckets,
      libraryTotal: libraryAddedInPeriod,
    };
  }, [games, gamesById, completionEvents, hourSlices, period, years]);

  return (
    <div className="min-h-screen">
      <GamesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas de juegos
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resumen de tu actividad gamer
          </p>
        </div>

        <StatsYearFilter
          period={period}
          onPeriodChange={setPeriod}
          years={years}
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              <StatCard
                icon={Trophy}
                label={
                  period === "all"
                    ? "Completados en total"
                    : `Completados en ${period}`
                }
                value={stats.totalCompleted}
              />
              <StatCard
                icon={Clock}
                label={
                  period === "all"
                    ? "Horas jugadas"
                    : `Horas jugadas · ${period}`
                }
                value={formatHours(stats.totalHours)}
                hint="Suma todas las partidas, da igual el estado"
              />
              <StatCard
                icon={Wallet}
                label={
                  period === "all"
                    ? "Gastado en total"
                    : `Gastado · ${period}`
                }
                value={formatEuros(stats.totalSpent)}
              />
              <StatCard
                icon={Gamepad2}
                label={
                  period === "all"
                    ? "En la biblioteca"
                    : `Añadidos · ${period}`
                }
                value={stats.libraryTotal}
                hint={
                  period === "all"
                    ? undefined
                    : "Juegos metidos en la biblioteca ese año"
                }
              />
            </div>

            <section className="relative mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {period === "all"
                  ? "Juegos completados por año"
                  : `Juegos completados por mes · ${period}`}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Cada miniatura es un completado o rejugada ·{" "}
                {periodLabel(period)}
              </p>

              {stats.chartBuckets.every((b) => b.games.length === 0) ? (
                <p className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                  No hay juegos completados en este periodo
                </p>
              ) : (
                <div className="relative">
                  <div
                    className={cn(
                      "flex min-h-[22rem] items-end gap-2 overflow-x-auto pb-1 sm:gap-3 sm:min-h-[26rem]",
                      period === "all" ? "justify-start" : "justify-between",
                    )}
                  >
                    {stats.chartBuckets.map((bucket) => {
                      const empty = bucket.games.length === 0;
                      return (
                        <div
                          key={bucket.label}
                          className={cn(
                            "flex flex-col items-center gap-2",
                            period === "all"
                              ? "w-[4.75rem] shrink-0 sm:w-24"
                              : "min-w-0 flex-1",
                          )}
                          onMouseEnter={() =>
                            !empty &&
                            setHovered({
                              label: bucket.label,
                              games: bucket.games,
                            })
                          }
                          onMouseLeave={() => setHovered(null)}
                        >
                          <div
                            className={cn(
                              "relative flex w-full flex-col-reverse overflow-hidden rounded-lg shadow-sm",
                              period !== "all" && "mx-auto max-w-[5.5rem] sm:max-w-24",
                              empty && "h-0",
                            )}
                          >
                            {bucket.games.map((g, i) => (
                              <div
                                key={g.key}
                                title={g.title}
                                className="relative aspect-[3/4] w-full overflow-hidden border-t border-black/20 first:border-t-0"
                              >
                                {g.cover_url ? (
                                  <Image
                                    src={g.cover_url}
                                    alt={g.title}
                                    fill
                                    className="object-cover object-top"
                                    sizes="96px"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-3)] text-[var(--muted)]">
                                    <Gamepad2 className="h-5 w-5 opacity-50" />
                                  </div>
                                )}
                                {i === bucket.games.length - 1 ? (
                                  <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {bucket.games.length}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-[var(--muted)] sm:text-xs">
                            {bucket.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {hovered && hovered.games.length > 0 ? (
                    <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-[min(100%,20rem)] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                        {hovered.label} · {hovered.games.length}{" "}
                        {hovered.games.length === 1 ? "juego" : "juegos"}
                      </p>
                      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                        {hovered.games.map((g) => (
                          <li
                            key={g.key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="relative h-9 w-7 shrink-0 overflow-hidden rounded bg-[var(--surface-3)]">
                              {g.cover_url ? (
                                <Image
                                  src={g.cover_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                  unoptimized
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center">
                                  <Gamepad2 className="h-3 w-3 text-[var(--muted)]" />
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-2 leading-snug">
                              {g.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
