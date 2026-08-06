"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MovieDestinationFields,
  movieDestinationToStatus,
  type MovieDestination,
} from "@/components/movies/movie-destination-fields";
import { enrichTmdbMovie } from "@/components/movies/enrich-movie";
import { MovieTrailerButton } from "@/components/movies/movie-trailer-button";
import { createClient } from "@/lib/supabase/client";
import type { MovieWatchLocation, TmdbMovieResult } from "@/lib/types";
import { isUpcomingRelease, serializeMovieProviders } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
};

export function AddMovieModal({ open, onOpenChange, userId, onAdded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbMovieResult | null>(null);
  const [destination, setDestination] = useState<MovieDestination | null>(null);
  const [viewedAt, setViewedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [location, setLocation] = useState<MovieWatchLocation>("home");
  const [score, setScore] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setDestination(null);
    setViewedAt(new Date().toISOString().slice(0, 10));
    setLocation("home");
    setScore("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(q)}&limit=6`,
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
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, selected]);

  function goToFullSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    onOpenChange(false);
    router.push(`/movies/search?q=${encodeURIComponent(q)}`);
  }

  async function handleSave() {
    if (!selected || !destination) return;
    if (destination === "watched" && !viewedAt) {
      setError("Indica la fecha en que la viste");
      return;
    }
    if (destination === "watched" && isUpcomingRelease(selected.released)) {
      setError("Esta película aún no se ha estrenado");
      return;
    }

    setSaving(true);
    setError(null);

    const enriched = await enrichTmdbMovie(selected);
    const status = movieDestinationToStatus(destination);
    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("user_movies")
      .insert({
        user_id: userId,
        tmdb_id: enriched.tmdbId,
        title: enriched.title,
        original_title: enriched.originalTitle,
        directors: enriched.directors,
        cover_url: enriched.coverUrl,
        genres: enriched.genres,
        providers: serializeMovieProviders(enriched.providers),
        released: enriched.released,
        runtime: enriched.runtime,
        vote_average: enriched.voteAverage,
        status,
        minutes_watched: 0,
        finish_date: status === "watched" ? viewedAt : null,
        score: status === "watched" && score !== "" ? score : null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setSaving(false);
      setError(insertError?.message ?? "No se pudo guardar");
      return;
    }

    if (status === "watched") {
      const { error: viewingError } = await supabase
        .from("user_movie_viewings")
        .insert({
          user_movie_id: inserted.id,
          user_id: userId,
          viewed_at: viewedAt,
          location,
        });
      if (viewingError) {
        setSaving(false);
        setError(viewingError.message);
        return;
      }
    }

    setSaving(false);
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir película</DialogTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Busca por título o director · pulsa Buscar / Enter para ver más
        </p>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {!selected ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                goToFullSearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Título o director..."
                  className="pl-9"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
                )}
              </div>
              <Button type="submit" disabled={query.trim().length < 2}>
                Buscar
              </Button>
            </form>

            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((movie) => (
                <li key={movie.tmdbId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(movie);
                      setDestination(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                      {movie.coverUrl ? (
                        <Image
                          src={movie.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{movie.title}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {[
                          movie.released?.slice(0, 4),
                          movie.directors[0] ?? null,
                          movie.runtime ? `${movie.runtime} min` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {query.trim().length >= 2 && (
              <button
                type="button"
                onClick={goToFullSearch}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
              >
                Ver todos los resultados
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <form
            className="space-y-4 animate-fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="flex gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)]">
                {selected.coverUrl && (
                  <Image
                    src={selected.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
                  {selected.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selected.released?.slice(0, 4) ?? "Sin fecha"}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--accent)] hover:underline"
                  onClick={() => setSelected(null)}
                >
                  Cambiar película
                </button>
                <div className="mt-3">
                  <MovieTrailerButton
                    title={selected.title}
                    youtubeKey={selected.youtubeTrailerKey}
                  />
                </div>
              </div>
            </div>

            <MovieDestinationFields
              destination={destination}
              onDestinationChange={setDestination}
              viewedAt={viewedAt}
              onViewedAtChange={setViewedAt}
              location={location}
              onLocationChange={setLocation}
              score={score}
              onScoreChange={setScore}
              upcoming={isUpcomingRelease(selected.released)}
              released={selected.released}
            />

            <Button
              type="submit"
              className={cn(
                "w-full",
                destination === "wishlist" &&
                  "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
              )}
              disabled={!destination || saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {!destination
                ? isUpcomingRelease(selected.released)
                  ? "Elige Wishlist"
                  : "Elige Wishlist o Vista"
                : destination === "wishlist"
                  ? "Añadir a Wishlist"
                  : "Marcar como vista"}
            </Button>
          </form>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <p className="text-center text-[11px] text-[var(--muted)]">
          This product uses the TMDB API but is not endorsed or certified by{" "}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--foreground)]"
          >
            TMDB
          </a>
        </p>
      </DialogBody>
    </Dialog>
  );
}
