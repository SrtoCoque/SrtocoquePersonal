"use client";

import { BookMarked, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookStatus, ShelfStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Destination = "wishlist" | "shelf";

const SHELF_OPTIONS: {
  id: ShelfStatus;
  label: string;
  hint: string;
}[] = [
  {
    id: "owned",
    label: "Sin empezar",
    hint: "Lo tengo guardado",
  },
  {
    id: "reading",
    label: "Leyendo",
    hint: "Ahora mismo",
  },
  {
    id: "read",
    label: "Leído",
    hint: "Ya lo terminé",
  },
];

type Props = {
  destination: Destination | null;
  onDestinationChange: (destination: Destination) => void;
  shelfStatus: ShelfStatus;
  onShelfStatusChange: (status: ShelfStatus) => void;
  finishDate: string;
  onFinishDateChange: (date: string) => void;
};

export function BookDestinationFields({
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
        <Label>¿Dónde lo guardamos?</Label>
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
              Lo quiero, pero aún no lo tengo
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
            <BookMarked
              className={cn(
                "h-4 w-4",
                destination === "shelf"
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]",
              )}
            />
            <span className="text-sm font-medium">Estantería</span>
            <span className="text-[11px] leading-snug text-[var(--muted)]">
              Ya lo tengo en casa
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

          {shelfStatus === "read" && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="finish-date-shared">Fecha de finalización</Label>
              <Input
                id="finish-date-shared"
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

export function destinationToStatus(
  destination: Destination,
  shelfStatus: ShelfStatus,
): BookStatus {
  if (destination === "wishlist") return "wishlist";
  return shelfStatus;
}
