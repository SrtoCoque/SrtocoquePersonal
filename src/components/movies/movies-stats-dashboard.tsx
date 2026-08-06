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
import { CalendarDays, Clapperboard, Clock, Trophy } from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import { createClient } from "@/lib/supabase/client";
import type { UserMovie } from "@/lib/types";

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
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_movies")
        .select("*")
        .eq("user_id", userId);
      if (data) setMovies(data as UserMovie[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  const stats = useMemo(() => {
    const watched = movies.filter((m) => m.status === "watched");
    const watchedThisYear = watched.filter((m) => {
      if (!m.finish_date) return false;
      return new Date(m.finish_date).getFullYear() === year;
    });

    const monthly = MONTHS.map((label, i) => ({
      month: label,
      peliculas: watchedThisYear.filter((m) => {
        const d = m.finish_date ? new Date(m.finish_date) : null;
        return d && d.getMonth() === i;
      }).length,
    }));

    const minutes = movies.reduce(
      (sum, m) => sum + (Number(m.minutes_watched) || 0),
      0,
    );
    const runtimeWatched = watched.reduce(
      (sum, m) => sum + (Number(m.runtime) || 0),
      0,
    );

    return {
      totalWatched: watched.length,
      watchedThisYear: watchedThisYear.length,
      totalMinutes: minutes || runtimeWatched,
      monthly,
      total: movies.length,
    };
  }, [movies, year]);

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas de películas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resumen de tu actividad cinefila
          </p>
        </div>

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
                icon={CalendarDays}
                label={`Vistas en ${year}`}
                value={stats.watchedThisYear}
              />
              <StatCard
                icon={Trophy}
                label="Vistas en total"
                value={stats.totalWatched}
              />
              <StatCard
                icon={Clock}
                label="Minutos"
                value={stats.totalMinutes.toLocaleString("es-ES")}
              />
              <StatCard
                icon={Clapperboard}
                label="En la biblioteca"
                value={stats.total}
              />
            </div>

            <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Películas vistas por mes · {year}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Basado en la fecha de visionado
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
                      dataKey="peliculas"
                      fill="var(--accent)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
