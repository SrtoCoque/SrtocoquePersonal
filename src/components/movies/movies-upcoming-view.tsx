"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Popcorn } from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { RecommendedMovieCard } from "@/components/movies/recommended-movie-card";
import { SaveMovieDialog } from "@/components/movies/save-movie-dialog";
import { createClient } from "@/lib/supabase/client";
import type { TmdbMovieResult, UserMovie } from "@/lib/types";
import { parseMovieProviders } from "@/lib/types";

export function MoviesUpcomingView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [library, setLibrary] = useState<UserMovie[]>([]);
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<TmdbMovieResult | null>(null);
  const [editing, setEditing] = useState<UserMovie | null>(null);

  const libraryByTmdbId = useMemo(() => {
    const map = new Map<number, UserMovie>();
    for (const m of library) {
      if (m.tmdb_id != null) map.set(m.tmdb_id, m);
    }
    return map;
  }, [library]);

  const loadLibrary = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_movies")
      .select("*")
      .eq("user_id", userId);
    if (data) {
      setLibrary(
        (data as UserMovie[]).map((m) => ({
          ...m,
          providers: parseMovieProviders(m.providers),
        })),
      );
    }
    setLoadingLib(false);
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (loadingLib) return;
    const controller = new AbortController();

    async function load() {
      setLoadingRec(true);
      setError(null);
      try {
        const res = await fetch(`/api/movies/upcoming?limit=24`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: TmdbMovieResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error al cargar estrenos");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoadingRec(false);
      }
    }

    load();
    return () => controller.abort();
  }, [loadingLib]);

  function handleClick(movie: TmdbMovieResult) {
    const existing = libraryByTmdbId.get(movie.tmdbId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(movie);
  }

  const loading = loadingLib || loadingRec;

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/movies"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a películas
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            <Popcorn className="h-7 w-7 text-[var(--accent)]" />
            Próximos estrenos
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Estrenos en cines · España (TMDB)
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--muted)]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando estrenos…</p>
          </div>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            No hay próximos estrenos ahora mismo.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 animate-fade-in">
            {results.map((movie) => (
              <RecommendedMovieCard
                key={movie.tmdbId}
                movie={movie}
                existing={libraryByTmdbId.get(movie.tmdbId)}
                onClick={() => handleClick(movie)}
              />
            ))}
          </div>
        )}
      </main>

      <SaveMovieDialog
        movie={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={loadLibrary}
      />
      <EditMovieDialog
        movie={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadLibrary}
        onDeleted={loadLibrary}
      />
    </div>
  );
}
