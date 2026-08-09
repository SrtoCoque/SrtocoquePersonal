"use client";

import Image from "next/image";
import { Bookmark, Check, Gamepad2, Star } from "lucide-react";
import type { GameStatus, UserGame } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  GAME_STOREFRONT_LABELS,
  GameStorefrontIcon,
  normalizeStorefronts,
} from "@/components/games/game-storefront";
import { MetacriticBadge } from "@/components/games/metacritic-badge";
import {
  SteamAchievementsBadge,
  SteamRatingBadge,
} from "@/components/games/steam-rating-badge";
import {
  normalizeGamePrices,
  sumGamePrices,
} from "@/lib/game-prices";
import { formatLastPlayedLabel } from "@/lib/game-last-played";

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
  dropped: {
    label: "Sin terminar",
    bar: "bg-zinc-500 text-white",
    Icon: Gamepad2,
  },
};

export function GameCard({
  game,
  onEdit,
  latestHourPlayedOn,
}: {
  game: UserGame;
  onEdit: (game: UserGame) => void;
  latestHourPlayedOn?: string | null;
}) {
  const statusMeta = STATUS_BAR[game.status];
  const StatusIcon = statusMeta.Icon;
  const storefronts = normalizeStorefronts(game.storefronts);
  const totalPaid = sumGamePrices(normalizeGamePrices(game.prices));
  const hours = Number(game.hours_played) || 0;
  const showHours =
    (game.status === "owned" ||
      game.status === "playing" ||
      game.status === "completed" ||
      game.status === "dropped") &&
    hours > 0;
  const lastPlayedLabel = formatLastPlayedLabel(game, latestHourPlayedOn);
  const timesCompleted = Number(game.times_completed) || 0;
  const showTimes = timesCompleted > 1;
  const showPrice = totalPaid > 0;
  const reviewPercent =
    game.steam_review_percent != null &&
    Number.isFinite(Number(game.steam_review_percent))
      ? Number(game.steam_review_percent)
      : null;
  const achUnlocked = game.steam_achievements_unlocked;
  const achTotal = game.steam_achievements_total;

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
        {storefronts.length > 0 ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/65 px-1.5 py-1 text-white backdrop-blur-sm">
            {storefronts.map((sf) => (
              <span
                key={sf}
                title={GAME_STOREFRONT_LABELS[sf]}
                className="flex h-6 w-6 items-center justify-center"
              >
                <GameStorefrontIcon storefront={sf} className="h-3.5 w-3.5" />
              </span>
            ))}
          </span>
        ) : null}
        {reviewPercent != null ? (
          <SteamRatingBadge
            percent={reviewPercent}
            className="absolute right-2 top-2"
          />
        ) : null}
        {game.metacritic != null ? (
          <MetacriticBadge
            score={game.metacritic}
            className={cn(
              "absolute right-2",
              reviewPercent != null ? "top-11" : "top-2",
            )}
          />
        ) : null}
        {achUnlocked != null &&
        achTotal != null &&
        Number(achTotal) > 0 ? (
          <SteamAchievementsBadge
            unlocked={Number(achUnlocked)}
            total={Number(achTotal)}
            className="absolute bottom-9 left-2"
          />
        ) : null}
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
        {storefronts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[var(--muted)]">
            {storefronts.map((sf) => (
              <span
                key={sf}
                title={GAME_STOREFRONT_LABELS[sf]}
                className="inline-flex"
              >
                <GameStorefrontIcon storefront={sf} className="h-4 w-4" />
              </span>
            ))}
          </div>
        ) : (
          <p className="line-clamp-1 text-xs text-[var(--muted)]">
            {game.platforms.slice(0, 2).join(", ") || "Sin plataformas"}
          </p>
        )}

        {showPrice || showHours || game.rating || showTimes ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            {game.rating ? (
              <div className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: game.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
            ) : null}
            {showPrice ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
                {game.status === "wishlist" ? (
                  <GameStorefrontIcon storefront="steam" className="h-3 w-3" />
                ) : null}
                {totalPaid.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            ) : null}
            {showHours ? (
              <span className="text-[10px] text-[var(--muted)]">
                {hours} Horas
                {lastPlayedLabel ? ` · ${lastPlayedLabel}` : ""}
              </span>
            ) : null}
            {showTimes ? (
              <span className="text-[10px] text-[var(--muted)]">
                ×{timesCompleted}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
