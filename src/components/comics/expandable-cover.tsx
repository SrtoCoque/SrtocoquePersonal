"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  /** Clases del contenedor thumbnail (aspect, tamaño). */
  thumbClassName?: string;
  sizes?: string;
};

/** Miniatura clicable que abre la portada a pantalla completa. */
export function ExpandableCover({
  src,
  alt = "",
  className,
  thumbClassName,
  sizes = "96px",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!src) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--surface-3)]",
          thumbClassName,
          className,
        )}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Ampliar portada"
        title="Ampliar"
        className={cn(
          "group relative overflow-hidden bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          thumbClassName,
          className,
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes={sizes}
          unoptimized
        />
        <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white opacity-80 transition-opacity group-hover:opacity-100">
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Portada ampliada"
          onClick={() => setOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-[min(90vh,900px)] w-[min(92vw,560px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="560px"
              unoptimized
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
