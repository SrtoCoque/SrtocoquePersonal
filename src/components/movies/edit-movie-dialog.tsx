"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
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
import type { MovieStatus, UserMovie } from "@/lib/types";
import { MOVIE_STATUS_LABELS } from "@/lib/types";
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
  const [minutesWatched, setMinutesWatched] = useState(0);
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movie || !open) return;
    setStatus(movie.status);
    setMinutesWatched(Number(movie.minutes_watched) || 0);
    setFinishDate(movie.finish_date ?? new Date().toISOString().slice(0, 10));
    setRating(movie.rating ?? "");
    setError(null);
  }, [movie, open]);

  async function handleSave() {
    if (!movie) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_movies")
      .update({
        status,
        minutes_watched: minutesWatched,
        finish_date: status === "watched" ? finishDate || null : null,
        rating: rating === "" ? null : rating,
      })
      .eq("id", movie.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar película</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
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
                  {movie.directors.join(", ") ||
                    movie.genres.slice(0, 2).join(", ")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar película"
                title="Eliminar película"
                onClick={handleDelete}
                disabled={saving || deleting}
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
          <Label>¿Dónde está?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MOVIE_STATUS_LABELS) as MovieStatus[]).map((s) => (
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
        </div>

        {status === "watching" && (
          <div className="space-y-2">
            <Label htmlFor="minutes-watched">Minutos vistos</Label>
            <Input
              id="minutes-watched"
              type="number"
              min={0}
              step={1}
              value={minutesWatched}
              onChange={(e) => setMinutesWatched(Number(e.target.value))}
            />
            {movie.runtime ? (
              <p className="text-xs text-[var(--muted)]">
                Duración: {movie.runtime} min
              </p>
            ) : null}
          </div>
        )}

        {status === "watched" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="movie-finish">Fecha de visionado</Label>
              <Input
                id="movie-finish"
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movie-rating">Valoración (1–5)</Label>
              <Input
                id="movie-rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Opcional"
              />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || deleting}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </DialogBody>
    </Dialog>
  );
}
