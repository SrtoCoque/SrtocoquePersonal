"use client";

import Image from "next/image";
import {
  Bookmark,
  BookMarked,
  BookOpen,
  Check,
  Star,
} from "lucide-react";
import type { BookStatus, GoogleBookResult, UserBook } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  BookStatus,
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-teal-600 text-white",
    ring: "ring-2 ring-teal-500/70 border-teal-500/40",
    Icon: BookOpen,
  },
  reading: {
    label: "Lo estás leyendo",
    bar: "bg-sky-500 text-white",
    ring: "ring-2 ring-sky-500/70 border-sky-500/40",
    Icon: BookOpen,
  },
  read: {
    label: "Ya lo has leído",
    bar: "bg-emerald-600 text-white",
    ring: "ring-2 ring-emerald-500/70 border-emerald-500/40",
    Icon: Check,
  },
};

export function RecommendedBookCard({
  book,
  existing,
  onClick,
}: {
  book: GoogleBookResult;
  existing?: UserBook | null;
  onClick: () => void;
}) {
  const statusMeta = existing ? STATUS_BAR[existing.status] : null;
  const StatusIcon = statusMeta?.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
        statusMeta
          ? statusMeta.ring
          : "border-[var(--border)] hover:border-[var(--accent)]/40",
      )}
    >
      <div className="relative aspect-[2/3] w-full bg-[var(--surface-3)]">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            fill
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              statusMeta && "brightness-[0.85]",
            )}
            sizes="200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <BookMarked className="h-8 w-8 opacity-40" />
          </div>
        )}
        {book.averageRating != null && book.averageRating > 0 ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            <Star className="h-3 w-3 fill-current" />
            {book.averageRating.toFixed(1)}
          </span>
        ) : null}
        {statusMeta && StatusIcon ? (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
              statusMeta.bar,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{statusMeta.label}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {book.authors.join(", ")}
        </p>
        {book.totalPages ? (
          <p className="text-[10px] text-[var(--muted)]">{book.totalPages} pág.</p>
        ) : null}
      </div>
    </button>
  );
}
