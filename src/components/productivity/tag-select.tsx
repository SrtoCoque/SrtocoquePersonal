"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ProductivityTag } from "@/lib/productivity";
import { cn } from "@/lib/utils";

export function TagSelect({
  tags,
  value,
  onChange,
  disabled,
  placeholder = "Elige etiqueta",
  className,
  "aria-label": ariaLabel = "Etiqueta",
}: {
  tags: ProductivityTag[];
  value: string;
  onChange: (tagId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = tags.find((t) => t.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled || tags.length === 0}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-left text-sm transition-colors",
          "hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {selected ? (
          <>
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: selected.color }}
            />
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[var(--muted)]">
            {tags.length === 0 ? "Sin etiquetas" : placeholder}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
        >
          {tags.map((t) => {
            const active = t.id === value;
            return (
              <li key={t.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-[var(--surface-2)] font-medium"
                      : "hover:bg-[var(--surface-2)]/70",
                  )}
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
