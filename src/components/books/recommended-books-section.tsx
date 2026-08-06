"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { RecommendedBookCard } from "@/components/books/recommended-book-card";
import { SaveBookDialog } from "@/components/books/save-book-dialog";
import { MediaScrollRow } from "@/components/ui/media-scroll-row";
import {
  deriveTopAuthors,
  libraryBookTitles,
  libraryGoogleBooksIds,
} from "@/lib/book-tastes";
import type { GoogleBookResult, UserBook } from "@/lib/types";

export function RecommendedBooksSection({
  userId,
  books,
  onLibraryChange,
  limit = 12,
}: {
  userId: string;
  books: UserBook[];
  onLibraryChange: () => void;
  limit?: number;
}) {
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [tasteAuthors, setTasteAuthors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNew, setSelectedNew] = useState<GoogleBookResult | null>(null);
  const [editing, setEditing] = useState<UserBook | null>(null);

  const libraryByGoogleId = useMemo(() => {
    const map = new Map<string, UserBook>();
    for (const b of books) {
      if (b.google_books_id) map.set(b.google_books_id, b);
    }
    return map;
  }, [books]);

  const tasteKey = useMemo(() => {
    const authors = deriveTopAuthors(books, 3);
    const exclude = libraryGoogleBooksIds(books).join(",");
    return `${authors.join("|")}::${exclude}`;
  }, [books]);

  useEffect(() => {
    const authors = deriveTopAuthors(books, 3);
    const exclude = libraryGoogleBooksIds(books);
    const titles = libraryBookTitles(books);
    const controller = new AbortController();

    async function load() {
      if (!authors.length) {
        setResults([]);
        setTasteAuthors([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          authors: authors.join("|||"),
          exclude: exclude.join(","),
          titles: titles.join("|||"),
        });

        const res = await fetch(`/api/books/recommended?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: GoogleBookResult[];
          authors?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error");
        setResults(data.results ?? []);
        setTasteAuthors(data.authors ?? authors);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
    // tasteKey captura authors + exclude
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasteKey, limit]);

  function handleClick(book: GoogleBookResult) {
    const existing = libraryByGoogleId.get(book.googleBooksId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(book);
  }

  if (loading) {
    return (
      <section className="animate-slide-up">
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Recomendados
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Según tus autores…
          </p>
        </div>
        <MediaScrollRow>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))}
        </MediaScrollRow>
      </section>
    );
  }

  if (results.length === 0) return null;

  const subtitle =
    tasteAuthors.length > 0
      ? `Más de · ${tasteAuthors.slice(0, 3).join(", ")}`
      : "Según tus lecturas";

  return (
    <section className="animate-slide-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Recomendados
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
        </div>
        <Link
          href="/recommended"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Ver más
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <MediaScrollRow>
        {results.slice(0, limit).map((book) => (
          <RecommendedBookCard
            key={book.googleBooksId}
            book={book}
            existing={libraryByGoogleId.get(book.googleBooksId)}
            onClick={() => handleClick(book)}
          />
        ))}
      </MediaScrollRow>

      <SaveBookDialog
        book={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={onLibraryChange}
      />
      <EditBookDialog
        book={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={onLibraryChange}
        onDeleted={onLibraryChange}
      />
    </section>
  );
}
