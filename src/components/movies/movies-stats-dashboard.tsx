"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Clapperboard,
  Clock,
  Home,
  Popcorn,
  Trophy,
} from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import {
  StatsYearFilter,
  collectYearsFromDates,
  periodLabel,
  type StatsPeriod,
  yearFromDate,
} from "@/components/stats/stats-year-filter";
import { createClient } from "@/lib/supabase/client";
import type { UserMovie, UserMovieViewing } from "@/lib/types";
import { parseMovieProviders } from "@/lib/types";
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

type ChartMode = "viewings" | "unique" | "hours" | "home" | "cinema";

type ChartMovie = {
  key: string;
  title: string;
  cover_url: string | null;
};

type ChartBucket = {
  label: string;
  movies: ChartMovie[];
};

function monthFromDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = new Date(value).getMonth();
  return Number.isFinite(m) ? m : null;
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return "0";
  const h = minutes / 60;
  if (h < 10) return h.toFixed(1).replace(/\.0$/, "");
  return Math.round(h).toLocaleString("es-ES");
}

function formatUnit(n: number, singular: string, plural: string): string | null {
  if (n <= 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

function joinSpanish(parts: (string | null)[]): string {
  const list = parts.filter((p): p is string => Boolean(p));
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} y ${list[1]}`;
  return `${list.slice(0, -1).join(" ")} y ${list[list.length - 1]}`;
}

function formatWatchSpan(minutes: number): string | null {
  if (minutes <= 0) return null;
  const totalDays = Math.floor(minutes / (60 * 24));
  if (totalDays < 1) return "menos de 1 día";
  if (totalDays <= 30) {
    return formatUnit(totalDays, "día", "días");
  }

  const totalMonths = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;

  if (totalMonths < 12) {
    return joinSpanish([
      formatUnit(totalMonths, "mes", "meses"),
      formatUnit(remDays, "día", "días"),
    ]);
  }

  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;
  return joinSpanish([
    formatUnit(years, "año", "años"),
    formatUnit(remMonths, "mes", "meses"),
    formatUnit(remDays, "día", "días"),
  ]);
}

function hoursFromViewings(
  list: UserMovieViewing[],
  moviesById: Map<string, UserMovie>,
): number {
  return list.reduce((sum, v) => {
    const movie = moviesById.get(v.user_movie_id);
    return sum + (Number(movie?.runtime) || 0);
  }, 0);
}

export function MoviesStatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [movies, setMovies] = useState<UserMovie[]>([]);
  const [viewings, setViewings] = useState<UserMovieViewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("viewings");
  const [hovered, setHovered] = useState<{
    label: string;
    movies: ChartMovie[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: movieData }, { data: viewingData }] = await Promise.all([
        supabase.from("user_movies").select("*").eq("user_id", userId),
        supabase.from("user_movie_viewings").select("*").eq("user_id", userId),
      ]);
      if (movieData) {
        setMovies(
          (movieData as UserMovie[]).map((m) => ({
            ...m,
            providers: parseMovieProviders(m.providers),
          })),
        );
      }
      if (viewingData) setViewings(viewingData as UserMovieViewing[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  const moviesById = useMemo(() => {
    const map = new Map<string, UserMovie>();
    for (const m of movies) map.set(m.id, m);
    return map;
  }, [movies]);

  const years = useMemo(
    () => collectYearsFromDates(viewings.map((v) => v.viewed_at)),
    [viewings],
  );

  const stats = useMemo(() => {
    const filteredViewings =
      period === "all"
        ? viewings
        : viewings.filter((v) => yearFromDate(v.viewed_at) === period);

    const movieIdsWithViewing = new Set(
      filteredViewings.map((v) => v.user_movie_id),
    );
    const watchedInPeriod = movies.filter((m) => movieIdsWithViewing.has(m.id));

    const homeViewings = filteredViewings.filter((v) => v.location === "home");
    const cinemaViewings = filteredViewings.filter(
      (v) => v.location === "cinema",
    );

    function chartMovieFromId(id: string): ChartMovie {
      const movie = moviesById.get(id);
      return {
        key: id,
        title: movie?.title ?? "Película",
        cover_url: movie?.cover_url ?? null,
      };
    }

    function uniqueMoviesFromViewings(list: UserMovieViewing[]): ChartMovie[] {
      const seen = new Set<string>();
      const out: ChartMovie[] = [];
      for (const v of list) {
        if (!v.user_movie_id || seen.has(v.user_movie_id)) continue;
        seen.add(v.user_movie_id);
        out.push(chartMovieFromId(v.user_movie_id));
      }
      return out;
    }

    function bucketsFromViewings(
      source: UserMovieViewing[],
    ): ChartBucket[] {
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => ({
            label: String(y),
            movies: uniqueMoviesFromViewings(
              source.filter((v) => yearFromDate(v.viewed_at) === y),
            ),
          }))
          .filter((b) => b.movies.length > 0);
      }
      return MONTHS.map((label, i) => ({
        label,
        movies: uniqueMoviesFromViewings(
          source.filter((v) => monthFromDate(v.viewed_at) === i),
        ),
      }));
    }

    const viewingsBuckets = bucketsFromViewings(filteredViewings);
    const homeBuckets = bucketsFromViewings(homeViewings);
    const cinemaBuckets = bucketsFromViewings(cinemaViewings);

    const chartBuckets =
      chartMode === "home"
        ? homeBuckets
        : chartMode === "cinema"
          ? cinemaBuckets
          : viewingsBuckets;

    const minutes = hoursFromViewings(filteredViewings, moviesById);

    return {
      uniqueWatched: watchedInPeriod.length,
      totalViewings: filteredViewings.length,
      homeCount: homeViewings.length,
      cinemaCount: cinemaViewings.length,
      chartBuckets,
      minutes,
      hoursLabel: formatHours(minutes),
      hoursSpan: formatWatchSpan(minutes),
    };
  }, [movies, moviesById, viewings, period, years, chartMode]);

  const coverTitle =
    chartMode === "viewings"
      ? period === "all"
        ? "Visionados por año"
        : `Visionados por mes · ${period}`
      : chartMode === "unique"
        ? period === "all"
          ? "Películas distintas por año"
          : `Películas distintas por mes · ${period}`
        : chartMode === "hours"
          ? period === "all"
            ? "Horas por año"
            : `Horas por mes · ${period}`
          : chartMode === "home"
            ? period === "all"
              ? "En casa por año"
              : `En casa por mes · ${period}`
            : period === "all"
              ? "En el cine por año"
              : `En el cine por mes · ${period}`;

  const coverHint =
    chartMode === "viewings"
      ? `Películas con al menos un visionado · ${periodLabel(period)}`
      : chartMode === "unique"
        ? `Películas distintas vistas · ${periodLabel(period)}`
        : chartMode === "hours"
          ? `Películas que aportan horas (duración TMDB) · ${periodLabel(period)}`
          : chartMode === "home"
            ? `Vistas en casa · ${periodLabel(period)}`
            : `Vistas en el cine · ${periodLabel(period)}`;

  const coverEmpty =
    chartMode === "home"
      ? "No hay visionados en casa en este periodo"
      : chartMode === "cinema"
        ? "No hay visionados en el cine en este periodo"
        : "No hay visionados en este periodo";

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas de películas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visionados, horas y lugares
          </p>
        </div>

        <StatsYearFilter
          period={period}
          onPeriodChange={setPeriod}
          years={years}
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
              <StatCard
                icon={Trophy}
                label={
                  period === "all"
                    ? "Visionados en total"
                    : `Visionados en ${period}`
                }
                value={stats.totalViewings}
                active={chartMode === "viewings"}
                onClick={() => setChartMode("viewings")}
              />
              <StatCard
                icon={Clapperboard}
                label="Películas distintas"
                value={stats.uniqueWatched}
                active={chartMode === "unique"}
                onClick={() => setChartMode("unique")}
              />
              <StatCard
                icon={Clock}
                label="Horas totales"
                value={stats.hoursLabel}
                aside={stats.hoursSpan}
                active={chartMode === "hours"}
                onClick={() => setChartMode("hours")}
              />
              <StatCard
                icon={Home}
                label="Vistas en casa"
                value={stats.homeCount}
                active={chartMode === "home"}
                onClick={() => setChartMode("home")}
              />
              <StatCard
                icon={Popcorn}
                label="Vistas en el cine"
                value={stats.cinemaCount}
                active={chartMode === "cinema"}
                onClick={() => setChartMode("cinema")}
              />
            </div>

            <section className="relative mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {coverTitle}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">{coverHint}</p>

              {stats.chartBuckets.every((b) => b.movies.length === 0) ? (
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
                      const empty = bucket.movies.length === 0;
                      const compact = bucket.movies.length > 5;
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
                              movies: bucket.movies,
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
                              !empty &&
                                (compact
                                  ? "grid grid-cols-2 gap-px bg-black/20"
                                  : "flex flex-col-reverse"),
                            )}
                          >
                            {bucket.movies.map((m) => (
                              <div
                                key={m.key}
                                title={m.title}
                                className={cn(
                                  "relative aspect-[2/3] overflow-hidden",
                                  !compact &&
                                    "w-full border-t border-black/20 first:border-t-0",
                                )}
                              >
                                {m.cover_url ? (
                                  <Image
                                    src={m.cover_url}
                                    alt={m.title}
                                    fill
                                    className="object-cover object-top"
                                    sizes={compact ? "48px" : "96px"}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-3)] text-[var(--muted)]">
                                    <Clapperboard
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
                                {bucket.movies.length}
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

                  {hovered && hovered.movies.length > 0 ? (
                    <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-[min(100%,20rem)] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                        {hovered.label} · {hovered.movies.length}{" "}
                        {hovered.movies.length === 1
                          ? "película"
                          : "películas"}
                      </p>
                      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                        {hovered.movies.map((m) => (
                          <li
                            key={m.key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="relative h-9 w-6 shrink-0 overflow-hidden rounded bg-[var(--surface-3)]">
                              {m.cover_url ? (
                                <Image
                                  src={m.cover_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                  unoptimized
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center">
                                  <Clapperboard className="h-3 w-3 opacity-40" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 truncate">{m.title}</span>
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
  aside,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  aside?: string | null;
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
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {value}
        </span>
        {aside ? (
          <span className="text-sm text-[var(--muted)]">{aside}</span>
        ) : null}
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
