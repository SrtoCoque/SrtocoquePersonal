"use client";

import { useEffect } from "react";
import { Clapperboard, Heart, Home, Popcorn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MovieStatus, MovieWatchLocation } from "@/lib/types";
import { MOVIE_WATCH_LOCATION_LABELS, formatReleaseDate } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MovieDestination = "wishlist" | "watched";

type Props = {
  destination: MovieDestination | null;
  onDestinationChange: (destination: MovieDestination) => void;
  viewedAt: string;
  onViewedAtChange: (date: string) => void;
  location: MovieWatchLocation;
  onLocationChange: (location: MovieWatchLocation) => void;
  score: number | "";
  onScoreChange: (score: number | "") => void;
  /** Si true, no se puede marcar como Vista (aún no estrenada). */
  upcoming?: boolean;
  released?: string | null;
};

export function MovieDestinationFields({
  destination,
  onDestinationChange,
  viewedAt,
  onViewedAtChange,
  location,
  onLocationChange,
  score,
  onScoreChange,
  upcoming = false,
  released = null,
}: Props) {
  useEffect(() => {
    if (upcoming && destination === "watched") {
      onDestinationChange("wishlist");
    }
  }, [upcoming, destination, onDestinationChange]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>¿Dónde la guardamos?</Label>
        <div className={cn("grid gap-2", upcoming ? "grid-cols-1" : "grid-cols-2")}>
          <button
            type="button"
            onClick={() => onDestinationChange("wishlist")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors",
              destination === "wishlist"
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] hover:bg-[var(--surface-2)]",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                destination === "wishlist"
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]",
              )}
            />
            <span className="text-sm font-medium">Wishlist</span>
          </button>

          {!upcoming && (
            <button
              type="button"
              onClick={() => onDestinationChange("watched")}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors",
                destination === "watched"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]",
              )}
            >
              <Clapperboard
                className={cn(
                  "h-4 w-4",
                  destination === "watched"
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)]",
                )}
              />
              <span className="text-sm font-medium">Vista</span>
            </button>
          )}
        </div>
        {upcoming && (
          <p className="text-xs text-[var(--muted)]">
            Aún no se ha estrenado
            {formatReleaseDate(released)
              ? ` (estreno ${formatReleaseDate(released)})`
              : ""}
            . Solo puedes añadirla a la wishlist.
          </p>
        )}
      </div>

      {destination === "watched" && !upcoming && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="movie-viewed-at">Fecha vista</Label>
            <Input
              id="movie-viewed-at"
              type="date"
              value={viewedAt}
              onChange={(e) => onViewedAtChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>¿Dónde la viste?</Label>
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
                  onClick={() => onLocationChange(id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    location === id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      location === id
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted)]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      location === id ? "text-[var(--accent)]" : "",
                    )}
                  >
                    {MOVIE_WATCH_LOCATION_LABELS[id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movie-score">Puntuación (0–100)</Label>
            <Input
              id="movie-score"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onScoreChange("");
                  return;
                }
                const n = Number(v);
                if (!Number.isFinite(n)) return;
                onScoreChange(Math.min(100, Math.max(0, n)));
              }}
              placeholder="Opcional"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function movieDestinationToStatus(
  destination: MovieDestination,
): MovieStatus {
  return destination === "wishlist" ? "wishlist" : "watched";
}
