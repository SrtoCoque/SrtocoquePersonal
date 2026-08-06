"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Check, Clapperboard, Loader2, Search, Star } from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { SaveMovieDialog } from "@/components/movies/save-movie-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { TmdbMovieResult, UserMovie } from "@/lib/types";
import {
  formatMovieRuntime,
  formatReleaseDate,
  isUpcomingRelease,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const IN_LIBRARY: Record<
  UserMovie["status"],
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

export function MoviesSearchView({
  userId,
  email,
  initialQuery,
}: {
  userId: string;
  email: string | null;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [library, setLibrary] = useState<UserMovie[]>([]);
  const [loading, setLoading] = useState(false);
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
    if (data) setLibrary(data as UserMovie[]);
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(q)}&limit=40`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: TmdbMovieResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error al buscar");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de búsqueda");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [initialQuery]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    router.push(`/movies/search?q=${encodeURIComponent(q)}`);
  }

  function handleClick(movie: TmdbMovieResult) {
    const existing = libraryByTmdbId.get(movie.tmdbId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(movie);
  }

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/movies"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a películas
        </Link>

        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Buscar películas
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Resultados de TMDB · las que ya tienes se marcan con claridad
          </p>
        </div>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título de la película..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={query.trim().length < 2 || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : initialQuery.trim().length < 2 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Escribe al menos 2 caracteres para buscar
          </p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Sin resultados para «{initialQuery}»
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--muted)]">
              {results.length} resultados para «{initialQuery}»
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 animate-fade-in">
              {results.map((movie) => {
                const existing = libraryByTmdbId.get(movie.tmdbId);
                const upcoming = isUpcomingRelease(movie.released);
                const inLib = existing
                  ? upcoming
                    ? {
                        label: "Próximo estreno · guardada",
                        bar: "bg-orange-500 text-white",
                        ring: "ring-2 ring-orange-500/70 border-orange-500/40",
                        Icon: Bookmark,
                      }
                    : IN_LIBRARY[existing.status]
                  : null;
                const StatusIcon = inLib?.Icon;

                return (
                  <button
                    key={movie.tmdbId}
                    type="button"
                    onClick={() => handleClick(movie)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
                      inLib
                        ? inLib.ring
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
                            inLib && "brightness-[0.85]",
                          )}
                          sizes="200px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[var(--muted)]">
                          <Clapperboard className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      {inLib && StatusIcon ? (
                        <div
                          className={cn(
                            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-2.5 text-center text-xs font-semibold leading-tight shadow-lg sm:text-sm",
                            inLib.bar,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                          <span className="line-clamp-1">{inLib.label}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
                        {movie.title}
                      </h2>
                      {inLib ? (
                        <p
                          className={cn(
                            "text-xs font-medium",
                            existing?.status === "watched"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : existing?.status === "wishlist" || upcoming
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[var(--muted)]",
                          )}
                        >
                          Toca para editar
                        </p>
                      ) : (
                        <p className="line-clamp-1 text-xs text-[var(--muted)]">
                          {upcoming
                            ? formatReleaseDate(movie.released)
                              ? `Estreno ${formatReleaseDate(movie.released)}`
                              : "Próximo estreno"
                            : (movie.released?.slice(0, 4) ?? "Sin fecha")}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-[10px] text-[var(--muted)]">
                        {movie.voteAverage ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {movie.voteAverage.toFixed(1)}
                          </span>
                        ) : null}
                        {!upcoming && formatMovieRuntime(movie.runtime) ? (
                          <span>{formatMovieRuntime(movie.runtime)}</span>
                        ) : null}
                      </div>
                      {movie.providers.length > 0 ? (
                        <p className="line-clamp-1 text-[10px] text-[var(--muted)]">
                          {movie.providers.slice(0, 3).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted)]">
          This product uses the TMDB API but is not endorsed or certified by{" "}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            TMDB
          </a>
        </p>
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
