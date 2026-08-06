"use client";

import { ArrowRight } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import type { UserBook } from "@/lib/types";

type Props = {
  title: string;
  subtitle?: string;
  books: UserBook[];
  limit?: number;
  onSeeMore: () => void;
  onEdit: (book: UserBook) => void;
  emptyLabel: string;
};

export function BookSection({
  title,
  subtitle,
  books,
  limit = 8,
  onSeeMore,
  onEdit,
  emptyLabel,
}: Props) {
  const visible = books.slice(0, limit);
  const hasMore = books.length > limit;

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
          ) : (
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {books.length}{" "}
              {books.length === 1 ? "libro" : "libros"}
            </p>
          )}
        </div>

        {books.length > 0 && (
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4">
          {visible.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={onSeeMore}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
          >
            Ver los {books.length} libros
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
