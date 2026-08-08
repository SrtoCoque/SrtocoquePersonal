import { cn } from "@/lib/utils";

export function SteamRatingBadge({
  percent,
  className,
  size = "md",
}: {
  percent: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={`Steam ${percent}% positivas`}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-[#1b2838] font-bold text-[#66c0f4] tabular-nums shadow-sm ring-1 ring-[#66c0f4]/40",
        size === "sm"
          ? "h-5 min-w-5 px-1 text-[10px]"
          : "h-7 min-w-7 px-1.5 text-xs",
        className,
      )}
    >
      {Math.round(percent)}%
    </span>
  );
}

export function SteamAchievementsBadge({
  unlocked,
  total,
  className,
  size = "md",
}: {
  unlocked: number;
  total: number;
  className?: string;
  size?: "sm" | "md";
}) {
  if (total <= 0) return null;
  const pct = Math.round((unlocked / total) * 100);
  return (
    <span
      title={`Logros Steam ${unlocked}/${total} (${pct}%)`}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-black/70 font-semibold text-amber-200 tabular-nums shadow-sm backdrop-blur-sm",
        size === "sm"
          ? "h-5 px-1 text-[10px]"
          : "h-7 px-1.5 text-xs",
        className,
      )}
    >
      {unlocked}/{total}
    </span>
  );
}
