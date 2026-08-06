"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BookDestinationFields,
  destinationToStatus,
  type Destination,
} from "@/components/books/book-destination-fields";
import { createClient } from "@/lib/supabase/client";
import type { GoogleBookResult, ShelfStatus } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
};

export function AddBookModal({ open, onOpenChange, userId, onAdded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GoogleBookResult | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [shelfStatus, setShelfStatus] = useState<ShelfStatus>("owned");
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setDestination(null);
    setShelfStatus("owned");
    setFinishDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: GoogleBookResult[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Error al buscar libros");
        }
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de búsqueda");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, selected]);

  function goToFullSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  async function handleSave() {
    if (!selected || !destination) return;
    setSaving(true);
    setError(null);

    const status = destinationToStatus(destination, shelfStatus);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("user_books").insert({
      user_id: userId,
      google_books_id: selected.googleBooksId,
      title: selected.title,
      authors: selected.authors,
      cover_url: selected.coverUrl,
      status,
      total_pages: selected.totalPages,
      pages_read: status === "read" ? (selected.totalPages ?? 0) : 0,
      read_finish_date: status === "read" ? finishDate : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir libro</DialogTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Escribe y elige una sugerencia, o pulsa Buscar / Enter para ver todos
        </p>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {!selected ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                goToFullSearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Título, autor..."
                  className="pl-9"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
                )}
              </div>
              <Button type="submit" disabled={query.trim().length < 2}>
                Buscar
              </Button>
            </form>

            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((book) => (
                <li key={book.googleBooksId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(book);
                      setDestination(null);
                      setShelfStatus("owned");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{book.title}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {book.authors.join(", ")}
                        {book.totalPages ? ` · ${book.totalPages} pág.` : ""}
                        {book.averageRating
                          ? ` · ★ ${book.averageRating.toFixed(1)}`
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <li className="py-8 text-center text-sm text-[var(--muted)]">
                  Sin sugerencias. Prueba Buscar para ver más resultados.
                </li>
              )}
            </ul>

            {query.trim().length >= 2 && (
              <button
                type="button"
                onClick={goToFullSearch}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
              >
                Ver todos los resultados
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
                {selected.coverUrl ? (
                  <Image
                    src={selected.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
                  {selected.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selected.authors.join(", ")}
                </p>
                {selected.totalPages && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selected.totalPages} páginas
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--accent)] hover:underline"
                  onClick={() => setSelected(null)}
                >
                  Cambiar libro
                </button>
              </div>
            </div>

            <BookDestinationFields
              destination={destination}
              onDestinationChange={setDestination}
              shelfStatus={shelfStatus}
              onShelfStatusChange={setShelfStatus}
              finishDate={finishDate}
              onFinishDateChange={setFinishDate}
            />

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!destination || saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {!destination
                ? "Elige Wishlist o Estantería"
                : destination === "wishlist"
                  ? "Añadir a Wishlist"
                  : "Añadir a la estantería"}
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </DialogBody>
    </Dialog>
  );
}
