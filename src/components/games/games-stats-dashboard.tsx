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
import type {
  UserGame,
  UserGameHourLog,
} from "@/lib/types";
import { normalizeGameStatus } from "@/lib/types";
import {
  normalizeGamePrices,
  sumGamePrices,
} from "@/lib/game-prices";
import { hoursCountedForStats } from "@/lib/game-hour-logs";
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

type ChartMode = "completed" | "hours" | "spent" | "library";

type CompletionEvent = {
  id: string;
  finish_date: string | null;
  hours_played: number;
  user_game_id: string;
};

type SpendEvent = {
  user_game_id: string;
  amount: number;
  set_at: string;
};

type LibraryEvent = {
  user_game_id: string;
  added_at: string;
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

function monthFromDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getMonth();
}

export function GamesStatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [games, setGames] = useState<UserGame[]>([]);
  const [hourLogs, setHourLogs] = useState<UserGameHourLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("completed");
  const [hovered, setHovered] = useState<{
    label: string;
    games: ChartGame[];
  } | null>(null);

  useEffect(() => {
    void load();
  }, [userId]);

  useEffect(() => {
    setHovered(null);
  }, [chartMode, period]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: gameData }, { data: hourLogData }] = await Promise.all([
      supabase.from("user_games").select("*").eq("user_id", userId),
      supabase.from("user_game_hour_logs").select("*").eq("user_id", userId),
    ]);
    if (gameData) {
      setGames(
        (gameData as UserGame[]).map((g) => ({
          ...g,
          status: normalizeGameStatus(g.status),
        })),
      );
    }
    if (hourLogData) {
      setHourLogs(hourLogData as UserGameHourLog[]);
    } else {
      setHourLogs([]);
    }
    setLoading(false);
  }

  const gamesById = useMemo(() => {
    const map = new Map<string, UserGame>();
    for (const g of games) map.set(g.id, g);
    return map;
  }, [games]);

  /** Completados por finish_date (solo status completed). */
  const completionEvents = useMemo(() => {
    const events: CompletionEvent[] = [];
    for (const g of games) {
      if (g.status !== "completed") continue;
      if (!g.finish_date) continue;
      events.push({
        id: g.id,
        finish_date: g.finish_date,
        hours_played: Number(g.hours_played) || 0,
        user_game_id: g.id,
      });
    }
    return events;
  }, [games]);

  /** Gasto atribuido al día en que se registró el precio pagado. */
  const spendEvents = useMemo(() => {
    const events: SpendEvent[] = [];
    for (const g of games) {
      if (g.status === "wishlist") continue;
      const amount = sumGamePrices(normalizeGamePrices(g.prices));
      if (amount <= 0) continue;
      const setAt =
        g.prices_set_at?.slice(0, 10) ??
        g.created_at?.slice(0, 10) ??
        null;
      if (!setAt) continue;
      events.push({
        user_game_id: g.id,
        amount,
        set_at: setAt,
      });
    }
    return events;
  }, [games]);

  /** Altas en biblioteca por created_at (sin wishlist). */
  const libraryEvents = useMemo(() => {
    const events: LibraryEvent[] = [];
    for (const g of games) {
      if (g.status === "wishlist") continue;
      const addedAt = g.created_at?.slice(0, 10);
      if (!addedAt) continue;
      events.push({ user_game_id: g.id, added_at: addedAt });
    }
    return events;
  }, [games]);

  /**
   * Horas: logs diarios + hueco si la ficha tiene más horas contables
   * que la suma de logs.
   */
  const hourSlices = useMemo(() => {
    const slices: {
      year: number | null;
      month: number | null;
      hours: number;
      user_game_id: string;
    }[] = hourLogs
      .map((log) => ({
        year: yearFromDate(log.played_on),
        month: monthFromDate(log.played_on),
        hours: Number(log.hours_delta) || 0,
        user_game_id: log.user_game_id,
      }))
      .filter((s) => s.hours > 0);

    const loggedByGame = new Map<string, number>();
    for (const s of slices) {
      loggedByGame.set(
        s.user_game_id,
        (loggedByGame.get(s.user_game_id) ?? 0) + s.hours,
      );
    }

    for (const g of games) {
      const counted = hoursCountedForStats(g);
      const logged = loggedByGame.get(g.id) ?? 0;
      const gap = Math.round((counted - logged) * 10) / 10;
      if (gap < 0.05) continue;
      const when =
        g.steam_last_played_at ??
        g.finish_date ??
        g.start_date ??
        g.updated_at ??
        g.created_at;
      slices.push({
        year: yearFromDate(when),
        month: monthFromDate(when),
        hours: gap,
        user_game_id: g.id,
      });
    }

    return slices;
  }, [hourLogs, games]);

  const years = useMemo(() => {
    const dates: Array<string | null | undefined> = [
      ...completionEvents.map((e) => e.finish_date),
      ...spendEvents.map((e) => e.set_at),
      ...libraryEvents.map((e) => e.added_at),
      ...hourLogs.map((l) => l.played_on),
    ];
    for (const g of games) {
      if (g.status === "wishlist") continue;
      dates.push(
        g.finish_date,
        g.start_date,
        g.prices_set_at,
        g.updated_at,
        g.created_at,
      );
    }
    return collectYearsFromDates(dates);
  }, [completionEvents, spendEvents, libraryEvents, games, hourLogs]);

  const stats = useMemo(() => {
    const eventsInPeriod =
      period === "all"
        ? completionEvents
        : completionEvents.filter(
            (e) => yearFromDate(e.finish_date) === period,
          );

    const spendsInPeriod =
      period === "all"
        ? spendEvents
        : spendEvents.filter((e) => yearFromDate(e.set_at) === period);

    const libraryInPeriod =
      period === "all"
        ? libraryEvents
        : libraryEvents.filter((e) => yearFromDate(e.added_at) === period);

    const slicesInPeriod = hourSlices.filter(
      (s) => period === "all" || s.year === period,
    );
    const totalHours = slicesInPeriod.reduce((sum, s) => sum + s.hours, 0);
    const totalSpent = spendsInPeriod.reduce((sum, e) => sum + e.amount, 0);

    function chartGameFromId(id: string): ChartGame {
      const game = gamesById.get(id);
      return {
        key: id,
        title: game?.title ?? "Juego",
        cover_url: game?.cover_url ?? null,
      };
    }

    /** Una sola carátula por juego en el mismo mes/año. */
    function uniqueGamesFromIds(ids: string[]): ChartGame[] {
      const seenIds = new Set<string>();
      const seenIdentity = new Set<string>();
      const out: ChartGame[] = [];
      for (const id of ids) {
        if (!id || seenIds.has(id)) continue;
        const game = gamesById.get(id);
        const identity =
          game?.rawg_id != null
            ? `rawg:${game.rawg_id}`
            : game?.steam_app_id != null
              ? `steam:${game.steam_app_id}`
              : game?.cover_url
                ? `cover:${game.cover_url}`
                : `title:${(game?.title ?? id).trim().toLowerCase()}`;
        if (seenIdentity.has(identity)) continue;
        seenIds.add(id);
        seenIdentity.add(identity);
        out.push(chartGameFromId(id));
      }
      return out;
    }

    function uniqueGamesFromSlices(
      slices: typeof hourSlices,
    ): ChartGame[] {
      return uniqueGamesFromIds(slices.map((s) => s.user_game_id));
    }

    const completedBuckets: ChartBucket[] =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => ({
              label: String(y),
              games: uniqueGamesFromIds(
                completionEvents
                  .filter((e) => yearFromDate(e.finish_date) === y)
                  .map((e) => e.user_game_id),
              ),
            }))
            .filter((b) => b.games.length > 0)
        : MONTHS.map((label, i) => ({
            label,
            games: uniqueGamesFromIds(
              eventsInPeriod
                .filter((e) => monthFromDate(e.finish_date) === i)
                .map((e) => e.user_game_id),
            ),
          }));

    const hoursBuckets: ChartBucket[] =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => ({
              label: String(y),
              games: uniqueGamesFromSlices(
                hourSlices.filter((s) => s.year === y),
              ),
            }))
            .filter((b) => b.games.length > 0)
        : MONTHS.map((label, i) => ({
            label,
            games: uniqueGamesFromSlices(
              slicesInPeriod.filter((s) => s.month === i),
            ),
          }));

    const spentBuckets: ChartBucket[] =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => ({
              label: String(y),
              games: uniqueGamesFromIds(
                spendEvents
                  .filter((e) => yearFromDate(e.set_at) === y)
                  .map((e) => e.user_game_id),
              ),
            }))
            .filter((b) => b.games.length > 0)
        : MONTHS.map((label, i) => ({
            label,
            games: uniqueGamesFromIds(
              spendsInPeriod
                .filter((e) => monthFromDate(e.set_at) === i)
                .map((e) => e.user_game_id),
            ),
          }));

    const libraryBuckets: ChartBucket[] =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => ({
              label: String(y),
              games: uniqueGamesFromIds(
                libraryEvents
                  .filter((e) => yearFromDate(e.added_at) === y)
                  .map((e) => e.user_game_id),
              ),
            }))
            .filter((b) => b.games.length > 0)
        : MONTHS.map((label, i) => ({
            label,
            games: uniqueGamesFromIds(
              libraryInPeriod
                .filter((e) => monthFromDate(e.added_at) === i)
                .map((e) => e.user_game_id),
            ),
          }));

    const chartBuckets =
      chartMode === "completed"
        ? completedBuckets
        : chartMode === "hours"
          ? hoursBuckets
          : chartMode === "spent"
            ? spentBuckets
            : libraryBuckets;

    const hoursByMonth =
      typeof period === "number"
        ? MONTHS.map((label, i) => ({
            label,
            hours: slicesInPeriod
              .filter((s) => s.month === i)
              .reduce((sum, s) => sum + s.hours, 0),
          }))
        : [];

    const completionsByMonth =
      typeof period === "number"
        ? MONTHS.map((label, i) => ({
            label,
            count: eventsInPeriod.filter(
              (e) => monthFromDate(e.finish_date) === i,
            ).length,
          }))
        : [];

    const spentByMonth =
      typeof period === "number"
        ? MONTHS.map((label, i) => ({
            label,
            amount: spendsInPeriod
              .filter((e) => monthFromDate(e.set_at) === i)
              .reduce((sum, e) => sum + e.amount, 0),
          }))
        : [];

    const libraryByMonth =
      typeof period === "number"
        ? MONTHS.map((label, i) => ({
            label,
            count: libraryInPeriod.filter(
              (e) => monthFromDate(e.added_at) === i,
            ).length,
          }))
        : [];

    const maxMonthHours = Math.max(0, ...hoursByMonth.map((m) => m.hours));
    const maxMonthCompletions = Math.max(
      0,
      ...completionsByMonth.map((m) => m.count),
    );
    const maxMonthSpent = Math.max(0, ...spentByMonth.map((m) => m.amount));
    const maxMonthLibrary = Math.max(
      0,
      ...libraryByMonth.map((m) => m.count),
    );

    return {
      totalCompleted: eventsInPeriod.length,
      totalHours,
      totalSpent,
      chartBuckets,
      libraryTotal: libraryInPeriod.length,
      hoursByMonth,
      maxMonthHours,
      completionsByMonth,
      maxMonthCompletions,
      spentByMonth,
      maxMonthSpent,
      libraryByMonth,
      maxMonthLibrary,
    };
  }, [
    gamesById,
    completionEvents,
    spendEvents,
    libraryEvents,
    hourSlices,
    period,
    years,
    chartMode,
  ]);

  const coverTitle =
    chartMode === "completed"
      ? period === "all"
        ? "Completados por año"
        : `Completados por mes · ${period}`
      : chartMode === "hours"
        ? period === "all"
          ? "Juegos con horas por año"
          : `Juegos con horas por mes · ${period}`
        : chartMode === "spent"
          ? period === "all"
            ? "Gastado por año"
            : `Gastado por mes · ${period}`
          : period === "all"
            ? "Añadidos a la biblioteca por año"
            : `Añadidos a la biblioteca · ${period}`;

  const coverHint =
    chartMode === "completed"
      ? `Juegos marcados como completados según fecha de fin · ${periodLabel(period)}`
      : chartMode === "hours"
        ? `Cada miniatura es un juego al que sumaste horas ese periodo (puede repetirse) · ${periodLabel(period)}`
        : chartMode === "spent"
          ? `Juegos según el día en que registraste el precio pagado · ${periodLabel(period)}`
          : `Juegos según el día en que los añadiste a la biblioteca · ${periodLabel(period)}`;

  const coverEmpty =
    chartMode === "completed"
      ? "No hay juegos completados en este periodo"
      : chartMode === "hours"
        ? "No hay horas registradas en este periodo"
        : chartMode === "spent"
          ? "No hay gasto registrado en este periodo"
          : "No hay juegos añadidos en este periodo";

  return (
    <div className="min-h-screen">
      <GamesHeader email={email} onSteamSynced={() => void load()} />

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
                className="h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              <StatCard
                icon={Trophy}
                label="Completados"
                value={stats.totalCompleted}
                active={chartMode === "completed"}
                onClick={() => setChartMode("completed")}
              />
              <StatCard
                icon={Clock}
                label="Horas"
                value={formatHours(stats.totalHours)}
                active={chartMode === "hours"}
                onClick={() => setChartMode("hours")}
              />
              <StatCard
                icon={Wallet}
                label="Gastado"
                value={formatEuros(stats.totalSpent)}
                active={chartMode === "spent"}
                onClick={() => setChartMode("spent")}
              />
              <StatCard
                icon={Gamepad2}
                label="Biblioteca"
                value={stats.libraryTotal}
                active={chartMode === "library"}
                onClick={() => setChartMode("library")}
              />
            </div>

            <section className="relative mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {coverTitle}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">{coverHint}</p>

              {stats.chartBuckets.every((b) => b.games.length === 0) ? (
                <p className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                  {coverEmpty}
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
                      const compact = bucket.games.length > 5;
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
                              "relative w-full overflow-hidden rounded-lg shadow-sm",
                              period !== "all" &&
                                "mx-auto max-w-[5.5rem] sm:max-w-24",
                              empty && "h-0",
                              // ≤5: pila vertical · >5: rejilla 2×2 (4 carátulas = 1 normal)
                              !empty &&
                                (compact
                                  ? "grid grid-cols-2 gap-px bg-black/20"
                                  : "flex flex-col-reverse"),
                            )}
                          >
                            {bucket.games.map((g) => (
                              <div
                                key={g.key}
                                title={g.title}
                                className={cn(
                                  "relative aspect-[3/4] overflow-hidden",
                                  !compact &&
                                    "w-full border-t border-black/20 first:border-t-0",
                                )}
                              >
                                {g.cover_url ? (
                                  <Image
                                    src={g.cover_url}
                                    alt={g.title}
                                    fill
                                    className="object-cover object-top"
                                    sizes={compact ? "48px" : "96px"}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-3)] text-[var(--muted)]">
                                    <Gamepad2
                                      className={cn(
                                        "opacity-50",
                                        compact ? "h-3 w-3" : "h-5 w-5",
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                            {!empty ? (
                              <span
                                className={cn(
                                  "absolute z-10 rounded-md bg-black/60 font-semibold text-white",
                                  compact
                                    ? "bottom-0.5 right-0.5 px-1 py-px text-[8px]"
                                    : "bottom-1 right-1 px-1.5 py-0.5 text-[10px]",
                                )}
                              >
                                {bucket.games.length}
                              </span>
                            ) : null}
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

            {typeof period === "number" ? (
              <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  {chartMode === "hours"
                    ? `Horas jugadas por mes · ${period}`
                    : chartMode === "spent"
                      ? `Gastado por mes · ${period}`
                      : chartMode === "library"
                        ? `Añadidos por mes · ${period}`
                        : `Completados por mes · ${period}`}
                </h2>
                <p className="mb-6 text-sm text-[var(--muted)]">
                  {chartMode === "hours"
                    ? `Incrementos registrados ese año · ${formatHours(stats.totalHours)} h en total`
                    : chartMode === "spent"
                      ? `Según el día en que metiste el precio · ${formatEuros(stats.totalSpent)}`
                      : chartMode === "library"
                        ? `${stats.libraryTotal} ${stats.libraryTotal === 1 ? "juego añadido" : "juegos añadidos"} ese año`
                        : `${stats.totalCompleted} ${stats.totalCompleted === 1 ? "juego" : "juegos"} con fecha de fin`}
                </p>
                {chartMode === "hours" ? (
                  stats.totalHours <= 0 ? (
                    <p className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
                      No hay horas registradas en este año
                    </p>
                  ) : (
                    <div className="flex h-48 items-end justify-between gap-1.5 sm:gap-2">
                      {stats.hoursByMonth.map((m) => {
                        const pct =
                          stats.maxMonthHours > 0
                            ? (m.hours / stats.maxMonthHours) * 100
                            : 0;
                        return (
                          <div
                            key={m.label}
                            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                            title={`${m.label}: ${formatHours(m.hours)} h`}
                          >
                            <span className="text-[10px] tabular-nums text-[var(--muted)] sm:text-xs">
                              {m.hours > 0 ? formatHours(m.hours) : ""}
                            </span>
                            <div className="flex h-32 w-full items-end justify-center">
                              <div
                                className="w-full max-w-[2.25rem] rounded-t-md bg-[var(--accent)]/80 transition-[height]"
                                style={{
                                  height:
                                    m.hours > 0
                                      ? `${Math.max(pct, 4)}%`
                                      : "0%",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--muted)] sm:text-xs">
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : chartMode === "spent" ? (
                  stats.totalSpent <= 0 ? (
                    <p className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
                      No hay gasto registrado en este año
                    </p>
                  ) : (
                    <div className="flex h-48 items-end justify-between gap-1.5 sm:gap-2">
                      {stats.spentByMonth.map((m) => {
                        const pct =
                          stats.maxMonthSpent > 0
                            ? (m.amount / stats.maxMonthSpent) * 100
                            : 0;
                        return (
                          <div
                            key={m.label}
                            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                            title={`${m.label}: ${formatEuros(m.amount)}`}
                          >
                            <span className="text-[10px] tabular-nums text-[var(--muted)] sm:text-xs">
                              {m.amount > 0 ? formatEuros(m.amount) : ""}
                            </span>
                            <div className="flex h-32 w-full items-end justify-center">
                              <div
                                className="w-full max-w-[2.25rem] rounded-t-md bg-[var(--accent)]/80 transition-[height]"
                                style={{
                                  height:
                                    m.amount > 0
                                      ? `${Math.max(pct, 4)}%`
                                      : "0%",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--muted)] sm:text-xs">
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : chartMode === "library" ? (
                  stats.libraryTotal <= 0 ? (
                    <p className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
                      No hay juegos añadidos en este año
                    </p>
                  ) : (
                    <div className="flex h-48 items-end justify-between gap-1.5 sm:gap-2">
                      {stats.libraryByMonth.map((m) => {
                        const pct =
                          stats.maxMonthLibrary > 0
                            ? (m.count / stats.maxMonthLibrary) * 100
                            : 0;
                        return (
                          <div
                            key={m.label}
                            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                            title={`${m.label}: ${m.count}`}
                          >
                            <span className="text-[10px] tabular-nums text-[var(--muted)] sm:text-xs">
                              {m.count > 0 ? m.count : ""}
                            </span>
                            <div className="flex h-32 w-full items-end justify-center">
                              <div
                                className="w-full max-w-[2.25rem] rounded-t-md bg-[var(--accent)]/80 transition-[height]"
                                style={{
                                  height:
                                    m.count > 0
                                      ? `${Math.max(pct, 4)}%`
                                      : "0%",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--muted)] sm:text-xs">
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : stats.totalCompleted <= 0 ? (
                  <p className="flex h-40 items-center justify-center text-sm text-[var(--muted)]">
                    No hay juegos completados en este año
                  </p>
                ) : (
                  <div className="flex h-48 items-end justify-between gap-1.5 sm:gap-2">
                    {stats.completionsByMonth.map((m) => {
                      const pct =
                        stats.maxMonthCompletions > 0
                          ? (m.count / stats.maxMonthCompletions) * 100
                          : 0;
                      return (
                        <div
                          key={m.label}
                          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                          title={`${m.label}: ${m.count}`}
                        >
                          <span className="text-[10px] tabular-nums text-[var(--muted)] sm:text-xs">
                            {m.count > 0 ? m.count : ""}
                          </span>
                          <div className="flex h-32 w-full items-end justify-center">
                            <div
                              className="w-full max-w-[2.25rem] rounded-t-md bg-[var(--accent)]/80 transition-[height]"
                              style={{
                                height:
                                  m.count > 0
                                    ? `${Math.max(pct, 4)}%`
                                    : "0%",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--muted)] sm:text-xs">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

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
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const className = cn(
    "rounded-2xl border bg-[var(--surface)] p-5 text-left transition-transform",
    interactive && "hover:-translate-y-0.5",
    active
      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
      : "border-[var(--border)]",
    interactive && !active && "cursor-pointer hover:border-[var(--accent)]/40",
  );

  const body = (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
      <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={className}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
