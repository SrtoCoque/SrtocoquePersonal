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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setShelfStatus("owned");
    setFinishDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setDone(false);
  }, [open, book?.googleBooksId]);

  async function handleSave() {
    if (!book || !destination) return;
    setSaving(true);
    setError(null);

    const status = destinationToStatus(destination, shelfStatus);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("user_books").insert({
      user_id: userId,
      google_books_id: book.googleBooksId,
      title: book.title,
      authors: book.authors,
      cover_url: book.coverUrl,
      status,
      total_pages: book.totalPages,
      pages_read: status === "read" ? (book.totalPages ?? 0) : 0,
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
        ? "Añadir a la estantería"
        : "Elige una opción";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar libro</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
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
          className="w-full"
          onClick={handleSave}
          disabled={!canSave || saving || done}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      </DialogBody>
    </Dialog>
  );
}
