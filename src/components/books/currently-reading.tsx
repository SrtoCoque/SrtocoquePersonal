"use client";

import Image from "next/image";
import { BookMarked, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserBook } from "@/lib/types";

type Props = {
  book: UserBook | null;
  onEdit: (book: UserBook) => void;
  onAdd: () => void;
};

export function CurrentlyReading({ book, onEdit, onAdd }: Props) {
  if (!book) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-5 py-8 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Ahora mismo
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
          No estás leyendo ningún libro
        </h2>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          Marca un libro como «Leyendo» o añade uno nuevo a tu biblioteca.
        </p>
        <Button className="mt-4" size="sm" onClick={onAdd}>
          <BookOpen className="h-4 w-4" />
          Añadir libro
        </Button>
      </section>
    );
  }

  const progress =
    book.total_pages && book.total_pages > 0
      ? Math.min(100, Math.round((book.pages_read / book.total_pages) * 100))
      : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-fade-in">
      <div className="flex flex-col sm:flex-row">
        <div className="relative mx-auto mt-5 h-48 w-32 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-lg sm:mx-0 sm:mt-0 sm:h-auto sm:w-40 sm:rounded-none sm:self-stretch">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-[var(--muted)]">
              <BookMarked className="h-10 w-10 opacity-40" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-5 sm:px-8 sm:py-7">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Estás leyendo
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {book.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {book.authors.join(", ")}
          </p>

          {progress !== null ? (
            <div className="mt-5 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                <span>Progreso</span>
                <span>{progress}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                  {book.pages_read}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                  {book.total_pages}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Actualiza el progreso desde Editar
            </p>
          )}

          <div className="mt-5">
            <Button size="sm" variant="secondary" onClick={() => onEdit(book)}>
              Actualizar progreso
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
