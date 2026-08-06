"use client";

import Image from "next/image";
import {
  Bookmark,
  BookMarked,
  BookOpen,
  Check,
  Star,
} from "lucide-react";
import type { BookStatus, UserBook } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_BAR: Record<
  BookStatus,
  { label: string; bar: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-teal-600 text-white",
    Icon: BookOpen,
  },
  reading: {
    label: "Lo estás leyendo",
    bar: "bg-sky-500 text-white",
    Icon: BookOpen,
  },
  read: {
    label: "Ya lo has leído",
    bar: "bg-emerald-600 text-white",
    Icon: Check,
  },
};

type Props = {
  book: UserBook;
  onEdit: (book: UserBook) => void;
};

export function BookCard({ book, onEdit }: Props) {
  const progress =
    book.total_pages && book.total_pages > 0
      ? Math.min(100, Math.round((book.pages_read / book.total_pages) * 100))
      : null;
  const statusMeta = STATUS_BAR[book.status];
  const StatusIcon = statusMeta.Icon;

  return (
    <button
      type="button"
      onClick={() => onEdit(book)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--surface-3)]">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover brightness-[0.85] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <BookMarked className="h-8 w-8 opacity-40" />
            <span className="text-center text-xs">Sin portada</span>
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

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {book.authors.join(", ") || "Autor desconocido"}
        </p>
        {book.total_pages && book.total_pages > 0 && book.status !== "reading" ? (
          <p className="text-[10px] text-[var(--muted)]">
            {book.total_pages} pág.
          </p>
        ) : null}

        {book.status === "reading" && progress !== null ? (
          <div className="mt-auto pt-1">
            <div className="mb-0.5 flex justify-between text-[10px] text-[var(--muted)]">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]">
                {book.pages_read}
              </span>
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]">
                {book.total_pages}
              </span>
            </div>
          </div>
        ) : null}

        {book.rating ? (
          <div
            className={cn(
              "flex items-center gap-0.5 text-amber-500",
              book.status !== "reading" && "mt-auto pt-1",
            )}
          >
            {Array.from({ length: book.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
