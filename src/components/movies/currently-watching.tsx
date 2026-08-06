"use client";

import Image from "next/image";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserMovie } from "@/lib/types";

export function CurrentlyWatching({
  movie,
  onEdit,
  onAdd,
}: {
  movie: UserMovie | null;
  onEdit: (movie: UserMovie) => void;
  onAdd: () => void;
}) {
  if (!movie) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-5 py-8 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Ahora mismo
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
          No estás viendo nada
        </h2>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          Marca una película como «Viendo» o añade una nueva.
        </p>
        <Button className="mt-4" size="sm" onClick={onAdd}>
          <Clapperboard className="h-4 w-4" />
          Añadir película
        </Button>
      </section>
    );
  }

  const runtimeLabel = movie.runtime
    ? `${movie.runtime} min`
    : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-fade-in">
      <div className="flex flex-col sm:flex-row">
        <div className="relative mx-auto mt-5 h-52 w-36 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-lg sm:mx-0 sm:mt-0 sm:h-auto sm:w-40 sm:rounded-none sm:self-stretch">
          {movie.cover_url ? (
            <Image
              src={movie.cover_url}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full min-h-52 items-center justify-center text-[var(--muted)]">
              <Clapperboard className="h-10 w-10 opacity-40" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-5 sm:px-8 sm:py-7">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Estás viendo
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {movie.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[movie.directors.slice(0, 2).join(", "), runtimeLabel]
              .filter(Boolean)
              .join(" · ") || "Sin datos"}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {Number(movie.minutes_watched) > 0
              ? `${Number(movie.minutes_watched)} minutos vistos`
              : "Actualiza los minutos desde Editar"}
          </p>
          <div className="mt-5">
            <Button size="sm" variant="secondary" onClick={() => onEdit(movie)}>
              Actualizar progreso
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
