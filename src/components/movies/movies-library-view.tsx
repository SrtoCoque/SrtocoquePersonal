"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clapperboard, Plus } from "lucide-react";
import { MoviesHeader } from "@/components/layout/movies-header";
import { AddMovieModal } from "@/components/movies/add-movie-modal";
import { CurrentlyWatching } from "@/components/movies/currently-watching";
import { EditMovieDialog } from "@/components/movies/edit-movie-dialog";
import { MovieCard } from "@/components/movies/movie-card";
import { MovieSection } from "@/components/movies/movie-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { MovieStatus, UserMovie } from "@/lib/types";
import { isMovieOnShelf } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "shelf" | MovieStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "shelf", label: "Estantería" },
  { id: "watching", label: "Viendo" },
  { id: "wishlist", label: "Wishlist" },
  { id: "watched", label: "Vistas" },
];

export function MoviesLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [movies, setMovies] = useState<UserMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserMovie | null>(null);

  const loadMovies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_movies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setMovies(data as UserMovie[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const watchingMovies = useMemo(
    () => movies.filter((m) => m.status === "watching"),
    [movies],
  );
  const wishlistMovies = useMemo(
    () => movies.filter((m) => m.status === "wishlist"),
    [movies],
  );
  const shelfMovies = useMemo(
    () => movies.filter((m) => isMovieOnShelf(m.status)),
    [movies],
  );

  const currentWatching = watchingMovies[0] ?? null;

  const filtered = useMemo(() => {
    if (filter === "all") return movies;
    if (filter === "shelf") return movies.filter((m) => isMovieOnShelf(m.status));
    return movies.filter((m) => m.status === filter);
  }, [movies, filter]);

  return (
    <div className="min-h-screen">
      <MoviesHeader email={email} onAddMovie={() => setAddOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Películas
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {movies.length}{" "}
              {movies.length === 1 ? "película guardada" : "películas guardadas"}
            </p>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
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
          ) : (
            <div className="space-y-10">
              <CurrentlyWatching
                movie={currentWatching}
                onEdit={setEditing}
                onAdd={() => setAddOpen(true)}
              />
              <MovieSection
                title="Wishlist"
                subtitle="Películas que quieres ver"
                movies={wishlistMovies}
                onSeeMore={() => setFilter("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
              />
              <MovieSection
                title="Estantería"
                subtitle="Todo lo que ya tienes (sin empezar, viendo o vistas)"
                movies={shelfMovies}
                onSeeMore={() => setFilter("shelf")}
                onEdit={setEditing}
                emptyLabel="Aún no has añadido películas a tu estantería."
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
              onClick={() => setFilter("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">
                {filtered.length} resultados
              </p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Ver inicio
              </button>
            </div>
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
