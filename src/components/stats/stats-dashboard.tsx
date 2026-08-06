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
import { BookCheck, CalendarDays, FileText, Library } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/client";
import type { UserBook } from "@/lib/types";

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

export function StatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", userId);
      if (data) setBooks(data as UserBook[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  const stats = useMemo(() => {
    const read = books.filter((b) => b.status === "read");
    const readThisYear = read.filter((b) => {
      if (!b.read_finish_date) return false;
      return new Date(b.read_finish_date).getFullYear() === year;
    });

    const monthly = MONTHS.map((label, i) => ({
      month: label,
      libros: readThisYear.filter((b) => {
        const d = b.read_finish_date
          ? new Date(b.read_finish_date)
          : null;
        return d && d.getMonth() === i;
      }).length,
    }));

    const pagesFromRead = read.reduce(
      (sum, b) => sum + (b.total_pages ?? b.pages_read ?? 0),
      0,
    );
    const pagesFromReading = books
      .filter((b) => b.status === "reading")
      .reduce((sum, b) => sum + (b.pages_read ?? 0), 0);

    return {
      totalRead: read.length,
      readThisYear: readThisYear.length,
      totalPages: pagesFromRead + pagesFromReading,
      monthly,
    };
  }, [books, year]);

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resumen de tu actividad lectora
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
                label={`Leídos en ${year}`}
                value={stats.readThisYear}
              />
              <StatCard
                icon={BookCheck}
                label="Leídos en total"
                value={stats.totalRead}
              />
              <StatCard
                icon={FileText}
                label="Páginas leídas"
                value={stats.totalPages.toLocaleString("es-ES")}
              />
              <StatCard
                icon={Library}
                label="En la estantería"
                value={books.length}
              />
            </div>

            <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 animate-slide-up">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Libros leídos por mes · {year}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">
                Basado en la fecha de finalización
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
                      dataKey="libros"
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
