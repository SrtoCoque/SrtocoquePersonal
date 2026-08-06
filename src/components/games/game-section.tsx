"use client";

import { ArrowRight } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { MediaScrollRow } from "@/components/ui/media-scroll-row";
import type { UserGame } from "@/lib/types";

export function GameSection({
  title,
  subtitle: _subtitle,
  games,
  limit = 12,
  onSeeMore,
  onEdit,
  emptyLabel,
}: {
  title: string;
  subtitle?: string;
  games: UserGame[];
  limit?: number;
  onSeeMore: () => void;
  onEdit: (game: UserGame) => void;
  emptyLabel: string;
}) {
  void _subtitle;
  const visible = games.slice(0, limit);

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {games.length} {games.length === 1 ? "juego" : "juegos"}
          </p>
        </div>

        {games.length > 0 && (
          <button
            type="button"
            onClick={onSeeMore}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Ver más
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-10 text-center text-sm text-[var(--muted)]">
          {emptyLabel}
        </div>
      ) : (
        <MediaScrollRow>
          {visible.map((game) => (
            <GameCard key={game.id} game={game} onEdit={onEdit} />
          ))}
        </MediaScrollRow>
      )}
    </section>
  );
}
