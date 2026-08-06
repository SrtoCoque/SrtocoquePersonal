"use client";

import { ArrowRight } from "lucide-react";
import { MovieCard } from "@/components/movies/movie-card";
import { MediaScrollRow } from "@/components/ui/media-scroll-row";
import type { UserMovie } from "@/lib/types";

export function MovieSection({
  title,
  subtitle,
  movies,
  limit = 12,
  onSeeMore,
  onEdit,
  emptyLabel,
}: {
  title: string;
  subtitle?: string;
  movies: UserMovie[];
  limit?: number;
  onSeeMore: () => void;
  onEdit: (movie: UserMovie) => void;
  emptyLabel: string;
}) {
  const visible = movies.slice(0, limit);

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
          ) : (
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {movies.length} {movies.length === 1 ? "película" : "películas"}
            </p>
          )}
        </div>

        {movies.length > 0 && (
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
          {visible.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onEdit={onEdit} />
          ))}
        </MediaScrollRow>
      )}
    </section>
  );
}
