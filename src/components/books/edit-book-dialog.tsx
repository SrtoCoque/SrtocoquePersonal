"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
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

function knownTotalPages(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function ClearableNumberInput({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  blurFallback = 0,
}: {
  id: string;
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
  blurFallback?: number | "";
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      value={value}
      onFocus={() => {
        if (value === 0) onChange("");
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onChange(n);
      }}
      onBlur={() => {
        if (value === "") onChange(blurFallback);
      }}
    />
  );
}

export function EditBookDialog({
  book,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<BookStatus>("wishlist");
  const [pagesRead, setPagesRead] = useState<number | "">(0);
  const [totalPages, setTotalPages] = useState<number | "">("");
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!book || !open) return;
    setStatus(book.status);
    setPagesRead(book.pages_read);
    setTotalPages(knownTotalPages(book.total_pages) ?? "");
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

    const resolvedTotal =
      totalPages === "" ? null : knownTotalPages(Number(totalPages));
    let resolvedPages = Math.max(0, Number(pagesRead) || 0);

    if (resolvedTotal != null && resolvedPages > resolvedTotal) {
      setSaving(false);
      setError(
        `Las páginas leídas (${resolvedPages}) no pueden superar el total (${resolvedTotal}).`,
      );
      return;
    }

    if (status === "read" && resolvedTotal != null) {
      resolvedPages = resolvedTotal;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status,
        total_pages: resolvedTotal,
        pages_read: resolvedPages,
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

  const totalKnown =
    totalPages === "" ? null : knownTotalPages(Number(totalPages));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar libro</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          id="edit-book-form"
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
                    if (s === "read" && totalKnown) {
                      setPagesRead(totalKnown);
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

          {status === "reading" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pages-read">Página actual</Label>
                  <ClearableNumberInput
                    id="pages-read"
                    min={0}
                    max={totalKnown ?? undefined}
                    value={pagesRead}
                    onChange={setPagesRead}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="total-pages">
                    Total{" "}
                    {!totalKnown ? (
                      <span className="font-normal text-[var(--muted)]">
                        (opc.)
                      </span>
                    ) : null}
                  </Label>
                  <ClearableNumberInput
                    id="total-pages"
                    min={1}
                    value={totalPages === 0 ? "" : totalPages}
                    onChange={(v) => setTotalPages(v === 0 ? "" : v)}
                    placeholder="—"
                    blurFallback=""
                  />
                </div>
              </div>
            </div>
          ) : status === "owned" || status === "read" ? (
            <div className="space-y-2">
              <Label htmlFor="total-pages">
                Total de páginas{" "}
                <span className="font-normal text-[var(--muted)]">(opcional)</span>
              </Label>
              <ClearableNumberInput
                id="total-pages"
                min={1}
                value={totalPages === 0 ? "" : totalPages}
                onChange={(v) => setTotalPages(v === 0 ? "" : v)}
                placeholder="Si no lo tenía, ponlo aquí"
                blurFallback=""
              />
            </div>
          ) : null}

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
                    setRating(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
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
        </form>
      </DialogBody>
      <DialogFooter>
        <Button
          type="submit"
          form="edit-book-form"
          className="w-full"
          disabled={saving || deleting}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
