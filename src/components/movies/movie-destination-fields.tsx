"use client";

import { Clapperboard, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MovieShelfStatus, MovieStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MovieDestination = "wishlist" | "shelf";

const SHELF_OPTIONS: {
  id: MovieShelfStatus;
  label: string;
  hint: string;
}[] = [
  { id: "owned", label: "Sin empezar", hint: "La tengo guardada" },
  { id: "watching", label: "Viendo", hint: "Ahora mismo" },
  { id: "watched", label: "Vista", hint: "Ya la terminé" },
];

type Props = {
  destination: MovieDestination | null;
  onDestinationChange: (destination: MovieDestination) => void;
  shelfStatus: MovieShelfStatus;
  onShelfStatusChange: (status: MovieShelfStatus) => void;
  finishDate: string;
  onFinishDateChange: (date: string) => void;
};

export function MovieDestinationFields({
  destination,
  onDestinationChange,
  shelfStatus,
  onShelfStatusChange,
  finishDate,
  onFinishDateChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>¿Dónde la guardamos?</Label>
        <div className="grid grid-cols-2 gap-2">
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
            <span className="text-[11px] leading-snug text-[var(--muted)]">
              La quiero, pero aún no la tengo
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDestinationChange("shelf");
              onShelfStatusChange("owned");
            }}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors",
              destination === "shelf"
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] hover:bg-[var(--surface-2)]",
            )}
          >
            <Clapperboard
              className={cn(
                "h-4 w-4",
                destination === "shelf"
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]",
              )}
            />
            <span className="text-sm font-medium">Estantería</span>
            <span className="text-[11px] leading-snug text-[var(--muted)]">
              Ya la tengo
            </span>
          </button>
        </div>
      </div>

      {destination === "shelf" && (
        <div className="space-y-3 animate-fade-in">
          <Label>Estado (opcional)</Label>
          <div className="grid grid-cols-3 gap-2">
            {SHELF_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onShelfStatusChange(opt.id)}
                className={cn(
                  "rounded-lg border px-2 py-2.5 text-left transition-colors",
                  shelfStatus === opt.id
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "block text-xs font-medium sm:text-sm",
                    shelfStatus === opt.id ? "text-[var(--accent)]" : "",
                  )}
                >
                  {opt.label}
                </span>
                <span className="mt-0.5 hidden text-[10px] text-[var(--muted)] sm:block">
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>

          {shelfStatus === "watched" && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="movie-finish-date">Fecha de visionado</Label>
              <Input
                id="movie-finish-date"
                type="date"
                value={finishDate}
                onChange={(e) => onFinishDateChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function movieDestinationToStatus(
  destination: MovieDestination,
  shelfStatus: MovieShelfStatus,
): MovieStatus {
  if (destination === "wishlist") return "wishlist";
  return shelfStatus;
}
