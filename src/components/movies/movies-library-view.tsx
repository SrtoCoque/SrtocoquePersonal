"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Plus } from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import { AddMovieModal } from "@/components/movies/add-movie-modal";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { MovieCard } from "@/components/movies/movie-card";
import { MovieSection } from "@/components/movies/movie-section";
import { RecommendedMoviesSection } from "@/components/movies/recommended-movies-section";
import { UpcomingMoviesSection } from "@/components/movies/upcoming-movies-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { UserMovie } from "@/lib/types";
import {
  isInTheatersRelease,
  isMovieOnShelf,
  isUpcomingRelease,
  parseMovieProviders,
  serializeMovieProviders,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "shelf" | "inTheaters" | "upcoming" | "wishlist" | "watched";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "wishlist", label: "Wishlist" },
  { id: "shelf", label: "Biblioteca" },
  { id: "upcoming", label: "Estrenos" },
  { id: "watched", label: "Vistas" },
];

function parseFilter(raw: string | null): Filter {
  if (
    raw === "shelf" ||
    raw === "wishlist" ||
    raw === "upcoming" ||
    raw === "watched" ||
    raw === "inTheaters"
  ) {
    return raw;
  }
  return "all";
}

export function MoviesLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [movies, setMovies] = useState<UserMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserMovie | null>(null);

  const loadMovies = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error }, { data: viewings }] = await Promise.all([
      supabase
        .from("user_movies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_movie_viewings")
        .select("user_movie_id")
        .eq("user_id", userId),
    ]);

    if (!error && data) {
      const counts = new Map<string, number>();
      for (const row of viewings ?? []) {
        const id = (row as { user_movie_id: string }).user_movie_id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const mapped = (data as UserMovie[]).map((m) => ({
        ...m,
        providers: parseMovieProviders(m.providers),
        times_watched: counts.get(m.id) ?? 0,
      }));
      setMovies(mapped);

      // Actualiza en BD los proveedores legacy (solo nombre → JSON con logo)
      void (async () => {
        for (const row of data as UserMovie[]) {
          const parsed = parseMovieProviders(row.providers);
          if (parsed.length === 0 || !parsed.some((p) => p.logoUrl)) continue;
          const next = serializeMovieProviders(parsed);
          const prev = Array.isArray(row.providers)
            ? (row.providers as unknown as string[])
            : [];
          if (JSON.stringify(prev) === JSON.stringify(next)) continue;
          await supabase
            .from("user_movies")
            .update({ providers: next })
            .eq("id", row.id)
            .eq("user_id", userId);
        }
      })();
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get("filter")));
  }, [searchParams]);

  function setFilterAndUrl(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const inTheatersMovies = useMemo(
    () =>
      movies
        .filter((m) => isInTheatersRelease(m.released))
        .sort((a, b) => (b.released ?? "").localeCompare(a.released ?? "")),
    [movies],
  );
  const upcomingMovies = useMemo(
    () =>
      movies
        .filter((m) => isUpcomingRelease(m.released))
        .sort((a, b) => (a.released ?? "").localeCompare(b.released ?? "")),
    [movies],
  );
  const wishlistMovies = useMemo(
    () =>
      movies.filter(
        (m) => m.status === "wishlist" && !isUpcomingRelease(m.released),
      ),
    [movies],
  );
  const shelfMovies = useMemo(
    () => movies.filter((m) => isMovieOnShelf(m.status)),
    [movies],
  );
  const watchedMovies = useMemo(
    () => movies.filter((m) => m.status === "watched"),
    [movies],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return movies;
    if (filter === "shelf") return shelfMovies;
    if (filter === "inTheaters") return inTheatersMovies;
    if (filter === "upcoming") return upcomingMovies;
    if (filter === "wishlist") return wishlistMovies;
    return watchedMovies;
  }, [
    movies,
    filter,
    shelfMovies,
    inTheatersMovies,
    upcomingMovies,
    wishlistMovies,
    watchedMovies,
  ]);

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} onAddMovie={() => setAddOpen(true)} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Películas
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {movies.length}{" "}
              {movies.length === 1 ? "película guardada" : "películas guardadas"}
            </p>
          </div>

          <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAndUrl(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  filter === f.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          </div>
        ) : filter === "all" ? (
          movies.length === 0 ? (
            <div className="space-y-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center">
                <Clapperboard className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
                <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                  Tu biblioteca de películas está vacía
                </p>
                <Button className="mt-5" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Añadir película
                </Button>
              </div>
              <UpcomingMoviesSection
                userId={userId}
                movies={movies}
                onLibraryChange={loadMovies}
                limit={12}
              />
              <RecommendedMoviesSection
                userId={userId}
                movies={movies}
                onLibraryChange={loadMovies}
                limit={12}
              />
            </div>
          ) : (
            <div className="space-y-10">
              {inTheatersMovies.length > 0 && (
                <MovieSection
                  title="En el cine"
                  subtitle="Estrenadas en las últimas dos semanas"
                  movies={inTheatersMovies}
                  onSeeMore={() => setFilterAndUrl("inTheaters")}
                  onEdit={setEditing}
                  emptyLabel=""
                />
              )}
              <UpcomingMoviesSection
                userId={userId}
                movies={movies}
                onLibraryChange={loadMovies}
                limit={12}
              />
              <RecommendedMoviesSection
                userId={userId}
                movies={movies}
                onLibraryChange={loadMovies}
                limit={12}
              />
              <MovieSection
                title="Wishlist"
                subtitle="Películas que quieres ver"
                movies={wishlistMovies}
                onSeeMore={() => setFilterAndUrl("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
              />
              <MovieSection
                title="Vistas"
                subtitle="Películas que ya has visto"
                movies={watchedMovies}
                onSeeMore={() => setFilterAndUrl("watched")}
                onEdit={setEditing}
                emptyLabel="Aún no has marcado ninguna como vista."
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay películas en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setFilterAndUrl("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onEdit={setEditing} />
              ))}
            </div>
          </div>
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

      <AddMovieModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadMovies}
      />
      <EditMovieDialog
        movie={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadMovies}
        onDeleted={loadMovies}
      />
    </div>
  );
}
