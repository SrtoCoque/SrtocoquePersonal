"use client";

import { useState } from "react";
import Image from "next/image";
import { GameScoreBadges } from "@/components/games/game-score-badges";
import type { RawgGameResult } from "@/lib/types";

function GameSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.trim().length > 90;

  if (!needsToggle) {
    return (
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{text}</p>
    );
  }

  if (!expanded) {
    return (
      <p className="mt-2 flex items-baseline gap-1.5 text-xs leading-relaxed text-[var(--muted)]">
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <button
          type="button"
          className="shrink-0 font-medium text-[var(--accent)] hover:underline"
          onClick={() => setExpanded(true)}
        >
          ver más
        </button>
      </p>
    );
  }

  return (
    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
      {text}{" "}
      <button
        type="button"
        className="font-medium text-[var(--accent)] hover:underline"
        onClick={() => setExpanded(false)}
      >
        ver menos
      </button>
    </p>
  );
}

export function GameSearchPreview({
  game,
  onChangeGame,
}: {
  game: RawgGameResult;
  onChangeGame?: () => void;
}) {
  const meta = [
    game.developers[0],
    game.released?.slice(0, 4),
    game.genres.slice(0, 2).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  const platforms =
    game.platforms.length > 0
      ? game.platforms.slice(0, 4).join(", ") +
        (game.platforms.length > 4 ? "…" : "")
      : null;

  return (
    <div className="flex gap-4">
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
        {game.coverUrl ? (
          <Image
            src={game.coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
          {game.title}
        </p>
        {meta ? (
          <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">{meta}</p>
        ) : null}
        {platforms ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
            {platforms}
          </p>
        ) : null}
        <GameScoreBadges
          metacritic={game.metacritic}
          communityRating={game.rating}
          size="sm"
          labeled
          className="mt-2"
        />
        {game.summary ? <GameSummary text={game.summary} /> : null}
        {onChangeGame ? (
          <button
            type="button"
            className="mt-2 text-xs text-[var(--accent)] hover:underline"
            onClick={onChangeGame}
          >
            Cambiar juego
          </button>
        ) : null}
      </div>
    </div>
  );
}
