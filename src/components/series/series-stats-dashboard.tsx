"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock, ListVideo, Tv } from "lucide-react";
import { SeriesHeader } from "@/components/layout/series-header";
import {
  StatsYearFilter,
  collectYearsFromDates,
  periodLabel,
  type StatsPeriod,
  yearFromDate,
} from "@/components/stats/stats-year-filter";
import { createClient } from "@/lib/supabase/client";
import type { UserSeries, UserSeriesEpisode } from "@/lib/types";
import {
  countRegularWatchedEpisodes,
  parseMovieProviders,
  parseSeriesSeasonCounts,
  seriesDisplayStatus,
  totalRegularEpisodes,
} from "@/lib/types";
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

type ChartMode = "episodes" | "series" | "hours" | "completed";

type ChartSeries = {
  key: string;
  title: string;
  cover_url: string | null;
};

type ChartBucket = {
  label: string;
  series: ChartSeries[];
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

export function SeriesStatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [seriesList, setSeriesList] = useState<UserSeries[]>([]);
  const [episodes, setEpisodes] = useState<UserSeriesEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("episodes");
  const [hovered, setHovered] = useState<{
    label: string;
    series: ChartSeries[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: seriesData }, { data: epData }] = await Promise.all([
        supabase.from("user_series").select("*").eq("user_id", userId),
        supabase.from("user_series_episodes").select("*").eq("user_id", userId),
      ]);
      if (seriesData) {
        const eps = (epData as UserSeriesEpisode[]) ?? [];
        setSeriesList(
          (seriesData as UserSeries[]).map((s) => {
            const seasonCounts = parseSeriesSeasonCounts(s.season_counts);
            const seriesEps = eps.filter((e) => e.user_series_id === s.id);
            const watched = countRegularWatchedEpisodes(seriesEps);
            const total = totalRegularEpisodes(seasonCounts);
            return {
              ...s,
              providers: parseMovieProviders(s.providers),
              season_counts: seasonCounts,
              episodes_watched: watched,
              episodes_total: total,
              status: seriesDisplayStatus(s.status, watched, total),
            };
          }),
        );
      }
      if (epData) setEpisodes(epData as UserSeriesEpisode[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  const seriesById = useMemo(() => {
    const map = new Map<string, UserSeries>();
    for (const s of seriesList) map.set(s.id, s);
    return map;
  }, [seriesList]);

  const years = useMemo(
    () =>
      collectYearsFromDates(
        episodes.map((e) => e.viewed_at ?? e.created_at),
      ),
    [episodes],
  );

  const stats = useMemo(() => {
    function epDate(e: UserSeriesEpisode) {
      return e.viewed_at ?? e.created_at;
    }

    const filteredEps =
      period === "all"
        ? episodes
        : episodes.filter((e) => yearFromDate(epDate(e)) === period);

    const seriesIdsWithEps = new Set(filteredEps.map((e) => e.user_series_id));

    const completedInPeriod = seriesList.filter((s) => {
      if (s.status !== "watched") return false;
      if (period === "all") return true;
      return seriesIdsWithEps.has(s.id);
    });

    function chartFromId(id: string): ChartSeries {
      const s = seriesById.get(id);
      return {
        key: id,
        title: s?.title ?? "Serie",
        cover_url: s?.cover_url ?? null,
      };
    }

    function uniqueFromEps(list: UserSeriesEpisode[]): ChartSeries[] {
      const seen = new Set<string>();
      const out: ChartSeries[] = [];
      for (const e of list) {
        if (!e.user_series_id || seen.has(e.user_series_id)) continue;
        seen.add(e.user_series_id);
        out.push(chartFromId(e.user_series_id));
      }
      return out;
    }

    function bucketsFromEps(source: UserSeriesEpisode[]): ChartBucket[] {
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => ({
            label: String(y),
            series: uniqueFromEps(
              source.filter((e) => yearFromDate(epDate(e)) === y),
            ),
          }))
          .filter((b) => b.series.length > 0);
      }
      return MONTHS.map((label, i) => ({
        label,
        series: uniqueFromEps(
          source.filter((e) => monthFromDate(epDate(e)) === i),
        ),
      }));
    }

    function bucketsCompleted(): ChartBucket[] {
      const source = completedInPeriod;
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => ({
            label: String(y),
            series: source
              .filter((s) => {
                const eps = episodes.filter((e) => e.user_series_id === s.id);
                if (eps.length === 0) {
                  return yearFromDate(s.created_at) === y;
                }
                return eps.some((e) => yearFromDate(epDate(e)) === y);
              })
              .map((s) => chartFromId(s.id)),
          }))
          .filter((b) => b.series.length > 0);
      }
      return MONTHS.map((label, i) => ({
        label,
        series: source
          .filter((s) => {
            const eps = episodes.filter((e) => e.user_series_id === s.id);
            if (eps.length === 0) return monthFromDate(s.created_at) === i;
            return eps.some((e) => monthFromDate(epDate(e)) === i);
          })
          .map((s) => chartFromId(s.id)),
      }));
    }

    const episodeBuckets = bucketsFromEps(filteredEps);
    const seriesBuckets = episodeBuckets;
    const hoursBuckets = episodeBuckets;
    const completedBuckets = bucketsCompleted();

    const minutes = filteredEps.reduce((sum, e) => {
      const own = Number(e.runtime);
      if (Number.isFinite(own) && own > 0) return sum + own;
      const s = seriesById.get(e.user_series_id);
      return sum + (Number(s?.episode_run_time) || 0);
    }, 0);

    return {
      totalEpisodes: filteredEps.length,
      uniqueSeries: seriesIdsWithEps.size,
      completedCount: completedInPeriod.length,
      minutes,
      hoursLabel: formatHours(minutes),
      chartBuckets:
        chartMode === "completed"
          ? completedBuckets
          : chartMode === "series"
            ? seriesBuckets
            : hoursBuckets,
    };
  }, [
    episodes,
    seriesList,
    seriesById,
    period,
    years,
    chartMode,
  ]);

  const coverTitle =
    chartMode === "episodes"
      ? period === "all"
        ? "Episodios por año"
        : `Episodios por mes · ${period}`
      : chartMode === "series"
        ? period === "all"
          ? "Series con progreso por año"
          : `Series con progreso · ${period}`
        : chartMode === "hours"
          ? period === "all"
            ? "Horas por año"
            : `Horas por mes · ${period}`
          : period === "all"
            ? "Completadas por año"
            : `Completadas por mes · ${period}`;

  const coverHint =
    chartMode === "hours"
      ? `Duración de cada capítulo · fecha en que lo marcaste · ${periodLabel(period)}`
      : chartMode === "episodes"
        ? `Según la fecha en que marcaste cada episodio · ${periodLabel(period)}`
        : chartMode === "series"
          ? `Series con progreso · ${periodLabel(period)}`
          : `Series en estado Vista · ${periodLabel(period)}`;

  return (
    <div className="min-h-screen">
      <SeriesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resumen de tu progreso en series
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
                icon={ListVideo}
                label="Episodios marcados"
                value={stats.totalEpisodes}
                active={chartMode === "episodes"}
                onClick={() => setChartMode("episodes")}
              />
              <StatCard
                icon={Tv}
                label="Series con progreso"
                value={stats.uniqueSeries}
                active={chartMode === "series"}
                onClick={() => setChartMode("series")}
              />
              <StatCard
                icon={Clock}
                label="Horas estimadas"
                value={stats.hoursLabel}
                active={chartMode === "hours"}
                onClick={() => setChartMode("hours")}
              />
              <StatCard
                icon={CheckCircle2}
                label="Series completadas"
                value={stats.completedCount}
                active={chartMode === "completed"}
                onClick={() => setChartMode("completed")}
              />
            </div>

            <section className="relative mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {coverTitle}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">{coverHint}</p>

              {stats.chartBuckets.every((b) => b.series.length === 0) ? (
                <p className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                  No hay actividad en este periodo
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
                      const empty = bucket.series.length === 0;
                      const compact = bucket.series.length > 5;
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
                              series: bucket.series,
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
                            {bucket.series.map((s) => (
                              <div
                                key={s.key}
                                title={s.title}
                                className={cn(
                                  "relative aspect-[2/3] overflow-hidden",
                                  !compact &&
                                    "w-full border-t border-black/20 first:border-t-0",
                                )}
                              >
                                {s.cover_url ? (
                                  <Image
                                    src={s.cover_url}
                                    alt={s.title}
                                    fill
                                    className="object-cover object-top"
                                    sizes={compact ? "48px" : "96px"}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface-3)] text-[var(--muted)]">
                                    <Tv
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
                                {bucket.series.length}
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

                  {hovered && hovered.series.length > 0 ? (
                    <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-[min(100%,20rem)] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                        {hovered.label} · {hovered.series.length}{" "}
                        {hovered.series.length === 1 ? "serie" : "series"}
                      </p>
                      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                        {hovered.series.map((s) => (
                          <li
                            key={s.key}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="relative h-9 w-6 shrink-0 overflow-hidden rounded bg-[var(--surface-3)]">
                              {s.cover_url ? (
                                <Image
                                  src={s.cover_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                  unoptimized
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center">
                                  <Tv className="h-3 w-3 opacity-40" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 truncate">{s.title}</span>
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
