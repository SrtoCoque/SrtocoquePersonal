"use client";

import Image from "next/image";
import { Bookmark, Check, Clapperboard, Star } from "lucide-react";
import type { MovieStatus, TmdbMovieResult, UserMovie } from "@/lib/types";
import {
  formatMovieRuntime,
  formatReleaseDate,
  isUpcomingRelease,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  MovieStatus,
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-rose-500 text-white",
    ring: "ring-2 ring-rose-500/70 border-rose-500/40",
    Icon: Bookmark,
  },
  watching: {
    label: "La estás viendo",
    bar: "bg-sky-500 text-white",
    ring: "ring-2 ring-sky-500/70 border-sky-500/40",
    Icon: Check,
  },
  watched: {
    label: "Ya la has visto",
    bar: "bg-emerald-600 text-white",
    ring: "ring-2 ring-emerald-500/70 border-emerald-500/40",
    Icon: Check,
  },
};

export function RecommendedMovieCard({
  movie,
  existing,
  onClick,
}: {
  movie: TmdbMovieResult;
  existing?: UserMovie | null;
  onClick: () => void;
}) {
  const upcoming = isUpcomingRelease(movie.released);
  const statusMeta = existing ? STATUS_BAR[existing.status] : null;
  const StatusIcon = statusMeta?.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
        statusMeta
          ? statusMeta.ring
          : "border-[var(--border)] hover:border-[var(--accent)]/40",
      )}
    >
      <div className="relative aspect-[2/3] w-full bg-[var(--surface-3)]">
        {movie.coverUrl ? (
          <Image
            src={movie.coverUrl}
            alt={movie.title}
            fill
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              statusMeta && "brightness-[0.85]",
            )}
            sizes="200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <Clapperboard className="h-8 w-8 opacity-40" />
          </div>
        )}
        {movie.voteAverage != null && movie.voteAverage > 0 ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            <Star className="h-3 w-3 fill-current" />
            {movie.voteAverage.toFixed(1)}
          </span>
        ) : null}
        {statusMeta && StatusIcon ? (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
              statusMeta.bar,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{statusMeta.label}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {movie.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {upcoming
            ? formatReleaseDate(movie.released)
              ? `Estreno ${formatReleaseDate(movie.released)}`
              : "Próximo estreno"
            : [
                movie.released?.slice(0, 4),
                movie.directors[0] || movie.genres.slice(0, 2).join(", ") || null,
                formatMovieRuntime(movie.runtime),
              ]
                .filter(Boolean)
                .join(" · ") || "Sin datos"}
        </p>
      </div>
    </button>
  );
}
