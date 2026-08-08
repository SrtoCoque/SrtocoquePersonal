"use client";

import { Gamepad2, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GAME_STOREFRONT_LABELS,
  GamePlayStorefrontPicker,
  GameStorefrontIcon,
  GameStorefrontPicker,
  type GameStorefront,
} from "@/components/games/game-storefront";
import type { GamePricesDraft } from "@/lib/game-prices";
import { prunePricesDraft } from "@/lib/game-prices";
import type { GameShelfStatus, GameStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GameDestination = "wishlist" | "shelf";

const SHELF_OPTIONS: {
  id: GameShelfStatus;
  label: string;
}[] = [
  { id: "owned", label: "Sin empezar" },
  { id: "playing", label: "Jugando" },
  { id: "completed", label: "Completado" },
];

type Props = {
  destination: GameDestination | null;
  onDestinationChange: (destination: GameDestination) => void;
  shelfStatus: GameShelfStatus;
  onShelfStatusChange: (status: GameShelfStatus) => void;
  storefronts: GameStorefront[];
  onStorefrontsChange: (storefronts: GameStorefront[]) => void;
  playStorefront: GameStorefront | null;
  onPlayStorefrontChange: (storefront: GameStorefront | null) => void;
  prices: GamePricesDraft;
  onPricesChange: (prices: GamePricesDraft) => void;
  hoursPlayed: number | "";
  onHoursPlayedChange: (hours: number | "") => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  finishDate: string;
  onFinishDateChange: (date: string) => void;
};

export function GameDestinationFields({
  destination,
  onDestinationChange,
  shelfStatus,
  onShelfStatusChange,
  storefronts,
  onStorefrontsChange,
  playStorefront,
  onPlayStorefrontChange,
  prices,
  onPricesChange,
  hoursPlayed,
  onHoursPlayedChange,
  startDate,
  onStartDateChange,
  finishDate,
  onFinishDateChange,
}: Props) {
  function handleStorefrontsChange(next: GameStorefront[]) {
    onStorefrontsChange(next);
    onPricesChange(prunePricesDraft(prices, next));
    if (next.length === 1) {
      onPlayStorefrontChange(next[0]);
    } else if (playStorefront && !next.includes(playStorefront)) {
      onPlayStorefrontChange(null);
    }
  }

  function setPrice(sf: GameStorefront, value: number | "") {
    onPricesChange({ ...prices, [sf]: value });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>¿Dónde lo guardamos?</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDestinationChange("wishlist")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-colors",
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
            onClick={() => {
              onDestinationChange("shelf");
              onShelfStatusChange("owned");
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-colors",
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
            <span className="text-sm font-medium">Biblioteca</span>
          </button>
        </div>
      </div>

      {destination === "shelf" && (
        <div className="space-y-3 animate-fade-in">
          <GameStorefrontPicker
            value={storefronts}
            onChange={handleStorefrontsChange}
            required
          />

          {storefronts.length > 0 ? (
            <div className="space-y-3">
              <Label>Precio pagado (€)</Label>
              <div className="space-y-2">
                {storefronts.map((sf) => (
                  <div key={sf} className="flex items-center gap-2">
                    <span
                      title={GAME_STOREFRONT_LABELS[sf]}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)]"
                    >
                      <GameStorefrontIcon storefront={sf} className="h-5 w-5" />
                    </span>
                    <Input
                      id={`game-price-${sf}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.01}
                      placeholder={GAME_STOREFRONT_LABELS[sf]}
                      aria-label={`Precio en ${GAME_STOREFRONT_LABELS[sf]}`}
                      value={prices[sf] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setPrice(sf, "");
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n < 0) return;
                        setPrice(sf, n);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <Label>Estado (opcional)</Label>
            <div className="grid grid-cols-3 gap-2">
              {SHELF_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onShelfStatusChange(opt.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-colors sm:text-sm",
                    shelfStatus === opt.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {shelfStatus === "playing" || shelfStatus === "completed" ? (
            <div className="space-y-3 animate-fade-in">
              <GamePlayStorefrontPicker
                options={storefronts}
                value={playStorefront}
                onChange={onPlayStorefrontChange}
              />
              <div className="space-y-2">
                <Label htmlFor="game-hours-played">Horas jugadas</Label>
                <Input
                  id="game-hours-played"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  placeholder="Ej. 12"
                  value={hoursPlayed}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onHoursPlayedChange("");
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n) || n < 0) return;
                    onHoursPlayedChange(n);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-start-date">Fecha de inicio</Label>
                <Input
                  id="game-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
              </div>

              {shelfStatus === "completed" ? (
                <div className="space-y-2">
                  <Label htmlFor="game-finish-date">Fecha de finalización</Label>
                  <Input
                    id="game-finish-date"
                    type="date"
                    value={finishDate}
                    min={startDate || undefined}
                    onChange={(e) => onFinishDateChange(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
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
