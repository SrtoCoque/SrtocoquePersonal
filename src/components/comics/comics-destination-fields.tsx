"use client";

import { BookOpen, Check, Heart } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ComicStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ComicDestination = "wishlist" | "reading" | "read";

type Props = {
  destination: ComicDestination | null;
  onDestinationChange: (destination: ComicDestination) => void;
};

export function ComicsDestinationFields({
  destination,
  onDestinationChange,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>¿Dónde lo guardamos?</Label>
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
          onClick={() => onDestinationChange("reading")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-2.5 py-3 text-left transition-colors sm:px-3",
            destination === "reading"
              ? "border-violet-500 bg-violet-500/15"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
          )}
        >
          <BookOpen
            className={cn(
              "h-4 w-4",
              destination === "reading"
                ? "text-violet-600 dark:text-violet-300"
                : "text-[var(--muted)]",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              destination === "reading" && "text-violet-700 dark:text-violet-300",
            )}
          >
            Leyendo
          </span>
        </button>

        <button
          type="button"
          onClick={() => onDestinationChange("read")}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-2.5 py-3 text-left transition-colors sm:px-3",
            destination === "read"
              ? "border-emerald-500 bg-emerald-500/15"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
          )}
        >
          <Check
            className={cn(
              "h-4 w-4",
              destination === "read"
                ? "text-emerald-600 dark:text-emerald-300"
                : "text-[var(--muted)]",
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              destination === "read" && "text-emerald-700 dark:text-emerald-300",
            )}
          >
            Leído
          </span>
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {destination === "read"
          ? "Todos los números del volumen quedan marcados."
          : destination === "reading"
            ? "Puedes marcar más números arriba."
            : destination === "wishlist"
              ? "Sin progreso de números."
              : "Marca números arriba, o elige Wishlist / Leyendo / Leído."}
      </p>
    </div>
  );
}

export function comicDestinationToStatus(
  destination: ComicDestination,
): ComicStatus {
  if (destination === "wishlist") return "wishlist";
  if (destination === "reading") return "reading";
  return "read";
}
