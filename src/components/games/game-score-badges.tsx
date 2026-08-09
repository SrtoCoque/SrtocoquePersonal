import { MetacriticBadge } from "@/components/games/metacritic-badge";
import { SteamRatingBadge } from "@/components/games/steam-rating-badge";
import { cn } from "@/lib/utils";

type Props = {
  metacritic?: number | null;
  steamReviewPercent?: number | null;
  /** Nota comunidad IGDB (0–5) */
  communityRating?: number | null;
  size?: "sm" | "md";
  className?: string;
  /** Si true, muestra etiquetas (Metacritic / Steam / IGDB) */
  labeled?: boolean;
};

export function GameScoreBadges({
  metacritic,
  steamReviewPercent,
  communityRating,
  size = "sm",
  className,
  labeled = false,
}: Props) {
  const hasMeta =
    metacritic != null && Number.isFinite(Number(metacritic));
  const hasSteam =
    steamReviewPercent != null &&
    Number.isFinite(Number(steamReviewPercent));
  const hasCommunity =
    communityRating != null &&
    Number.isFinite(Number(communityRating)) &&
    Number(communityRating) > 0;

  if (!hasMeta && !hasSteam && !hasCommunity) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1",
        className,
      )}
    >
      {hasSteam ? (
        <span className="inline-flex items-center gap-1.5">
          {labeled ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Steam
            </span>
          ) : null}
          <SteamRatingBadge
            percent={Number(steamReviewPercent)}
            size={size}
          />
        </span>
      ) : null}
      {hasMeta ? (
        <span className="inline-flex items-center gap-1.5">
          {labeled ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Metacritic
            </span>
          ) : null}
          <MetacriticBadge score={Number(metacritic)} size={size} />
        </span>
      ) : null}
      {hasCommunity ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 tabular-nums text-amber-500",
            size === "sm" ? "text-xs" : "text-sm",
          )}
          title="Valoración comunidad (IGDB)"
        >
          {labeled ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              IGDB
            </span>
          ) : null}
          <span className="font-semibold">
            ★ {Number(communityRating).toFixed(1)}
          </span>
        </span>
      ) : null}
    </div>
  );
}
