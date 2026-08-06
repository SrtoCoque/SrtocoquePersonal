"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InlineHeaderSearch({
  open,
  onOpenChange,
  searchPath,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchPath: string;
  placeholder: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSubmitting(false);
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSubmitting(true);
    router.push(`${searchPath}?q=${encodeURIComponent(q)}`);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)]/95 animate-fade-in">
      <form
        onSubmit={submit}
        className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpiar"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={query.trim().length < 2 || submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar búsqueda"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
