"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { RecommendedBookCard } from "@/components/books/recommended-book-card";
import { SaveBookDialog } from "@/components/books/save-book-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  deriveTopAuthors,
  libraryBookTitles,
  libraryGoogleBooksIds,
} from "@/lib/book-tastes";
import type { GoogleBookResult, UserBook } from "@/lib/types";

export function BooksRecommendedView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [library, setLibrary] = useState<UserBook[]>([]);
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [tasteAuthors, setTasteAuthors] = useState<string[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<GoogleBookResult | null>(null);
  const [editing, setEditing] = useState<UserBook | null>(null);

  const libraryByGoogleId = useMemo(() => {
    const map = new Map<string, UserBook>();
    for (const b of library) {
      if (b.google_books_id) map.set(b.google_books_id, b);
    }
    return map;
  }, [library]);

  const loadLibrary = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", userId);
    if (data) setLibrary(data as UserBook[]);
    setLoadingLib(false);
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (loadingLib) return;

    const authors = deriveTopAuthors(library, 3);
    const exclude = libraryGoogleBooksIds(library);
    const titles = libraryBookTitles(library);
    const controller = new AbortController();

    async function load() {
      if (!authors.length) {
        setResults([]);
        setTasteAuthors([]);
        setLoadingRec(false);
        return;
      }

      setLoadingRec(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: "24",
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
        if (!res.ok) throw new Error(data.error ?? "Error al recomendar");
        setResults(data.results ?? []);
        setTasteAuthors(data.authors ?? authors);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error");
        setResults([]);
      } finally {
        setLoadingRec(false);
      }
    }

    load();
    return () => controller.abort();
  }, [library, loadingLib]);

  function handleClick(book: GoogleBookResult) {
    const existing = libraryByGoogleId.get(book.googleBooksId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(book);
  }

  const loading = loadingLib || loadingRec;

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/library"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a biblioteca
        </Link>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            <Sparkles className="h-7 w-7 text-[var(--accent)]" />
            Recomendados
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {tasteAuthors.length > 0
              ? `Según tus autores · ${tasteAuthors.join(", ")}`
              : "Añade libros a tu biblioteca o wishlist para afinar recomendaciones"}
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--muted)]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Buscando recomendaciones…</p>
          </div>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            No hay recomendaciones ahora mismo. Añade libros a tu biblioteca o
            wishlist para afinar los gustos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 animate-fade-in">
            {results.map((book) => (
              <RecommendedBookCard
                key={book.googleBooksId}
                book={book}
                existing={libraryByGoogleId.get(book.googleBooksId)}
                onClick={() => handleClick(book)}
              />
            ))}
          </div>
        )}
      </main>

      <SaveBookDialog
        book={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={loadLibrary}
      />
      <EditBookDialog
        book={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadLibrary}
        onDeleted={loadLibrary}
      />
    </div>
  );
}
