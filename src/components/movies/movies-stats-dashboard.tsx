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
  CalendarDays,
  Clapperboard,
  Home,
  Popcorn,
  Star,
  Trophy,
} from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
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
  const year = new Date().getFullYear();

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

  const stats = useMemo(() => {
    const watchedMovies = movies.filter((m) => m.status === "watched");
    const viewingsThisYear = viewings.filter((v) => {
      return new Date(v.viewed_at).getFullYear() === year;
    });

    const monthly = MONTHS.map((label, i) => ({
      month: label,
      visionados: viewingsThisYear.filter((v) => {
        return new Date(v.viewed_at).getMonth() === i;
      }).length,
    }));

    const homeCount = viewings.filter((v) => v.location === "home").length;
    const cinemaCount = viewings.filter((v) => v.location === "cinema").length;

    const scored = movies.filter((m) => m.score != null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, m) => sum + Number(m.score), 0) / scored.length
        : null;

    const minutes = viewings.reduce((sum, v) => {
      const movie = movies.find((m) => m.id === v.user_movie_id);
      return sum + (Number(movie?.runtime) || 0);
    }, 0);

    return {
      uniqueWatched: watchedMovies.length,
      totalViewings: viewings.length,
      viewingsThisYear: viewingsThisYear.length,
      homeCount,
      cinemaCount,
      avgScore,
      monthly,
      total: movies.length,
      minutes,
    };
  }, [movies, viewings, year]);

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas de películas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visionados, lugares y puntuaciones
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
                icon={CalendarDays}
                label={`Visionados en ${year}`}
                value={stats.viewingsThisYear}
              />
              <StatCard
                icon={Trophy}
                label="Visionados en total"
                value={stats.totalViewings}
              />
              <StatCard
                icon={Clapperboard}
                label="Películas distintas vistas"
                value={stats.uniqueWatched}
              />
              <StatCard
                icon={Home}
                label="Vistas en casa"
                value={stats.homeCount}
              />
              <StatCard
                icon={Popcorn}
                label="Vistas en el cine"
                value={stats.cinemaCount}
              />
              <StatCard
                icon={Star}
                label="Puntuación media"
                value={
                  stats.avgScore != null
                    ? stats.avgScore.toFixed(1)
                    : "—"
                }
              />
            </div>

            <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Visionados por mes · {year}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Cada +1 cuenta como un visionado (casa o cine)
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--muted)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
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
                      dataKey="visionados"
                      fill="var(--accent)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {stats.minutes > 0 && (
              <p className="mt-4 text-center text-sm text-[var(--muted)]">
                ~{stats.minutes.toLocaleString("es-ES")} minutos de metraje
                visionado (según duración TMDB × veces vistas)
              </p>
            )}
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
