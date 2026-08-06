"use client";

import { Gamepad2, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameShelfStatus, GameStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GameDestination = "wishlist" | "shelf";

const SHELF_OPTIONS: {
  id: GameShelfStatus;
  label: string;
  hint: string;
}[] = [
  { id: "owned", label: "Sin empezar", hint: "Lo tengo guardado" },
  { id: "playing", label: "Jugando", hint: "Ahora mismo" },
  { id: "completed", label: "Completado", hint: "Ya lo terminé" },
];

type Props = {
  destination: GameDestination | null;
  onDestinationChange: (destination: GameDestination) => void;
  shelfStatus: GameShelfStatus;
  onShelfStatusChange: (status: GameShelfStatus) => void;
  finishDate: string;
  onFinishDateChange: (date: string) => void;
};

export function GameDestinationFields({
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
            <Gamepad2
              className={cn(
                "h-4 w-4",
                destination === "shelf"
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]",
              )}
            />
            <span className="text-sm font-medium">Estantería</span>
            <span className="text-[11px] leading-snug text-[var(--muted)]">
              Ya lo tengo
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

          {shelfStatus === "completed" && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="game-finish-date">Fecha de finalización</Label>
              <Input
                id="game-finish-date"
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

export function gameDestinationToStatus(
  destination: GameDestination,
  shelfStatus: GameShelfStatus,
): GameStatus {
  if (destination === "wishlist") return "wishlist";
  return shelfStatus;
}
