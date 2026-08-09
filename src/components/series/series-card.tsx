"use client";

import Image from "next/image";
import { Bookmark, Check, Play, Tv } from "lucide-react";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import type { SeriesStatus, UserSeries } from "@/lib/types";
import { formatReleaseDate, seriesDisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  SeriesStatus,
  { label: string; bar: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    Icon: Bookmark,
  },
  watching: {
    label: "Viendo",
    bar: "bg-sky-500 text-white",
    Icon: Play,
  },
  watched: {
    label: "Vista",
    bar: "bg-emerald-600 text-white",
    Icon: Check,
  },
};

export function SeriesCard({
  series,
  onEdit,
  compact = false,
}: {
  series: UserSeries;
  onEdit: (series: UserSeries) => void;
  compact?: boolean;
}) {
  const watched = series.episodes_watched ?? 0;
  const total = series.episodes_total ?? 0;
  const displayStatus = seriesDisplayStatus(series.status, watched, total);
  const statusMeta = STATUS_BAR[displayStatus];
  const StatusIcon = statusMeta.Icon;
  const year = series.first_air_date?.slice(0, 4);
  const progressLabel =
    displayStatus !== "wishlist" && total > 0
      ? `${watched}/${total}`
      : displayStatus !== "wishlist" && watched > 0
        ? `${watched}`
        : null;

  return (
    <button
      type="button"
      onClick={() => onEdit(series)}
      className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface-3)]">
        {series.cover_url ? (
          <Image
            src={series.cover_url}
            alt={series.title}
            fill
            className="object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <Tv className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
            statusMeta.bar,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{statusMeta.label}</span>
          {progressLabel ? (
            <span className="shrink-0 tabular-nums opacity-95">
              {progressLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col p-3",
          compact ? "gap-1" : "gap-2",
        )}
      >
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {series.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {[
            year,
            series.number_of_seasons
              ? `${series.number_of_seasons} temp.`
              : null,
            series.genres.slice(0, 2).join(", ") || null,
          ]
            .filter(Boolean)
            .join(" · ") ||
            (formatReleaseDate(series.first_air_date)
              ? `Estreno ${formatReleaseDate(series.first_air_date)}`
              : "Sin datos")}
        </p>
        {!compact && series.providers?.length ? (
          <MovieProviderLogos providers={series.providers} limit={3} />
        ) : null}

        {!compact && series.score != null ? (
          <div className="mt-auto pt-1 text-[10px] text-[var(--muted)]">
            {series.score}/100
          </div>
        ) : null}
      </div>
    </button>
  );
}
