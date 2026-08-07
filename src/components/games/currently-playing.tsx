"use client";

import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserGame } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CurrentlyPlaying({
  games,
  onEdit,
  onAdd,
}: {
  games: UserGame[];
  onEdit: (game: UserGame) => void;
  onAdd: () => void;
}) {
  if (games.length === 0) {
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
    <section className="space-y-3 animate-fade-in">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Ahora mismo
        </p>
        <p className="text-xs text-[var(--muted)]">{games.length} en curso</p>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            onClick={() => onEdit(game)}
            className={cn(
              "flex w-[min(85vw,20rem)] shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition-all hover:border-[var(--accent)]/40 hover:shadow-md hover:shadow-[var(--accent)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:w-80",
              index === 0 && "ring-1 ring-[var(--accent)]/20",
            )}
          >
            <div className="relative h-36 w-24 shrink-0 overflow-hidden bg-[var(--surface-3)] sm:h-40 sm:w-28">
              {game.cover_url ? (
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                  priority={index === 0}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--muted)]">
                  <Gamepad2 className="h-8 w-8 opacity-40" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
                {game.status === "replaying"
                  ? "Estás rejugando"
                  : "Estás jugando"}
              </p>
              <h2 className="mt-0.5 line-clamp-2 font-[family-name:var(--font-display)] text-base font-semibold leading-snug tracking-tight sm:text-lg">
                {game.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {Number(game.hours_played) > 0
                  ? `${Number(game.hours_played)} horas jugadas`
                  : "Sin horas registradas"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
