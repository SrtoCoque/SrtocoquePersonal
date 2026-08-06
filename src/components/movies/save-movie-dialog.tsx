"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MovieDestinationFields,
  movieDestinationToStatus,
  type MovieDestination,
} from "@/components/movies/movie-destination-fields";
import { enrichTmdbMovie } from "@/components/movies/enrich-movie";
import { createClient } from "@/lib/supabase/client";
import type { MovieWatchLocation, TmdbMovieResult } from "@/lib/types";

type Props = {
  movie: TmdbMovieResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveMovieDialog({
  movie,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<MovieDestination | null>(null);
  const [viewedAt, setViewedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [location, setLocation] = useState<MovieWatchLocation>("home");
  const [score, setScore] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setViewedAt(new Date().toISOString().slice(0, 10));
    setLocation("home");
    setScore("");
    setError(null);
    setDone(false);
  }, [open, movie?.tmdbId]);

  async function handleSave() {
    if (!movie || !destination) return;
    if (destination === "watched" && !viewedAt) {
      setError("Indica la fecha en que la viste");
      return;
    }

    setSaving(true);
    setError(null);

    const enriched = await enrichTmdbMovie(movie);
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
        providers: enriched.providers,
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
    setDone(true);
    onSaved?.();
    setTimeout(() => onOpenChange(false), 700);
  }

  if (!movie) return null;

  const canSave = destination === "wishlist" || destination === "watched";
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "watched"
        ? "Marcar como vista"
        : "Elige una opción";

  const year = movie.released?.slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar película</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="flex gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
            {movie.coverUrl ? (
              <Image
                src={movie.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
              {movie.title}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {[
                year,
                movie.originalTitle !== movie.title ? movie.originalTitle : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Sin fecha"}
            </p>
            {movie.voteAverage ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                TMDB {movie.voteAverage.toFixed(1)}
                {movie.runtime ? ` · ${movie.runtime} min` : ""}
              </p>
            ) : movie.runtime ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {movie.runtime} min
              </p>
            ) : null}
            {movie.providers.length > 0 ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {movie.providers.slice(0, 4).join(" · ")}
              </p>
            ) : null}
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
        />

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
            Guardada correctamente
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!canSave || saving || done}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      </DialogBody>
    </Dialog>
  );
}
