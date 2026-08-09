"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function formatIssueEuro(n: number): string {
  return `${n.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} €`;
}

type Props = {
  price: number | null;
  disabled?: boolean;
  onCommit: (raw: string) => void | Promise<void>;
  className?: string;
};

/** Precio tras el nombre: si hay valor se muestra; al pinchar abre el input. */
export function IssuePriceInline({
  price,
  disabled,
  onCommit,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(price != null ? String(price) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(price != null ? String(price) : "");
    if (price != null) setEditing(false);
  }, [price]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    await onCommit(value);
    setEditing(false);
  }

  if (!editing && price != null) {
    return (
      <button
        type="button"
        disabled={disabled}
        title="Editar precio"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "shrink-0 tabular-nums text-sm text-[var(--accent)] hover:underline disabled:opacity-50",
          className,
        )}
      >
        {formatIssueEuro(price)}
      </button>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        title="Añadir precio"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "shrink-0 text-sm text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50",
          className,
        )}
      >
        €
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      inputMode="decimal"
      min={0}
      step={0.01}
      disabled={disabled}
      className={cn("h-8 w-[5.5rem] shrink-0", className)}
      value={value}
      placeholder="€"
      aria-label="Precio del tomo"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setValue(price != null ? String(price) : "");
          setEditing(false);
        }
      }}
    />
  );
}
