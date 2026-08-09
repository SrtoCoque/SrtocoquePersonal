"use client";

import { Check, Heart, Play } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { SeriesStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SeriesDestination = "wishlist" | "watching" | "watched";

type Props = {
  destination: SeriesDestination | null;
  onDestinationChange: (destination: SeriesDestination) => void;
};

export function SeriesDestinationFields({
  destination,
  onDestinationChange,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>¿Dónde la guardamos?</Label>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onDestinationChange("wishlist")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-2.5 py-3 text-left transition-colors sm:px-3",
            destination === "wishlist"
              ? "border-amber-500 bg-amber-500/15"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              destination === "wishlist"
                ? "text-amber-600 dark:text-amber-300"
                : "text-[var(--muted)]",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              destination === "wishlist" &&
                "text-amber-700 dark:text-amber-300",
            )}
          >
            Wishlist
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDestinationChange("watching")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-2.5 py-3 text-left transition-colors sm:px-3",
            destination === "watching"
              ? "border-sky-500 bg-sky-500/15"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
          )}
        >
          <Play
            className={cn(
              "h-4 w-4",
              destination === "watching"
                ? "text-sky-600 dark:text-sky-300"
                : "text-[var(--muted)]",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              destination === "watching" && "text-sky-700 dark:text-sky-300",
            )}
          >
            Viendo
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDestinationChange("watched")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-2.5 py-3 text-left transition-colors sm:px-3",
            destination === "watched"
              ? "border-emerald-500 bg-emerald-500/15"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
          )}
        >
          <Check
            className={cn(
              "h-4 w-4",
              destination === "watched"
                ? "text-emerald-600 dark:text-emerald-300"
                : "text-[var(--muted)]",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              destination === "watched" &&
                "text-emerald-700 dark:text-emerald-300",
            )}
          >
            Vista
          </span>
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {destination === "watched"
          ? "Todas las temporadas regulares marcadas (sin especiales)."
          : destination === "watching"
            ? "Puedes marcar más temporadas o capítulos arriba."
            : destination === "wishlist"
              ? "Sin progreso de capítulos."
              : "Marca temporadas con el ojo, o elige Wishlist / Viendo / Vista."}
      </p>
    </div>
  );
}

export function seriesDestinationToStatus(
  destination: SeriesDestination,
): SeriesStatus {
  if (destination === "wishlist") return "wishlist";
  if (destination === "watching") return "watching";
  return "watched";
}

/** Deriva Viendo/Vista según capítulos marcados (ignora especiales para Vista). */
export function deriveDestinationFromMarks(
  seasons: Array<{ seasonNumber: number; episodeCount: number }>,
  marked: Array<{ seasonNumber: number }>,
): SeriesDestination | null {
  const regular = seasons.filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0,
  );
  const hasAny = marked.length > 0;
  if (!hasAny) return null;

  if (regular.length === 0) return "watching";

  const allRegularDone = regular.every((s) => {
    const n = marked.filter((m) => m.seasonNumber === s.seasonNumber).length;
    return n >= s.episodeCount;
  });

  return allRegularDone ? "watched" : "watching";
}
