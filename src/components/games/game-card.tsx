"use client";

import Image from "next/image";
import { Gamepad2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GameStatus, UserGame } from "@/lib/types";
import { GAME_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<GameStatus, string> = {
  wishlist: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  owned: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  playing: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function GameCard({
  game,
  onEdit,
}: {
  game: UserGame;
  onEdit: (game: UserGame) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(game)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--surface-3)]">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <Gamepad2 className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Badge className={cn("w-fit", STATUS_STYLE[game.status])}>
          {GAME_STATUS_LABELS[game.status]}
        </Badge>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {game.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {game.platforms.slice(0, 2).join(", ") || "Sin plataformas"}
        </p>

        {game.status === "playing" && Number(game.hours_played) > 0 && (
          <p className="mt-auto text-[10px] text-[var(--muted)]">
            {Number(game.hours_played)} h jugadas
          </p>
        )}

        {game.rating ? (
          <div className="mt-auto flex items-center gap-0.5 pt-1 text-amber-500">
            {Array.from({ length: game.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
