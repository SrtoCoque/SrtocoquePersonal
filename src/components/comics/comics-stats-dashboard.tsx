"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BookMarked, CheckCircle2, Euro, Layers, ListOrdered } from "lucide-react";
import { ComicsHeader } from "@/components/layout/comics-header";
import {
  StatsYearFilter,
  collectYearsFromDates,
  periodLabel,
  type StatsPeriod,
  yearFromDate,
} from "@/components/stats/stats-year-filter";
import { createClient } from "@/lib/supabase/client";
import type { UserComic, UserComicIssue } from "@/lib/types";
import { comicDisplayStatus } from "@/lib/types";
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

type ChartMode = "issues" | "comics" | "completed" | "spent";

type ChartComic = {
  key: string;
  title: string;
  cover_url: string | null;
};

type ChartBucket = {
  label: string;
  comics: ChartComic[];
};

function monthFromDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = new Date(value).getMonth();
  return Number.isFinite(m) ? m : null;
}

export function ComicsStatsDashboard({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [comics, setComics] = useState<UserComic[]>([]);
  const [issues, setIssues] = useState<UserComicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [chartMode, setChartMode] = useState<ChartMode>("issues");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: comicsData }, { data: issuesData }] = await Promise.all([
        supabase.from("user_comics").select("*").eq("user_id", userId),
        supabase.from("user_comic_issues").select("*").eq("user_id", userId),
      ]);
      const issueRows = (issuesData as UserComicIssue[]) ?? [];
      if (comicsData) {
        setComics(
          (comicsData as UserComic[]).map((c) => {
            const read = issueRows.filter(
              (i) => i.user_comic_id === c.id,
            ).length;
            const total = c.issue_count ?? 0;
            return {
              ...c,
              issues_read: read,
              issues_total: total,
              status: comicDisplayStatus(c.status, read, total),
            };
          }),
        );
      }
      setIssues(issueRows);
      setLoading(false);
    }
    load();
  }, [userId]);

  const comicsById = useMemo(() => {
    const map = new Map<string, UserComic>();
    for (const c of comics) map.set(c.id, c);
    return map;
  }, [comics]);

  const years = useMemo(() => {
    const dates = [
      ...issues.map((i) => i.read_at ?? i.created_at),
      ...issues.map((i) => i.purchased_at).filter(Boolean),
    ];
    return collectYearsFromDates(dates as string[]);
  }, [issues]);

  const stats = useMemo(() => {
    function issueDate(i: UserComicIssue) {
      return i.read_at ?? i.created_at;
    }

    function purchaseDate(i: UserComicIssue) {
      return i.purchased_at ?? i.read_at ?? i.created_at;
    }

    function issuePrice(i: UserComicIssue) {
      return i.price != null && Number.isFinite(Number(i.price))
        ? Number(i.price)
        : 0;
    }

    const filtered =
      period === "all"
        ? issues
        : issues.filter((i) => yearFromDate(issueDate(i)) === period);

    const spentIssues =
      period === "all"
        ? issues.filter((i) => issuePrice(i) > 0)
        : issues.filter(
            (i) =>
              issuePrice(i) > 0 && yearFromDate(purchaseDate(i)) === period,
          );

    const totalSpent = spentIssues.reduce((sum, i) => sum + issuePrice(i), 0);

    const comicIdsWithProgress = new Set(filtered.map((i) => i.user_comic_id));

    const completedInPeriod = comics.filter((c) => {
      if (c.status !== "read") return false;
      if (period === "all") return true;
      return comicIdsWithProgress.has(c.id);
    });

    function chartFromId(id: string): ChartComic {
      const c = comicsById.get(id);
      return {
        key: id,
        title: c?.title ?? "Cómic",
        cover_url: c?.cover_url ?? null,
      };
    }

    function uniqueFromIssues(list: UserComicIssue[]): ChartComic[] {
      const seen = new Set<string>();
      const out: ChartComic[] = [];
      for (const i of list) {
        if (!i.user_comic_id || seen.has(i.user_comic_id)) continue;
        seen.add(i.user_comic_id);
        out.push(chartFromId(i.user_comic_id));
      }
      return out;
    }

    function bucketsFromIssues(
      source: UserComicIssue[],
      dateOf: (i: UserComicIssue) => string,
    ): ChartBucket[] {
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => ({
            label: String(y),
            comics: uniqueFromIssues(
              source.filter((i) => yearFromDate(dateOf(i)) === y),
            ),
          }))
          .filter((b) => b.comics.length > 0);
      }
      return MONTHS.map((label, i) => ({
        label,
        comics: uniqueFromIssues(
          source.filter((issue) => monthFromDate(dateOf(issue)) === i),
        ),
      }));
    }

    function bucketsCompleted(): ChartBucket[] {
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => ({
            label: String(y),
            comics: completedInPeriod
              .filter((c) => {
                const own = issues.filter((i) => i.user_comic_id === c.id);
                if (own.length === 0) return yearFromDate(c.created_at) === y;
                return own.some((i) => yearFromDate(issueDate(i)) === y);
              })
              .map((c) => chartFromId(c.id)),
          }))
          .filter((b) => b.comics.length > 0);
      }
      return MONTHS.map((label, index) => ({
        label,
        comics: completedInPeriod
          .filter((c) => {
            const own = issues.filter((i) => i.user_comic_id === c.id);
            if (own.length === 0) return monthFromDate(c.created_at) === index;
            return own.some((i) => monthFromDate(issueDate(i)) === index);
          })
          .map((c) => chartFromId(c.id)),
      }));
    }

    function spentByBucket(): { label: string; amount: number; comics: ChartComic[] }[] {
      if (period === "all") {
        return years
          .slice()
          .reverse()
          .map((y) => {
            const list = spentIssues.filter(
              (i) => yearFromDate(purchaseDate(i)) === y,
            );
            return {
              label: String(y),
              amount: list.reduce((s, i) => s + issuePrice(i), 0),
              comics: uniqueFromIssues(list),
            };
          })
          .filter((b) => b.amount > 0);
      }
      return MONTHS.map((label, i) => {
        const list = spentIssues.filter(
          (issue) => monthFromDate(purchaseDate(issue)) === i,
        );
        return {
          label,
          amount: list.reduce((s, issue) => s + issuePrice(issue), 0),
          comics: uniqueFromIssues(list),
        };
      });
    }

    const issueBuckets = bucketsFromIssues(filtered, issueDate);
    const spentBuckets = spentByBucket();

    return {
      totalIssues: filtered.length,
      uniqueComics: comicIdsWithProgress.size,
      completedCount: completedInPeriod.length,
      totalSpent,
      chartBuckets:
        chartMode === "completed"
          ? bucketsCompleted()
          : chartMode === "spent"
            ? spentBuckets.map((b) => ({ label: b.label, comics: b.comics }))
            : issueBuckets,
      spentBuckets,
    };
  }, [issues, comics, comicsById, period, years, chartMode]);

  const coverTitle =
    chartMode === "issues"
      ? period === "all"
        ? "Números por año"
        : `Números por mes · ${period}`
      : chartMode === "comics"
        ? period === "all"
          ? "Cómics con progreso por año"
          : `Cómics con progreso · ${period}`
        : chartMode === "spent"
          ? period === "all"
            ? "Gasto por año"
            : `Gasto por mes · ${period}`
          : period === "all"
            ? "Completados por año"
            : `Completados por mes · ${period}`;

  const coverHint =
    chartMode === "completed"
      ? `Cómics en estado Leído · ${periodLabel(period)}`
      : chartMode === "spent"
        ? `Según la fecha en que apuntaste el gasto · ${periodLabel(period)}`
        : `Según la fecha en que marcaste cada número · ${periodLabel(period)}`;

  function formatEuro(n: number) {
    return `${n.toLocaleString("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} €`;
  }

  return (
    <div className="min-h-screen">
      <ComicsHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Estadísticas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resumen de tu progreso en cómics
          </p>
        </div>

        <StatsYearFilter
          period={period}
          onPeriodChange={setPeriod}
          years={years}
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid animate-fade-in gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={ListOrdered}
                label="Números leídos"
                value={stats.totalIssues}
                active={chartMode === "issues"}
                onClick={() => setChartMode("issues")}
              />
              <StatCard
                icon={Layers}
                label="Cómics con progreso"
                value={stats.uniqueComics}
                active={chartMode === "comics"}
                onClick={() => setChartMode("comics")}
              />
              <StatCard
                icon={CheckCircle2}
                label="Cómics completados"
                value={stats.completedCount}
                active={chartMode === "completed"}
                onClick={() => setChartMode("completed")}
              />
              <StatCard
                icon={Euro}
                label="Gastado"
                value={formatEuro(stats.totalSpent)}
                active={chartMode === "spent"}
                onClick={() => setChartMode("spent")}
              />
            </div>

            <section className="relative mt-8 animate-slide-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {coverTitle}
              </h2>
              <p className="mb-6 text-sm text-[var(--muted)]">{coverHint}</p>

              {stats.chartBuckets.every((b) => b.comics.length === 0) ? (
                <p className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                  {chartMode === "spent"
                    ? "No hay gasto registrado en este periodo"
                    : "No hay actividad en este periodo"}
                </p>
              ) : (
                <div
                  className={cn(
                    "flex min-h-[22rem] items-end gap-2 overflow-x-auto pb-1 sm:min-h-[26rem] sm:gap-3",
                    period === "all" ? "justify-start" : "justify-between",
                  )}
                >
                  {stats.chartBuckets.map((bucket) => {
                    const empty = bucket.comics.length === 0;
                    const compact = bucket.comics.length > 5;
                    const spentAmount =
                      chartMode === "spent"
                        ? (stats.spentBuckets.find(
                            (b) => b.label === bucket.label,
                          )?.amount ?? 0)
                        : 0;
                    return (
                      <div
                        key={bucket.label}
                        className={cn(
                          "flex flex-col items-center gap-2",
                          period === "all"
                            ? "w-[4.75rem] shrink-0 sm:w-24"
                            : "min-w-0 flex-1",
                        )}
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
                          {bucket.comics.map((c) => (
                            <div
                              key={c.key}
                              title={c.title}
                              className={cn(
                                "relative aspect-[2/3] overflow-hidden",
                                !compact &&
                                  "w-full border-t border-black/20 first:border-t-0",
                              )}
                            >
                              {c.cover_url ? (
                                <Image
                                  src={c.cover_url}
                                  alt={c.title}
                                  fill
                                  className="object-cover object-top"
                                  sizes={compact ? "48px" : "96px"}
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[var(--surface-3)] text-[var(--muted)]">
                                  <BookMarked
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
                              {chartMode === "spent"
                                ? formatEuro(spentAmount)
                                : bucket.comics.length}
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border bg-[var(--surface)] p-5 text-left transition-transform hover:-translate-y-0.5",
        active
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
          : "cursor-pointer border-[var(--border)] hover:border-[var(--accent)]/40",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
      <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </button>
  );
}
