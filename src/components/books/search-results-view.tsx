"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookMarked,
  BookOpen,
  Check,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { SaveBookDialog } from "@/components/books/save-book-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { GoogleBookResult, UserBook } from "@/lib/types";
import { cn } from "@/lib/utils";

const IN_LIBRARY: Record<
  UserBook["status"],
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu estantería",
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

export function SearchResultsView({
  userId,
  email,
  initialQuery,
}: {
  userId: string;
  email: string | null;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [library, setLibrary] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(false);
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
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(q)}&limit=40`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: GoogleBookResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error al buscar");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de búsqueda");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [initialQuery]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleClick(book: GoogleBookResult) {
    const existing = libraryByGoogleId.get(book.googleBooksId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(book);
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/library"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la biblioteca
        </Link>

        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Buscar libros
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Título o autor · los que ya tienes se marcan con claridad
          </p>
        </div>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título, autor..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={query.trim().length < 2 || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : initialQuery.trim().length < 2 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Escribe al menos 2 caracteres para buscar
          </p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Sin resultados para «{initialQuery}»
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--muted)]">
              {results.length} resultados para «{initialQuery}»
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 animate-fade-in">
              {results.map((book) => {
                const existing = libraryByGoogleId.get(book.googleBooksId);
                const inLib = existing ? IN_LIBRARY[existing.status] : null;
                const StatusIcon = inLib?.Icon;

                return (
                  <button
                    key={book.googleBooksId}
                    type="button"
                    onClick={() => handleClick(book)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
                      inLib
                        ? inLib.ring
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
                            inLib && "brightness-[0.85]",
                          )}
                          sizes="(max-width:640px) 50vw, 200px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--muted)]">
                          <BookMarked className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      {inLib && StatusIcon ? (
                        <div
                          className={cn(
                            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-2.5 text-center text-xs font-semibold leading-tight shadow-lg sm:text-sm",
                            inLib.bar,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                          <span className="line-clamp-1">{inLib.label}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
                        {book.title}
                      </h2>
                      <p className="line-clamp-1 text-xs text-[var(--muted)]">
                        {book.authors.join(", ")}
                      </p>
                      <div className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-[var(--muted)]">
                        {book.totalPages ? (
                          <span>{book.totalPages} pág.</span>
                        ) : null}
                        {book.averageRating ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {book.averageRating.toFixed(1)}
                            {book.ratingsCount
                              ? ` (${book.ratingsCount})`
                              : null}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
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
