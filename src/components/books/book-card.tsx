"use client";

import Image from "next/image";
import { BookMarked, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BookStatus, UserBook } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<BookStatus, string> = {
  wishlist: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  owned: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  reading: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  read: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
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
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 200px"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-[var(--muted)]">
            <BookMarked className="h-8 w-8 opacity-40" />
            <span className="text-center text-xs">Sin portada</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Badge className={cn("w-fit", STATUS_STYLE[book.status])}>
          {STATUS_LABELS[book.status]}
        </Badge>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">
          {book.authors.join(", ")}
        </p>

        {book.status === "reading" && progress !== null && (
          <div className="mt-auto pt-1">
            <div className="mb-1 flex justify-between text-[10px] text-[var(--muted)]">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {book.rating ? (
          <div className="mt-auto flex items-center gap-0.5 pt-1 text-amber-500">
            {Array.from({ length: book.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
