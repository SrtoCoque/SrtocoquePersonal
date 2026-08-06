"use client";

import Image from "next/image";
import { Clapperboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MovieStatus, UserMovie } from "@/lib/types";
import { formatMovieRuntime, MOVIE_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<MovieStatus, string> = {
  wishlist: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  owned: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  watching: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  watched: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function MovieCard({
  movie,
  onEdit,
}: {
  movie: UserMovie;
  onEdit: (movie: UserMovie) => void;
}) {
  const times = movie.times_watched ?? 0;

  return (
    <button
      type="button"
      onClick={() => onEdit(movie)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface-3)]">
        {movie.cover_url ? (
          <Image
            src={movie.cover_url}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <Clapperboard className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Badge className={cn("w-fit", STATUS_STYLE[movie.status])}>
          {MOVIE_STATUS_LABELS[movie.status]}
        </Badge>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {movie.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {[
            formatMovieRuntime(movie.runtime),
            movie.directors.slice(0, 2).join(", ") ||
              movie.genres.slice(0, 2).join(", ") ||
              null,
          ]
            .filter(Boolean)
            .join(" · ") || "Sin datos"}
        </p>
        {movie.providers?.length ? (
          <p className="line-clamp-1 text-[10px] text-[var(--muted)]">
            {movie.providers.slice(0, 3).join(" · ")}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-[10px] text-[var(--muted)]">
          {movie.score != null ? <span>{movie.score}/100</span> : null}
          {times > 0 ? (
            <span>
              {times} {times === 1 ? "vista" : "vistas"}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
