"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { BookStatus, UserBook } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  book: UserBook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function EditBookDialog({
  book,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<BookStatus>("wishlist");
  const [pagesRead, setPagesRead] = useState(0);
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!book || !open) return;
    setStatus(book.status);
    setPagesRead(book.pages_read);
    setFinishDate(
      book.read_finish_date ?? new Date().toISOString().slice(0, 10),
    );
    setRating(book.rating ?? "");
    setError(null);
  }, [book, open]);

  async function handleSave() {
    if (!book) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status,
        pages_read: pagesRead,
        read_finish_date: status === "read" ? finishDate || null : null,
        rating: rating === "" ? null : rating,
      })
      .eq("id", book.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!book) return;
    if (!confirm(`¿Eliminar «${book.title}»? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_books")
      .delete()
      .eq("id", book.id);

    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar libro</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && !deleting) void handleSave();
          }}
        >
        <div className="flex gap-3">
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
            {book.cover_url && (
              <Image
                src={book.cover_url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{book.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {book.authors.join(", ")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar libro"
                title="Eliminar libro"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="shrink-0 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>¿Dónde está?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  if (s === "read" && book.total_pages) {
                    setPagesRead(book.total_pages);
                  }
                }}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  status === s
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-medium",
                    status === s ? "text-[var(--accent)]" : "",
                  )}
                >
                  {STATUS_LABELS[s]}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                  {s === "wishlist"
                    ? "Lo quiero, no lo tengo"
                    : s === "owned"
                      ? "Lo tengo, sin empezar"
                      : s === "reading"
                        ? "Lo tengo · leyendo"
                        : "Lo tengo · terminado"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {status === "reading" && (
          <div className="space-y-2">
            <Label htmlFor="pages-read">
              Páginas leídas
              {book.total_pages ? ` / ${book.total_pages}` : ""}
            </Label>
            <Input
              id="pages-read"
              type="number"
              min={0}
              max={book.total_pages ?? undefined}
              value={pagesRead}
              onChange={(e) => setPagesRead(Number(e.target.value))}
            />
          </div>
        )}

        {status === "read" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="finish">Fecha de finalización</Label>
              <Input
                id="finish"
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Valoración (1–5)</Label>
              <Input
                id="rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Opcional"
              />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || deleting}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
