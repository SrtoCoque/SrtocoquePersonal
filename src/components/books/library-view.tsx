"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AddBookModal } from "@/components/books/add-book-modal";
import { BookCard } from "@/components/books/book-card";
import { BookSection } from "@/components/books/book-section";
import { CurrentlyReading } from "@/components/books/currently-reading";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { RecommendedBooksSection } from "@/components/books/recommended-books-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { UserBook } from "@/lib/types";
import { isOnShelf } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "wishlist" | "shelf";
type ShelfSubFilter = "all" | "owned" | "reading" | "read";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "wishlist", label: "Wishlist" },
  { id: "shelf", label: "Biblioteca" },
];

const SHELF_SUBFILTERS: { id: ShelfSubFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "owned", label: "Sin empezar" },
  { id: "reading", label: "Leyendo" },
  { id: "read", label: "Leídos" },
];

function parseFilter(raw: string | null): Filter {
  if (raw === "wishlist" || raw === "shelf") return raw;
  return "all";
}

export function LibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [shelfSubFilter, setShelfSubFilter] = useState<ShelfSubFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserBook | null>(null);

  const loadBooks = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setBooks(data as UserBook[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const next = parseFilter(searchParams.get("filter"));
    setFilter(next);
    if (next === "shelf") setShelfSubFilter("all");
  }, [searchParams]);

  function setFilterAndUrl(next: Filter, shelfSub: ShelfSubFilter = "all") {
    setFilter(next);
    if (next === "shelf") setShelfSubFilter(shelfSub);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function goToShelf(sub: ShelfSubFilter = "all") {
    setFilterAndUrl("shelf", sub);
  }

  const readingBooks = useMemo(
    () => books.filter((b) => b.status === "reading"),
    [books],
  );
  const wishlistBooks = useMemo(
    () => books.filter((b) => b.status === "wishlist"),
    [books],
  );
  const shelfBooks = useMemo(
    () => books.filter((b) => isOnShelf(b.status)),
    [books],
  );

  const currentReading = readingBooks[0] ?? null;

  const filtered = useMemo(() => {
    if (filter === "all") return books;
    if (filter === "wishlist") {
      return books.filter((b) => b.status === "wishlist");
    }
    const onShelf = books.filter((b) => isOnShelf(b.status));
    if (shelfSubFilter === "all") return onShelf;
    return onShelf.filter((b) => b.status === shelfSubFilter);
  }, [books, filter, shelfSubFilter]);

  return (
    <div className="min-h-screen">
      <AppHeader email={email} onAddBook={() => setAddOpen(true)} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Biblioteca
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {books.length}{" "}
              {books.length === 1 ? "libro guardado" : "libros guardados"}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:items-end">
            <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterAndUrl(f.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    filter === f.id
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filter === "shelf" ? (
              <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
                {SHELF_SUBFILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setShelfSubFilter(f.id)}
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors sm:text-sm",
                      shelfSubFilter === f.id
                        ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
                />
              ))}
            </div>
          </div>
        ) : filter === "all" ? (
          books.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center animate-fade-in">
              <BookOpen className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                Tu biblioteca está vacía
              </p>
              <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
                Busca un título en Google Books y añádelo a tu lista.
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Añadir libro
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <CurrentlyReading
                book={currentReading}
                onEdit={setEditing}
                onAdd={() => setAddOpen(true)}
              />

              <BookSection
                title="Wishlist"
                subtitle="Libros que quieres conseguir"
                books={wishlistBooks}
                limit={12}
                onSeeMore={() => setFilterAndUrl("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía. Añade libros que te apetezca conseguir."
              />

              <BookSection
                title="Biblioteca"
                subtitle="Todo lo que ya tienes (sin empezar, leyendo o leído)"
                books={shelfBooks}
                limit={12}
                onSeeMore={() => goToShelf("all")}
                onEdit={setEditing}
                emptyLabel="Aún no has añadido libros a tu biblioteca."
              />

              <RecommendedBooksSection
                userId={userId}
                books={books}
                onLibraryChange={loadBooks}
                limit={12}
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center animate-fade-in">
            <BookOpen className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay libros en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setFilterAndUrl("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onEdit={setEditing}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <AddBookModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadBooks}
      />

      <EditBookDialog
        book={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadBooks}
        onDeleted={loadBooks}
      />
    </div>
  );
}
