"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gamepad2, Plus } from "lucide-react";
import { GamesHeader } from "@/components/layout/games-header";
import { AddGameModal } from "@/components/games/add-game-modal";
import { CurrentlyPlaying } from "@/components/games/currently-playing";
import { EditGameDialog } from "@/components/games/edit-game-dialog";
import { GameCard } from "@/components/games/game-card";
import { GameSection } from "@/components/games/game-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { GameStatus, UserGame } from "@/lib/types";
import { isGameOnShelf } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "shelf" | GameStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "shelf", label: "Estantería" },
  { id: "playing", label: "Jugando" },
  { id: "wishlist", label: "Wishlist" },
  { id: "completed", label: "Completados" },
];

export function GamesLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserGame | null>(null);

  const loadGames = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setGames(data as UserGame[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const playingGames = useMemo(
    () => games.filter((g) => g.status === "playing"),
    [games],
  );
  const wishlistGames = useMemo(
    () => games.filter((g) => g.status === "wishlist"),
    [games],
  );
  const shelfGames = useMemo(
    () => games.filter((g) => isGameOnShelf(g.status)),
    [games],
  );

  const currentPlaying = playingGames[0] ?? null;

  const filtered = useMemo(() => {
    if (filter === "all") return games;
    if (filter === "shelf") return games.filter((g) => isGameOnShelf(g.status));
    return games.filter((g) => g.status === filter);
  }, [games, filter]);

  return (
    <div className="min-h-screen">
      <GamesHeader email={email} onAddGame={() => setAddOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Videojuegos
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {games.length}{" "}
              {games.length === 1 ? "juego guardado" : "juegos guardados"}
            </p>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  filter === f.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          </div>
        ) : filter === "all" ? (
          games.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center">
              <Gamepad2 className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                Tu biblioteca de juegos está vacía
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Añadir juego
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <CurrentlyPlaying
                game={currentPlaying}
                onEdit={setEditing}
                onAdd={() => setAddOpen(true)}
              />
              <GameSection
                title="Wishlist"
                subtitle="Juegos que quieres conseguir"
                games={wishlistGames}
                onSeeMore={() => setFilter("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
              />
              <GameSection
                title="Estantería"
                subtitle="Todo lo que ya tienes (sin empezar, jugando o completado)"
                games={shelfGames}
                onSeeMore={() => setFilter("shelf")}
                onEdit={setEditing}
                emptyLabel="Aún no has añadido juegos a tu estantería."
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay juegos en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setFilter("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">
                {filtered.length} resultados
              </p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Ver inicio
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((game) => (
                <GameCard key={game.id} game={game} onEdit={setEditing} />
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted)]">
          Datos de videojuegos por{" "}
          <a
            href="https://rawg.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            RAWG
          </a>
        </p>
      </main>

      <AddGameModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadGames}
      />
      <EditGameDialog
        game={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadGames}
        onDeleted={loadGames}
      />
    </div>
  );
}
