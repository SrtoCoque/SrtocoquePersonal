"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

function formatHours(minutes: number): string {
  if (minutes <= 0) return "0";
  const h = minutes / 60;
  if (h < 10) return h.toFixed(1).replace(/\.0$/, "");
  return Math.round(h).toLocaleString("es-ES");
}

function hoursFromViewings(
  list: UserMovieViewing[],
  movies: UserMovie[],
): number {
  return list.reduce((sum, v) => {
    const movie = movies.find((m) => m.id === v.user_movie_id);
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

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: movieData }, { data: viewingData }] = await Promise.all([
        supabase.from("user_movies").select("*").eq("user_id", userId),
        supabase.from("user_movie_viewings").select("*").eq("user_id", userId),
      ]);
      if (movieData) setMovies(movieData as UserMovie[]);
      if (viewingData) setViewings(viewingData as UserMovieViewing[]);
      setLoading(false);
    }
    load();
  }, [userId]);

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

    const chartData =
      period === "all"
        ? years
            .slice()
            .reverse()
            .map((y) => {
              const yearViewings = viewings.filter(
                (v) => yearFromDate(v.viewed_at) === y,
              );
              return {
                label: String(y),
                visionados: yearViewings.length,
                horas: Math.round(
                  (hoursFromViewings(yearViewings, movies) / 60) * 10,
                ) / 10,
              };
            })
        : MONTHS.map((label, i) => {
            const monthViewings = filteredViewings.filter(
              (v) => new Date(v.viewed_at).getMonth() === i,
            );
            return {
              label,
              visionados: monthViewings.length,
              horas:
                Math.round(
                  (hoursFromViewings(monthViewings, movies) / 60) * 10,
                ) / 10,
            };
          });

    const homeCount = filteredViewings.filter((v) => v.location === "home")
      .length;
    const cinemaCount = filteredViewings.filter(
      (v) => v.location === "cinema",
    ).length;

    const minutes = hoursFromViewings(filteredViewings, movies);

    return {
      uniqueWatched: watchedInPeriod.length,
      totalViewings: filteredViewings.length,
      homeCount,
      cinemaCount,
      chartData,
      minutes,
      hoursLabel: formatHours(minutes),
    };
  }, [movies, viewings, period, years]);

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
              />
              <StatCard
                icon={Clapperboard}
                label="Películas distintas"
                value={stats.uniqueWatched}
              />
              <StatCard
                icon={Clock}
                label="Horas totales"
                value={stats.hoursLabel}
              />
              <InlineStatCard
                icon={Home}
                label="Vistas en casa"
                value={stats.homeCount}
              />
              <InlineStatCard
                icon={Popcorn}
                label="Vistas en el cine"
                value={stats.cinemaCount}
              />
            </div>

            <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {period === "all"
                  ? "Visionados por año"
                  : `Visionados por mes · ${period}`}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Periodo: {periodLabel(period)} · cada +1 cuenta como un
                visionado
              </p>
              <StatsBarChart
                data={stats.chartData}
                dataKey="visionados"
                emptyLabel="No hay visionados en este periodo"
                emptyCheck={(d) => d.visionados === 0}
              />
            </section>

            <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {period === "all"
                  ? "Horas por año"
                  : `Horas por mes · ${period}`}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Periodo: {periodLabel(period)} · duración TMDB × veces vistas
              </p>
              <StatsBarChart
                data={stats.chartData}
                dataKey="horas"
                emptyLabel="No hay horas en este periodo"
                emptyCheck={(d) => d.horas === 0}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

type ChartRow = { label: string; visionados: number; horas: number };

function StatsBarChart({
  data,
  dataKey,
  emptyLabel,
  emptyCheck,
}: {
  data: ChartRow[];
  dataKey: "visionados" | "horas";
  emptyLabel: string;
  emptyCheck: (d: ChartRow) => boolean;
}) {
  return (
    <div className="h-64 w-full">
      {data.every(emptyCheck) ? (
        <p className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
          {emptyLabel}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={dataKey === "horas"}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--foreground)",
              }}
              cursor={{ fill: "var(--surface-2)" }}
            />
            <Bar
              dataKey={dataKey}
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
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
    </div>
  );
}

/** Icono, etiqueta y número en una sola línea. */
function InlineStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-transform hover:-translate-y-0.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
