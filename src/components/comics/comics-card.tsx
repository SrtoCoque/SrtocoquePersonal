"use client";

import Image from "next/image";
import { BookMarked, Bookmark, BookOpen, Check } from "lucide-react";
import type { ComicStatus, UserComic } from "@/lib/types";
import { comicDisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  ComicStatus,
  { label: string; bar: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    Icon: Bookmark,
  },
  reading: {
    label: "Leyendo",
    bar: "bg-violet-500 text-white",
    Icon: BookOpen,
  },
  read: {
    label: "Leído",
    bar: "bg-emerald-600 text-white",
    Icon: Check,
  },
};

export function ComicsCard({
  comic,
  onEdit,
  compact = false,
}: {
  comic: UserComic;
  onEdit: (comic: UserComic) => void;
  compact?: boolean;
}) {
  const read = comic.issues_read ?? 0;
  const total = comic.issues_total ?? comic.issue_count ?? 0;
  const displayStatus = comicDisplayStatus(comic.status, read, total);
  const statusMeta = STATUS_BAR[displayStatus];
  const StatusIcon = statusMeta.Icon;
  const progressLabel =
    displayStatus === "wishlist"
      ? null
      : total > 0
        ? `${read}/${total}`
        : read > 0
          ? `${read}`
          : null;

  return (
    <button
      type="button"
      onClick={() => onEdit(comic)}
      className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface-3)]">
        {comic.cover_url ? (
          <Image
            src={comic.cover_url}
            alt={comic.title}
            fill
            className="object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <BookMarked className="h-8 w-8 opacity-40" />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
            statusMeta.bar,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{statusMeta.label}</span>
          {progressLabel ? (
            <span className="shrink-0 tabular-nums opacity-95">
              {progressLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn("flex flex-1 flex-col p-3", compact ? "gap-1" : "gap-2")}>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {comic.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {[
            comic.start_year ? String(comic.start_year) : null,
            comic.publisher,
            total > 0 ? `${total} núms.` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Sin datos"}
        </p>

        {!compact && comic.score != null ? (
          <div className="mt-auto pt-1 text-[10px] text-[var(--muted)]">
            {comic.score}/100
          </div>
        ) : null}
      </div>
    </button>
  );
}
