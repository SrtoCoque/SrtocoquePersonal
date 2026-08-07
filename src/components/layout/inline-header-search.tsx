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
    const input = inputRef.current;
    if (!input) return;

    // preventScroll evita que el navegador mueva la página al enfocar
    const focusNow = () => {
      input.focus({ preventScroll: true });
    };
    focusNow();
    const t1 = window.setTimeout(focusNow, 50);
    const t2 = window.setTimeout(focusNow, 200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
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
    <div
      data-skip-keyboard-scroll
      className="border-t border-[var(--border)] bg-[var(--background)]/95 animate-fade-in"
    >
      <form
        onSubmit={submit}
        className="mx-auto flex w-full min-w-0 max-w-6xl items-center gap-2 px-4 py-3 sm:px-6"
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
            enterKeyHint="search"
            data-skip-keyboard-scroll="true"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpiar"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus({ preventScroll: true });
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
