"use client";

import { ArrowRight } from "lucide-react";
import { SeriesCard } from "@/components/series/series-card";
import { MediaScrollRow } from "@/components/ui/media-scroll-row";
import type { UserSeries } from "@/lib/types";

export function SeriesSection({
  title,
  subtitle,
  series,
  limit = 12,
  onSeeMore,
  onEdit,
  emptyLabel,
  compactCards = false,
}: {
  title: string;
  subtitle?: string;
  series: UserSeries[];
  limit?: number;
  onSeeMore: () => void;
  onEdit: (series: UserSeries) => void;
  emptyLabel: string;
  compactCards?: boolean;
}) {
  const visible = series.slice(0, limit);
  const countLabel = `${series.length} ${series.length === 1 ? "serie" : "series"}`;
  const meta = subtitle ? `${countLabel} · ${subtitle}` : countLabel;

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-[var(--muted)]">{meta}</p>
        </div>

        {series.length > 0 && (
          <button
            type="button"
            onClick={onSeeMore}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Ver más
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-10 text-center text-sm text-[var(--muted)]">
          {emptyLabel}
        </div>
      ) : (
        <MediaScrollRow>
          {visible.map((item) => (
            <SeriesCard
              key={item.id}
              series={item}
              onEdit={onEdit}
              compact={compactCards}
            />
          ))}
        </MediaScrollRow>
      )}
    </section>
  );
}
