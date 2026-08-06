"use client";

import { cn } from "@/lib/utils";

export type StatsPeriod = "all" | number;

export function yearFromDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const y = new Date(value).getFullYear();
  return Number.isFinite(y) ? y : null;
}

export function collectYearsFromDates(
  dates: Array<string | null | undefined>,
): number[] {
  const set = new Set<number>();
  for (const d of dates) {
    const y = yearFromDate(d);
    if (y != null) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

export function StatsYearFilter({
  period,
  onPeriodChange,
  years,
}: {
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
  years: number[];
}) {
  return (
    <div className="mb-6 flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      <button
        type="button"
        onClick={() => onPeriodChange("all")}
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
          period === "all"
            ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
      >
        Todo
      </button>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onPeriodChange(y)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
            period === y
              ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

export function periodLabel(period: StatsPeriod): string {
  return period === "all" ? "Todo" : String(period);
}
