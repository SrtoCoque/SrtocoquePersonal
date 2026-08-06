"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookDestinationFields,
  destinationToStatus,
  type Destination,
} from "@/components/books/book-destination-fields";
import { createClient } from "@/lib/supabase/client";
import type { GoogleBookResult, ShelfStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  book: GoogleBookResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveBookDialog({
  book,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [shelfStatus, setShelfStatus] = useState<ShelfStatus>("owned");
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [pagesRead, setPagesRead] = useState<number | "">(0);
  const [manualTotalPages, setManualTotalPages] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setShelfStatus("owned");
    setFinishDate(new Date().toISOString().slice(0, 10));
    setPagesRead(0);
    setManualTotalPages("");
    setError(null);
    setDone(false);
  }, [open, book?.googleBooksId]);

  async function handleSave() {
    if (!book || !destination) return;
    setSaving(true);
    setError(null);

    const status = destinationToStatus(destination, shelfStatus);
    const apiTotal =
      book.totalPages && book.totalPages > 0 ? book.totalPages : null;
    const manualTotal =
      manualTotalPages === ""
        ? null
        : Number(manualTotalPages) > 0
          ? Number(manualTotalPages)
          : null;
    const knownTotal = apiTotal ?? manualTotal;
    let resolvedPages = 0;
    if (status === "read" && knownTotal) {
      resolvedPages = knownTotal;
    } else if (status === "reading") {
      resolvedPages = Math.max(0, Number(pagesRead) || 0);
      if (knownTotal != null && resolvedPages > knownTotal) {
        setSaving(false);
        setError(
          `Las páginas leídas no pueden superar el total (${knownTotal}).`,
        );
        return;
      }
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("user_books").insert({
      user_id: userId,
      google_books_id: book.googleBooksId,
      title: book.title,
      authors: book.authors,
      cover_url: book.coverUrl,
      status,
      total_pages: knownTotal,
      pages_read: resolvedPages,
      read_finish_date: status === "read" ? finishDate : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
    onSaved?.();
    setTimeout(() => {
      onOpenChange(false);
    }, 700);
  }

  if (!book) return null;

  const canSave = destination === "wishlist" || destination === "shelf";
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "shelf"
        ? "Añadir a la biblioteca"
        : "Elige una opción";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar libro</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
        <div className="flex gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
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
              {book.title}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {book.authors.join(", ")}
            </p>
            {book.totalPages ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {book.totalPages} páginas
              </p>
            ) : null}
          </div>
        </div>

        <BookDestinationFields
          destination={destination}
          onDestinationChange={setDestination}
          shelfStatus={shelfStatus}
          onShelfStatusChange={setShelfStatus}
          finishDate={finishDate}
          onFinishDateChange={setFinishDate}
          pagesRead={pagesRead}
          onPagesReadChange={setPagesRead}
          totalPages={book.totalPages}
          manualTotalPages={manualTotalPages}
          onManualTotalPagesChange={setManualTotalPages}
        />

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
            Guardado correctamente
          </p>
        )}

        <Button
          type="submit"
          className={cn(
            "w-full",
            destination === "wishlist" &&
              "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
          )}
          disabled={!canSave || saving || done}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
