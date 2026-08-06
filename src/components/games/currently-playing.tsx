"use client";

import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserGame } from "@/lib/types";

export function CurrentlyPlaying({
  game,
  onEdit,
  onAdd,
}: {
  game: UserGame | null;
  onEdit: (game: UserGame) => void;
  onAdd: () => void;
}) {
  if (!game) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-5 py-8 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Ahora mismo
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
          No estás jugando a nada
        </h2>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          Marca un juego como «Jugando» o añade uno nuevo.
        </p>
        <Button className="mt-4" size="sm" onClick={onAdd}>
          <Gamepad2 className="h-4 w-4" />
          Añadir juego
        </Button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-fade-in">
      <div className="flex flex-col sm:flex-row">
        <div className="relative mx-auto mt-5 h-48 w-36 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-lg sm:mx-0 sm:mt-0 sm:h-auto sm:w-44 sm:rounded-none sm:self-stretch">
          {game.cover_url ? (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              className="object-cover"
              sizes="176px"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-[var(--muted)]">
              <Gamepad2 className="h-10 w-10 opacity-40" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-5 sm:px-8 sm:py-7">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
            Estás jugando
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {game.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {game.platforms.slice(0, 3).join(", ")}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {Number(game.hours_played) > 0
              ? `${Number(game.hours_played)} horas jugadas`
              : "Actualiza las horas desde Editar"}
          </p>
          <div className="mt-5">
            <Button size="sm" variant="secondary" onClick={() => onEdit(game)}>
              Actualizar progreso
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
