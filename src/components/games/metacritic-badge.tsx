import { cn } from "@/lib/utils";

export function MetacriticBadge({
  score,
  className,
  size = "md",
}: {
  score: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={`Metacritic ${score}`}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-orange-500 font-bold text-white tabular-nums shadow-sm",
        size === "sm" ? "h-5 min-w-5 px-1 text-[10px]" : "h-7 min-w-7 px-1.5 text-xs",
        className,
      )}
    >
      {Math.round(score)}
    </span>
  );
}
