"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { RecommendedMovieCard } from "@/components/movies/recommended-movie-card";
import { SaveMovieDialog } from "@/components/movies/save-movie-dialog";
import {
  deriveTopGenreNames,
  libraryTmdbIds,
} from "@/lib/movie-tastes";
import type { TmdbMovieResult, UserMovie } from "@/lib/types";

export function RecommendedMoviesSection({
  userId,
  movies,
  onLibraryChange,
  limit = 8,
}: {
  userId: string;
  movies: UserMovie[];
  onLibraryChange: () => void;
  limit?: number;
}) {
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [tasteGenres, setTasteGenres] = useState<string[]>([]);
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

  const tasteKey = useMemo(() => {
    const genres = deriveTopGenreNames(movies, 3);
    const exclude = libraryTmdbIds(movies).join(",");
    return `${genres.join("|")}::${exclude}`;
  }, [movies]);

  useEffect(() => {
    const genres = deriveTopGenreNames(movies, 3);
    const exclude = libraryTmdbIds(movies);
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          exclude: exclude.join(","),
        });
        if (genres.length) params.set("genres", genres.join(","));

        const res = await fetch(`/api/movies/recommended?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: TmdbMovieResult[];
          genres?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error");
        setResults(data.results ?? []);
        setTasteGenres(data.genres ?? genres);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
    // tasteKey captura genres + exclude de movies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasteKey, limit]);

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
            Recomendados
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Según tus gustos…
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (results.length === 0) return null;

  const subtitle =
    tasteGenres.length > 0
      ? `Bien valoradas · ${tasteGenres.slice(0, 3).join(", ")}`
      : "Bien valoradas en TMDB";

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Recomendados
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
        </div>
        <Link
          href="/movies/recommended"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Ver más
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4">
        {results.slice(0, limit).map((movie) => (
          <RecommendedMovieCard
            key={movie.tmdbId}
            movie={movie}
            existing={libraryByTmdbId.get(movie.tmdbId)}
            onClick={() => handleClick(movie)}
          />
        ))}
      </div>

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
