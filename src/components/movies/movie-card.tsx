"use client";

import Image from "next/image";
import { Bookmark, Check, Clapperboard } from "lucide-react";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import type { MovieStatus, UserMovie } from "@/lib/types";
import {
  formatDaysUntilRelease,
  formatMovieRuntime,
  formatReleaseDate,
  isInTheatersRelease,
  isUpcomingRelease,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  MovieStatus,
  { label: string; bar: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-rose-500 text-white",
    Icon: Bookmark,
  },
  watching: {
    label: "La estás viendo",
    bar: "bg-sky-500 text-white",
    Icon: Check,
  },
  watched: {
    label: "Ya la has visto",
    bar: "bg-emerald-600 text-white",
    Icon: Check,
  },
};

export function MovieCard({
  movie,
  onEdit,
  compact = false,
}: {
  movie: UserMovie;
  onEdit: (movie: UserMovie) => void;
  /** Misma densidad que Próximos estrenos / recomendados. */
  compact?: boolean;
}) {
  const times = movie.times_watched ?? 0;
  const upcoming = isUpcomingRelease(movie.released);
  const inTheaters = !upcoming && isInTheatersRelease(movie.released);
  const daysLeft = formatDaysUntilRelease(movie.released);
  const statusMeta = STATUS_BAR[movie.status];
  const StatusIcon = statusMeta.Icon;

  return (
    <button
      type="button"
      onClick={() => onEdit(movie)}
      className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface-3)]">
        {movie.cover_url ? (
          <Image
            src={movie.cover_url}
            alt={movie.title}
            fill
            className="object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <Clapperboard className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
            statusMeta.bar,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{statusMeta.label}</span>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col p-3",
          compact ? "gap-1" : "gap-2",
        )}
      >
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {movie.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {upcoming
            ? [
                formatReleaseDate(movie.released)
                  ? `Estreno ${formatReleaseDate(movie.released)}`
                  : null,
                daysLeft,
              ]
                .filter(Boolean)
                .join(" · ") || "Fecha de estreno pendiente"
            : inTheaters && formatReleaseDate(movie.released)
              ? `Estreno ${formatReleaseDate(movie.released)}`
              : [
                  formatMovieRuntime(movie.runtime),
                  movie.directors.slice(0, 2).join(", ") ||
                    movie.genres.slice(0, 2).join(", ") ||
                    null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sin datos"}
        </p>
        {!compact && movie.providers?.length ? (
          <MovieProviderLogos providers={movie.providers} limit={3} />
        ) : null}

        {!compact ? (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-[10px] text-[var(--muted)]">
            {movie.score != null ? <span>{movie.score}/100</span> : null}
            {times > 0 ? (
              <span>
                {times} {times === 1 ? "vista" : "vistas"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
