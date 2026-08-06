"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, Home, Loader2, Plus, Popcorn, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MovieTrailerButton } from "@/components/movies/movie-trailer-button";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import type {
  MovieStatus,
  MovieWatchLocation,
  UserMovie,
  UserMovieViewing,
} from "@/lib/types";
import {
  MOVIE_STATUS_LABELS,
  MOVIE_WATCH_LOCATION_LABELS,
  formatMovieRuntime,
  formatReleaseDate,
  isUpcomingRelease,
  parseMovieProviders,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  movie: UserMovie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function EditMovieDialog({
  movie,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<MovieStatus>("wishlist");
  const [score, setScore] = useState<number | "">("");
  const [viewings, setViewings] = useState<UserMovieViewing[]>([]);
  const [viewedAt, setViewedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [location, setLocation] = useState<MovieWatchLocation>("home");
  const [saving, setSaving] = useState(false);
  const [addingView, setAddingView] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  useEffect(() => {
    if (!movie || !open) return;
    const upcoming = isUpcomingRelease(movie.released);
    setStatus(upcoming ? "wishlist" : movie.status);
    setScore(movie.score ?? "");
    setViewedAt(new Date().toISOString().slice(0, 10));
    setLocation("home");
    setError(null);
    setHistoryOpen(false);
    setTrailerKey(null);

    async function loadViewings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_movie_viewings")
        .select("*")
        .eq("user_movie_id", movie!.id)
        .order("viewed_at", { ascending: false });
      setViewings((data as UserMovieViewing[]) ?? []);
    }

    async function loadTrailer() {
      if (!movie!.tmdb_id) return;
      try {
        const res = await fetch(`/api/movies/details?id=${movie!.tmdb_id}`);
        const data = (await res.json()) as {
          movie?: { youtubeTrailerKey?: string | null };
        };
        if (res.ok) setTrailerKey(data.movie?.youtubeTrailerKey ?? null);
      } catch {
        /* fallback a búsqueda YouTube */
      }
    }

    loadViewings();
    loadTrailer();
  }, [movie, open]);

  async function handleSave() {
    if (!movie) return;
    const upcoming = isUpcomingRelease(movie.released);
    if (upcoming && status === "watched") {
      setError("Esta película aún no se ha estrenado");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const becomingWatched =
      status === "watched" && movie.status !== "watched" && viewings.length === 0;

    const { error: updateError } = await supabase
      .from("user_movies")
      .update({
        status,
        score: score === "" ? null : score,
        finish_date:
          status === "watched"
            ? viewedAt || movie.finish_date || new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", movie.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    if (becomingWatched) {
      const { error: viewingError } = await supabase
        .from("user_movie_viewings")
        .insert({
          user_movie_id: movie.id,
          user_id: movie.user_id,
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
    onSaved();
  }

  async function handleAddViewing() {
    if (!movie || !viewedAt) {
      setError("Indica la fecha del visionado");
      return;
    }
    setAddingView(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("user_movie_viewings")
      .insert({
        user_movie_id: movie.id,
        user_id: movie.user_id,
        viewed_at: viewedAt,
        location,
      })
      .select("*")
      .single();

    if (insertError) {
      setAddingView(false);
      setError(insertError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("user_movies")
      .update({
        status: "watched",
        finish_date: viewedAt,
        score: score === "" ? movie.score : score,
      })
      .eq("id", movie.id);

    setAddingView(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus("watched");
    setViewings((prev) => [data as UserMovieViewing, ...prev]);
    onSaved();
  }

  async function handleDelete() {
    if (!movie) return;
    if (!confirm(`¿Eliminar «${movie.title}»?`)) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_movies")
      .delete()
      .eq("id", movie.id);

    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  if (!movie) return null;

  const upcoming = isUpcomingRelease(movie.released);
  const editStatuses: MovieStatus[] = upcoming
    ? ["wishlist"]
    : ["wishlist", "watched"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar película</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && !deleting && !addingView) void handleSave();
          }}
        >
        <div className="flex gap-3">
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
            {movie.cover_url && (
              <Image
                src={movie.cover_url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{movie.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {[
                    formatMovieRuntime(movie.runtime),
                    movie.directors.join(", ") ||
                      movie.genres.slice(0, 2).join(", ") ||
                      null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {movie.providers?.length ? (
                  <MovieProviderLogos
                    providers={movie.providers}
                    limit={4}
                    className="mt-1"
                  />
                ) : null}
                {viewings.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {viewings.length}{" "}
                    {viewings.length === 1 ? "vez vista" : "veces vista"}
                  </p>
                )}
                {upcoming && formatReleaseDate(movie.released) && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Estreno {formatReleaseDate(movie.released)}
                  </p>
                )}
                <div className="mt-3">
                  <MovieTrailerButton
                    title={movie.title}
                    youtubeKey={trailerKey}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar película"
                title="Eliminar película"
                onClick={handleDelete}
                disabled={saving || deleting || addingView}
                className="shrink-0 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          {upcoming ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5 text-sm text-[var(--muted)]">
              Aún no se ha estrenado
              {formatReleaseDate(movie.released)
                ? ` (${formatReleaseDate(movie.released)})`
                : ""}
              . Solo wishlist.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {editStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    status === s
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      status === s ? "text-[var(--accent)]" : "",
                    )}
                  >
                    {MOVIE_STATUS_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {status === "watched" && !upcoming && (
          <>
            <div className="space-y-2">
              <Label htmlFor="movie-score-edit">Puntuación (0–100)</Label>
              <Input
                id="movie-score-edit"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setScore("");
                    return;
                  }
                  const n = Number(v);
                  if (!Number.isFinite(n)) return;
                  setScore(Math.min(100, Math.max(0, n)));
                }}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="mb-0">
                  {viewings.length === 0 ? "Primer visionado" : "Añadir +1 vista"}
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-viewed-at">Fecha</Label>
                <Input
                  id="add-viewed-at"
                  type="date"
                  value={viewedAt}
                  onChange={(e) => setViewedAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lugar</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "home" as const, icon: Home },
                      { id: "cinema" as const, icon: Popcorn },
                    ] as const
                  ).map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLocation(id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        location === id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--border)] hover:bg-[var(--surface)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">
                        {MOVIE_WATCH_LOCATION_LABELS[id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {viewings.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleAddViewing}
                  disabled={addingView || saving || deleting}
                >
                  {addingView ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  +1 vista
                </Button>
              )}
            </div>

            {viewings.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                  aria-expanded={historyOpen}
                >
                  <span className="text-sm font-medium">
                    Historial de visionados ({viewings.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
                      historyOpen && "rotate-180",
                    )}
                  />
                </button>
                {historyOpen && (
                  <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-[var(--border)] px-3 py-2 text-sm">
                    {viewings.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between rounded-lg bg-[var(--surface-2)]/50 px-3 py-2"
                      >
                        <span>{v.viewed_at}</span>
                        <span className="text-[var(--muted)]">
                          {MOVIE_WATCH_LOCATION_LABELS[v.location]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || deleting || addingView}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
