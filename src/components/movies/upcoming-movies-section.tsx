"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { RecommendedMovieCard } from "@/components/movies/recommended-movie-card";
import { SaveMovieDialog } from "@/components/movies/save-movie-dialog";
import { MediaScrollRow } from "@/components/ui/media-scroll-row";
import type { TmdbMovieResult, UserMovie } from "@/lib/types";

export function UpcomingMoviesSection({
  userId,
  movies,
  onLibraryChange,
  limit = 12,
}: {
  userId: string;
  movies: UserMovie[];
  onLibraryChange: () => void;
  limit?: number;
}) {
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNew, setSelectedNew] = useState<TmdbMovieResult | null>(null);
  const [editing, setEditing] = useState<UserMovie | null>(null);

  const libraryByTmdbId = useMemo(() => {
    const map = new Map<number, UserMovie>();
    for (const m of movies) {
      if (m.tmdb_id != null) map.set(m.tmdb_id, m);
    }
    return map;
  }, [movies]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/upcoming?limit=${limit}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: TmdbMovieResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [limit]);

  function handleClick(movie: TmdbMovieResult) {
    const existing = libraryByTmdbId.get(movie.tmdbId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(movie);
  }

  if (loading) {
    return (
      <section className="animate-slide-up">
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Próximos estrenos
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            En cines (España)…
          </p>
        </div>
        <MediaScrollRow>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))}
        </MediaScrollRow>
      </section>
    );
  }

  if (results.length === 0) return null;

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Próximos estrenos
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            En cines · España
          </p>
        </div>
        <Link
          href="/movies/upcoming"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Ver más
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <MediaScrollRow>
        {results.slice(0, limit).map((movie) => (
          <RecommendedMovieCard
            key={movie.tmdbId}
            movie={movie}
            existing={libraryByTmdbId.get(movie.tmdbId)}
            onClick={() => handleClick(movie)}
          />
        ))}
      </MediaScrollRow>

      <SaveMovieDialog
        movie={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={onLibraryChange}
      />
      <EditMovieDialog
        movie={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={onLibraryChange}
        onDeleted={onLibraryChange}
      />
    </section>
  );
}
