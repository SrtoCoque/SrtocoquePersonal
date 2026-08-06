"use client";

import Image from "next/image";
import { Bookmark, Check, Gamepad2, Star } from "lucide-react";
import type { GameStatus, UserGame } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  GameStatus,
  { label: string; bar: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-violet-600 text-white",
    Icon: Gamepad2,
  },
  playing: {
    label: "Lo estás jugando",
    bar: "bg-sky-500 text-white",
    Icon: Gamepad2,
  },
  completed: {
    label: "Ya lo has completado",
    bar: "bg-emerald-600 text-white",
    Icon: Check,
  },
};

export function GameCard({
  game,
  onEdit,
}: {
  game: UserGame;
  onEdit: (game: UserGame) => void;
}) {
  const statusMeta = STATUS_BAR[game.status];
  const StatusIcon = statusMeta.Icon;

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
            className="object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <Gamepad2 className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
            statusMeta.bar,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{statusMeta.label}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
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
